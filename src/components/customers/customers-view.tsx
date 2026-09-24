"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Users, MoreHorizontal, Edit, Trash2, Phone, Mail, Building2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAsyncData } from "@/hooks/use-async-data";
import { deleteCustomer, fetchCustomers } from "@/lib/queries";
import type { Customer } from "@/lib/types/database";

export function CustomersView() {
  const { data, loading, refresh } = useAsyncData(fetchCustomers, [], {
    errorMessage: "Could not load customers",
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);

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

  const columns: Column<Customer>[] = [
    {
      key: "business_name",
      header: "Business Name",
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {c.business_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <Link href={`/customers/${c.id}`} className="font-medium text-foreground hover:text-primary">
              {c.business_name}
            </Link>
            {c.contact_person && (
              <p className="text-xs text-muted-foreground">{c.contact_person}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "mobile",
      header: "Phone",
      render: (c) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="size-3.5 text-muted-foreground" />
          <span>{c.mobile || "—"}</span>
        </div>
      ),
    },
    {
      key: "city",
      header: "City",
      sortable: true,
      render: (c) => (
        <span className="text-muted-foreground">
          {c.city || "—"}
        </span>
      ),
    },
    {
      key: "gst_number",
      header: "GSTIN",
      render: (c) => (
        <span className="font-mono text-xs text-muted-foreground">
          {c.gst_number || "Unregistered"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      render: (customer) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg" aria-label="Customer actions">
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/customers/${customer.id}`}>View History</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openEdit(customer)}>
              <Edit className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem destructive onSelect={() => setDeleting(customer)}>
              <Trash2 className="mr-2 size-4 text-rose-500" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Customer Directory" description="Manage clients, ledger history, contact information and GST details.">
        <Button onClick={openNew}>
          <Plus />
          Add Customer
        </Button>
      </PageHeader>

      <DataTable
        data={data ?? []}
        columns={columns}
        isLoading={loading}
        searchPlaceholder="Search business name, phone, city, GSTIN..."
        emptyMessage="No customers found. Click 'Add Customer' to start building your client ledger."
      />

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
    </div>
  );
}
