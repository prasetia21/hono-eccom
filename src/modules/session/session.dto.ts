import { z } from "@hono/zod-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/* =========================================================================
 * OPENAPI RESPONSE SCHEMAS
 *========================================================================= */

export const SessionResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
    token: z.string(),
  })
  .openapi("SessionResponse");

/* =========================================================================
 * TYPES
 *========================================================================= */

export type SessionResult = z.infer<typeof SessionResponseSchema>;

export type SessionServiceResult = SessionResult & {
  statusCode: ContentfulStatusCode;
};
