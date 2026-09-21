import type { OpenAPITagDefinition } from "@/shared/types/openapi";
import { createStandardPostRouteNoBody } from "@/shared/utils/openapi-helper";
import { SessionResponseSchema } from "@/modules/session/session.dto.ts";

/* =========================================================================
 * TAG
 *========================================================================= */

export const sessionTag: OpenAPITagDefinition = {
  name: "Session",
  description: "Endpoint untuk generate session token",
};

const TAGS = [sessionTag.name];

/* =========================================================================
 * ROUTES
 *========================================================================= */

/** POST /session/init */
export const getSessionRoute = createStandardPostRouteNoBody({
  path: "/init",
  tags: TAGS,
  summary: "Get Generate Session Token",
  description: "Mendapatkan session token data.",
  resSchema: SessionResponseSchema,
  resDescription: "Berhasil",
});
