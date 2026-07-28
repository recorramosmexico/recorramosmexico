import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import Stripe from 'npm:stripe@17.7.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeSecretKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { order_id, method } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: order, error: orderError } = await supabase
      .from('product_orders')
      .select('id, payment_status, stripe_session_id, total_mxn, product_id, quantity, size')
      .eq('id', order_id)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (order.payment_status !== 'paid') {
      return new Response(JSON.stringify({ error: 'Order is not in paid status' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'bank_transfer') {
      await supabase
        .from('product_orders')
        .update({
          payment_status: 'refunded',
          refund_status: 'completed',
          refund_method: 'bank_transfer',
          refunded_at: new Date().toISOString(),
        })
        .eq('id', order_id);
      return new Response(JSON.stringify({ success: true, message: 'Marked as refunded via bank transfer' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!order.stripe_session_id) {
      return new Response(JSON.stringify({ error: 'No Stripe session on this order' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    if (!session.payment_intent) {
      return new Response(JSON.stringify({ error: 'No payment intent on session' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const refund = await stripe.refunds.create({
      payment_intent: session.payment_intent as string,
    });

    if (refund.status === 'succeeded' || refund.status === 'pending') {
      await supabase
        .from('product_orders')
        .update({
          payment_status: 'refunded',
          refund_status: refund.status === 'succeeded' ? 'completed' : 'pending',
          refund_method: 'stripe',
          refunded_at: new Date().toISOString(),
        })
        .eq('id', order_id);

      // Restore stock
      if (order.product_id && order.size) {
        const { data: product } = await supabase
          .from('products')
          .select('sizes')
          .eq('id', order.product_id)
          .maybeSingle();
        if (product?.sizes) {
          const updatedSizes = (product.sizes as Array<{ size: string; stock: number }>).map((s) =>
            s.size === order.size
              ? { ...s, stock: s.stock + (order.quantity || 1) }
              : s
          );
          await supabase.from('products').update({ sizes: updatedSizes }).eq('id', order.product_id);
        }
      }

      return new Response(JSON.stringify({ success: true, refund_status: refund.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Refund status: ${refund.status}` }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
