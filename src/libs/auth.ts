import { and, eq, sql } from "drizzle-orm";

import { type Customer, customerTable } from "@/db/schema/customer";
import { customerOtpTable } from "@/db/schema/customer-otp";
import { customerSimTable } from "@/db/schema/customer-sim";
import { db } from "@/libs/postgresql";
import { envSchema } from "@/config/env";
import { md5 } from "@/shared/utils/crypto-helper";
import { cacheDelete, cacheGetSerialize, cacheSetSerialize } from "@/libs/redis";
import { toSnakeCase } from "@/shared/utils/case-transform";
import { formatDate } from "@/shared/utils/date";

interface CustomerWithParent extends Customer {
  parent?: Customer | null;
}

export class Service {}

export class AuthService extends Service {
  async forgetToken(customerId: number): Promise<void> {
    const secret = envSchema.SECRET_KEY as string;

    const tokenQuery = sql<string>`
      MD5(
         ENCODE(
            SHA256(
              CONCAT(
                  ${customerSimTable.cSimImei}::text,
                    ENCODE(
                      SHA256(
                          CONCAT(COALESCE(${customerTable.customerEmail}::text, ''))::bytea
                      ), 'hex'
                    ),
                  ${customerOtpTable.cOtpToken}::text, ${customerSimTable.cSimPrimary}::text,
                  ENCODE(
                      SHA256(
                          CONCAT(
                                  MD5(
                                      MD5(COALESCE(${customerTable.customerPassword}::text, ''))
                                  ),
                                  ${customerOtpTable.cOtpCode}::text, ${customerSimTable.cSimSn}::text
                          )::bytea
                      ), 'hex'
                  ),
                  ${secret}::text
              )::bytea
            ), 'hex'
         )
      )
    `;

    const rows = await db
      .select({ token: tokenQuery })
      .from(customerTable)
      .innerJoin(customerSimTable, eq(customerTable.customerId, customerSimTable.customerId))
      .innerJoin(customerOtpTable, eq(customerSimTable.cSimId, customerOtpTable.cSimId))
      .where(
        and(
          eq(customerSimTable.cSimStatus, "active"),
          eq(customerOtpTable.cOtpStatus, "using"),
          eq(customerTable.customerId, customerId),
        ),
      );

    if (rows.length > 0) {
      for (const item of rows) {
        if (item.token) {
          await cacheDelete(item.token);
        }
      }
    }
  }

  async resetInitAuth(customerId: number): Promise<void> {
    await cacheDelete(`appv3:init_auth_data:${customerId}`);
    await cacheDelete(`apps:init_auth_data:${customerId}`);
  }

  async getTokenAuth(token: string): Promise<Record<string, any> | null> {
    const cachedData = await cacheGetSerialize<string>(token);

    if (cachedData) {
      return typeof cachedData === "string" ? JSON.parse(cachedData) : cachedData;
    }

    const secret = envSchema.SECRET_KEY as string;
    const data = await db.query.customerTable.findFirst({
      where: and(
        eq(customerTable.customerStatus, "active"),
        sql`EXISTS (
            SELECT 1 
            FROM _customer_sim csim
            INNER JOIN _customer_otp cotp ON csim.c_sim_id = cotp.c_sim_id
            WHERE csim.customer_id = ${customerTable.customerId}
              AND csim.c_sim_status = 'active'
              AND cotp.c_otp_section = 'signin'
              AND cotp.c_otp_status = 'using'
              AND MD5(
                    ENCODE(
                      SHA256(
                        CONCAT(
                          csim.c_sim_imei,
                          ENCODE(SHA256(CONCAT(COALESCE(${customerTable.customerEmail}::text, ''))::bytea), 'hex'),
                          cotp.c_otp_token, csim.c_sim_primary,
                          ENCODE(SHA256(CONCAT(
                            MD5(MD5(COALESCE(${customerTable.customerPassword}::text, ''))),
                            cotp.c_otp_code, csim.c_sim_sn)::bytea), 'hex'
                          ),
                          ${secret}::text
                        )::bytea
                      ), 'hex'
                    )
                  ) = ${token}
          )`,
      ),
      with: {
        parent: {
          with: { parent: true },
        },
        merchant: true,
        sims: {
          where: eq(customerSimTable.cSimStatus, "active"),
          with: {
            customerOtps: {
              where: and(
                eq(customerOtpTable.cOtpSection, "signin"),
                eq(customerOtpTable.cOtpStatus, "using"),
              ),
            },
          },
        },
      },
    });

    if (!data || !data.sims || data.sims.length === 0) {
      return null;
    }

    const activeSim = data.sims[0];
    if (!activeSim || !activeSim.customerOtps || activeSim.customerOtps.length === 0) {
      return null;
    }

    const activeOtp = activeSim.customerOtps[0];
    if (!activeOtp) {
      return null;
    }

    let master = null;
    let dealer = null;

    if (data.parent) {
      const parentRecord = data.parent as CustomerWithParent;

      if (parentRecord.customerLevel === "master") {
        const { parent: _parent, ...restMaster } = parentRecord;
        master = restMaster;
        dealer = null;
      } else {
        const { parent: _parent, ...restDealer } = parentRecord;
        dealer = restDealer;
        if (parentRecord.parent) {
          const { parent: _grandParent, ...restMaster } = parentRecord.parent as CustomerWithParent;
          master = restMaster;
        }
      }
    }

    const dateStr = formatDate(data.customerCreateDate || new Date());
    const md5Code = md5(md5(data.customerCode || ""));
    const saldoMinus = data.customerSaldoMinus;
    const custId = data.customerId;
    const picId = data.picId;
    const md5Email = md5(data.customerEmail || "");
    const smKey = md5(md5(dateStr + md5Code + saldoMinus + md5Email + custId + picId));

    const {
      parent: _parent,
      sims: _sims,
      merchant: _merchant,
      customerPassword,
      customerPasswordTrx,
      customerSmKey,
      ...baseCustomerData
    } = data;

    const dataMapping = {
      ...baseCustomerData,
      customerPassword,
      customerPasswordTrx,
      customerSmKey,
      cOtpId: activeOtp.cOtpId,
      cWalletStatus: activeOtp.cWalletStatus,
      dealer,
      master,
      merchantId: data.merchant ? data.merchant.merchantId : "",
      balance: 0,
      smKey,
      cSim: {
        customerId: data.customerId,
        cSimImei: activeSim.cSimImei,
        cSimSn: activeSim.cSimSn,
        cSimMcc: activeSim.cSimMcc,
        cSimMnc: activeSim.cSimMnc,
        cSimPrimary: activeSim.cSimPrimary,
        cSimStatus: activeSim.cSimStatus,
        cSimCreateDate: activeSim.cSimCreateDate,
      },
    };

    const collectionData = toSnakeCase(dataMapping);

    await cacheSetSerialize(token, collectionData, { ttl: 180 * 60 });

    return collectionData;
  }

