"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { HugeiconsIcon } from "@hugeicons/react";
import { QrCodeIcon } from "@hugeicons/core-free-icons";

interface QrCodeProps {
  upiId?: string | null;
  payeeName?: string | null;
  amount?: number;
  note?: string;
  size?: number;
  className?: string;
}

export function buildUpiUrl(upiId: string, payeeName?: string | null, amount?: number, note?: string): string {
  const params = new URLSearchParams();
  params.set("pa", upiId.trim());
  if (payeeName) params.set("pn", payeeName.trim());
  if (amount && amount > 0) params.set("am", amount.toFixed(2));
  params.set("cu", "INR");
  if (note) params.set("tn", note.trim());
  return `upi://pay?${params.toString()}`;
}

export function UpiQrCode({ upiId, payeeName, amount, note, size = 140, className }: QrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!upiId) {
      setDataUrl(null);
      return;
    }

    const upiPayload = buildUpiUrl(upiId, payeeName, amount, note);

    QRCode.toDataURL(upiPayload, {
      width: size,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => {
        console.error("Failed to generate UPI QR Code", err);
        setDataUrl(null);
      });
  }, [upiId, payeeName, amount, note, size]);

  if (!upiId) return null;

  if (!dataUrl) {
    return (
      <div className={`flex h-[${size}px] w-[${size}px] items-center justify-center rounded-lg border bg-muted text-muted-foreground ${className}`}>
        <HugeiconsIcon icon={QrCodeIcon} className="h-6 w-6 animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center gap-1 rounded-lg border bg-white p-2 text-center shadow-xs dark:bg-slate-900 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="UPI Payment QR Code" width={size} height={size} className="rounded" />
      <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
        Scan to Pay via UPI
      </div>
      <div className="text-[9px] text-muted-foreground font-mono">{upiId}</div>
    </div>
  );
}
