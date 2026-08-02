"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataList } from "@/components/shared/data-list";
import { useAsyncData } from "@/hooks/use-async-data";
import { deleteProduct, fetchProducts } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types/database";

export function ProductsView() {
  const { data, loading, refresh } = useAsyncData(fetchProducts, [], {
    errorMessage: "Could not load products",
  });

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const products = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) =>
      [p.name, p.category, p.unit].filter(Boolean).some((f) => String(f).toLowerCase().includes(q)),
    );
  }, [data, search]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteProduct(deleting.id);
      toast.success("Product deleted");
      await refresh();
    } catch (err) {
      toast.error("Could not delete product", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <PageHeader title="Products" description="Rate card used by the quotation builder.">
        <Button onClick={openNew}>
          <Plus />
          New product
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput value={search} onChange={setSearch} placeholder="Search products…" />
            {!loading ? (
              <p className="text-xs text-muted-foreground">
                {products.length} of {data?.length ?? 0} products
              </p>
            ) : null}
          </div>

          {loading ? (
            <TableSkeleton rows={7} cols={5} />
          ) : !products.length ? (
            <EmptyState
              icon={Package}
              title={search ? "No matching products" : "No products yet"}
              description={
                search ? "Try a different name or category." : "Add the items you print and sell."
              }
              action={
                search ? null : (
                  <Button size="sm" onClick={openNew}>
                    <Plus />
                    New product
                  </Button>
                )
              }
            />
          ) : (
            <DataList
              rows={products}
              rowKey={(product) => product.id}
              columns={[
                {
                  key: "name",
                  header: "Product",
                  primary: true,
                  cell: (product) => (
                    <span className="flex items-center gap-2 font-medium">
                      {product.name}
                      {!product.is_active ? (
                        <Badge variant="outline" className="text-[10px]">
                          Inactive
                        </Badge>
                      ) : null}
                    </span>
                  ),
                },
                {
                  key: "category",
                  header: "Category",
                  subtitle: true,
                  hideBelow: "lg",
                  cell: (product) => (
                    <span className="text-muted-foreground">{product.category || "—"}</span>
                  ),
                },
                {
                  key: "pricing",
                  header: "Pricing",
                  cell: (product) => (
                    <Badge variant={product.rate_type === "sqft" ? "default" : "secondary"}>
                      {product.rate_type === "sqft" ? "Per sq.ft." : "Per piece"}
                    </Badge>
                  ),
                },
                {
                  key: "rate",
                  header: "Rate",
                  align: "right",
                  className: "whitespace-nowrap font-medium",
                  cell: (product) => (
                    <>
                      {formatCurrency(product.default_rate)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        /{product.unit}
                      </span>
                    </>
                  ),
                },
                {
                  key: "slabs",
                  header: "Volume rate",
                  align: "right",
                  cell: (product) =>
                    product.rate_type === "sqft" && product.slab1_min_area ? (
                      <span className="text-xs text-muted-foreground">
                        {product.slab1_min_area}+:{" "}
                        {formatCurrency(
                          Number(product.default_rate) - Number(product.slab1_discount),
                        )}
                        {product.slab2_min_area ? (
                          <>
                            {" · "}
                            {product.slab2_min_area}+:{" "}
                            {formatCurrency(
                              Number(product.default_rate) - Number(product.slab2_discount),
                            )}
                          </>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    ),
                },
                {
                  key: "gst",
                  header: "GST",
                  align: "right",
                  hideBelow: "lg",
                  cell: (product) => (
                    <span className="text-muted-foreground">{Number(product.gst_percent)}%</span>
                  ),
                },
              ]}
              actions={(product) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Product actions">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditing(product);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem destructive onSelect={() => setDeleting(product)}>
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          )}
        </CardContent>
      </Card>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        onSaved={() => void refresh()}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete product?"
        description={`${deleting?.name ?? "This product"} will be removed from the rate card. Existing quotation lines keep their saved description and rate.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </>
  );
}
