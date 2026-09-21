import { eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/libs/postgresql";
import { productPointTable, type ProductPoint } from "@/db/schema/product-point";
import { productPointSettingTable } from "@/db/schema/product-point-setting";

/* =========================================================================
 * PRODUCT POINT SETTING REPOSITORY
 *========================================================================= */

export class ProductPointSettingRepository {
  async getAll(): Promise<Record<string, number>> {
    const rows = await db.select().from(productPointSettingTable);

    return rows.reduce<Record<string, number>>((map, row) => {
      if (row.ppSettingAlias !== null) {
        map[row.ppSettingAlias] = Number(row.ppSettingValue ?? 0);
      }
      return map;
    }, {});
  }
}

/* =========================================================================
 * PRODUCT POINT REPOSITORY
 *========================================================================= */

const POINT_COLUMNS = {
  update: productPointTable.pPointUpdate,
  hit: productPointTable.pPointHit,
  favorite: productPointTable.pPointFavorite,
  cart: productPointTable.pPointCart,
  buy: productPointTable.pPointBuy,
  rating: productPointTable.pPointRating,
} as const;

export type ProductPointField = keyof typeof POINT_COLUMNS;

const POINT_SCHEMA_KEYS: Record<ProductPointField, keyof typeof productPointTable> = {
  update: "pPointUpdate",
  hit: "pPointHit",
  favorite: "pPointFavorite",
  cart: "pPointCart",
  buy: "pPointBuy",
  rating: "pPointRating",
} as const;

export class ProductPointRepository {
  async findByProductId(productId: number): Promise<ProductPoint | null> {
    const [row] = await db
      .select()
      .from(productPointTable)
      .where(eq(productPointTable.productId, productId))
      .limit(1);

    return row ?? null;
  }

  async createPoint(productId: number, createValue: number): Promise<ProductPoint | null> {
    const [row] = await db
      .insert(productPointTable)
      .values({
        productId,
        pPointCreate: createValue,
        pPointTotal: createValue,
        pPointCreateDate: new Date(),
      })
      .returning();

    return row ?? null;
  }

  async addPoint(productId: number, field: ProductPointField, value: number): Promise<void> {
    const column = POINT_COLUMNS[field];
    const schemaKey = POINT_SCHEMA_KEYS[field];

    const values = {
      [schemaKey]: sql`${column} + ${value}`,
      pPointTotal: sql`${productPointTable.pPointTotal} + ${value}`,
      pPointUpdateDate: new Date(),
    } as unknown as Record<string, SQL<unknown> | Date>;

    await db
      .update(productPointTable)
      .set(values as never)
      .where(eq(productPointTable.productId, productId));
  }
}
