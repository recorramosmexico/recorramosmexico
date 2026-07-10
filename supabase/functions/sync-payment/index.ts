import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: { name: 'Bolt Integration', version: '1.0.0' },
});
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    // Verify the caller is an authenticated admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Authorization required' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') return json({ error: 'Admin only' }, 403);

    const { reservation_id } = await req.json();
    if (!reservation_id) return json({ error: 'reservation_id required' }, 400);

    // Fetch reservation
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('id, payment_status, stripe_session_id, balance_stripe_session_id, deposit_amount_mxn')
      .eq('id', reservation_id)
      .maybeSingle();

    if (resError || !reservation) return json({ error: 'Reservation not found' }, 404);

    if (reservation.payment_status === 'paid') {
      return json({ status: 'paid', message: 'Already fully paid', changed: false });
    }

    const sessionId = reservation.stripe_session_id;
    if (!sessionId) return json({ error: 'No Stripe session ID on this reservation' }, 400);

    // Query Stripe for the actual session status
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paymentType = (session.metadata?.payment_type as string) ?? 'full';

    if (session.payment_status !== 'paid') {
      // Also check if there's a balance session
      const balanceSessionId = reservation.balance_stripe_session_id;
      if (balanceSessionId) {
        const balanceSession = await stripe.checkout.sessions.retrieve(balanceSessionId);
        if (balanceSession.payment_status === 'paid') {
          await supabase
            .from('reservations')
            .update({ payment_status: 'paid' })
            .eq('id', reservation_id);
          return json({ status: 'paid', message: 'Balance payment confirmed and reservation updated', changed: true });
        }
      }
      return json({
        status: session.payment_status,
        message: `Stripe reports payment as: ${session.payment_status}. No update made.`,
        changed: false,
      });
    }

    // Session is paid — determine new reservation status
    const newStatus = paymentType === 'deposit' ? 'deposit_paid' : 'paid';

    if (reservation.payment_status === newStatus) {
      return json({ status: newStatus, message: 'Already at correct status', changed: false });
    }

    const { error: updateError } = await supabase
      .from('reservations')
      .update({ payment_status: newStatus })
      .eq('id', reservation_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return json({ error: updateError.message }, 500);
    }

    // Also upsert stripe_orders if missing
    const { data: existingOrder } = await supabase
      .from('stripe_orders')
      .select('checkout_session_id')
      .eq('checkout_session_id', sessionId)
      .maybeSingle();

    if (!existingOrder) {
      const pi = session.payment_intent;
      const piId = typeof pi === 'string' ? pi : (pi as Stripe.PaymentIntent | null)?.id ?? null;
      await supabase.from('stripe_orders').insert({
        checkout_session_id: sessionId,
        payment_intent_id: piId,
        customer_id: typeof session.customer === 'string' ? session.customer : null,
        amount_subtotal: session.amount_subtotal,
        amount_total: session.amount_total,
        currency: session.currency,
        payment_status: 'paid',
        status: 'completed',
        payment_method_type: session.payment_method_types?.[0] ?? 'card',
      });
    } else {
      await supabase
        .from('stripe_orders')
        .update({ status: 'completed', payment_status: 'paid' })
        .eq('checkout_session_id', sessionId);
    }

    console.info(`sync-payment: reservation ${reservation_id} → ${newStatus}`);
    return json({ status: newStatus, message: `Reservation updated to ${newStatus}`, changed: true });

  } catch (err: any) {
    console.error('sync-payment error:', err);
    return json({ error: err.message }, 500);
  }
});
