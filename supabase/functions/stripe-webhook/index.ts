import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: { name: 'Bolt Integration', version: '1.0.0' },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const signature = req.headers.get('stripe-signature');
    if (!signature) return new Response('No signature found', { status: 400 });

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  // Async payment methods (OXXO, SPEI bank transfers) fire these after the customer pays
  if (event.type === 'checkout.session.async_payment_succeeded') {
    await handleCheckoutPaymentSucceeded(event.data.object as Stripe.Checkout.Session);
    return;
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    await handleCheckoutPaymentFailed(event.data.object as Stripe.Checkout.Session);
    return;
  }

  const stripeData = event?.data?.object ?? {};
  if (!stripeData || !('customer' in stripeData)) return;

  // Skip raw payment_intent.succeeded for one-time payments — handled via checkout.session.completed
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) return;

  const { customer: customerId } = stripeData as { customer?: string | null };
  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer on event: ${event.type}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = stripeData as Stripe.Checkout.Session;
    const { mode } = session;

    if (mode === 'subscription') {
      console.info(`Subscription checkout completed for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
      return;
    }

    if (mode === 'payment') {
      await handleCheckoutPaymentCompleted(session, customerId);
    }
  }
}

// Fires immediately when the Checkout session is submitted.
// For card payments: payment_status is 'paid' → mark as completed right away.
// For OXXO / bank transfers: payment_status is 'unpaid' → store as pending,
// wait for async_payment_succeeded to mark it paid.
async function handleCheckoutPaymentCompleted(session: Stripe.Checkout.Session, customerId: string) {
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
  const paymentIntentId =
    typeof payment_intent === 'string'
      ? payment_intent
      : (payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

  const { error: orderError } = await supabase.from('stripe_orders').insert({
    checkout_session_id,
    payment_intent_id: paymentIntentId,
    customer_id: customerId,
    amount_subtotal,
    amount_total,
    currency,
    payment_status: payment_status ?? 'unpaid',
    status: isPaid ? 'completed' : 'pending',
    payment_method_type: pmType,
  });

  if (orderError) {
    console.error('Error inserting order:', orderError);
    return;
  }

  if (isPaid) {
    await markReservationPaid(metadata?.reservation_id, checkout_session_id);
  } else {
    console.info(`Async payment pending for session ${checkout_session_id} (${pmType})`);
  }
}

// Fires when an OXXO or bank-transfer payment is confirmed.
async function handleCheckoutPaymentSucceeded(session: Stripe.Checkout.Session) {
  const { id: checkout_session_id, metadata } = session;

  const { error } = await supabase
    .from('stripe_orders')
    .update({ status: 'completed', payment_status: 'paid' })
    .eq('checkout_session_id', checkout_session_id);

  if (error) {
    console.error('Error updating order on async success:', error);
    return;
  }

  await markReservationPaid(metadata?.reservation_id, checkout_session_id);
  console.info(`Async payment succeeded for session ${checkout_session_id}`);
}

// Fires when an async payment expires or is declined.
async function handleCheckoutPaymentFailed(session: Stripe.Checkout.Session) {
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

async function markReservationPaid(reservationId: string | null | undefined, sessionId: string) {
  if (!reservationId) return;

  const { error } = await supabase
    .from('reservations')
    .update({ payment_status: 'paid' })
    .eq('id', reservationId);

  if (error) {
    console.error(`Error updating reservation ${reservationId} for session ${sessionId}:`, error);
  } else {
    console.info(`Reservation ${reservationId} marked as paid`);
  }
}

// Based on https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    if (subscriptions.data.length === 0) {
      const { error } = await supabase.from('stripe_subscriptions').upsert(
        { customer_id: customerId, subscription_status: 'not_started' },
        { onConflict: 'customer_id' },
      );
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
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}
