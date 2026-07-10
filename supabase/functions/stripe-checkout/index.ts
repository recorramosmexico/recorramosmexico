import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: { name: 'Bolt Integration', version: '1.0.0' },
});

type PaymentMethodInput = 'card' | 'oxxo' | 'bank_transfer';
type PaymentTypeInput = 'deposit' | 'balance' | 'full';

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
  if (status === 204) return new Response(null, { status, headers });
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return corsResponse({}, 204);
    if (req.method !== 'POST') return corsResponse({ error: 'Method not allowed' }, 405);

    const {
      unit_amount,
      quantity,
      product_name,
      success_url,
      cancel_url,
      reservation_id,
      payment_method = 'card',
      payment_type = 'full',
    } = await req.json();

    if (!unit_amount || typeof unit_amount !== 'number')
      return corsResponse({ error: 'Missing required parameter unit_amount' }, 400);
    if (!quantity || typeof quantity !== 'number')
      return corsResponse({ error: 'Missing required parameter quantity' }, 400);
    if (!product_name || typeof product_name !== 'string')
      return corsResponse({ error: 'Missing required parameter product_name' }, 400);
    if (!success_url || typeof success_url !== 'string')
      return corsResponse({ error: 'Missing required parameter success_url' }, 400);
    if (!cancel_url || typeof cancel_url !== 'string')
      return corsResponse({ error: 'Missing required parameter cancel_url' }, 400);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return corsResponse({ error: 'Authorization header required' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
    if (getUserError || !user) return corsResponse({ error: 'Failed to authenticate user' }, 401);

    const { data: customer, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (getCustomerError) return corsResponse({ error: 'Failed to fetch customer information' }, 500);

    let customerId: string;

    if (!customer?.customer_id) {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });

      const { error: createCustomerError } = await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newCustomer.id,
      });

      if (createCustomerError) {
        try { await stripe.customers.del(newCustomer.id); } catch (_) { /* ignore */ }
        return corsResponse({ error: 'Failed to create customer mapping' }, 500);
      }

      customerId = newCustomer.id;
    } else {
      customerId = customer.customer_id;
    }

    const sessionParams = buildSessionParams(
      customerId,
      unit_amount,
      quantity,
      product_name,
      success_url,
      cancel_url,
      reservation_id,
      payment_method as PaymentMethodInput,
      payment_type as PaymentTypeInput,
    );

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Persist session ID on the reservation
    if (reservation_id) {
      const updateFields: Record<string, string> = {
        payment_method_type: payment_method,
      };

      if (payment_type === 'balance') {
        updateFields['balance_stripe_session_id'] = session.id;
      } else {
        updateFields['stripe_session_id'] = session.id;
      }

      await supabase
        .from('reservations')
        .update(updateFields)
        .eq('id', reservation_id);
    }

    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error(`Checkout error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});

function buildSessionParams(
  customerId: string,
  unit_amount: number,
  quantity: number,
  product_name: string,
  success_url: string,
  cancel_url: string,
  reservation_id: string | undefined,
  payment_method: PaymentMethodInput,
  payment_type: PaymentTypeInput,
): Stripe.Checkout.SessionCreateParams {
  const lineItems: Stripe.Checkout.SessionCreateParams['line_items'] = [
    {
      price_data: {
        currency: 'mxn',
        unit_amount,
        product_data: { name: product_name },
      },
      quantity,
    },
  ];

  const base: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    line_items: lineItems,
    mode: 'payment',
    success_url,
    cancel_url,
    metadata: reservation_id
      ? { reservation_id: String(reservation_id), payment_type }
      : undefined,
  };

  if (payment_method === 'oxxo') {
    return {
      ...base,
      payment_method_types: ['oxxo'],
      payment_method_options: {
        oxxo: { expires_after_days: 3 },
      },
    };
  }

  if (payment_method === 'bank_transfer') {
    return {
      ...base,
      payment_method_types: ['customer_balance'],
      payment_method_options: {
        customer_balance: {
          funding_type: 'bank_transfer',
          bank_transfer: { type: 'mx_bank_transfer' },
        },
      },
    };
  }

  // Default: card
  return {
    ...base,
    payment_method_types: ['card'],
  };
}
