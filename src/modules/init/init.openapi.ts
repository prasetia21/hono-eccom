import { HTTP_STATUS } from "@/shared/constants/http-status";
import type { OpenAPITagDefinition } from "@/shared/types/openapi";
import { createStandardPostRoute, errBadRequest } from "@/shared/utils/openapi-helper";
import { GetChildCategoryRequestSchema, GetChildCategoryResponseSchema } from "./init.dto";

/* =========================================================================
 * TAG
 *========================================================================= */

export const initTag: OpenAPITagDefinition = {
  name: "Init Data",
  description: "Endpoint untuk init child kategori produk",
};

const TAGS = [initTag.name];

/* =========================================================================
 * ROUTE
 *========================================================================= */

/** POST /get/init/get_child_category */
export const getChildCategoryRoute = createStandardPostRoute({
  path: "/init/get_child_category",
  tags: TAGS,
  summary: "Get Child Category",
  description: "Mendapatkan daftar child category berdasarkan parent category ID.",
  reqSchema: GetChildCategoryRequestSchema,
  reqRequired: false,
  resSchema: GetChildCategoryResponseSchema,
  resDescription: "Berhasil mendapatkan data child category",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
  },
});
