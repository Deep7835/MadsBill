import type { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";

import { formatAmount, formatDate, formatNumber } from "@/lib/format";
import { text } from "@/lib/pdf/draw";
import { COLORS, CONTENT_RIGHT, FONT, PAGE } from "@/lib/pdf/theme";
import type { RateSlabRow, Report } from "@/lib/reports";
import type { Settings } from "@/lib/types/database";

const TABLE_STYLES = {
  styles: {
    font: "helvetica",
    fontSize: 7.6,
    cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
    textColor: COLORS.body,
    lineColor: COLORS.hairline,
    lineWidth: 0.2,
  },
  headStyles: {
    fillColor: COLORS.navy,
    textColor: COLORS.white,
    fontStyle: "bold" as const,
    fontSize: 7.6,
  },
  footStyles: {
    fillColor: COLORS.bandGrey,
    textColor: COLORS.ink,
    fontStyle: "bold" as const,
  },
};

const money = (n: number) => formatAmount(n);

function heading(doc: jsPDF, title: string, y: number, note?: string): number {
  text(doc, title, PAGE.margin, y, { size: FONT.section, style: "bold", color: COLORS.ink });
  if (note) text(doc, note, CONTENT_RIGHT, y, { size: FONT.tiny, color: COLORS.muted, align: "right" });
  return y + 3;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const finalY = (doc: jsPDF) => (doc as any).lastAutoTable.finalY as number;

function slabTable(doc: jsPDF, rows: RateSlabRow[], total: RateSlabRow, y: number): number {
  const line = (r: RateSlabRow, label: string): RowInput => [
    label,
    String(r.invoices),
    money(r.taxable),
    money(r.cgst),
    money(r.sgst),
    money(r.igst),
    money(r.tax),
  ];
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE.margin, right: PAGE.margin },
    theme: "grid",
    head: [["Rate", "Invoices", "Taxable Value", "CGST", "SGST", "IGST", "Total Tax"]],
    body: rows.length ? rows.map((r) => line(r, `${formatNumber(r.rate, 0)}%`)) : [["—", "0", "0.00", "0.00", "0.00", "0.00", "0.00"]],
    foot: [line(total, "Total")],
    columnStyles: { 0: { cellWidth: 18 }, 1: { halign: "right", cellWidth: 18 }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
    ...TABLE_STYLES,
  });
  return finalY(doc) + 6;
}

/** GST summary + sales register, A4 portrait — the pack a CA asks for each month. */
export async function buildReportPdf(report: Report, settings: Settings | null): Promise<jsPDF> {
  const { jsPDF: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const company = settings?.company_name ?? "Madskraft Flex & Advertising";
  const periodLabel = `${formatDate(report.period.from)} – ${formatDate(report.period.to)}`;
  let y = PAGE.margin;

  /* header */
  text(doc, company, PAGE.margin, y + 5, { size: FONT.company, style: "bold", color: COLORS.ink });
  text(doc, "GST & SALES REPORT", CONTENT_RIGHT, y + 5, { size: 14, style: "bold", color: COLORS.navy, align: "right" });
  const meta = [
    settings?.gst_number ? `GSTIN: ${settings.gst_number}` : null,
    [settings?.city, settings?.state].filter(Boolean).join(", ") || null,
  ].filter(Boolean);
  text(doc, meta.join("   |   "), PAGE.margin, y + 10, { size: FONT.tiny, color: COLORS.muted });
  text(doc, `Period: ${periodLabel}`, CONTENT_RIGHT, y + 10, { size: FONT.tiny, color: COLORS.muted, align: "right" });
  y += 18;

  /* overview */
  const t = report.totals;
  y = heading(doc, "Summary", y);
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE.margin, right: PAGE.margin },
    theme: "grid",
    head: [["Invoices", "Taxable Value", "CGST", "SGST", "IGST", "Total Tax", "Invoice Value", "Collected", "Outstanding"]],
    body: [[
      String(t.invoices), money(t.taxable), money(t.cgst), money(t.sgst), money(t.igst),
      money(t.tax), money(t.total), money(t.collected), money(t.outstanding),
    ]],
    columnStyles: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i, { halign: "right" }])),
    ...TABLE_STYLES,
  });
  y = finalY(doc) + 6;

  /* GSTR-1 */
  y = heading(doc, "GSTR-1 — B2B outward supplies (registered customers)", y);
  y = slabTable(doc, report.gstr1.b2b, report.gstr1.b2bTotal, y);
  y = heading(doc, "GSTR-1 — B2C outward supplies (unregistered customers)", y);
  y = slabTable(doc, report.gstr1.b2c, report.gstr1.b2cTotal, y);

  /* GSTR-3B */
  y = heading(doc, "GSTR-3B — Table 3.1(a) Outward taxable supplies", y, "Input tax credit is not tracked in this app");
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE.margin, right: PAGE.margin },
    theme: "grid",
    head: [["Nature of supply", "Taxable Value", "Integrated Tax", "Central Tax", "State/UT Tax"]],
    body: [["(a) Outward taxable supplies (other than zero rated, nil rated and exempted)", money(t.taxable), money(t.igst), money(t.cgst), money(t.sgst)]],
    columnStyles: { 0: { cellWidth: 80 }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    ...TABLE_STYLES,
  });
  y = finalY(doc) + 6;

  /* register — landscape so GSTINs and dates stay on one line */
  doc.addPage("a4", "landscape");
  y = PAGE.margin;
  const landscapeRight = doc.internal.pageSize.getWidth() - PAGE.margin;
  text(doc, "Sales register", PAGE.margin, y, { size: FONT.section, style: "bold", color: COLORS.ink });
  text(doc, periodLabel, landscapeRight, y, { size: FONT.tiny, color: COLORS.muted, align: "right" });
  y += 3;
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE.margin, right: PAGE.margin, top: PAGE.margin, bottom: PAGE.margin },
    theme: "grid",
    head: [["Date", "Invoice", "Customer", "GSTIN", "Place of Supply", "Taxable", "CGST", "SGST", "IGST", "Total"]],
    body: report.register.map((r) => [
      formatDate(r.date), r.number, r.customer, r.gstin ?? "—", r.placeOfSupply,
      money(r.taxable), money(r.cgst), money(r.sgst), money(r.igst), money(r.total),
    ]),
    foot: [["", "", `${t.invoices} invoices`, "", "", money(t.taxable), money(t.cgst), money(t.sgst), money(t.igst), money(t.total)]],
    columnStyles: {
      0: { cellWidth: 24 }, 1: { cellWidth: 20 }, 2: { cellWidth: 60 }, 3: { cellWidth: 36 }, 4: { cellWidth: 34 },
      5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right" }, 9: { halign: "right" },
    },
    ...TABLE_STYLES,
  });

  /* chrome */
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    text(doc, `${company}  |  GST & Sales Report  |  ${periodLabel}`, PAGE.margin, height - 6, { size: FONT.tiny, color: COLORS.muted });
    text(doc, `Page ${page} of ${pages}`, width - PAGE.margin, height - 6, { size: FONT.tiny, color: COLORS.muted, align: "right" });
  }

  return doc;
}

export async function downloadReportPdf(report: Report, settings: Settings | null): Promise<void> {
  const doc = await buildReportPdf(report, settings);
  doc.save(`gst-report-${report.period.from}-to-${report.period.to}.pdf`);
}
