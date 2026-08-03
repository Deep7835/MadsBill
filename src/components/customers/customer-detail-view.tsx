"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Building02Icon,
  CreditCardIcon,
  Invoice01Icon,
  Mail01Icon,
  Location01Icon,
  Comment01Icon,
  Comment02Icon,
  PencilEdit01Icon,
  CallIcon,
  ReceiptTextIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import type { IconElement } from "@/components/ui/icon";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { DocStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { RecordPaymentDialog } from "@/components/customers/record-payment-dialog";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataList } from "@/components/shared/data-list";
import { useAsyncData } from "@/hooks/use-async-data";
import { fetchCustomer, fetchCustomerPayments, fetchQuotations } from "@/lib/queries";
import { sendSmsReminder } from "@/lib/sms";
import { triggerWhatsAppShare } from "@/lib/whatsapp";
import { formatCurrency, formatDate } from "@/lib/format";

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const customerFetcher = useCallback(() => fetchCustomer(customerId), [customerId]);
  const historyFetcher = useCallback(() => fetchQuotations({ customerId }), [customerId]);
  const paymentsFetcher = useCallback(() => fetchCustomerPayments(customerId), [customerId]);

  const { data: customer, loading, refresh: refreshCustomer } = useAsyncData(customerFetcher, [customerId], {
    errorMessage: "Could not load customer",
  });
  const { data: history, loading: historyLoading, refresh: refreshHistory } = useAsyncData(historyFetcher, [customerId], {
    errorMessage: "Could not load history",
  });
  const { data: payments, loading: paymentsLoading, refresh: refreshPayments } = useAsyncData(paymentsFetcher, [customerId], {
    errorMessage: "Could not load payments",
  });

  const invoices = (history ?? []).filter((q) => q.status === "invoice");
  const totalBilled = invoices.reduce((sum, q) => sum + Number(q.grand_total ?? 0), 0);
  const totalPaid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const netOutstanding = Math.max(0, totalBilled - totalPaid);

  function handleRefreshAll() {
    void refreshCustomer();
    void refreshHistory();
    void refreshPayments();
  }

  async function handleSendSmsReminder() {
    if (!customer) return;
    try {
      const res = await sendSmsReminder({
        type: "pending_payment",
        customer,
        amount: netOutstanding,
      });
      toast.success("SMS Reminder Sent!", { description: res.message });
    } catch (err) {
      toast.error("Could not send SMS", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleSendWhatsApp() {
    if (!customer) return;
    try {
      const url = await triggerWhatsAppShare({
        type: "invoice",
        customer,
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error("Could not open WhatsApp", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/customers">
          <HugeiconsIcon icon={ArrowLeft01Icon} />
          All customers
        </Link>
      </Button>

      {loading ? (
        <Skeleton className="h-10 w-64" />
      ) : (
        <PageHeader
          title={customer?.business_name ?? "Customer Profile"}
          description={customer?.contact_person ? `Contact Person: ${customer.contact_person}` : undefined}
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleSendWhatsApp} disabled={!customer?.mobile}>
              <HugeiconsIcon icon={Comment01Icon} className="h-4 w-4 text-emerald-600 mr-1" />
              WhatsApp
            </Button>

            <Button variant="outline" onClick={handleSendSmsReminder} disabled={!customer?.mobile || netOutstanding <= 0}>
              <HugeiconsIcon icon={Comment02Icon} className="h-4 w-4 text-amber-600 mr-1" />
              Send SMS
            </Button>

            <Button variant="outline" onClick={() => setEditOpen(true)} disabled={!customer}>
              <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4 mr-1" />
              Edit
            </Button>

            <Button onClick={() => setPaymentOpen(true)} disabled={!customer} className="shadow-xs bg-emerald-600 hover:bg-emerald-700">
              <HugeiconsIcon icon={CreditCardIcon} className="h-4 w-4 mr-1" />
              Record Payment
            </Button>

            <Button asChild variant="secondary">
              <Link href={`/quotations/new?customer=${customerId}`}>
                <HugeiconsIcon icon={Invoice01Icon} className="h-4 w-4 mr-1" />
                New Quotation
              </Link>
            </Button>
          </div>
        </PageHeader>
      )}

      {/* Overview Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Invoiced Billed"
          value={formatCurrency(totalBilled)}
          hint={`${invoices.length} Tax Invoice(s)`}
          icon={ReceiptTextIcon}
        />
        <StatCard
          label="Total Payment Received"
          value={formatCurrency(totalPaid)}
          hint={`${payments?.length ?? 0} Recorded Payment(s)`}
          icon={Wallet01Icon}
          tone="success"
        />
        <StatCard
          label="Outstanding Balance"
          value={formatCurrency(netOutstanding)}
          hint={netOutstanding > 0 ? "Pending collection" : "Account fully settled"}
          icon={CreditCardIcon}
          tone={netOutstanding > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Customer Info Card */}
        <Card className="lg:col-span-1 border-border/60">
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5 text-sm">
            {loading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </>
            ) : (
              <>
                <DetailRow icon={CallIcon} label="Mobile" value={customer?.mobile} />
                <DetailRow icon={Mail01Icon} label="Email" value={customer?.email} />
                <DetailRow icon={Building02Icon} label="GSTIN" value={customer?.gst_number} mono />
                <DetailRow
                  icon={Location01Icon}
                  label="Address"
                  value={[customer?.address, customer?.city, customer?.state]
                    .filter(Boolean)
                    .join(", ")}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Payments History Ledger */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <HugeiconsIcon icon={Wallet01Icon} className="h-4 w-4 text-emerald-600" />
              Payment Transactions &amp; Receipts
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setPaymentOpen(true)}>
              + Add Payment
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {paymentsLoading ? (
              <TableSkeleton rows={3} cols={4} />
            ) : !payments?.length ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No payment transactions recorded yet. Click &ldquo;Record Payment&rdquo; to add cash or UPI receipts.
              </div>
            ) : (
              <DataList
                rows={payments}
                rowKey={(p) => p.id}
                columns={[
                  {
                    key: "date",
                    header: "Date",
                    primary: true,
                    cell: (p) => (
                      <span className="font-semibold text-xs text-foreground">
                        {formatDate(p.payment_date)}
                      </span>
                    ),
                  },
                  {
                    key: "mode",
                    header: "Mode & Reference",
                    cell: (p) => (
                      <div className="min-w-0">
                        <span className="font-medium text-xs text-foreground">{p.payment_mode}</span>
                        {p.reference_no ? (
                          <p className="text-[10px] text-muted-foreground font-mono truncate">
                            Ref: {p.reference_no}
                          </p>
                        ) : null}
                      </div>
                    ),
                  },
                  {
                    key: "amount",
                    header: "Amount Paid",
                    align: "right",
                    cell: (p) => (
                      <span className="font-bold text-emerald-600 text-sm">
                        +{formatCurrency(Number(p.amount))}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quotations & Invoices History */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HugeiconsIcon icon={Invoice01Icon} className="h-4 w-4 text-primary" />
            Quotations &amp; Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <TableSkeleton rows={4} cols={4} />
          ) : !history?.length ? (
            <EmptyState
              icon={Invoice01Icon}
              title="Nothing raised yet"
              description="Quotations you create for this customer will show up here."
              action={
                <Button asChild size="sm">
                  <Link href={`/quotations/new?customer=${customerId}`}>New quotation</Link>
                </Button>
              }
            />
          ) : (
            <DataList
              rows={history}
              rowKey={(q) => q.id}
              href={(q) => `/quotations/${q.id}`}
              columns={[
                {
                  key: "number",
                  header: "Document No.",
                  primary: true,
                  cell: (q) => (
                    <Link href={`/quotations/${q.id}`} className="font-semibold text-primary hover:underline">
                      {q.quote_number}
                    </Link>
                  ),
                },
                {
                  key: "date",
                  header: "Date",
                  cell: (q) => <span className="text-muted-foreground text-xs">{formatDate(q.date)}</span>,
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (q) => (
                    <div className="flex flex-wrap gap-1.5">
                      <DocStatusBadge status={q.status} />
                      {q.status === "invoice" ? (
                        <PaymentStatusBadge status={q.payment_status} />
                      ) : null}
                    </div>
                  ),
                },
                {
                  key: "total",
                  header: "Total Amount",
                  align: "right",
                  className: "whitespace-nowrap font-medium",
                  cell: (q) => formatCurrency(q.grand_total),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        onSaved={handleRefreshAll}
      />

      {customer ? (
        <RecordPaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          customer={customer}
          quotations={history ?? []}
          onPaymentSaved={handleRefreshAll}
        />
      ) : null}
    </>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: IconElement | React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  const isIconObject = typeof Icon === "object" && Icon !== null;

  return (
    <div className="flex items-start gap-2.5">
      {isIconObject ? (
        <HugeiconsIcon icon={Icon as IconElement} className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      ) : (
        /* @ts-ignore fallback */
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
        <div className={value ? (mono ? "font-mono text-xs font-semibold" : "font-medium") : "text-muted-foreground"}>
          {value || "—"}
        </div>
      </div>
    </div>
  );
}
