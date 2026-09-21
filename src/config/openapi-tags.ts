import type { OpenAPITagDefinition } from "@/shared/types/openapi";
import { initTag } from "@/modules/init";
import { productTag } from "@/modules/product";
import { productReviewTag } from "@/modules/product-review";
import { sessionTag } from "@/modules/session";
import { productCategoryTag } from "@/modules/product-category";

export const allTags: OpenAPITagDefinition[] = [
  initTag,
  sessionTag,
  productTag,
  productReviewTag,
  productCategoryTag,
];
