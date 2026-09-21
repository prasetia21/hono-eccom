import { CourierExpeditionRepository } from "./courier-expedition.repository.ts";
import type {
  CourierCostItem,
  CourierPriceRequest,
  CourierPriceResponse,
  CourierPriceServiceResult,
} from "./courier-expedition.dto.ts";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { toSnakeCase } from "@/shared/utils/case-transform.ts";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class CourierExpeditionService {
  private repository: CourierExpeditionRepository;

  constructor() {
    this.repository = new CourierExpeditionRepository();
  }

  private roundWeightForSicepat(weightKg: number): number {
    const [wholeStr, fracStr] = String(weightKg).split(".");
    if (!fracStr) return weightKg;

    const whole = Number(wholeStr ?? 0);
    const firstDigit = Number(fracStr.charAt(0) || "0");
    const inc = firstDigit <= 5 ? 0.5 : 1;

    const res = whole + inc;
    return res <= 1 ? 1 : res;
  }

  private roundWeightForAnteraja(weightGram: number): number {
    return weightGram < 1000 ? 1000 : weightGram;
  }

  private isEmptyData(data: unknown): boolean {
    if (data === null || data === undefined) return true;
    if (Array.isArray(data) && data.length === 0) return true;
    return (
      typeof data === "object" && !Array.isArray(data) && Object.keys(data as object).length === 0
    );
  }

  private respond(
    body: CourierPriceResponse,
    statusCode: ContentfulStatusCode,
  ): CourierPriceServiceResult {
    return {
      ...toSnakeCase(body),
      statusCode,
    };
  }

  async getCourierPrice(payload: CourierPriceRequest): Promise<CourierPriceServiceResult> {
    try {
      const customerId = Number(payload.customer_id);
      const merchantId = Number(payload.merchant_id);
      const data: CourierCostItem[] = [];

      const shippingExpedisi = await this.repository.getEnabledExpedisi();

      // check destination address
      const destinationAddress = await this.repository.getDestinationAddress(
        customerId,
        shippingExpedisi,
      );

      if (!destinationAddress) {
        return this.respond(
          {
            success: false,
            message: "alamat tidak ditemukan",
          },
          HTTP_STATUS.OK,
        );
      }

      // check origin address
      const originAddress = await this.repository.getOriginAddress(merchantId);

      if (!originAddress) {
        return this.respond(
          {
            success: false,
            message: "alamat toko tidak ditemukan",
          },
          HTTP_STATUS.OK,
        );
      }

      // check cart & weight
      const weightGram = await this.repository.getCartWeight(customerId, merchantId);

      if (weightGram === null) {
        return this.respond(
          {
            success: false,
            message: "cart tidak ditemukan",
          },
          HTTP_STATUS.OK,
        );
      }

      const weightKg = Number(weightGram) / 1000;

      let sicepatResponse: unknown;
      let anterajaResponse: unknown;
      let jntresponse: unknown;
      let idexpressresponse: unknown;

      // sicepat
      if (shippingExpedisi["sicepat"] === "1") {
        // pembulatan berat sicepat
        const totalBerat = this.roundWeightForSicepat(weightKg);

        sicepatResponse = await this.repository.sicepatPrice(
          String(originAddress.sicepat?.sc_sicepat_code ?? "").substring(0, 3),
          String(destinationAddress.sicepat?.sc_sicepat_code ?? ""),
          totalBerat,
        );
      }

      // anteraja
      if (shippingExpedisi["anteraja"] === "1") {
        // pembulatan berat anteraja
        const anterajaWeight = this.roundWeightForAnteraja(Number(weightGram));

        anterajaResponse = await this.repository.anterajaPrice(
          String(originAddress.anteraja?.sc_anteraja_code ?? ""),
          String(destinationAddress.anteraja?.sc_anteraja_code ?? ""),
          anterajaWeight,
        );
      }

      // jnt
      if (shippingExpedisi["jnt"] === "1") {
        jntresponse = await this.repository.jntPrice(
          String(originAddress.jnt?.sc_jnt_city ?? ""),
          String(destinationAddress.jnt?.sc_jnt_subdistrict ?? ""),
          weightKg,
        );
      }

      // idexpress
      if (shippingExpedisi["idexpress"] === "1") {
        idexpressresponse = await this.repository.idexpressPrice(
          String(originAddress.idexpress?.sc_idexpress_city_code ?? ""),
          String(destinationAddress.idexpress?.sc_idexpress_district_code ?? ""),
          weightKg,
        );
      }

      if (!this.isEmptyData(sicepatResponse)) {
        data.push({
          code: "sicepat",
          name: "SiCepat",
          costs: sicepatResponse as CourierCostItem["costs"],
        });
      }

      if (!this.isEmptyData(jntresponse)) {
        data.push({
          code: "jnt",
          name: "Jnt",
          costs: jntresponse as CourierCostItem["costs"],
        });
      }

      if (!this.isEmptyData(anterajaResponse)) {
        data.push({
          code: "anteraja",
          name: "Anteraja",
          costs: anterajaResponse as CourierCostItem["costs"],
        });
      }

      if (!this.isEmptyData(idexpressresponse)) {
        data.push({
          code: "idexpress",
          name: "ID Express",
          costs: idexpressresponse as CourierCostItem["costs"],
        });
      }

      // return data
      if (data.length > 0) {
        return this.respond(
          {
            success: true,
            message: "Data berhasil ditemukan",
            origin_details: originAddress.city,
            destination_details: destinationAddress.city,
            results: data,
          },
          HTTP_STATUS.OK,
        );
      }

      return this.respond(
        {
          success: false,
          message: "Data tidak ditemukan",
        },
        HTTP_STATUS.OK,
      );
    } catch {
      return this.respond(
        {
          success: false,
          message: "Terjadi kesalahan saat mengambil data ongkir",
        },
        HTTP_STATUS.OK,
      );
    }
  }
}
