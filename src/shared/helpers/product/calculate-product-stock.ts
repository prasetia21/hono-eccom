import type { ProductStock } from "@/db/schema/product-stock";

export function calculateProductStock(
  product: any,
  flashSale: any | null,
  variant: ProductStock | null,
): number {
  if (flashSale) {
    return Number(flashSale.fsDetailProductStock ?? 0);
  }

  if (variant) {
    return Number(variant.psStock ?? 0);
  }

  return Number(product.productStock ?? 0);
}
