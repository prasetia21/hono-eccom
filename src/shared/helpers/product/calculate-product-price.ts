export function calculateProductPrice(
  product: any,
  flashSale: any | null,
  grosir: any[],
  qty: number = 0,
) {
  const price = {
    product_discount: product.productDiscount ?? 0,
    product_price_publish: product.productPricePublish,
    product_price: product.productPrice,
    product_hpp: product.productHpp,
    product_grosir: "0",
  };

  if (flashSale) {
    price.product_discount = flashSale.fsDetailProductDiscount;

    price.product_price_publish = flashSale.fsDetailProductNominal;

    price.product_price = flashSale.fsDetailProductPrice;
  } else if (grosir.length > 0) {
    for (const item of grosir) {
      if (Number(item.pPriceQty) <= qty) {
        price.product_grosir = "1";

        price.product_price = item.pPriceNominal;

        price.product_hpp = item.pPriceHpp;
      }
    }
  }

  return price;
}
