"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
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
import { deleteCustomer, fetchCustomers } from "@/lib/queries";
import type { Customer } from "@/lib/types/database";

export function CustomersView() {
  const { data, loading, refresh } = useAsyncData(fetchCustomers, [], {
    errorMessage: "Could not load customers",
  });

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);

  const customers = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      [c.business_name, c.contact_person, c.mobile, c.email, c.city, c.gst_number]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    );
  }, [data, search]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteCustomer(deleting.id);
      toast.success("Customer deleted");
      await refresh();
    } catch (err) {
      toast.error("Could not delete customer", {
        description:
          err instanceof Error && err.message.includes("violates foreign key")
            ? "This customer has quotations. Delete those first."
            : err instanceof Error
              ? err.message
              : undefined,
      });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <PageHeader title="Customers" description="Your address book for quotations and invoices.">
        <Button onClick={openNew}>
          <Plus />
          New customer
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search name, mobile, city…"
            />
            {!loading ? (
              <p className="text-xs text-muted-foreground">
                {customers.length} of {data?.length ?? 0} customers
              </p>
            ) : null}
          </div>

          {loading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : !customers.length ? (
            <EmptyState
              icon={Users}
              title={search ? "No matching customers" : "No customers yet"}
              description={
                search
                  ? "Try a different name, mobile number or city."
                  : "Add your first customer to start quoting."
              }
              action={
                search ? null : (
                  <Button size="sm" onClick={openNew}>
                    <Plus />
                    New customer
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="hidden lg:table-cell">City</TableHead>
                  <TableHead className="hidden lg:table-cell">GSTIN</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <Link href={`/customers/${customer.id}`} className="hover:text-primary">
                        {customer.business_name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {customer.contact_person || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{customer.mobile || "—"}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {customer.city || "—"}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                      {customer.gst_number || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Customer actions">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/customers/${customer.id}`}>View history</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openEdit(customer)}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem destructive onSelect={() => setDeleting(customer)}>
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

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
        onSaved={() => void refresh()}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete customer?"
        description={`${deleting?.business_name ?? "This customer"} will be removed permanently. Quotations already raised for them are not deleted.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </>
  );
}
