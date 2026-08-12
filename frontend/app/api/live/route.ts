import { aktuellerBenutzer } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export async function GET() {
  const user = await aktuellerBenutzer();
  if (!user) return new Response("Anmeldung erforderlich", { status: 401 });
  const encoder = new TextEncoder(); let timer: ReturnType<typeof setInterval>;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`event: bereit\ndata: ${Date.now()}\n\n`));
      timer = setInterval(() => controller.enqueue(encoder.encode(`event: sync\ndata: ${Date.now()}\n\n`)), 15000);
    },
    cancel() { clearInterval(timer); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
}
