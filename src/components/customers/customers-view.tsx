"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  UserGroupIcon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
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
import { DataList } from "@/components/shared/data-list";
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
          <HugeiconsIcon icon={Add01Icon} />
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
              icon={UserGroupIcon}
              title={search ? "No matching customers" : "No customers yet"}
              description={
                search
                  ? "Try a different name, mobile number or city."
                  : "Add your first customer to start quoting."
              }
              action={
                search ? null : (
                  <Button size="sm" onClick={openNew}>
                    <HugeiconsIcon icon={Add01Icon} />
                    New customer
                  </Button>
                )
              }
            />
          ) : (
            <DataList
              rows={customers}
              rowKey={(customer) => customer.id}
              href={(customer) => `/customers/${customer.id}`}
              columns={[
                {
                  key: "business",
                  header: "Business",
                  primary: true,
                  cell: (customer) => (
                    <Link href={`/customers/${customer.id}`} className="font-medium hover:text-primary">
                      {customer.business_name}
                    </Link>
                  ),
                },
                {
                  key: "contact",
                  header: "Contact",
                  subtitle: true,
                  hideBelow: "lg",
                  cell: (customer) => (
                    <span className="text-muted-foreground">{customer.contact_person || "—"}</span>
                  ),
                },
                {
                  key: "mobile",
                  header: "Mobile",
                  className: "whitespace-nowrap",
                  cell: (customer) => customer.mobile || "—",
                },
                {
                  key: "city",
                  header: "City",
                  hideBelow: "lg",
                  cell: (customer) => (
                    <span className="text-muted-foreground">{customer.city || "—"}</span>
                  ),
                },
                {
                  key: "gstin",
                  header: "GSTIN",
                  hideBelow: "lg",
                  cell: (customer) => (
                    <span className="font-mono text-xs text-muted-foreground">
                      {customer.gst_number || "—"}
                    </span>
                  ),
                },
              ]}
              actions={(customer) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Customer actions">
                      <HugeiconsIcon icon={MoreHorizontalIcon} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/customers/${customer.id}`}>View history</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openEdit(customer)}>
                      <HugeiconsIcon icon={PencilEdit01Icon} />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem destructive onSelect={() => setDeleting(customer)}>
                      <HugeiconsIcon icon={Delete02Icon} />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
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
