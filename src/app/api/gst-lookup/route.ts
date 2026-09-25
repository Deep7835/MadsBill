import { createClient } from "@/lib/supabase/server";
import { isValidGstin, parseGstin } from "@/lib/gstin";
import { GstLookupError, lookupGstin } from "@/lib/server/gst-lookup";

/**
 * POST /api/gst-lookup  { gstin }
 *
 * Sits between the browser and the paid GST provider so the API key stays on
 * the server. Every lookup costs money, so the request must come from a
 * signed-in user and the GSTIN is checked locally first — a typo is rejected
 * here rather than spending a credit to be told the same thing.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Sign in to look up a GSTIN." }, { status: 401 });
  }

  let gstin = "";
  try {
    const body = (await request.json()) as { gstin?: unknown };
    gstin = typeof body.gstin === "string" ? body.gstin.toUpperCase().trim() : "";
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  if (!isValidGstin(gstin)) {
    const parsed = parseGstin(gstin);
    return Response.json(
      {
        error: parsed.wellFormed
          ? "That GSTIN's check digit is wrong — re-check it."
          : "Enter a complete 15-character GSTIN.",
      },
      { status: 400 },
    );
  }

  try {
    return Response.json({ taxpayer: await lookupGstin(gstin) });
  } catch (err) {
    if (err instanceof GstLookupError) {
      // 404 for "no such taxpayer", 501 for "nobody configured a key", 502 otherwise.
      const status = err.kind === "not_found" ? 404 : err.kind === "not_configured" ? 501 : 502;
      return Response.json({ error: err.message }, { status });
    }
    return Response.json({ error: "Could not reach the GST provider." }, { status: 502 });
  }
}
