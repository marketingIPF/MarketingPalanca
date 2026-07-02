/**
 * POST /api/slack
 *
 * Fetches every recording event scheduled for TOMORROW (Europe/Madrid),
 * resolves agent details, and sends a Block Kit message to Slack via
 * incoming webhook. Only superusers may trigger it.
 *
 * Env vars:
 *  - SLACK_WEBHOOK_URL
 *  - FIREBASE_SERVICE_ACCOUNT (see lib/firebase-admin.ts)
 */

import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ = "Europe/Madrid";

const EVENT_TYPE_LABELS: Record<string, string> = {
  listing_acquisition: "Captación",
  client_visit: "Visita",
  office_shoot: "Grabación en oficina",
  event: "Evento",
};

/** Returns [start, end) of tomorrow in Europe/Madrid as JS Dates (UTC). */
function getTomorrowRange(): { start: Date; end: Date; label: string } {
  const now = new Date();
  // Current date parts in Madrid time
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(now).split("-").map(Number);

  // Madrid midnight expressed in UTC: build a UTC date then correct offset.
  const localMidnightUtcGuess = Date.UTC(y, m - 1, d);
  const offsetMs =
    localMidnightUtcGuess -
    new Date(
      new Date(localMidnightUtcGuess).toLocaleString("en-US", { timeZone: TZ })
    ).getTime();

  const todayStart = new Date(localMidnightUtcGuess + offsetMs);
  const start = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const end = new Date(todayStart.getTime() + 48 * 60 * 60 * 1000);

  const label = new Intl.DateTimeFormat("es-ES", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(start);

  return { start, end, label };
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function requireSuperuser(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw new Error("UNAUTHENTICATED");

  const decoded = await getAdminAuth().verifyIdToken(token);
  const userSnap = await getAdminDb().collection("users").doc(decoded.uid).get();

  if (!userSnap.exists || userSnap.data()?.role !== "superuser") {
    throw new Error("FORBIDDEN");
  }
  return decoded.uid;
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperuser(req);

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { ok: false, error: "SLACK_WEBHOOK_URL no está configurada" },
        { status: 500 }
      );
    }

    const { start, end, label } = getTomorrowRange();

    const snapshot = await getAdminDb()
      .collection("recording_schedule")
      .where("startAt", ">=", Timestamp.fromDate(start))
      .where("startAt", "<", Timestamp.fromDate(end))
      .orderBy("startAt", "asc")
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        ok: true,
        sent: false,
        message: "No hay grabaciones programadas para mañana.",
      });
    }

    // Build one section per recording event
    const eventBlocks = snapshot.docs.flatMap((doc) => {
      const data = doc.data();
      const startAt: Date = data.startAt.toDate();
      const typeLabel = EVENT_TYPE_LABELS[data.type] ?? "Grabación";
      const contents: string[] =
        Array.isArray(data.contentTitles) && data.contentTitles.length > 0
          ? data.contentTitles
          : ["Contenido por confirmar"];

      return [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              `*Mañana ${data.agentName}*, Pedro te acompañará a tu ` +
              `*${typeLabel}* a las *${formatTime(startAt)}* ` +
              `para grabar los siguientes contenidos:\n` +
              contents.map((c) => `• ${c}`).join("\n") +
              (data.location ? `\n📍 ${data.location}` : ""),
          },
        },
        { type: "divider" },
      ];
    });

    const payload = {
      text: `Agenda de grabación para mañana (${label})`, // fallback notification text
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `🎬 Agenda de grabación · ${label}`,
            emoji: true,
          },
        },
        { type: "divider" },
        ...eventBlocks,
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "Enviado desde el panel de marketing de RK Palanca Fontestad",
            },
          ],
        },
      ],
    };

    const slackRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!slackRes.ok) {
      const detail = await slackRes.text();
      console.error("Slack webhook error:", slackRes.status, detail);
      return NextResponse.json(
        { ok: false, error: "Slack rechazó el mensaje" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      sent: true,
      events: snapshot.size,
      message: `Agenda enviada: ${snapshot.size} grabación(es) para mañana.`,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { ok: false, error: "No autenticado" },
        { status: 401 }
      );
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json(
        { ok: false, error: "Solo los superusuarios pueden enviar la agenda" },
        { status: 403 }
      );
    }
    console.error("Slack route error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno al enviar la agenda" },
      { status: 500 }
    );
  }
}
