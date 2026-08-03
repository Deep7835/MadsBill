"use client";

import { createClient } from "@/lib/supabase/client";

/** Bucket created by supabase/migrations/20260803010000_branding_storage.sql. */
export const BRANDING_BUCKET = "branding";

/** Which branding slot an upload belongs to — also the folder inside the bucket. */
export type BrandingAsset = "logo" | "stamp" | "signature";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(",");

/** Human-readable reason the file is unusable, or null when it is fine. */
export function validateImage(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Use a PNG, JPG, WEBP or SVG image.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Image must be under ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`;
  }
  return null;
}

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
}

/**
 * Uploads to `branding/<asset>/<timestamp>.<ext>` and returns the public URL.
 *
 * Each upload gets a fresh name rather than overwriting a fixed key, so a
 * replaced stamp is never served from a stale CDN cache. The previous object
 * is removed by the caller once the new URL is saved.
 */
export async function uploadBrandingAsset(asset: BrandingAsset, file: File): Promise<string> {
  const invalid = validateImage(file);
  if (invalid) throw new Error(invalid);

  const supabase = createClient();
  const path = `${asset}/${Date.now()}.${extensionFor(file)}`;

  const { error } = await supabase.storage.from(BRANDING_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Object path inside the bucket for a URL we previously handed out, else null. */
function pathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BRANDING_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
}

/**
 * Best-effort cleanup of a replaced asset. A failure here is not worth
 * surfacing — the new URL is already saved and the orphan is harmless.
 */
export async function removeBrandingAsset(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const path = pathFromPublicUrl(url);
  if (!path) return;
  try {
    await createClient().storage.from(BRANDING_BUCKET).remove([path]);
  } catch {
    // Ignore — orphaned objects do not affect the app.
  }
}
