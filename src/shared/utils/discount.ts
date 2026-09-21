const toSafeNumber = (value: unknown): number => {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
};

export const diskon = (productPrice: unknown, productPricePublish: unknown): number => {
  const price = toSafeNumber(productPrice);
  const publishPrice = toSafeNumber(productPricePublish);

  if (publishPrice <= 0) {
    return 0;
  }

  if (price < publishPrice) {
    return Math.round(((publishPrice - price) / publishPrice) * 100);
  }

  return 0;
};

export const hargaDiskon = (productPrice: unknown, productPricePublish: unknown): number => {
  const price = toSafeNumber(productPrice);
  const publishPrice = toSafeNumber(productPricePublish);

  if (price < publishPrice) {
    return publishPrice - price;
  }

  return 0;
};
