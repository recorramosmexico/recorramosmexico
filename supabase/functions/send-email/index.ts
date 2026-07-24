import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailPayload {
  type: "welcome" | "contact" | "reservation_traveler" | "reservation_admin" | "reservation_payment_reminder" | "reservation_balance_request" | "reservation_pending_payment" | "reservation_bank_transfer" | "reservation_confirmed" | "inquiry" | "inquiry_reply";
  to: string;
  data: Record<string, string | number>;
}

function brandHeader(logoUrl: string) {
  return `
    <div style="background:#1A1A1A;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center;">
      ${logoUrl ? `<img src="${logoUrl}" alt="Recorramos México" style="height:64px;width:64px;object-fit:cover;border-radius:12px;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto;" />` : ''}
      <p style="color:#E8670A;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 2px;">Recorramos México</p>
      <p style="color:#9ca3af;font-size:12px;margin:0;">Descubre la magia de México</p>
    </div>`;
}

function brandFooter() {
  return `
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center;border-radius:0 0 12px 12px;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} Recorramos México · <a href="mailto:contacto@recorramosmexico.com.mx" style="color:#9ca3af;">contacto@recorramosmexico.com.mx</a></p>
    </div>`;
}

function buildHtml(title: string, body: string, logoUrl: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:20px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
      ${brandHeader(logoUrl)}
      <div style="padding:32px;">
        <h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 16px;">${title}</h1>
        ${body}
      </div>
      ${brandFooter()}
    </div>
  </body></html>`;
}

function buildText(title: string, body: string): string {
  return `${title}\n\n${body}\n\n---\nRecorramos México · contacto@recorramosmexico.com.mx`;
}

function getTemplate(type: EmailPayload["type"], data: Record<string, string | number>, logoUrl: string): { subject: string; html_body: string; text_body: string } {
  switch (type) {
    case "reservation_pending_payment": {
      const subject = `Solicitud de reserva recibida — ${data.tour_title}`;
      const total = Number(data.total).toLocaleString("es-MX");
      const depositAmount = data.deposit_amount ? Number(data.deposit_amount).toLocaleString("es-MX") : null;
      const depositPct = data.deposit_percentage ? String(data.deposit_percentage) : null;
      const paymentMethodLabel = data.payment_method === 'oxxo' ? 'OXXO' : data.payment_method === 'bank_transfer' ? 'SPEI / Transferencia bancaria' : 'Pago asíncrono';
      const body = `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Hola <strong>${data.customer_name}</strong>,
        </p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Hemos recibido tu solicitud de reserva para <strong>${data.tour_title}</strong>. Sin embargo, <strong>tu reserva no quedará confirmada hasta que realices el pago del anticipo</strong> a través de <strong>${paymentMethodLabel}</strong>.
        </p>
        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 20px;">
          <p style="margin:0 0 6px;color:#92400e;font-size:14px;font-weight:700;">Importante: tienes maximo 72 horas para realizar el pago.</p>
          <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">Si no recibimos tu pago en ese plazo, tu solicitud sera cancelada automaticamente y el lugar quedara disponible para otros viajeros.</p>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;">
          <p style="margin:0 0 10px;font-size:16px;font-weight:800;color:#111827;">${data.tour_title}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Fecha de salida:</strong> ${data.departure_date}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Viajeros:</strong> ${data.travelers}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Total del tour:</strong> $${total} MXN</p>
          ${depositAmount ? `<p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#E8670A;"><strong style="color:#374151;">Anticipo requerido (${depositPct}%):</strong> $${depositAmount} MXN</p>` : ""}
          <p style="margin:8px 0 0;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Metodo de pago:</strong> ${paymentMethodLabel}</p>
          <p style="margin:6px 0 0;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Telefono de contacto:</strong> ${data.phone}</p>
        </div>
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">Sigue las instrucciones que Stripe te mostro en pantalla para completar tu pago. Una vez confirmado, recibiras un correo con tu numero de reserva y la confirmacion oficial.</p>
        <a href="https://recorramosmexico.com.mx/mi-cuenta" style="display:inline-block;padding:14px 32px;background:#E8670A;color:#fff;font-weight:700;text-decoration:none;border-radius:8px;font-size:15px;">Ver Estado de mi Reserva</a>
        <p style="color:#9ca3af;font-size:12px;margin:20px 0 0;">Si tienes preguntas escribenos a <a href="mailto:contacto@recorramosmexico.com.mx" style="color:#E8670A;">contacto@recorramosmexico.com.mx</a></p>`;
      return {
        subject,
        html_body: buildHtml("Solicitud Recibida — Pago Pendiente", body, logoUrl),
        text_body: buildText(
          subject,
          `Hola ${data.customer_name},\n\nHemos recibido tu solicitud de reserva para ${data.tour_title}. Tu reserva NO esta confirmada hasta que realices el pago.\n\nIMPORTANTE: Tienes maximo 72 horas para pagar. Si no se recibe el pago en ese plazo, tu solicitud sera cancelada automaticamente.\n\nTour: ${data.tour_title}\nFecha: ${data.departure_date}\nViajeros: ${data.travelers}\nTotal: $${total} MXN${depositAmount ? `\nAnticipo requerido (${depositPct}%): $${depositAmount} MXN` : ""}\nMetodo: ${paymentMethodLabel}\n\nSigue las instrucciones de Stripe para completar tu pago. Cuando se confirme, recibiras tu numero de reserva.\n\nVer estado: https://recorramosmexico.com.mx/mi-cuenta`,
        ),
      };
    }

    case "reservation_confirmed": {
      const subject = `Reserva Confirmada ${data.reservation_number} — ${data.tour_title}`;
      const total = Number(data.total).toLocaleString("es-MX");
      const depositAmount = data.deposit_amount ? Number(data.deposit_amount).toLocaleString("es-MX") : null;
      const remainingBalance = data.remaining_balance ? Number(data.remaining_balance).toLocaleString("es-MX") : null;
      const depositPct = data.deposit_percentage ? String(data.deposit_percentage) : null;
      const body = `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Hola <strong>${data.customer_name}</strong>,
        </p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Tu pago ha sido confirmado y tu reserva esta oficialmente registrada. En breve nuestro equipo se pondra en contacto contigo con los detalles y recomendaciones para el viaje.
        </p>
        <div style="background:#ecfdf5;border-left:4px solid #10b981;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 20px;">
          <p style="margin:0 0 4px;color:#065f46;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Numero de Reserva</p>
          <p style="margin:0;color:#065f46;font-size:24px;font-weight:900;letter-spacing:3px;">${data.reservation_number}</p>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;">
          <p style="margin:0 0 10px;font-size:16px;font-weight:800;color:#111827;">${data.tour_title}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Fecha de salida:</strong> ${data.departure_date}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Viajeros:</strong> ${data.travelers}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Total del tour:</strong> $${total} MXN</p>
          ${depositAmount ? `<p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Anticipo pagado (${depositPct}%):</strong> $${depositAmount} MXN</p>` : ""}
          ${remainingBalance ? `<p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#E8670A;"><strong style="color:#374151;">Saldo a pagar en efectivo al abordar:</strong> $${remainingBalance} MXN</p>` : ""}
          <p style="margin:8px 0 0;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Telefono de contacto:</strong> ${data.phone}</p>
        </div>
        <p style="color:#6b7280;font-size:13px;margin:0;">Si tienes preguntas escribenos a <a href="mailto:contacto@recorramosmexico.com.mx" style="color:#E8670A;">contacto@recorramosmexico.com.mx</a></p>`;
      return {
        subject,
        html_body: buildHtml("Reserva Confirmada", body, logoUrl),
        text_body: buildText(
          subject,
          `Hola ${data.customer_name},\n\nTu pago fue confirmado. Tu reserva esta registrada oficialmente.\n\nNumero de reserva: ${data.reservation_number}\n\nTour: ${data.tour_title}\nFecha: ${data.departure_date}\nViajeros: ${data.travelers}\nTotal: $${total} MXN${depositAmount ? `\nAnticipo (${depositPct}%): $${depositAmount} MXN\nSaldo en efectivo al abordar: $${remainingBalance} MXN` : ""}`,
        ),
      };
    }

    case "reservation_balance_request": {
      const subject = `Solicitud de pago de saldo — ${data.tour_title}`;
      const balance = Number(data.remaining_balance).toLocaleString("es-MX");
      const total = Number(data.total).toLocaleString("es-MX");
      const body = `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Hola <strong>${data.customer_name}</strong>,
        </p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          El equipo de <strong>Recorramos México</strong> te solicita el pago del saldo restante de tu reserva para <strong>${data.tour_title}</strong>.
        </p>
        <div style="background:#fff7ed;border-left:4px solid #E8670A;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 20px;">
          <p style="margin:0;color:#c2410c;font-size:14px;font-weight:600;">Ingresa a tu cuenta para completar el pago con tarjeta de crédito o débito.</p>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:16px;font-weight:800;color:#111827;">${data.tour_title}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Fecha de salida:</strong> ${data.departure_date}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Viajeros:</strong> ${data.travelers}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Total del tour:</strong> $${total} MXN</p>
          <p style="margin:0;font-size:15px;font-weight:800;color:#E8670A;"><strong style="color:#374151;">Saldo a pagar:</strong> $${balance} MXN</p>
        </div>
        <a href="https://recorramosmexico.com.mx/mi-cuenta" style="display:inline-block;padding:14px 32px;background:#E8670A;color:#fff;font-weight:700;text-decoration:none;border-radius:8px;font-size:15px;">Pagar Saldo Ahora</a>
        <p style="color:#9ca3af;font-size:12px;margin:20px 0 0;">¿Preguntas? Escríbenos a <a href="mailto:contacto@recorramosmexico.com.mx" style="color:#E8670A;">contacto@recorramosmexico.com.mx</a></p>`;
      return {
        subject,
        html_body: buildHtml("Solicitud de Pago de Saldo", body, logoUrl),
        text_body: buildText(
          subject,
          `Hola ${data.customer_name},\n\nEl equipo de Recorramos México te solicita el pago del saldo restante de tu reserva.\n\nTour: ${data.tour_title}\nFecha: ${data.departure_date}\nViajeros: ${data.travelers}\nSaldo a pagar: $${balance} MXN\n\nIngresa a tu cuenta para completar el pago: https://recorramosmexico.com.mx/mi-cuenta`,
        ),
      };
    }

    case "welcome": {
      const name = String(data.name || data.email || "viajero");
      const subject = "¡Bienvenido a Recorramos México!";
      const body = `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Hola <strong>${name}</strong>,
        </p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Nos da mucho gusto tenerte con nosotros. Ya puedes explorar nuestros tours, hacer reservaciones y gestionar tu cuenta desde tu perfil.
        </p>
        <div style="background:#fff7ed;border-left:4px solid #E8670A;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;">
          <p style="margin:0;color:#c2410c;font-size:14px;font-weight:600;">Explora nuestros tours disponibles y empieza a planear tu proxima aventura.</p>
        </div>
        <a href="https://recorramosmexico.com.mx/tours" style="display:inline-block;margin-top:8px;padding:12px 28px;background:#E8670A;color:#fff;font-weight:700;text-decoration:none;border-radius:8px;font-size:14px;">Ver Tours</a>`;
      return {
        subject,
        html_body: buildHtml(subject, body, logoUrl),
        text_body: buildText(subject, `Hola ${name},\n\nNos da mucho gusto tenerte con nosotros. Ya puedes explorar nuestros tours en: https://recorramosmexico.com.mx/tours`),
      };
    }

    case "contact": {
      const subject = `Nuevo mensaje de contacto: ${data.subject}`;
      const body = `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 4px;"><strong>Nombre:</strong> ${data.name}</p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 4px;"><strong>Email:</strong> ${data.email}</p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 4px;"><strong>Teléfono:</strong> ${data.phone || "—"}</p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;"><strong>Asunto:</strong> ${data.subject}</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-top:8px;">
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;white-space:pre-wrap;">${data.message}</p>
        </div>`;
      return {
        subject,
        html_body: buildHtml("Nuevo Mensaje de Contacto", body, logoUrl),
        text_body: buildText(subject, `Nombre: ${data.name}\nEmail: ${data.email}\nTeléfono: ${data.phone || "—"}\nAsunto: ${data.subject}\n\nMensaje:\n${data.message}`),
      };
    }

    case "reservation_traveler": {
      const subject = `Confirmación de reserva — ${data.tour_title}`;
      const total = Number(data.total).toLocaleString("es-MX");
      const depositAmount = data.deposit_amount ? Number(data.deposit_amount).toLocaleString("es-MX") : null;
      const remainingBalance = data.remaining_balance ? Number(data.remaining_balance).toLocaleString("es-MX") : null;
      const depositPct = data.deposit_percentage ? String(data.deposit_percentage) : null;
      const body = `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Hola <strong>${data.customer_name}</strong>,
        </p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Tu reserva ha sido recibida con éxito. En breve nuestro equipo se pondrá en contacto contigo para darte mayores detalles así como las recomendaciones para el viaje.
        </p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;">
          <p style="margin:0 0 10px;font-size:16px;font-weight:800;color:#111827;">${data.tour_title}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Fecha de salida:</strong> ${data.departure_date}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Viajeros:</strong> ${data.travelers}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Total del tour:</strong> $${total} MXN</p>
          ${depositAmount ? `<p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Anticipo pagado (${depositPct}%):</strong> $${depositAmount} MXN</p>` : ""}
          ${remainingBalance ? `<p style="margin:0 0 6px;font-size:14px;color:#E8670A;font-weight:600;"><strong style="color:#374151;">Saldo a pagar en efectivo al abordar:</strong> $${remainingBalance} MXN</p>` : ""}
          <p style="margin:${depositAmount ? "8px" : "0"} 0 0;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Teléfono de contacto:</strong> ${data.phone}</p>
        </div>
        <p style="color:#6b7280;font-size:13px;margin:0;">Si tienes preguntas escríbenos a <a href="mailto:contacto@recorramosmexico.com.mx" style="color:#E8670A;">contacto@recorramosmexico.com.mx</a></p>`;
      return {
        subject,
        html_body: buildHtml("Reserva Confirmada", body, logoUrl),
        text_body: buildText(subject, `Hola ${data.customer_name},\n\nTu reserva fue recibida.\n\nTour: ${data.tour_title}\nFecha: ${data.departure_date}\nViajeros: ${data.travelers}\nTotal: $${total} MXN${depositAmount ? `\nAnticipo (${depositPct}%): $${depositAmount} MXN\nSaldo en efectivo al abordar: $${remainingBalance} MXN` : ""}`),
      };
    }

    case "reservation_admin": {
      const subject = `Nueva reserva — ${data.tour_title}`;
      const total = Number(data.total).toLocaleString("es-MX");
      const body = `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Se ha registrado una nueva reserva:</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:16px;font-weight:800;color:#111827;">${data.tour_title}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Cliente:</strong> ${data.customer_name}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Email:</strong> ${data.email}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Teléfono:</strong> ${data.phone}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Fecha de salida:</strong> ${data.departure_date}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Viajeros:</strong> ${data.travelers}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Total:</strong> $${total} MXN</p>
          ${data.notes ? `<p style="margin:8px 0 0;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Notas:</strong> ${data.notes}</p>` : ""}
          ${data.payment_method ? `<p style="margin:4px 0 0;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Metodo de pago:</strong> ${data.payment_method === "bank_transfer" ? "Transferencia Bancaria" : data.payment_method === "oxxo" ? "OXXO" : "Tarjeta"}</p>` : ""}
          ${data.payment_proof_url ? `<p style="margin:8px 0 0;font-size:14px;font-weight:700;color:#E8670A;"><strong style="color:#374151;">Comprobante de pago:</strong> <a href="${data.payment_proof_url}" style="color:#E8670A;">Ver comprobante</a></p>` : ""}
        </div>`;
      return {
        subject,
        html_body: buildHtml("Nueva Reserva Recibida", body, logoUrl),
        text_body: buildText(subject, `Nueva reserva:\n\nTour: ${data.tour_title}\nCliente: ${data.customer_name}\nEmail: ${data.email}\nTeléfono: ${data.phone}\nFecha: ${data.departure_date}\nViajeros: ${data.travelers}\nTotal: $${total} MXN`),
      };
    }

    case "inquiry": {
      const tipoLabel: Record<string, string> = {
        transporte: "Solicitud de Transporte",
        tour_personalizado: "Solicitud de Tour Personalizado",
        contacto: "Mensaje de Contacto",
      };
      const tipoTexto = tipoLabel[String(data.tipo)] || "Nueva Solicitud";
      const subject = `Nueva solicitud: ${tipoTexto} — ${data.nombre}`;
      const body = `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 4px;"><strong>Tipo de solicitud:</strong> ${tipoTexto}</p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 4px;"><strong>Nombre:</strong> ${data.nombre}</p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 4px;"><strong>Email:</strong> ${data.email}</p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 4px;"><strong>Teléfono:</strong> ${data.telefono || "—"}</p>
        ${data.asunto ? `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;"><strong>Asunto:</strong> ${data.asunto}</p>` : ""}
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-top:8px;">
          <p style="margin:0 0 6px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Mensaje</p>
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;white-space:pre-wrap;">${data.mensaje}</p>
        </div>`;
      return {
        subject,
        html_body: buildHtml("Nueva Solicitud Recibida", body, logoUrl),
        text_body: buildText(subject, `Tipo: ${tipoTexto}\nNombre: ${data.nombre}\nEmail: ${data.email}\nTeléfono: ${data.telefono || "—"}${data.asunto ? `\nAsunto: ${data.asunto}` : ""}\n\nMensaje:\n${data.mensaje}`),
      };
    }

    case "inquiry_reply": {
      const subject = `Respuesta de Recorramos México — ${data.asunto || "tu solicitud"}`;
      const body = `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Hola <strong>${data.nombre}</strong>,
        </p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Hemos recibido tu solicitud y este es nuestro respuesta:
        </p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:0 0 20px;">
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;white-space:pre-wrap;">${data.reply}</p>
        </div>
        ${data.mensaje_original ? `<div style="background:#fff7ed;border-left:4px solid #E8670A;padding:12px 20px;border-radius:0 8px 8px 0;margin:0 0 20px;">
          <p style="margin:0 0 4px;color:#92400e;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Tu solicitud original</p>
          <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;white-space:pre-wrap;">${data.mensaje_original}</p>
        </div>` : ""}
        <p style="color:#6b7280;font-size:13px;margin:0;">Si tienes más preguntas escribenos a <a href="mailto:contacto@recorramosmexico.com.mx" style="color:#E8670A;">contacto@recorramosmexico.com.mx</a></p>`;
      return {
        subject,
        html_body: buildHtml("Respuesta a tu Solicitud", body, logoUrl),
        text_body: buildText(subject, `Hola ${data.nombre},\n\nHemos recibido tu solicitud y esta es nuestra respuesta:\n\n${data.reply}${data.mensaje_original ? `\n\n---\nTu solicitud original:\n${data.mensaje_original}` : ""}\n\nSi tienes mas preguntas escribenos a contacto@recorramosmexico.com.mx`),
      };
    }

    case "reservation_bank_transfer": {
      const subject = `Reserva por Transferencia — ${data.tour_title}`;
      const total = Number(data.total).toLocaleString("es-MX");
      const depositAmount = data.deposit_amount ? Number(data.deposit_amount).toLocaleString("es-MX") : null;
      const depositPct = data.deposit_percentage ? String(data.deposit_percentage) : null;
      const remainingBalance = data.remaining_balance ? Number(data.remaining_balance).toLocaleString("es-MX") : null;
      const proofUrl = data.payment_proof_url ? String(data.payment_proof_url) : null;
      const body = `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Hola <strong>${data.customer_name}</strong>,
        </p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Hemos recibido tu solicitud de reserva para <strong>${data.tour_title}</strong>. Para confirmar tu lugar, realiza la transferencia del anticipo a la siguiente cuenta bancaria:
        </p>
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:20px;margin:0 0 20px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:1px;">Datos Bancarios</p>
          <p style="margin:0 0 4px;font-size:14px;color:#374151;"><strong>Banco:</strong> Bancomer (BBVA)</p>
          <p style="margin:0 0 4px;font-size:14px;color:#374151;"><strong>Tarjeta:</strong> 4152 3141 0698 0256</p>
          <p style="margin:0 0 4px;font-size:14px;color:#374151;"><strong>CLABE:</strong> 012180004833647476</p>
          <p style="margin:0 0 4px;font-size:14px;color:#374151;"><strong>Titular:</strong> Trinidad Gil Martinez</p>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;">
          <p style="margin:0 0 10px;font-size:16px;font-weight:800;color:#111827;">${data.tour_title}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Fecha de salida:</strong> ${data.departure_date}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Viajeros:</strong> ${data.travelers}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Total del tour:</strong> ${total} MXN</p>
          ${depositAmount ? `<p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#E8670A;"><strong style="color:#374151;">Anticipo a transferir (${depositPct}%):</strong> ${depositAmount} MXN</p>` : ""}
          ${remainingBalance ? `<p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Saldo a pagar en efectivo al abordar:</strong> ${remainingBalance} MXN</p>` : ""}
        </div>
        <div style="background:#fff7ed;border-left:4px solid #E8670A;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 20px;">
          <p style="margin:0 0 4px;color:#c2410c;font-size:14px;font-weight:700;">Importante: tienes maximo 72 horas para realizar la transferencia.</p>
          <p style="margin:0;color:#c2410c;font-size:13px;line-height:1.6;">Una vez realizada la transferencia, envianos el comprobante por WhatsApp al 562 387 2050 o subelo desde tu cuenta.</p>
        </div>
        ${proofUrl ? `<p style="color:#374151;font-size:14px;margin:0 0 20px;">El viajero ya subio su comprobante de pago: <a href="${proofUrl}" style="color:#E8670A;">Ver comprobante</a></p>` : ""}
        <a href="https://recorramosmexico.com.mx/mi-cuenta" style="display:inline-block;padding:14px 32px;background:#E8670A;color:#fff;font-weight:700;text-decoration:none;border-radius:8px;font-size:15px;">Ver Estado de mi Reserva</a>
        <p style="color:#9ca3af;font-size:12px;margin:20px 0 0;">¿Preguntas? Escribenos a <a href="mailto:contacto@recorramosmexico.com.mx" style="color:#E8670A;">contacto@recorramosmexico.com.mx</a></p>`;
      return {
        subject,
        html_body: buildHtml("Reserva por Transferencia Bancaria", body, logoUrl),
        text_body: buildText(
          subject,
          `Hola ${data.customer_name},\n\nHemos recibido tu solicitud de reserva para ${data.tour_title}.\n\nDATOS BANCARIOS:\nBanco: Bancomer (BBVA)\nTarjeta: 4152 3141 0698 0256\nCLABE: 012180004833647476\nTitular: Trinidad Gil Martinez\n\nAnticipo a transferir (${depositPct}%): ${depositAmount} MXN\nTotal: ${total} MXN\n\nIMPORTANTE: Tienes maximo 72 horas para realizar la transferencia. Envianos el comprobante por WhatsApp al 562 387 2050 o subelo desde tu cuenta.\n\nVer estado: https://recorramosmexico.com.mx/mi-cuenta`,
        ),
      };
    }

    case "reservation_payment_reminder": {
      const subject = `Tu reserva vence en ${data.hours_remaining} horas — completa tu pago`;
      const total = Number(data.total).toLocaleString("es-MX");
      const body = `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Hola <strong>${data.customer_name}</strong>,
        </p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Tu reserva para <strong>${data.tour_title}</strong> está pendiente de pago. Tienes <strong>${data.hours_remaining} horas</strong> para completar el pago antes de que sea cancelada automáticamente.
        </p>
        <div style="background:#fff7ed;border-left:4px solid #E8670A;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 20px;">
          <p style="margin:0;color:#c2410c;font-size:14px;font-weight:600;">Completa tu pago antes de que venza tu reserva.</p>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:16px;font-weight:800;color:#111827;">${data.tour_title}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Fecha de salida:</strong> ${data.departure_date}</p>
          <p style="margin:0 0 6px;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Viajeros:</strong> ${data.travelers}</p>
          <p style="margin:0;font-size:14px;color:#6b7280;"><strong style="color:#374151;">Total:</strong> $${total} MXN</p>
        </div>
        <a href="https://recorramosmexico.com.mx/mi-cuenta" style="display:inline-block;padding:14px 32px;background:#E8670A;color:#fff;font-weight:700;text-decoration:none;border-radius:8px;font-size:15px;">Completar Pago Ahora</a>
        <p style="color:#9ca3af;font-size:12px;margin:20px 0 0;">Si ya realizaste tu pago, puedes ignorar este mensaje. ¿Preguntas? Escríbenos a <a href="mailto:contacto@recorramosmexico.com.mx" style="color:#E8670A;">contacto@recorramosmexico.com.mx</a></p>`;
      return {
        subject,
        html_body: buildHtml("Recordatorio de Pago", body, logoUrl),
        text_body: buildText(
          subject,
          `Hola ${data.customer_name},\n\nTu reserva para ${data.tour_title} vence en ${data.hours_remaining} horas.\n\nTour: ${data.tour_title}\nFecha: ${data.departure_date}\nViajeros: ${data.travelers}\nTotal: $${total} MXN\n\nCompleta tu pago en: https://recorramosmexico.com.mx/mi-cuenta`,
        ),
      };
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: settingsRows } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["smtp2go_api_key", "from_email", "from_name", "admin_email", "logo_url"]);

    const settings: Record<string, string> = {};
    for (const row of settingsRows ?? []) {
      settings[row.key] = row.value;
    }

    const apiKey = settings["smtp2go_api_key"];
    const fromEmail = settings["from_email"] || "contacto@recorramosmexico.com.mx";
    const fromName = settings["from_name"] || "Recorramos México";
    const logoUrl = settings["logo_url"] || "";

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "SMTP2GO API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const template = getTemplate(payload.type, payload.data, logoUrl);

    const smtpRes = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Smtp2go-Api-Key": apiKey,
      },
      body: JSON.stringify({
        sender: `${fromName} <${fromEmail}>`,
        to: [payload.to],
        subject: template.subject,
        html_body: template.html_body,
        text_body: template.text_body,
      }),
    });

    const result = await smtpRes.json();

    if (!smtpRes.ok || result.data?.failures?.length > 0) {
      console.error("SMTP2GO error:", JSON.stringify(result));
      return new Response(JSON.stringify({ error: "Email delivery failed", detail: result }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
