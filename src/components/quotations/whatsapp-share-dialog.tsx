"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { downloadQuotationPdf } from "@/lib/pdf/quotation-pdf";
import { buildWhatsappMessage, normalizeMobile } from "@/lib/whatsapp";
import type { QuotationFull, Settings } from "@/lib/types/database";

interface WhatsappShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: QuotationFull;
  settings: Settings | null;
}

export function WhatsappShareDialog({
  open,
  onOpenChange,
  quotation,
  settings,
}: WhatsappShareDialogProps) {
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);

  // The share link points back at this document in the app; WhatsApp cannot
  // attach a file from a wa.me link, so the PDF is downloaded separately.
  const documentUrl = typeof window !== "undefined" ? window.location.href : undefined;

  const defaultMessage = useMemo(
    () => buildWhatsappMessage({ quotation, settings, documentUrl }),
    [quotation, settings, documentUrl],
  );

  useEffect(() => {
    if (open) setMessage(defaultMessage);
  }, [open, defaultMessage]);

  const mobile = normalizeMobile(quotation.customer?.mobile);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadQuotationPdf({ quotation, settings });
      toast.success("PDF downloaded — attach it in WhatsApp");
    } catch (err) {
      toast.error("Could not generate the PDF", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDownloading(false);
    }
  }

  function handleOpenWhatsapp() {
    const text = encodeURIComponent(message);
    const url = mobile ? `https://wa.me/${mobile}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share on WhatsApp</DialogTitle>
          <DialogDescription>
            {mobile
              ? `Opens a chat with ${quotation.customer?.business_name ?? "the customer"} (+${mobile}).`
              : "This customer has no mobile number saved — WhatsApp will ask you to pick a chat."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="wa-message">Message</Label>
          <Textarea
            id="wa-message"
            rows={9}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Download the PDF first, then attach it in the WhatsApp chat.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleDownload} loading={downloading}>
            <Download />
            Download PDF
          </Button>
          <Button type="button" onClick={handleOpenWhatsapp}>
            <MessageCircle />
            Open WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
