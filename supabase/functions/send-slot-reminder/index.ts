// Supabase Edge Function: send-slot-reminder
// Sends a reminder email to the scholar with slot details.
// Configure env var RESEND_API_KEY in your Supabase project.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("REMINDER_FROM_EMAIL") || "no-reply@example.com";

type Payload = {
  to: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
};

async function sendEmail(payload: Payload) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const { to, slotDate, startTime, endTime, purpose } = payload;

  const subject = `Reminder: Booked slot on ${slotDate}`;
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h3>Meeting Slot Reminder</h3>
      <p>You booked a meeting slot on VTOP. Please ensure you register it on VTOP.</p>
      <ul>
        <li><strong>Date:</strong> ${slotDate}</li>
        <li><strong>Time:</strong> ${startTime} - ${endTime}</li>
        <li><strong>Purpose:</strong> ${purpose || "Not specified"}</li>
      </ul>
      <p>If needed, create or use your Google account to complete the registration.</p>
    </div>
  `;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend error: ${text}`);
  }
}

serve(async (req) => {
  try {
    const payload = (await req.json()) as Payload;

    if (!payload?.to || !payload?.slotDate || !payload?.startTime || !payload?.endTime) {
      return new Response("Missing required fields", { status: 400 });
    }

    await sendEmail(payload);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("send-slot-reminder error", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Unknown error" }),
      { headers: { "Content-Type": "application/json" }, status: 500 },
    );
  }
});

