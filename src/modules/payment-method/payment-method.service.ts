import { PaymentMethodRepository } from "./payment-method.repository.ts"; // Sesuaikan nama class repository jika pakai PaymentMethodRepository
import type { GetPaymentMethodServiceResult } from "./payment-method.dto.ts";
import { HTTP_STATUS } from "@/shared/constants/http-status.ts";
import { toSnakeCase } from "@/shared/utils/case-transform.ts";

export class PaymentMethodService {
  private repository: PaymentMethodRepository;

  constructor() {
    this.repository = new PaymentMethodRepository();
  }

  async getPaymentMethod(): Promise<GetPaymentMethodServiceResult> {
    const paymentMethods = await this.repository.getPaymentMethods();

    const safeData = paymentMethods ?? [];

    return {
      success: true,
      message: "success",
      data: toSnakeCase(safeData),
      statusCode: HTTP_STATUS.OK,
    };
  }
}
