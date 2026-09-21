import { asc, eq } from "drizzle-orm";
import { db } from "@/libs/postgresql.ts";
import { paymentMethodTable } from "@/db/schema";

export class PaymentMethodRepository {
  async getPaymentMethods() {
    return await db
      .select({
        paymentMethodId: paymentMethodTable.paymentMethodId,
        paymentMethodAdminPrice: paymentMethodTable.paymentMethodAdminPrice,
        paymentMethodGroup: paymentMethodTable.paymentMethodGroup,
        paymentMethodName: paymentMethodTable.paymentMethodName,
        paymentMethodAlias: paymentMethodTable.paymentMethodAlias,
        paymentMethodStatus: paymentMethodTable.paymentMethodStatus,
        paymentMethod3rdparty: paymentMethodTable.paymentMethod3rdparty,
        paymentMethodLogo: paymentMethodTable.paymentMethodLogo,
      })
      .from(paymentMethodTable)
      .where(eq(paymentMethodTable.paymentMethodStatus, "1"))
      .orderBy(asc(paymentMethodTable.paymentMethodName));
  }
}
