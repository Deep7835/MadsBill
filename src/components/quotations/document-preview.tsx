import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { UpiQrCode } from "@/components/shared/qr-code";
import { amountInWords, formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { QuotationFull, Settings } from "@/lib/types/database";

/** On-screen mirror of the document so the user can check before sending. */
export function DocumentPreview({
  quotation,
  settings,
}: {
  quotation: QuotationFull;
  settings: Settings | null;
}) {
  const hsn = settings?.default_hsn?.trim() || "—";
  const isInvoice = quotation.status === "invoice";
  const customer = quotation.customer;

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-8 shadow-xs">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4 items-start">
          {settings?.logo_url ? (
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
            </div>
          ) : null}
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{settings?.company_name ?? "Madskraft Flex & Advertising"}</h2>
            <div className="text-xs leading-relaxed text-muted-foreground">
              {settings?.address ? <p>{settings.address}</p> : null}
              {settings?.city || settings?.state ? (
                <p>{[settings?.city, settings?.state].filter(Boolean).join(", ")}</p>
              ) : null}
              {settings?.phone || settings?.email ? (
                <p>{[settings?.phone, settings?.email].filter(Boolean).join(" • ")}</p>
              ) : null}
              {settings?.gst_number ? <p>GSTIN: {settings.gst_number}</p> : null}
            </div>
          </div>
        </div>

        <div className="sm:text-right">
          <p className="text-xl font-semibold uppercase tracking-wide text-primary">
            {isInvoice ? "Tax Invoice" : "Quotation"}
          </p>
          <dl className="mt-2 space-y-0.5 text-xs">
            <div className="flex gap-2 sm:justify-end">
              <dt className="text-muted-foreground">{isInvoice ? "Invoice No." : "Quote No."}</dt>
              <dd className="font-medium">{quotation.quote_number}</dd>
            </div>
            <div className="flex gap-2 sm:justify-end">
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium">{formatDate(quotation.date)}</dd>
            </div>
            {!isInvoice && quotation.valid_until ? (
              <div className="flex gap-2 sm:justify-end">
                <dt className="text-muted-foreground">Valid until</dt>
                <dd className="font-medium">{formatDate(quotation.valid_until)}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </header>

      <Separator />

      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {isInvoice ? "Bill to" : "Quotation for"}
        </p>
        <p className="mt-1.5 font-medium">{customer?.business_name ?? "—"}</p>
        <div className="text-xs leading-relaxed text-muted-foreground">
          {customer?.contact_person ? <p>Attn: {customer.contact_person}</p> : null}
          {customer?.address ? <p>{customer.address}</p> : null}
          {customer?.city || customer?.state ? (
            <p>{[customer?.city, customer?.state].filter(Boolean).join(", ")}</p>
          ) : null}
          {customer?.mobile ? <p>Mobile: {customer.mobile}</p> : null}
          {customer?.gst_number ? <p>GSTIN: {customer.gst_number}</p> : null}
        </div>
      </section>

      {/* Line items — stacked cards on phones, ruled table from md up. */}
      <ul className="space-y-3 md:hidden">
        {quotation.items.map((item, index) => (
          <li key={item.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-medium">
                <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>
                {item.description}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatCurrency(item.amount)}
              </span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <Field label="HSN/SAC">{hsn}</Field>
              {item.rate_type === "sqft" ? (
                <>
                  <Field label="Size">
                    {formatNumber(Number(item.width ?? 0))} × {formatNumber(Number(item.height ?? 0))} ft
                  </Field>
                  <Field label="Area">{formatNumber(Number(item.area ?? 0))} sq.ft.</Field>
                </>
              ) : null}
              <Field label="Qty">{formatNumber(Number(item.qty))}</Field>
              <Field label="Rate">{formatCurrency(item.rate)}</Field>
              <Field label="GST">{formatNumber(Number(item.gst_percent), 0)}%</Field>
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-lg border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead className="w-10">#</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">HSN/SAC</TableHead>
              <TableHead className="hidden text-center sm:table-cell">Size</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Area</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="hidden text-center md:table-cell">GST</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotation.items.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium">{item.description}</TableCell>
                <TableCell className="text-center text-muted-foreground">{hsn}</TableCell>
                <TableCell className="hidden whitespace-nowrap text-center text-muted-foreground sm:table-cell">
                  {item.rate_type === "sqft"
                    ? `${formatNumber(Number(item.width ?? 0))} × ${formatNumber(Number(item.height ?? 0))} ft`
                    : "—"}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">
                  {item.rate_type === "sqft" ? formatNumber(Number(item.area ?? 0)) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(Number(item.qty))}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatCurrency(item.rate)}
                </TableCell>
                <TableCell className="hidden text-center text-muted-foreground md:table-cell">
                  {formatNumber(Number(item.gst_percent), 0)}%
                </TableCell>
                <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">
                  {formatCurrency(item.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:justify-between items-start">
        <div className="space-y-3">
          <p className="max-w-sm text-xs italic text-muted-foreground">
            Amount in words: {amountInWords(Number(quotation.grand_total))}
          </p>

          {/* UPI Payment QR Code view */}
          {settings?.upi_id && isInvoice ? (
            <div className="pt-2">
              <UpiQrCode
                upiId={settings.upi_id}
                payeeName={settings.upi_name || settings.company_name}
                amount={quotation.grand_total}
                note={`Inv ${quotation.quote_number}`}
                size={120}
              />
            </div>
          ) : null}
        </div>

        {(() => {
          const totalPaid = quotation.payments?.length
            ? quotation.payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0)
            : quotation.payment_status === "paid"
              ? Number(quotation.grand_total)
              : 0;
          const balanceDue = Math.max(0, Number(quotation.grand_total) - totalPaid);
          const showPaymentDetails = isInvoice && (totalPaid > 0 || quotation.payment_status !== "unpaid");

          return (
            <dl className="w-full max-w-xs space-y-1.5 text-sm sm:ml-auto">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatCurrency(quotation.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">GST</dt>
                <dd className="tabular-nums">{formatCurrency(quotation.gst_amount)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-1 font-medium">
                <dt className="text-muted-foreground">Grand total</dt>
                <dd className="text-base font-semibold tabular-nums">
                  {formatCurrency(quotation.grand_total)}
                </dd>
              </div>

              {showPaymentDetails ? (
                <>
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <dt>Amount Paid</dt>
                    <dd className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totalPaid)}
                    </dd>
                  </div>
                  <div
                    className={`flex items-baseline justify-between rounded-lg px-3 py-2 ${
                      balanceDue === 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    <dt className="font-semibold text-xs uppercase tracking-wide">Balance Due</dt>
                    <dd className="text-lg font-bold tabular-nums">
                      {formatCurrency(balanceDue)}
                    </dd>
                  </div>
                </>
              ) : (
                <div className="flex items-baseline justify-between rounded-lg bg-primary px-3 py-2 text-primary-foreground">
                  <dt className="font-medium">Grand total</dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {formatCurrency(quotation.grand_total)}
                  </dd>
                </div>
              )}
            </dl>
          );
        })()}
      </div>

      {quotation.notes || settings?.bank_details || settings?.terms ? (
        <div className="grid gap-5 border-t border-border pt-5 text-xs sm:grid-cols-2">
          {quotation.notes ? (
            <Block title="Notes" body={quotation.notes} className="sm:col-span-2" />
          ) : null}
          {settings?.bank_details ? <Block title="Bank details" body={settings.bank_details} /> : null}
          {settings?.terms ? <Block title="Terms & conditions" body={settings.terms} /> : null}
        </div>
      ) : null}

      {/* Digital Stamp & Authorized Signature Display */}
      <div className="flex justify-between items-end pt-6 border-t border-border/80">
        <div>
          {settings?.stamp_url ? (
            <div className="relative flex h-20 w-20 items-center justify-center p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings.stamp_url} alt="Company Stamp" className="max-h-full max-w-full object-contain" />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-1">
          {settings?.signature_url ? (
            <div className="relative flex h-16 w-36 items-center justify-center p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings.signature_url} alt="Authorized Signature" className="max-h-full max-w-full object-contain" />
            </div>
          ) : null}
          <div className="w-52 border-t border-border pt-1.5 text-right text-xs">
            <p className="font-semibold text-foreground">Authorised Signatory</p>
            <p className="text-muted-foreground text-[11px]">
              For {settings?.company_name ?? "Madskraft Flex & Advertising"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate tabular-nums">{children}</dd>
    </div>
  );
}

function Block({ title, body, className }: { title: string; body: string; className?: string }) {
  return (
    <div className={className}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 whitespace-pre-line leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
