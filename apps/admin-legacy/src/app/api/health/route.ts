export async function GET() {
  return Response.json({ status: "ok", service: "hatod-admin", version: "0.1.0" });
}
