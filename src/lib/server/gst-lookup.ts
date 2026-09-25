import { resolveStateCode, stateNameForCode } from "@/lib/gst-states";

/**
 * GSTIN lookup against a third-party GST API.
 *
 * Server-only: the provider key is a paid credential and must never reach the
 * browser, so nothing here may be imported from a client component. The route
 * handler at /api/gst-lookup is the only caller.
 */

export interface GstTaxpayer {
  gstin: string;
  legalName: string | null;
  tradeName: string | null;
  /** "Active", "Cancelled", … — worth showing before billing someone. */
  status: string | null;
  address: string | null;
  city: string | null;
  /** Canonical state name, so it matches what the CGST/SGST split expects. */
  state: string | null;
  pincode: string | null;
}

export class GstLookupError extends Error {
  constructor(
    message: string,
    /** Surfaced to the client so the UI can tell "typo" from "outage". */
    readonly kind: "not_configured" | "not_found" | "provider" = "provider",
  ) {
    super(message);
    this.name = "GstLookupError";
  }
}

const trim = (value: unknown): string | null => {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : null;
};

/** Providers report the state as a name; normalise it to our canonical one. */
function canonicalState(value: unknown): string | null {
  const raw = trim(value);
  if (!raw) return null;
  return stateNameForCode(resolveStateCode(raw)) ?? raw;
}

function joinAddress(parts: (string | null)[]): string | null {
  const joined = parts.filter(Boolean).join(", ").replace(/\s+/g, " ").trim();
  return joined ? joined : null;
}

/* ------------------------------------------------------------------ appyflow */

interface AppyflowAddress {
  bno?: string; bnm?: string; flno?: string; st?: string;
  loc?: string; city?: string; dst?: string; stcd?: string; pncd?: string;
}

async function lookupAppyflow(gstin: string, key: string): Promise<GstTaxpayer> {
  const url = `https://appyflow.in/api/verifyGST?gstNo=${encodeURIComponent(gstin)}&key_secret=${encodeURIComponent(key)}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new GstLookupError(`GST provider returned ${response.status}`);
  }

  const body = (await response.json()) as {
    error?: boolean | string;
    message?: string;
    taxpayerInfo?: {
      lgnm?: string; tradeNam?: string; sts?: string;
      pradr?: { addr?: AppyflowAddress; adr?: string };
    };
  };

  if (body.error || !body.taxpayerInfo) {
    throw new GstLookupError(body.message || "No taxpayer found for that GSTIN", "not_found");
  }

  const info = body.taxpayerInfo;
  const addr = info.pradr?.addr ?? {};

  return {
    gstin,
    legalName: trim(info.lgnm),
    tradeName: trim(info.tradeNam),
    status: trim(info.sts),
    address:
      joinAddress([trim(addr.flno), trim(addr.bno), trim(addr.bnm), trim(addr.st), trim(addr.loc)]) ??
      trim(info.pradr?.adr),
    city: trim(addr.city) ?? trim(addr.dst),
    state: canonicalState(addr.stcd),
    pincode: trim(addr.pncd),
  };
}

/* -------------------------------------------------------------- knowyourgst */

async function lookupKnowYourGst(gstin: string, key: string): Promise<GstTaxpayer> {
  const response = await fetch(
    `https://www.knowyourgst.com/developers/gstincall/?gstin=${encodeURIComponent(gstin)}`,
    { headers: { passthrough: key }, cache: "no-store" },
  );

  if (!response.ok) {
    throw new GstLookupError(`GST provider returned ${response.status}`);
  }

  const body = (await response.json()) as {
    error?: string;
    message?: string;
    data?: {
      legal_name?: string; trade_name?: string; status?: string;
      adress?: { full_adress?: string; city?: string; state?: string; pincode?: string };
    };
  };

  if (body.error || !body.data) {
    throw new GstLookupError(body.message || "No taxpayer found for that GSTIN", "not_found");
  }

  const data = body.data;
  return {
    gstin,
    legalName: trim(data.legal_name),
    tradeName: trim(data.trade_name),
    status: trim(data.status),
    address: trim(data.adress?.full_adress),
    city: trim(data.adress?.city),
    state: canonicalState(data.adress?.state),
    pincode: trim(data.adress?.pincode),
  };
}

/* ------------------------------------------------------------------ dispatch */

export function isGstLookupConfigured(): boolean {
  return !!process.env.GST_API_KEY;
}

export async function lookupGstin(gstin: string): Promise<GstTaxpayer> {
  const key = process.env.GST_API_KEY;
  if (!key) {
    throw new GstLookupError(
      "GST lookup is not configured. Set GST_API_KEY to enable it.",
      "not_configured",
    );
  }

  const provider = (process.env.GST_API_PROVIDER ?? "appyflow").toLowerCase();
  switch (provider) {
    case "appyflow":
      return lookupAppyflow(gstin, key);
    case "knowyourgst":
      return lookupKnowYourGst(gstin, key);
    default:
      throw new GstLookupError(`Unknown GST_API_PROVIDER "${provider}"`, "not_configured");
  }
}
