import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const EXPIRY_HOURS = 72;
const REMINDER_WINDOW_MIN = 23;
const REMINDER_WINDOW_MAX = 25;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const now = new Date();
    const expiryThreshold = new Date(now.getTime() - EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
    const reminderWindowStart = new Date(now.getTime() - REMINDER_WINDOW_MAX * 60 * 60 * 1000).toISOString();
    const reminderWindowEnd = new Date(now.getTime() - REMINDER_WINDOW_MIN * 60 * 60 * 1000).toISOString();

    // ── 1. Auto-cancel reservations pending > 72 hours ──────────────────────────
    const { data: cancelledRes, error: cancelResError } = await supabase
      .from('reservations')
      .update({ payment_status: 'cancelled' })
      .eq('payment_status', 'pending')
      .lt('created_at', expiryThreshold)
      .select('id');

    if (cancelResError) {
      console.error('Cancel reservations error:', cancelResError.message);
    } else {
      console.log(`Cancelled ${cancelledRes?.length ?? 0} expired reservations`);
    }

    // ── 1b. Auto-cancel product orders pending > 72 hours ────────────────────────
    const { data: cancelledOrders, error: cancelOrdersError } = await supabase
      .from('product_orders')
      .update({ payment_status: 'cancelled' })
      .eq('payment_status', 'pending')
      .lt('created_at', expiryThreshold)
      .select('id');

    if (cancelOrdersError) {
      console.error('Cancel product orders error:', cancelOrdersError.message);
    } else {
      console.log(`Cancelled ${cancelledOrders?.length ?? 0} expired product orders`);
    }

    // ── 2. Send 24-hour reminder emails for reservations ──────────────────────────
    const { data: toRemindRes, error: reminderQueryError } = await supabase
      .from('reservations')
      .select('id, email, customer_name, departure_date, travelers, total_price_mxn, created_at, tours(title_es)')
      .eq('payment_status', 'pending')
      .is('reminder_sent_at', null)
      .gte('created_at', reminderWindowStart)
      .lte('created_at', reminderWindowEnd);

    if (reminderQueryError) {
      console.error('Reminder query error:', reminderQueryError.message);
    } else if (toRemindRes && toRemindRes.length > 0) {
      const sendEmailUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;

      for (const res of toRemindRes) {
        const hoursElapsed = (now.getTime() - new Date(res.created_at).getTime()) / (60 * 60 * 1000);
        const hoursRemaining = Math.max(0, Math.round(EXPIRY_HOURS - hoursElapsed));
        const tourTitle = (res.tours as { title_es: string } | null)?.title_es ?? 'Tu tour';

        try {
          await fetch(sendEmailUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              type: 'reservation_payment_reminder',
              to: res.email,
              data: {
                customer_name: res.customer_name,
                tour_title: tourTitle,
                departure_date: res.departure_date,
                travelers: String(res.travelers),
                total: String(res.total_price_mxn),
                hours_remaining: String(hoursRemaining),
              },
            }),
          });

          await supabase
            .from('reservations')
            .update({ reminder_sent_at: now.toISOString() })
            .eq('id', res.id);
        } catch (emailErr) {
          console.error(`Failed to send reminder for reservation ${res.id}:`, emailErr);
        }
      }

      console.log(`Sent ${toRemindRes.length} reservation reminder emails`);
    }

    // ── 2b. Send 24-hour reminder emails for product orders ───────────────────────
    const { data: toRemindOrders, error: orderReminderError } = await supabase
      .from('product_orders')
      .select('id, user_id, product_id, quantity, size, total_mxn, created_at, products(title_es), profiles(full_name, email)')
      .eq('payment_status', 'pending')
      .is('reminder_sent_at', null)
      .gte('created_at', reminderWindowStart)
      .lte('created_at', reminderWindowEnd);

    if (orderReminderError) {
      console.error('Product order reminder query error:', orderReminderError.message);
    } else if (toRemindOrders && toRemindOrders.length > 0) {
      const sendEmailUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;

      for (const order of toRemindOrders) {
        const hoursElapsed = (now.getTime() - new Date(order.created_at).getTime()) / (60 * 60 * 1000);
        const hoursRemaining = Math.max(0, Math.round(EXPIRY_HOURS - hoursElapsed));
        const productTitle = (order.products as { title_es: string } | null)?.title_es ?? 'Tu producto';
        const customerEmail = (order.profiles as { email: string } | null)?.email ?? '';
        const customerName = (order.profiles as { full_name: string } | null)?.full_name ?? 'Cliente';

        if (!customerEmail) continue;

        try {
          await fetch(sendEmailUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              type: 'product_payment_reminder',
              to: customerEmail,
              data: {
                customer_name: customerName,
                product_title: productTitle,
                quantity: String(order.quantity),
                size: order.size ?? '',
                total: String(order.total_mxn),
                hours_remaining: String(hoursRemaining),
              },
            }),
          });

          await supabase
            .from('product_orders')
            .update({ reminder_sent_at: now.toISOString() })
            .eq('id', order.id);
        } catch (emailErr) {
          console.error(`Failed to send reminder for product order ${order.id}:`, emailErr);
        }
      }

      console.log(`Sent ${toRemindOrders.length} product order reminder emails`);
    }

    // ── 3. Send review request emails for completed tours ──────────────────────────
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: completedRes, error: reviewQueryError } = await supabase
      .from('reservations')
      .select('id, email, customer_name, departure_date, tours(title_es)')
      .in('payment_status', ['confirmed', 'deposit_paid', 'paid'])
      .is('review_request_sent_at', null)
      .lt('departure_date', yesterday);

    if (reviewQueryError) {
      console.error('Review request query error:', reviewQueryError.message);
    } else if (completedRes && completedRes.length > 0) {
      const sendEmailUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;
      const reviewsUrl = `${Deno.env.get('SUPABASE_URL').replace('.supabase.co', '')}`.includes('recorramos')
        ? 'https://recorramosmexico.com.mx/resenas'
        : '/resenas';

      for (const res of completedRes) {
        const tourTitle = (res.tours as { title_es: string } | null)?.title_es ?? 'Tu tour';
        const customerEmail = res.email;
        if (!customerEmail) continue;

        try {
          await fetch(sendEmailUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              type: 'review_request',
              to: customerEmail,
              data: {
                customer_name: res.customer_name,
                tour_title: tourTitle,
                reviews_url: 'https://recorramosmexico.com.mx/resenas',
              },
            }),
          });

          await supabase
            .from('reservations')
            .update({ review_request_sent_at: now.toISOString() })
            .eq('id', res.id);
        } catch (emailErr) {
          console.error(`Failed to send review request for reservation ${res.id}:`, emailErr);
        }
      }

      console.log(`Sent ${completedRes.length} review request emails`);
    }

    return new Response(
      JSON.stringify({
        cancelled_reservations: cancelledRes?.length ?? 0,
        cancelled_product_orders: cancelledOrders?.length ?? 0,
        reservation_reminders_sent: toRemindRes?.length ?? 0,
        product_order_reminders_sent: toRemindOrders?.length ?? 0,
        review_requests_sent: completedRes?.length ?? 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('process-reservations error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
