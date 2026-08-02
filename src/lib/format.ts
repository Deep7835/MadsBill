/** Currency, date and number formatting shared by the UI and the PDF layer. */

export function formatCurrency(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

/** Same as formatCurrency but without the ₹ glyph — jsPDF's core fonts cannot render it. */
export function formatAmount(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  const n = Number(value ?? 0);
  return (Number.isFinite(n) ? n : 0).toFixed(decimals);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** yyyy-MM-dd for <input type="date"> and Postgres `date` columns. */
export function toDateInput(value: string | Date | null | undefined): string {
  const d = value ? (typeof value === "string" ? new Date(value) : value) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const tzOffset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Round to 2 decimals without float drift (12.345 -> 12.35). */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** 12345.67 -> "Twelve Thousand Three Hundred Forty Five Rupees and Sixty Seven Paise Only" */
export function amountInWords(value: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (n: number): string =>
    n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;

  const threeDigits = (n: number): string =>
    n > 99
      ? `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${twoDigits(n % 100)}` : ""}`
      : twoDigits(n);

  const inWords = (n: number): string => {
    if (n === 0) return "Zero";
    const crore = Math.floor(n / 10_000_000);
    const lakh = Math.floor((n % 10_000_000) / 100_000);
    const thousand = Math.floor((n % 100_000) / 1000);
    const rest = n % 1000;

    return [
      crore ? `${threeDigits(crore)} Crore` : "",
      lakh ? `${threeDigits(lakh)} Lakh` : "",
      thousand ? `${threeDigits(thousand)} Thousand` : "",
      rest ? threeDigits(rest) : "",
    ]
      .filter(Boolean)
      .join(" ");
  };

  const safe = round2(Math.abs(Number(value) || 0));
  const rupees = Math.floor(safe);
  const paise = Math.round((safe - rupees) * 100);

  const parts = [`${inWords(rupees)} Rupees`];
  if (paise > 0) parts.push(`and ${twoDigits(paise)} Paise`);
  return `${parts.join(" ")} Only`;
}
