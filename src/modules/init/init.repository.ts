import { and, asc, eq } from "drizzle-orm";
import { db } from "@/libs/postgresql.ts";
import { productCategoryTable } from "@/db/schema";

export class InitRepository {
  getChildCategories(catParent: string) {
    return db.query.productCategoryTable.findMany({
      where: and(
        eq(productCategoryTable.catParent, parseInt(catParent)),
        eq(productCategoryTable.catStatus, "1"),
      ),
      orderBy: [asc(productCategoryTable.catName)],
      with: {
        child: true,
      },
    });
  }
}
