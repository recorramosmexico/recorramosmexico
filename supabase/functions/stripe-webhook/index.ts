import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, stripe-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
  const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!stripeSecret || !stripeWebhookSecret) {
    console.error('Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return new Response('Server configuration error', { status: 500, headers: corsHeaders });
  }

  const stripe = new Stripe(stripeSecret, {
    appInfo: { name: 'Bolt Integration', version: '1.0.0' },
  });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('No signature found', { status: 400, headers: corsHeaders });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400, headers: corsHeaders });
  }

  // Acknowledge receipt immediately — process async so Stripe doesn't time out
  EdgeRuntime.waitUntil(handleEvent(event, stripe, supabase));

  return Response.json({ received: true }, { headers: corsHeaders });
});

async function handleEvent(event: Stripe.Event, stripe: Stripe, supabase: ReturnType<typeof createClient>) {
  console.info(`Processing event: ${event.type} (${event.id})`);

  try {
    if (event.type === 'checkout.session.async_payment_succeeded') {
      await handleCheckoutPaymentSucceeded(event.data.object as Stripe.Checkout.Session, supabase);
      return;
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      await handleCheckoutPaymentFailed(event.data.object as Stripe.Checkout.Session, supabase);
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;

      if (session.mode === 'subscription' && customerId) {
        console.info(`Subscription checkout completed for customer: ${customerId}`);
        await syncCustomerFromStripe(customerId, stripe, supabase);
        return;
      }

      if (session.mode === 'payment') {
        await handleCheckoutPaymentCompleted(session, customerId, supabase);
      }
      return;
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.invoice === null) return; // one-time payment handled via checkout.session.completed
      const customerId = typeof pi.customer === 'string' ? pi.customer : null;
      if (customerId) await syncCustomerFromStripe(customerId, stripe, supabase);
      return;
    }

    console.info(`Unhandled event type: ${event.type}`);
  } catch (err: any) {
    console.error(`Error handling event ${event.type}:`, err.message ?? err);
  }
}

async function handleCheckoutPaymentCompleted(
  session: Stripe.Checkout.Session,
  customerId: string | null,
  supabase: ReturnType<typeof createClient>,
) {
  const {
    id: checkout_session_id,
    payment_intent,
    amount_subtotal,
    amount_total,
    currency,
    metadata,
    payment_status,
    payment_method_types,
  } = session;

  const isPaid = payment_status === 'paid';
  const pmType = payment_method_types?.[0] ?? 'card';
  const paymentType = metadata?.payment_type ?? 'full';
  const paymentIntentId =
    typeof payment_intent === 'string'
      ? payment_intent
      : (payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

  // Upsert so duplicate webhook deliveries don't error
  const { error: orderError } = await supabase.from('stripe_orders').upsert(
    {
      checkout_session_id,
      payment_intent_id: paymentIntentId,
      customer_id: customerId,
      amount_subtotal,
      amount_total,
      currency,
      payment_status: payment_status ?? 'unpaid',
      status: isPaid ? 'completed' : 'pending',
      payment_method_type: pmType,
    },
    { onConflict: 'checkout_session_id' },
  );

  if (orderError) {
    console.error('Error upserting order:', orderError);
    return;
  }

  if (isPaid) {
    await markReservationPaid(metadata?.reservation_id, checkout_session_id, paymentType, supabase);
  } else {
    console.info(`Async payment pending for session ${checkout_session_id} (${pmType})`);
  }
}

async function handleCheckoutPaymentSucceeded(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createClient>,
) {
  const { id: checkout_session_id, metadata } = session;

  const { error } = await supabase
    .from('stripe_orders')
    .update({ status: 'completed', payment_status: 'paid' })
    .eq('checkout_session_id', checkout_session_id);

  if (error) {
    console.error('Error updating order on async success:', error);
    return;
  }

  const paymentType = metadata?.payment_type ?? 'full';
  await markReservationPaid(metadata?.reservation_id, checkout_session_id, paymentType, supabase);
  console.info(`Async payment succeeded for session ${checkout_session_id}`);
}

async function handleCheckoutPaymentFailed(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createClient>,
) {
  const { id: checkout_session_id } = session;

  const { error } = await supabase
    .from('stripe_orders')
    .update({ status: 'canceled', payment_status: 'failed' })
    .eq('checkout_session_id', checkout_session_id);

  if (error) {
    console.error('Error updating order on async failure:', error);
  } else {
    console.info(`Async payment failed for session ${checkout_session_id}`);
  }
}

async function markReservationPaid(
  reservationId: string | null | undefined,
  sessionId: string,
  paymentType: string,
  supabase: ReturnType<typeof createClient>,
) {
  if (!reservationId) {
    console.info(`No reservation_id in metadata for session ${sessionId}`);
    return;
  }

  const newStatus = paymentType === 'deposit' ? 'deposit_paid' : 'paid';

  const { data: numberRow, error: numberError } = await supabase.rpc('generate_reservation_number');

  if (numberError || !numberRow) {
    console.error(`Error generating reservation number for ${reservationId}:`, numberError);
    await supabase.from('reservations').update({ payment_status: newStatus }).eq('id', reservationId);
    return;
  }

  const reservationNumber: string = numberRow;

  const { error: updateError } = await supabase
    .from('reservations')
    .update({ payment_status: newStatus, reservation_number: reservationNumber })
    .eq('id', reservationId);

  if (updateError) {
    console.error(`Error updating reservation ${reservationId}:`, updateError);
    return;
  }

  console.info(`Reservation ${reservationId} marked as ${newStatus}, number: ${reservationNumber}`);

  const { data: reservation, error: fetchError } = await supabase
    .from('reservations')
    .select('*, tours(title_es, title_en)')
    .eq('id', reservationId)
    .single();

  if (fetchError || !reservation) {
    console.error(`Error fetching reservation ${reservationId} for email:`, fetchError);
    return;
  }

  const tourTitle = reservation.tours?.title_es || reservation.tours?.title_en || 'Tour';

  await sendConfirmationEmail({
    to: reservation.email,
    reservation_number: reservationNumber,
    customer_name: reservation.customer_name,
    tour_title: tourTitle,
    departure_date: reservation.departure_date,
    travelers: String(reservation.travelers),
    total: String(reservation.total_price_mxn),
    deposit_amount: reservation.deposit_amount_mxn ? String(reservation.deposit_amount_mxn) : '',
    remaining_balance: reservation.remaining_balance_mxn ? String(reservation.remaining_balance_mxn) : '',
    deposit_percentage: reservation.deposit_percentage_applied ? String(reservation.deposit_percentage_applied) : '',
    phone: reservation.phone,
  });
}

async function sendConfirmationEmail(data: Record<string, string>) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ type: 'reservation_confirmed', to: data.to, data }),
    });

    if (!res.ok) {
      console.error(`send-email responded with ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error('Error sending confirmation email:', err);
  }
}

async function syncCustomerFromStripe(
  customerId: string,
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    if (subscriptions.data.length === 0) {
      const { error } = await supabase
        .from('stripe_subscriptions')
        .upsert({ customer_id: customerId, subscription_status: 'not_started' }, { onConflict: 'customer_id' });
      if (error) console.error('Error updating subscription status:', error);
      return;
    }

    const subscription = subscriptions.data[0];

    const { error } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method &&
        typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      { onConflict: 'customer_id' },
    );

    if (error) console.error('Error syncing subscription:', error);
    else console.info(`Subscription synced for customer: ${customerId}`);
  } catch (error: any) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
  }
}