  async getAuthData(customerId: number): Promise<Record<string, any> | null> {
    const data = await db.query.customerTable.findFirst({
      where: and(
        eq(customerTable.customerStatus, "active"),
        eq(customerTable.customerId, customerId),
      ),
      with: {
        parent: {
          with: { parent: true },
        },
        merchant: true,
        sims: {
          where: eq(customerSimTable.cSimStatus, "active"),
          with: {
            customerOtps: {
              where: and(
                eq(customerOtpTable.cOtpSection, "signin"),
                eq(customerOtpTable.cOtpStatus, "using"),
              ),
            },
          },
        },
      },
    });

    if (!data || !data.sims || data.sims.length === 0) {
      return null;
    }

    const activeSim = data.sims[0];
    if (!activeSim || !activeSim.customerOtps || activeSim.customerOtps.length === 0) {
      return null;
    }

    const activeOtp = activeSim.customerOtps[0];
    if (!activeOtp) {
      return null;
    }

    let master = null;
    let dealer = null;

    if (data.parent) {
      const parentRecord = data.parent as CustomerWithParent;

      if (parentRecord.customerLevel === "master") {
        const { parent: _parent, ...restMaster } = parentRecord;
        master = restMaster;
        dealer = null;
      } else {
        const { parent: _parent, ...restDealer } = parentRecord;
        dealer = restDealer;
        if (parentRecord.parent) {
          const { parent: _grandParent, ...restMaster } = parentRecord.parent as CustomerWithParent;
          master = restMaster;
        }
      }
    }

    const dateStr = formatDate(data.customerCreateDate || new Date());
    const md5Code = md5(md5(data.customerCode || ""));
    const saldoMinus = data.customerSaldoMinus;
    const custId = data.customerId;
    const picId = data.picId;
    const md5Email = md5(data.customerEmail || "");
    const smKey = md5(md5(dateStr + md5Code + saldoMinus + md5Email + custId + picId));

    const {
      parent: _parent,
      sims: _sims,
      merchant: _merchant,
      customerPassword,
      customerPasswordTrx,
      customerSmKey,
      ...baseCustomerData
    } = data;

    const dataMapping = {
      ...baseCustomerData,
      customerPassword,
      customerPasswordTrx,
      customerSmKey,
      cOtpId: activeOtp.cOtpId,
      cWalletStatus: activeOtp.cWalletStatus,
      dealer,
      master,
      merchantId: data.merchant ? data.merchant.merchantId : "",
      balance: 0,
      smKey,
      cSim: {
        customerId: data.customerId,
        cSimImei: activeSim.cSimImei,
        cSimSn: activeSim.cSimSn,
        cSimMcc: activeSim.cSimMcc,
        cSimMnc: activeSim.cSimMnc,
        cSimPrimary: activeSim.cSimPrimary,
        cSimStatus: activeSim.cSimStatus,
        cSimCreateDate: activeSim.cSimCreateDate,
      },
    };

    return toSnakeCase(dataMapping);
  }
}

export const authService = new AuthService();
