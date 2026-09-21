import { createHash } from "node:crypto";
import { envSchema } from "@/config/env.ts";
import { providerRequest } from "@/providers/http/http-client.ts";

export type IdExpressConfig = {
  baseUrl: string;
  securityKey: string;
  appId: string;
  timeoutMs?: number;
};

function trimSlashEnd(s: string) {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

function trimSlashStart(s: string) {
  return s.startsWith("/") ? s.slice(1) : s;
}

function joinUrl(baseUrl: string, path: string) {
  return `${trimSlashEnd(baseUrl)}/${trimSlashStart(path)}`;
}

function md5Hex(input: string) {
  return createHash("md5").update(input).digest("hex");
}

export class IdExpressProvider {
  private config: IdExpressConfig;

  constructor(config?: Partial<IdExpressConfig>) {
    const baseUrl = config?.baseUrl ?? envSchema.IDEXPRESS_URL?.trim() ?? "";
    const securityKey = config?.securityKey ?? envSchema.IDEXPRESS_SECURITY_KEY?.trim() ?? "";
    const appId = config?.appId ?? envSchema.IDEXPRESS_APP_ID?.trim() ?? "";

    if (!baseUrl || !securityKey || !appId) {
      throw new Error("IdExpress config error: Missing required configuration");
    }

    this.config = {
      baseUrl,
      securityKey,
      appId,
      timeoutMs: config?.timeoutMs ?? 0,
    };
  }

  private async sendRequest(
    path: string,
    params: Record<string, any>,
    method: "GET" | "POST",
  ): Promise<any> {
    let url = joinUrl(this.config.baseUrl, path);

    if (method === "GET") {
      url = `${url}?data=${params?.data ?? ""}&appId=${params?.appId ?? ""}&sign=${params?.sign ?? ""}`;
    }

    const res = await providerRequest<any>(url, {
      method,
      headers: {
        Accept: "application/json,text/plain,*/*",
      },
      form: method === "POST" ? params : undefined,
      timeoutMs: this.config.timeoutMs || undefined,
    });

    return res.data;
  }

  sendData(type: string, data: any) {
    let path = "";
    let method: "GET" | "POST" = "POST";

    switch (type) {
      case "order":
        path = "/open/v1/waybill/create";
        method = "POST";
        break;
      case "waybill-update":
        path = "/open/v1/waybill/update";
        method = "POST";
        break;
      case "waybill_cancel":
        path = "/open/v1/waybill/cancel";
        method = "POST";
        break;
      case "tracking":
        path = "/open/v1/waybill/get-tracking";
        method = "GET";
        break;
      case "status":
        path = "/open/v1/waybill/get-last-operation-waybill-with-fee";
        method = "POST";
        break;
      case "shipping_fee":
        path = "/open/v1/waybill/get-standard-fee";
        method = "POST";
        break;
      case "longitude_latitude":
        path = "/open/v1/waybill/get-nearest-branch";
        method = "POST";
        break;
      default:
        return null;
    }

    return this.sendRequest(path, data, method);
  }

  /**
   * Builder payload + sign => sama seperti PHP request()
   */
  request(type: string, params: any = {}) {
    const data: any = {};

    if (type === "order") {
      data.appId = this.config.appId;
      data.data = JSON.stringify([
        {
          orderNo: params.orderNo,
          orderTime: params.orderTime,
          expressType: params.expressType,
          itemName: params.itemName,
          insured: params.insured,
          itemRemarks: params.itemRemarks,
          itemQuantity: params.itemQuantity,
          itemCategory: params.itemCategory,
          weight: params.weight,
          length: params.length,
          width: params.width,
          height: params.height,
          serviceType: params.serviceType,
          itemValue: params.itemValue,
          senderName: params.senderName,
          senderEmail: params.senderEmail,
          senderCellphone: params.senderCellphone,
          senderPhoneNumber: params.senderPhoneNumber,
          senderProvinceId: params.senderProvinceId,
          senderCityId: params.senderCityId,
          senderDistrictId: params.senderDistrictId,
          senderAddress: params.senderAddress,
          senderZipCode: params.senderZipCode,
          recipientName: params.recipientName,
          recipientEmail: params.recipientEmail,
          recipientCellphone: params.recipientCellphone,
          recipientPhoneNumber: params.recipientPhoneNumber,
          recipientProvinceId: params.recipientProvinceId,
          recipientCityId: params.recipientCityId,
          recipientDistrictId: params.recipientDistrictId,
          recipientAddress: params.recipientAddress,
          recipientZipCode: params.recipientZipCode,
          codAmount: params.codAmount,
          paymentType: params.paymentType,

          pickupStartTime: params.orderTime + 1000 * 60 * (60 + 30),
          pickupEndTime: params.orderTime + 1000 * 60 * (60 * 5 + 30),

          shippingclient: params.shippingclient,
        },
      ]);

      data.sign = md5Hex(String(data.data) + this.config.appId + this.config.securityKey);
    } else if (type === "waybill-update") {
      data.appId = this.config.appId;
      data.data = JSON.stringify({
        waybillNo: params.waybillNo,
        orderTime: params.orderTime,
        expressType: params.expressType,
        itemName: params.itemName,
        insured: params.insured,
        itemRemarks: params.itemRemarks,
        itemQuantity: params.itemQuantity,
        itemCategory: params.itemCategory,
        weight: params.weight,
        length: params.length,
        width: params.width,
        height: params.height,
        itemValue: params.itemValue,
        senderName: params.senderName,
        senderEmail: params.senderEmail,
        senderCellphone: params.senderCellphone,
        senderPhoneNumber: params.senderPhoneNumber,
        senderProvinceId: params.senderProvinceId,
        senderCityId: params.senderCityId,
        senderDistrictId: params.senderDistrictId,
        senderAddress: params.senderAddress,
        senderZipCode: params.senderZipCode,
        recipientName: params.recipientName,
        recipientEmail: params.recipientEmail,
        recipientCellphone: params.recipientCellphone,
        recipientPhoneNumber: params.recipientPhoneNumber,
        recipientProvinceId: params.recipientProvinceId,
        recipientCityId: params.recipientCityId,
        recipientDistrictId: params.recipientDistrictId,
        recipientAddress: params.recipientAddress,
        recipientZipCode: params.recipientZipCode,
        serviceType: params.serviceType,
        codAmount: params.codAmount,
        paymentType: params.paymentType,
        pickupStartTime: params.orderTime + 1000 * 60 * (60 + 30),
        pickupEndTime: params.orderTime + 1000 * 60 * (60 * 5 + 30),
      });

      data.sign = md5Hex(String(data.data) + this.config.appId + this.config.securityKey);
    } else if (type === "waybill_cancel") {
      data.appId = this.config.appId;
      data.data = JSON.stringify({ waybillNo: params.waybillNo });
      data.sign = md5Hex(String(data.data) + this.config.appId + this.config.securityKey);
    } else if (type === "tracking") {
      data.appId = this.config.appId;
      data.data = params.data;
      data.sign = md5Hex(String(data.data) + this.config.appId + this.config.securityKey);
    } else if (type === "status") {
      data.appId = this.config.appId;
      data.data = JSON.stringify([{ waybillNo: params.data }]);
      data.sign = md5Hex(String(data.data) + this.config.appId + this.config.securityKey);
    } else if (type === "shipping_fee") {
      data.appId = this.config.appId;
      data.data = JSON.stringify({
        senderCityId: params.senderCityId,
        recipientDistrictId: params.recipientDistrictId,
        weight: params.weight,
        expressType: params.expressType,
      });
      data.sign = md5Hex(String(data.data) + this.config.appId + this.config.securityKey);
    } else if (type === "longitude_latitude") {
      data.appId = this.config.appId;
      data.data = JSON.stringify({
        longitude: params.longitude,
        latitude: params.latitude,
      });
      data.sign = md5Hex(String(data.data) + this.config.appId + this.config.securityKey);
    }

    return this.sendData(type, data);
  }

  /**
   * Port 1:1 dari parse_response PHP
   */
  parseResponse(opt: string = "", response: any = {}, code: string = "", desc: string = "") {
    const recData: any = {};

    if (opt === "order") {
      recData.Code = response.code;
      recData.Desc = response.desc;
      recData.Total = response.total;
      recData.Data = (Array.isArray(response.data) ? response.data : []).map((item: any) => ({
        Code: item.code,
        OrderNo: item.orderNo,
        WaybillNo: item.waybillNo,
        SortingCode: item.sortingCode,
        Msg: item.msg,
      }));
      return recData;
    }

    if (opt === "waybill-update" || opt === "waybill_cancel") {
      recData.Code = response.code;
      recData.Desc = response.desc;
      recData.Total = response.total;

      if (response.code === 0) {
        if (response.data === null) {
          recData.Data = "success";
        } else if (Array.isArray(response.data)) {
          recData.Data = response.data.map(() => ({ Success: "success" }));
        } else {
          recData.Data = [{ Success: "success" }];
        }
      } else {
        recData.Data = response.data;
      }

      return recData;
    }

    if (opt === "tracking") {
      recData.Code = response.code;
      recData.Desc = response.desc;
      recData.Total = response.total;

      recData.Data = {};
      recData.Data.BasicInfo = {
        OrderNo: response?.data?.basicInfo?.orderNo,
        OrderTime: response?.data?.basicInfo?.orderTime,
        WaybillNo: response?.data?.basicInfo?.waybillNo,
      };

      recData.Data.Historys = (
        Array.isArray(response?.data?.historys) ? response.data.historys : []
      ).map((item: any) => ({
        CourierName: item.courierName,
        CurrentBranch: item.currentBranch,
        Description: item.description,
        NextBranchName: item.nextBranchName,
        OperationTime: item.operationTime,
        OperationType: item.operationType,
        ProblemCode: item.problemCode,
        ProofOfStatus: item.proofOfStatus,
        Relation: item.relation,
        Signer: item.signer,
        WaybillNo: item.waybillNo,
      }));

      recData.Data.ItemInfo = {
        Height: response?.data?.itemInfo?.height,
        InsuranceAmount: response?.data?.itemInfo?.insuranceAmount,
        Insured: response?.data?.itemInfo?.insured,
        ItemCategory: response?.data?.itemInfo?.itemCategory,
        ItemName: response?.data?.itemInfo?.itemName,
        ItemQuantity: response?.data?.itemInfo?.itemQuantity,
        ItemRemarks: response?.data?.itemInfo?.itemRemarks,
        ItemValue: response?.data?.itemInfo?.itemValue,
        Length: response?.data?.itemInfo?.length,
        Weight: response?.data?.itemInfo?.weight,
        Width: response?.data?.itemInfo?.width,
      };

      recData.Data.RecipientInfo = {
        RecipientAddress: response?.data?.recipientInfo?.recipientAddress,
        RecipientCellphone: response?.data?.recipientInfo?.recipientCellphone,
        RecipientCity: response?.data?.recipientInfo?.recipientCity,
        RecipientDistrict: response?.data?.recipientInfo?.recipientDistrict,
        RecipientEmail: response?.data?.recipientInfo?.recipientEmail,
        RecipientName: response?.data?.recipientInfo?.recipientName,
        RecipientPhoneNumber: response?.data?.recipientInfo?.recipientPhoneNumber,
        RecipientProvince: response?.data?.recipientInfo?.recipientProvince,
        RecipientZipCode: response?.data?.recipientInfo?.recipientZipCode,
      };

      recData.Data.SenderInfo = {
        SenderAddress: response?.data?.senderInfo?.senderAddress,
        SenderCellphone: response?.data?.senderInfo?.senderCellphone,
        SenderCity: response?.data?.senderInfo?.senderCity,
        SenderDistrict: response?.data?.senderInfo?.senderDistrict,
        SenderEmail: response?.data?.senderInfo?.senderEmail,
        SenderName: response?.data?.senderInfo?.senderName,
        SenderPhoneNumber: response?.data?.senderInfo?.senderPhoneNumber,
        SenderProvince: response?.data?.senderInfo?.senderProvince,
        SenderZipCode: response?.data?.senderInfo?.senderZipCode,
      };

      return recData;
    }

    if (opt === "status") {
      recData.Code = response.code;
      recData.Desc = response.desc;
      recData.Total = response.total;
      recData.Data = (Array.isArray(response.data) ? response.data : []).map((item: any) => ({
        CodAmount: item.codAmount,
        Description: item.description,
        ExpressType: item.expressType,
        LastOperationCity: item.lastOperationCity,
        LastOperationTime: item.lastOperationTime,
        LastStatus: item.lastStatus,
        OrderNo: item.orderNo,
        ShippingFee: item.shippingFee,
        WaybillNo: item.waybillNo,
      }));
      return recData;
    }

    if (opt === "shipping_fee") {
      return {
        service: code,
        description: desc,
        cost: [
          [
            {
              value: Number.parseInt(response?.data ?? 0, 10),
              minValue: Number.parseInt(response?.data ?? 0, 10),
              unitValue: Number.parseInt(response?.data ?? 0, 10),
              etd: "",
              note: "",
            },
          ],
        ][0],
      };
    }

    if (opt === "longitude_latitude") {
      recData.Code = response.code;
      recData.Desc = response.desc;
      recData.Total = response.total;
      recData.Data = (Array.isArray(response.data) ? response.data : []).map((item: any) => ({
        BranchNo: item.branchNo,
        BranchName: item.branchName,
        Cellphone: item.cellphone,
        DetailAddress: item.detailAddress,
        Longitude: item.longitude,
        Lattitude: item.lattitude,
        Pic: item.pic,
      }));
      return recData;
    }

    return {};
  }
}
