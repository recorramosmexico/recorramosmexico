import { supabase } from './supabase';

type EmailType = 'welcome' | 'contact' | 'reservation_traveler' | 'reservation_admin';

export async function sendEmail(type: EmailType, to: string, data: Record<string, string | number>) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ type, to, data }),
      }
    );
  } catch {
    // Email failures are non-fatal — log silently
  }
}
