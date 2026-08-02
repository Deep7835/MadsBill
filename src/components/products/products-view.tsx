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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="hidden text-right md:table-cell">GST</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className={product.is_active ? "" : "opacity-60"}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {product.name}
                        {!product.is_active ? (
                          <Badge variant="outline" className="text-[10px]">
                            Inactive
                          </Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {product.category || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.rate_type === "sqft" ? "default" : "secondary"}>
                        {product.rate_type === "sqft" ? "Per sq.ft." : "Per piece"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium">
                      {formatCurrency(product.default_rate)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        /{product.unit}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-right text-muted-foreground md:table-cell">
                      {Number(product.gst_percent)}%
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
