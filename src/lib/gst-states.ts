/**
 * GST state codes. The first two digits of a GSTIN are the state, and that is
 * what decides CGST+SGST (same state) versus IGST (different state).
 *
 * Customers without a GSTIN only have a typed state, and people write "UP",
 * "U.P." or "Uttar Pradesh" interchangeably — so names are resolved to a code
 * before anything is compared.
 */

export interface GstState {
  code: string;
  name: string;
  /** Extra spellings seen in the wild, beyond the name itself. */
  aliases?: string[];
}

export const GST_STATES: GstState[] = [
  { code: "01", name: "Jammu and Kashmir", aliases: ["jk", "j&k", "jammu kashmir"] },
  { code: "02", name: "Himachal Pradesh", aliases: ["hp"] },
  { code: "03", name: "Punjab", aliases: ["pb"] },
  { code: "04", name: "Chandigarh", aliases: ["ch"] },
  { code: "05", name: "Uttarakhand", aliases: ["uk", "ua", "uttaranchal"] },
  { code: "06", name: "Haryana", aliases: ["hr"] },
  { code: "07", name: "Delhi", aliases: ["dl", "new delhi", "nct of delhi"] },
  { code: "08", name: "Rajasthan", aliases: ["rj"] },
  { code: "09", name: "Uttar Pradesh", aliases: ["up"] },
  { code: "10", name: "Bihar", aliases: ["br"] },
  { code: "11", name: "Sikkim", aliases: ["sk"] },
  { code: "12", name: "Arunachal Pradesh", aliases: ["ar"] },
  { code: "13", name: "Nagaland", aliases: ["nl"] },
  { code: "14", name: "Manipur", aliases: ["mn"] },
  { code: "15", name: "Mizoram", aliases: ["mz"] },
  { code: "16", name: "Tripura", aliases: ["tr"] },
  { code: "17", name: "Meghalaya", aliases: ["ml"] },
  { code: "18", name: "Assam", aliases: ["as"] },
  { code: "19", name: "West Bengal", aliases: ["wb"] },
  { code: "20", name: "Jharkhand", aliases: ["jh"] },
  { code: "21", name: "Odisha", aliases: ["or", "od", "orissa"] },
  { code: "22", name: "Chhattisgarh", aliases: ["cg", "chattisgarh"] },
  { code: "23", name: "Madhya Pradesh", aliases: ["mp"] },
  { code: "24", name: "Gujarat", aliases: ["gj"] },
  {
    code: "26",
    name: "Dadra and Nagar Haveli and Daman and Diu",
    aliases: ["dn", "dd", "daman and diu", "dadra and nagar haveli"],
  },
  { code: "27", name: "Maharashtra", aliases: ["mh"] },
  { code: "29", name: "Karnataka", aliases: ["ka"] },
  { code: "30", name: "Goa", aliases: ["ga"] },
  { code: "31", name: "Lakshadweep", aliases: ["ld"] },
  { code: "32", name: "Kerala", aliases: ["kl"] },
  { code: "33", name: "Tamil Nadu", aliases: ["tn", "tamilnadu"] },
  { code: "34", name: "Puducherry", aliases: ["py", "pondicherry"] },
  { code: "35", name: "Andaman and Nicobar Islands", aliases: ["an", "andaman nicobar"] },
  { code: "36", name: "Telangana", aliases: ["ts", "tg"] },
  { code: "37", name: "Andhra Pradesh", aliases: ["ap"] },
  { code: "38", name: "Ladakh", aliases: ["la"] },
  { code: "97", name: "Other Territory" },
];

/** "uttar   pradesh." → "uttar pradesh" */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.\-_]/g, "")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

const BY_KEY = new Map<string, string>();
for (const state of GST_STATES) {
  BY_KEY.set(normalise(state.name), state.code);
  for (const alias of state.aliases ?? []) BY_KEY.set(normalise(alias), state.code);
}

const NAME_BY_CODE = new Map(GST_STATES.map((s) => [s.code, s.name]));

/** The state code baked into a GSTIN — the authoritative answer when present. */
export function stateCodeFromGstin(gstin: string | null | undefined): string | null {
  const value = (gstin ?? "").trim();
  return /^\d{2}/.test(value) ? value.slice(0, 2) : null;
}

/** Resolves a typed state ("UP", "U.P.", "Uttar Pradesh", "09") to its code. */
export function resolveStateCode(input: string | null | undefined): string | null {
  const value = (input ?? "").trim();
  if (!value) return null;
  if (/^\d{2}$/.test(value)) return NAME_BY_CODE.has(value) ? value : null;
  return BY_KEY.get(normalise(value)) ?? null;
}

export function stateNameForCode(code: string | null | undefined): string | null {
  return code ? (NAME_BY_CODE.get(code) ?? null) : null;
}

/** GSTIN first, then the typed state name. */
export function resolveSideStateCode(
  gstin: string | null | undefined,
  state: string | null | undefined,
): string | null {
  return stateCodeFromGstin(gstin) ?? resolveStateCode(state);
}

/** "Uttar Pradesh (09)" — how place of supply is written on a GST invoice. */
export function formatPlaceOfSupply(code: string | null, fallback?: string | null): string {
  const name = stateNameForCode(code);
  if (name && code) return `${name} (${code})`;
  return fallback?.trim() || "—";
}
