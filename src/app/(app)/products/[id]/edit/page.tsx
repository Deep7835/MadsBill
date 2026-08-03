import type { Metadata } from "next";
import { ProductEditView } from "@/components/products/product-edit-view";

export const metadata: Metadata = { title: "Edit Product" };

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductEditView productId={id} />;
}
