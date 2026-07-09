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
    const { data: cancelled, error: cancelError } = await supabase
      .from('reservations')
      .update({ payment_status: 'cancelled' })
      .eq('payment_status', 'pending')
      .lt('created_at', expiryThreshold)
      .select('id');

    if (cancelError) {
      console.error('Cancel error:', cancelError.message);
    } else {
      console.log(`Cancelled ${cancelled?.length ?? 0} expired reservations`);
    }

    // ── 2. Send 24-hour reminder emails ─────────────────────────────────────────
    const { data: toRemind, error: reminderQueryError } = await supabase
      .from('reservations')
      .select('id, email, customer_name, departure_date, travelers, total_price_mxn, created_at, tours(title_es)')
      .eq('payment_status', 'pending')
      .is('reminder_sent_at', null)
      .gte('created_at', reminderWindowStart)
      .lte('created_at', reminderWindowEnd);

    if (reminderQueryError) {
      console.error('Reminder query error:', reminderQueryError.message);
    } else if (toRemind && toRemind.length > 0) {
      const sendEmailUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;

      for (const res of toRemind) {
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

          // Mark reminder as sent
          await supabase
            .from('reservations')
            .update({ reminder_sent_at: now.toISOString() })
            .eq('id', res.id);
        } catch (emailErr) {
          console.error(`Failed to send reminder for reservation ${res.id}:`, emailErr);
        }
      }

      console.log(`Sent ${toRemind.length} reminder emails`);
    }

    return new Response(
      JSON.stringify({
        cancelled: cancelled?.length ?? 0,
        reminders_sent: toRemind?.length ?? 0,
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
