import { db } from "@/libs/postgresql";
import {
  cartTable,
  productTable,
  merchantTable,
  customerAddressTable,
  rajaongkirCityTable,
  shippingExpedisiTable,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { SicepatProvider } from "@/providers/courier/sicepat.provider.ts";
import { AnterajaProvider } from "@/providers/courier/anteraja.provider.ts";
import { JntProvider } from "@/providers/courier/jnt.provider.ts";
import { IdExpressProvider } from "@/providers/courier/idexpress.provider.ts";
import type {
  DestinationAddress,
  EnabledExpedisiMap,
  OriginAddress,
} from "./courier-expedition.dto.ts";

export class CourierExpeditionRepository {
  async getEnabledExpedisi(): Promise<EnabledExpedisiMap> {
    const results = await db
      .select({
        expedisi_group: shippingExpedisiTable.expedisiGroup,
        expedisi_status: shippingExpedisiTable.expedisiStatus,
      })
      .from(shippingExpedisiTable);

    const map: EnabledExpedisiMap = {};
    for (const row of results) {
      map[row.expedisi_group] = row.expedisi_status;
    }
    return map;
  }

  async getCityById(rCityId: number) {
    const result = await db
      .select({
        r_city_id: rajaongkirCityTable.rCityId,
        province_id: rajaongkirCityTable.provinceId,
        city_id: rajaongkirCityTable.cityId,
        subdistrict_id: rajaongkirCityTable.subdistrictId,
        r_city_province: rajaongkirCityTable.rCityProvince,
        r_city_name: rajaongkirCityTable.rCityName,
        r_city_subdistrict: rajaongkirCityTable.rCitySubdistrict,
        r_city_postcode: rajaongkirCityTable.rCityPostcode,
        r_city_create_date: sql<string>`TO_CHAR(${rajaongkirCityTable.rCityCreateDate},
          'YYYY-MM-DD HH24:MI:SS')`.as("r_city_create_date"),
      })
      .from(rajaongkirCityTable)
      .where(eq(rajaongkirCityTable.rCityId, rCityId))
      .limit(1);

    return result[0] ?? null;
  }

  async getDestinationAddress(
    customerId: number,
    enabled: EnabledExpedisiMap,
  ): Promise<DestinationAddress | null> {
    const withObj: Record<string, { columns: Record<string, true> }> = {};

    if (enabled["sicepat"] === "1") {
      withObj.sicepat = { columns: { scSicepatCode: true } };
    }
    if (enabled["anteraja"] === "1") {
      withObj.anteraja = { columns: { scAnterajaCode: true } };
    }
    if (enabled["jnt"] === "1") {
      withObj.jnt = { columns: { scJntCity: true, scJntSubdistrict: true } };
    }
    if (enabled["idexpress"] === "1") {
      withObj.idexpress = {
        columns: { scIdexpressDistrictCode: true, scIdexpressCityCode: true },
      };
    }

    const row = await db.query.customerAddressTable.findFirst({
      where: and(
        eq(customerAddressTable.customerId, customerId),
        eq(customerAddressTable.cAddressPrimary, "1"),
      ),
      columns: {
        cAddressId: true,
        customerId: true,
        rCityId: true,
        cAddressLatitude: true,
        cAddressLongitude: true,
      },
      with: withObj,
    });

    if (!row) return null;

    if (enabled["sicepat"] === "1" && !(row as { sicepat?: unknown }).sicepat) return null;
    if (enabled["anteraja"] === "1" && !(row as { anteraja?: unknown }).anteraja) return null;
    if (enabled["jnt"] === "1" && !(row as { jnt?: unknown }).jnt) return null;
    if (enabled["idexpress"] === "1" && !(row as { idexpress?: unknown }).idexpress) {
      return null;
    }

    const cityInfo = row.rCityId ? await this.getCityById(row.rCityId) : null;
    const rel = row as {
      sicepat?: { scSicepatCode: string | null } | null;
      anteraja?: { scAnterajaCode: string | null } | null;
      jnt?: { scJntCity: string | null; scJntSubdistrict: string | null } | null;
      idexpress?: {
        scIdexpressDistrictCode: number | null;
        scIdexpressCityCode: number | null;
      } | null;
    };

    return {
      c_address_id: row.cAddressId,
      customer_id: row.customerId,
      r_city_id: row.rCityId,
      c_address_latitude: row.cAddressLatitude,
      c_address_longitude: row.cAddressLongitude,
      city: cityInfo,

      sicepat: rel.sicepat ? { sc_sicepat_code: rel.sicepat.scSicepatCode ?? null } : undefined,
      anteraja: rel.anteraja
        ? { sc_anteraja_code: rel.anteraja.scAnterajaCode ?? null }
        : undefined,
      jnt: rel.jnt
        ? {
            sc_jnt_city: rel.jnt.scJntCity ?? null,
            sc_jnt_subdistrict: rel.jnt.scJntSubdistrict ?? null,
          }
        : undefined,
      idexpress: rel.idexpress
        ? {
            sc_idexpress_district_code: rel.idexpress.scIdexpressDistrictCode ?? null,
            sc_idexpress_city_code: rel.idexpress.scIdexpressCityCode ?? null,
          }
        : undefined,
    };
  }

  async getOriginAddress(merchantId: number): Promise<OriginAddress | null> {
    const m = await db.query.merchantTable.findFirst({
      where: eq(merchantTable.merchantId, merchantId),
      columns: {
        merchantId: true,
        customerId: true,
        rCityId: true,
      },
      with: {
        sicepat: { columns: { scSicepatCode: true } },
        anteraja: { columns: { scAnterajaCode: true } },
        jnt: { columns: { scJntCity: true } },
        idexpress: { columns: { scIdexpressCityCode: true } },
      },
    });

    if (!m) return null;

    const cityInfo = m.rCityId ? await this.getCityById(m.rCityId) : null;

    const primary = m.customerId
      ? await db.query.customerAddressTable.findFirst({
          where: and(
            eq(customerAddressTable.customerId, m.customerId),
            eq(customerAddressTable.cAddressPrimaryMerchant, "1"),
          ),
          columns: {
            cAddressLatitude: true,
            cAddressLongitude: true,
            rCityId: true,
          },
        })
      : null;

    return {
      merchant_id: m.merchantId,
      customer_id: m.customerId,
      r_city_id: m.rCityId,
      address_primary: primary
        ? {
            c_address_latitude: primary.cAddressLatitude,
            c_address_longitude: primary.cAddressLongitude,
            r_city_id: primary.rCityId,
          }
        : null,
      city: cityInfo,

      sicepat: m.sicepat ? { sc_sicepat_code: m.sicepat.scSicepatCode ?? null } : null,
      anteraja: m.anteraja ? { sc_anteraja_code: m.anteraja.scAnterajaCode ?? null } : null,
      jnt: m.jnt ? { sc_jnt_city: m.jnt.scJntCity ?? null } : null,
      idexpress: m.idexpress
        ? { sc_idexpress_city_code: m.idexpress.scIdexpressCityCode ?? null }
        : null,
    };
  }

  async getCartWeight(customerId: number, merchantId: number) {
    const cartExists = await db
      .select({ cart_id: cartTable.cartId })
      .from(cartTable)
      .innerJoin(productTable, eq(cartTable.productId, productTable.productId))
      .where(
        and(
          eq(productTable.productStatus, "publish"),
          eq(cartTable.customerId, customerId),
          eq(cartTable.merchantId, merchantId),
          eq(cartTable.cartStatus, "on"),
        ),
      )
      .limit(1);

    if (cartExists.length === 0) return null;

    const weightResult = await db
      .select({
        weight_gram: sql<number>`SUM(
                    CASE
                        WHEN
          ${productTable.productWeight} > 0 THEN
          ${productTable.productWeight}
          ELSE 1000
          END * ${cartTable.qty}::INTEGER)`.mapWith(Number),
      })
      .from(cartTable)
      .innerJoin(productTable, eq(cartTable.productId, productTable.productId))
      .where(
        and(
          eq(productTable.productStatus, "publish"),
          eq(cartTable.customerId, customerId),
          eq(cartTable.merchantId, merchantId),
          eq(cartTable.cartStatus, "on"),
        ),
      );

    return weightResult[0]?.weight_gram ?? 0;
  }

  async sicepatPrice(origin: string, destination: string, weight: number) {
    const sicepat = new SicepatProvider();
    const param = { origin, destination, weight };

    try {
      const response: any = await sicepat.request("tarif", param);
      const statusCode = response?.sicepat?.status?.code ?? 403;
      if (statusCode === 200) return sicepat.parseResponse("tarif", response);
      return [];
    } catch {
      return [];
    }
  }

  async anterajaPrice(origin: string, destination: string, weightGram: number) {
    const anteraja = new AnterajaProvider();
    const param = { origin, destination, weight: weightGram };

    try {
      const response: any = await anteraja.request("service", param);
      if (
        response?.status === 200 &&
        Array.isArray(response?.content?.services) &&
        response.content.services.length > 0
      ) {
        return anteraja.parseResponse("service", response);
      }
      return [];
    } catch {
      return [];
    }
  }

  async jntPrice(sendSiteCode: string, destAreaCode: string, weightKg: number) {
    const jnt = new JntProvider();
    const params = {
      weight: Number(weightKg.toFixed(2)),
      sendSiteCode,
      destAreaCode,
    };

    try {
      const raw: any = await jnt.request("tariff", params);
      const json = typeof raw === "string" ? JSON.parse(raw) : raw;

      const status = json?.is_success;
      const ok = typeof status === "boolean" ? status : true;

      if (!ok) return [];
      return jnt.parseResponse("tariff", json);
    } catch {
      return [];
    }
  }

  async idexpressPrice(senderCityId: string, recipientDistrictId: string, weightKg: number) {
    const idexpress = new IdExpressProvider();
    const w = Number(weightKg.toFixed(2));

    const param = {
      senderCityId,
      recipientDistrictId,
      weight: w,
      expressType: "00",
    };
    const param1 = {
      senderCityId,
      recipientDistrictId,
      weight: w,
      expressType: "01",
    };
    const param2 = {
      senderCityId,
      recipientDistrictId,
      weight: w,
      expressType: "06",
    };

    const response: unknown[] = [];

    try {
      const raw1 = await idexpress.request("shipping_fee", param);
      const response1 = typeof raw1 === "string" ? JSON.parse(raw1) : raw1;
      if (response1?.code === 0) {
        response.push(idexpress.parseResponse("shipping_fee", response1, "STD", "Standart"));
      }
    } catch {
      // skip
    }

    try {
      const raw2 = await idexpress.request("shipping_fee", param1);
      const response2 = typeof raw2 === "string" ? JSON.parse(raw2) : raw2;
      if (response2?.code === 0) {
        response.push(idexpress.parseResponse("shipping_fee", response2, "SMD", "Same Day"));
      }
    } catch {
      // skip
    }

    try {
      const raw3 = await idexpress.request("shipping_fee", param2);
      const response3 = typeof raw3 === "string" ? JSON.parse(raw3) : raw3;
      if (response3?.code === 0) {
        response.push(idexpress.parseResponse("shipping_fee", response3, "iDtruck", "Cargo"));
      }
    } catch {
      // skip
    }

    return response;
  }
}
