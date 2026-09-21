import { asc, desc, type SQL } from "drizzle-orm";
import { productTable } from "@/db/schema";

export type ProductOrderBy =
  | "populer"
  | "termahal"
  | "termurah"
  | "diskon"
  | "az"
  | "za"
  | string
  | undefined;

export const getOrderBy = (orderBy: ProductOrderBy): SQL[] => {
  switch (orderBy) {
    case "populer":
      return [desc(productTable.productHits)];
    case "termahal":
      return [desc(productTable.productPrice)];
    case "termurah":
      return [asc(productTable.productPrice)];
    case "diskon":
      return [desc(productTable.productDiscount)];
    case "az":
      return [asc(productTable.productName)];
    case "za":
      return [desc(productTable.productName)];
    default:
      return [desc(productTable.productCreateDate)];
  }
};

export type SortDirection = "asc" | "desc";

const toComparable = (value: unknown): number | string => {
  if (value instanceof Date) return value.getTime();

  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const asNumber = Number(value);

    if (Number.isFinite(asNumber) && value.trim() !== "") {
      return asNumber;
    }

    const asDate = Date.parse(value);

    if (!Number.isNaN(asDate)) {
      return asDate;
    }

    return value.toLowerCase();
  }

  return 0;
};

export const sortBy = <T extends Record<string, unknown>>(
  items: T[],
  key: keyof T,
  direction: SortDirection = "asc",
): T[] => {
  return [...items].sort((a, b) => {
    const left = toComparable(a[key]);
    const right = toComparable(b[key]);

    if (left < right) return direction === "asc" ? -1 : 1;
    if (left > right) return direction === "asc" ? 1 : -1;

    return 0;
  });
};
