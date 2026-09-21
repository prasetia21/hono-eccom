import { and, eq } from "drizzle-orm";
import { db } from "@/libs/postgresql.ts";

import { flashsaleDetailTable } from "@/db/schema/flashsale-detail.ts";
import { flashsaleTable } from "@/db/schema/flashsale.ts";

export async function flashSaleCheck(productId: number, fsDetailId: number, qty: number = 0) {
  const [data] = await db
    .select({
      detail: flashsaleDetailTable,
      flashSale: flashsaleTable,
    })
    .from(flashsaleDetailTable)
    .leftJoin(flashsaleTable, eq(flashsaleDetailTable.fSaleId, flashsaleTable.fSaleId))
    .where(
      and(
        eq(flashsaleDetailTable.fsDetailId, fsDetailId),
        eq(flashsaleDetailTable.productId, productId),
        eq(flashsaleDetailTable.fsDetailStatus, "active"),
      ),
    )
    .limit(1);

  if (!data) {
    return {
      success: false,
      message: "Produk flash Sale tidak ditemukan!",
    };
  }

  const detail = data.detail;
  const flashSale = data.flashSale;

  if (!flashSale) {
    return {
      success: false,
      message: "Produk flash sale tidak ditemukan",
      data: detail,
    };
  }

  if (flashSale.fSaleStatus !== "active") {
    return {
      success: false,
      message: "Produk flash sale tidak aktif",
      data: detail,
    };
  }

  const now = new Date();

  if (flashSale.fSaleStartDate > now) {
    return {
      success: false,
      message: `Flash sale ${detail.fsDetailProductName} belum dimulai!`,
      data: detail,
    };
  }

  if (flashSale.fSaleEndDate < now) {
    return {
      success: false,
      message: `Flash sale ${detail.fsDetailProductName} telah berakhir!`,
      data: detail,
    };
  }

  if (Number(detail.fsDetailProductStock ?? 0) === 0) {
    return {
      success: false,
      message: `Produk flash sale ${detail.fsDetailProductName} habis!`,
      data: detail,
    };
  }

  if (qty !== 0) {
    if (Number(detail.fsDetailProductStock ?? 0) < qty) {
      return {
        success: false,
        message: `Stock produk flash sale ${detail.fsDetailProductName} tidak mencukupi!`,
        data: detail,
      };
    }
  }

  return {
    success: true,
    message: "Produk flash sale ditemukan!",
    data: detail,
  };
}
