import { CourierRepository } from "./courier.repository";
import type { DeliveryPriceV2Request, DeliveryPriceV2ServiceResult } from "./courier.dto";
import { HTTP_STATUS } from "@/shared/constants/http-status";

export class CourierService {
  private repository: CourierRepository;

  constructor() {
    this.repository = new CourierRepository();
  }

  private calculateWeight(totalGrams: number): number {
    const totalKg = totalGrams / 1000;

    const str = totalKg.toString();
    const parts = str.split(".");

    const decimalPart = parts[1];

    if (decimalPart && decimalPart !== "0") {
      const firstDecimalDigit = decimalPart[0] ?? "0";
      const intPart = parseInt(parts[0] ?? "0", 10);

      if (firstDecimalDigit <= "5") {
        return intPart + 0.5;
      } else {
        return intPart + 1;
      }
    } else {
      return Math.floor(totalKg);
    }
  }

  async deliveryPriceV2(payload: DeliveryPriceV2Request): Promise<DeliveryPriceV2ServiceResult> {
    const { c_address_id: penerima, merchant_id: merchant, customer_id = "0" } = payload;

    const customerId = parseInt(customer_id, 10);

    const totalWeightGrams = await this.repository.getCartTotalWeightGrams(customerId, merchant);
    const berat = this.calculateWeight(totalWeightGrams);

    const cartFirst = await this.repository.getCartFirstWithMerchantCity(customerId, merchant);

    if (!cartFirst) {
      return {
        success: false,
        message: "keranjang anda masih kosong",
        statusCode: HTTP_STATUS.OK,
      };
    }

    const idTo = await this.repository.getCustomerAddressWithCity(penerima);

    if (!idTo || !idTo.city) {
      return {
        success: false,
        message: "lokasi tidak tersedia",
        statusCode: HTTP_STATUS.OK,
      };
    }

    const fromCityId = cartFirst.city?.rCityId;
    const toCityId = idTo.city.rCityId;

    if (!fromCityId || !toCityId) {
      return {
        success: false,
        message: "lokasi tidak tersedia",
        statusCode: HTTP_STATUS.OK,
      };
    }

    const price = await this.repository.getDeliveryPrice(fromCityId, toCityId);

    if (!price) {
      return {
        success: false,
        message: "lokasi tidak tersedia",
        statusCode: HTTP_STATUS.OK,
      };
    }

    const harga = berat * price.dPriceCost;

    const cod =
      cartFirst.merchant.merchantCod && cartFirst.merchant.merchantCod === "1"
        ? cartFirst.merchant.merchantCod
        : 0;

    const detailPengirim = cartFirst.city
      ? {
          r_city_id: cartFirst.city.rCityId,
          province_id: cartFirst.city.provinceId,
          city_id: cartFirst.city.cityId,
          subdistrict_id: cartFirst.city.subdistrictId,
          r_city_province: cartFirst.city.rCityProvince,
          r_city_name: cartFirst.city.rCityName,
          r_city_subdistrict: cartFirst.city.rCitySubdistrict,
          r_city_postcode: cartFirst.city.rCityPostcode,
        }
      : null;

    const detailPenerima = idTo.city
      ? {
          r_city_id: idTo.city.rCityId,
          province_id: idTo.city.provinceId,
          city_id: idTo.city.cityId,
          subdistrict_id: idTo.city.subdistrictId,
          r_city_province: idTo.city.rCityProvince,
          r_city_name: idTo.city.rCityName,
          r_city_subdistrict: idTo.city.rCitySubdistrict,
          r_city_postcode: idTo.city.rCityPostcode,
        }
      : null;

    return {
      success: true,
      message: "success",
      detail_pengirim: detailPengirim,
      detail_penerima: detailPenerima,
      jumlah_pembayaran: harga,
      cod,
      statusCode: HTTP_STATUS.OK,
    };
  }
}
