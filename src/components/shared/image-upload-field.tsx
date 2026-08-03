"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon, Delete02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ACCEPT_ATTRIBUTE,
  removeBrandingAsset,
  uploadBrandingAsset,
  validateImage,
  type BrandingAsset,
} from "@/lib/storage";

interface ImageUploadFieldProps {
  label: string;
  asset: BrandingAsset;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  hint?: string;
  error?: string;
  /** Preview aspect — signatures are wide, stamps are square. */
  aspect?: "square" | "wide";
  className?: string;
}

/**
 * Drop-or-browse upload backed by the public `branding` Supabase bucket.
 * The form only ever stores the resulting public URL, so the PDF layer needs
 * no knowledge of storage.
 */
export function ImageUploadField({
  label,
  asset,
  value,
  onChange,
  hint,
  error,
  aspect = "square",
  className,
}: ImageUploadFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const inputId = `upload-${asset}`;

  async function handleFile(file: File | undefined) {
    if (!file) return;

    const invalid = validateImage(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }

    setBusy(true);
    const previous = value;
    try {
      const url = await uploadBrandingAsset(asset, file);
      onChange(url);
      void removeBrandingAsset(previous);
      toast.success(`${label} uploaded`);
    } catch (err) {
      toast.error(`Could not upload ${label.toLowerCase()}`, {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    const previous = value;
    onChange(null);
    void removeBrandingAsset(previous);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={inputId}>{label}</Label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex flex-col gap-3 rounded-[5px] border border-dashed p-3 transition-colors sm:flex-row sm:items-center",
          dragging ? "border-primary bg-primary/5" : "border-border/80 bg-muted/30",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-border/70 bg-card",
            aspect === "wide" ? "h-20 w-full sm:w-40" : "size-20",
          )}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={`${label} preview`} className="max-h-full max-w-full object-contain p-1.5" />
          ) : (
            <HugeiconsIcon icon={CloudUploadIcon} className="size-6 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {error ? (
            <p className="text-xs font-medium text-destructive">{error}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {hint ?? "PNG with a transparent background works best."}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-xs font-semibold transition-colors hover:border-primary/40 hover:bg-accent disabled:opacity-60"
            >
              <HugeiconsIcon
                icon={busy ? Loading03Icon : CloudUploadIcon}
                className={cn("size-4", busy && "animate-spin")}
              />
              {busy ? "Uploading…" : value ? "Replace" : "Upload image"}
            </button>

            {value && !busy ? (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                Remove
              </button>
            ) : null}
          </div>
        </div>

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
