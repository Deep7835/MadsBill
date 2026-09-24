import type { Product, StockItem, StockMovementKind } from "@/lib/types/database";

export const INVENTORY_MIGRATION = "supabase/migrations/20260924010000_inventory.sql";

/** Stock is counted in the unit the product is billed in. */
export function stockUnit(product: Pick<Product, "rate_type" | "unit">): string {
  return product.rate_type === "sqft" ? "sq.ft." : product.unit || "pcs";
}

export type StockStatus = "untracked" | "out" | "low" | "ok" | "empty";

/**
 * Alerts only fire for items with a reorder level — an item nobody has
 * stocked yet is "empty", not an emergency.
 */
export function stockStatus(item: StockItem): StockStatus {
  if (!item.track_stock) return "untracked";
  const reorder = Number(item.reorder_level);
  if (reorder > 0) {
    if (item.on_hand <= 0) return "out";
    if (item.on_hand <= reorder) return "low";
    return "ok";
  }
  return item.on_hand > 0 ? "ok" : "empty";
}

export const needsReorder = (item: StockItem) => {
  const status = stockStatus(item);
  return status === "out" || status === "low";
};

export const KIND_LABEL: Record<StockMovementKind, string> = {
  opening: "Opening stock",
  purchase: "Purchase",
  usage: "Used",
  wastage: "Wastage",
  adjustment: "Stock count",
  invoice: "Invoice",
};

/** Missing table / view / column errors mean the SQL has not been run yet. */
export function isInventoryMissing(message: string | null | undefined): boolean {
  return !!message && /product_stock|stock_movements|cost_price|reorder_level|track_stock|schema cache/i.test(message);
}
