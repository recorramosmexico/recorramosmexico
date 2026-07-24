import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function htmlPage(title: string, message: string, success: boolean) {
  const bg = success ? "#f0fdf4" : "#fef2f2";
  const border = success ? "#bbf7d0" : "#fecaca";
  const color = success ? "#15803d" : "#b91c1c";
  const icon = success ? "\u2713" : "\u2717";
  return new Response(
    `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title><style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;display:flex;justify-content:center;align-items:center;min-height:100vh}
      .card{max-width:480px;width:100%;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;text-align:center}
      .banner{padding:40px 32px;background:${bg};border-bottom:3px solid ${border}}
      .icon{font-size:48px;color:${color};margin-bottom:16px;line-height:1}
      h1{font-size:22px;font-weight:800;color:#111827;margin:0 0 8px}
      .msg{font-size:15px;color:#6b7280;line-height:1.6;margin:0}
      .body{padding:32px}
      .btn{display:inline-block;padding:14px 32px;background:#E8670A;color:#fff;font-weight:700;text-decoration:none;border-radius:8px;font-size:15px}
      .footer{padding:20px 32px;background:#f9fafb;font-size:12px;color:#9ca3af}
    </style></head><body><div class="card"><div class="banner"><div class="icon">${icon}</div><h1>${title}</h1><p class="msg">${message}</p></div><div class="body"><a href="https://recorramosmexico.com.mx/admin/reservaciones" class="btn">Ir al Panel de Admin</a></div><div class="footer">Recorramos Mexico &mdash; Sistema de Reservas</div></div></body></html>`,
    { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return htmlPage(
        "Token requerido",
        "Falta el token de confirmacion. Usa el enlace del correo para confirmar la reserva.",
        false,
      );
    }

    // Look up the reservation by confirmation_token
    const { data: reservation, error: findErr } = await supabase
      .from("reservations")
      .select("id, payment_status, payment_proof_url, email, customer_name, departure_date, travelers, total_price_mxn, deposit_amount_mxn, remaining_balance_mxn, deposit_percentage_applied, confirmation_token, tours(title_es, title_en)")
      .eq("confirmation_token", token)
      .maybeSingle();

    if (findErr || !reservation) {
      return htmlPage(
        "Token invalido",
        "No se encontro ninguna reserva con este token. Es posible que la reserva ya haya sido confirmada o cancelada.",
        false,
      );
    }

    if (reservation.payment_status === "deposit_paid" || reservation.payment_status === "paid") {
      return htmlPage(
        "Reserva ya confirmada",
        "Esta reserva ya fue confirmada anteriormente. No se requiere ninguna accion adicional.",
        true,
      );
    }

    // Confirm the reservation: mark as deposit_paid, invalidate token, set confirmed_at
    const { error: updateErr } = await supabase
      .from("reservations")
      .update({
        payment_status: "deposit_paid",
        confirmation_token: null,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", reservation.id);

    if (updateErr) {
      return htmlPage(
        "Error al confirmar",
        "Hubo un problema al confirmar la reserva. Intenta de nuevo mas tarde.",
        false,
      );
    }

    // Send confirmation email to the traveler
    const tourTitle = reservation.tours
      ? (reservation.tours.title_es || reservation.tours.title_en)
      : "Tour";

    const emailData = {
      tour_title: tourTitle,
      customer_name: reservation.customer_name || "",
      email: reservation.email,
      phone: "",
      departure_date: reservation.departure_date,
      travelers: String(reservation.travelers),
      total: String(reservation.total_price_mxn),
      deposit_amount: String(reservation.deposit_amount_mxn ?? 0),
      remaining_balance: String(reservation.remaining_balance_mxn ?? 0),
      deposit_percentage: String(reservation.deposit_percentage_applied ?? 40),
      notes: "",
      payment_method: "bank_transfer",
    };

    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "reservation_confirmed",
        to: reservation.email,
        data: emailData,
      }),
    });

    return htmlPage(
      "Reserva Confirmada",
      `La reserva de ${reservation.customer_name || "el viajero"} para "${tourTitle}" ha sido confirmada exitosamente. Se envio un correo de confirmacion al viajero.`,
      true,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return htmlPage("Error", msg, false);
  }
});
