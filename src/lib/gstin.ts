import { stateNameForCode } from "@/lib/gst-states";

/**
 * A GSTIN encodes more than it looks: 09 ABCDE1234F 1 Z 5
 *   09          state code
 *   ABCDE1234F  the holder's PAN
 *   1           entity number for that PAN in the state
 *   Z           fixed
 *   5           check digit
 *
 * So state and PAN can be filled in the moment it is typed, and a typo can be
 * caught outright, without calling any service.
 */

const CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

/** The official mod-36 check digit for the first 14 characters. */
export function gstinCheckDigit(first14: string): string | null {
  if (first14.length < 14) return null;

  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = CHARSET.indexOf(first14[i]);
    if (value < 0) return null;
    // Alternating weights of 1 and 2, with the carry folded back in.
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }

  return CHARSET[(36 - (sum % 36)) % 36];
}

export interface ParsedGstin {
  gstin: string;
  /** Shape is right: 15 chars in the expected pattern. */
  wellFormed: boolean;
  /** Shape is right *and* the check digit agrees — this is a real GSTIN. */
  valid: boolean;
  stateCode: string | null;
  stateName: string | null;
  pan: string | null;
  /** What the check digit should have been, when it is wrong. */
  expectedCheckDigit: string | null;
}

export function parseGstin(input: string | null | undefined): ParsedGstin {
  const gstin = (input ?? "").toUpperCase().replace(/\s/g, "");
  const wellFormed = GSTIN_PATTERN.test(gstin);

  if (!wellFormed) {
    return {
      gstin,
      wellFormed: false,
      valid: false,
      stateCode: null,
      stateName: null,
      pan: null,
      expectedCheckDigit: null,
    };
  }

  const stateCode = gstin.slice(0, 2);
  const expected = gstinCheckDigit(gstin.slice(0, 14));
  const valid = !!expected && expected === gstin[14] && !!stateNameForCode(stateCode);

  return {
    gstin,
    wellFormed: true,
    valid,
    stateCode,
    stateName: stateNameForCode(stateCode),
    pan: gstin.slice(2, 12),
    expectedCheckDigit: expected,
  };
}

export function isValidGstin(input: string | null | undefined): boolean {
  return parseGstin(input).valid;
}

/** One line for the UI: what we could work out, or why it is wrong. */
export function describeGstin(parsed: ParsedGstin): string | null {
  if (!parsed.gstin) return null;
  if (!parsed.wellFormed) {
    return parsed.gstin.length === 15
      ? "That does not look like a GSTIN."
      : `GSTIN is 15 characters — ${parsed.gstin.length} entered.`;
  }
  if (!parsed.stateName) return `Unknown state code "${parsed.stateCode}".`;
  if (!parsed.valid) return "Check digit does not match — please re-check the GSTIN.";
  return `${parsed.stateName} (${parsed.stateCode}) · PAN ${parsed.pan}`;
}
