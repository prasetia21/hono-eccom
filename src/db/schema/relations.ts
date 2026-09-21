import { relations } from "drizzle-orm";
import { productTable } from "@/db/schema/product";
import { productCategoryTable } from "@/db/schema/product-category";
import { productCategoryRecommendationTable } from "@/db/schema/product-category-recommendation";
import { merchantTable } from "@/db/schema/merchant";
import { productReviewTable } from "@/db/schema/product-review";
import { productStockTable } from "@/db/schema/product-stock";
import { orderDetailTable } from "@/db/schema/order-detail";
import { rajaongkirCityTable } from "@/db/schema/rajaongkir-city";
import { customerTable } from "@/db/schema/customer";
import { customerWishlistTable } from "@/db/schema/customer-wishlist";
import { productAttributeTable } from "@/db/schema/product-attribute";
import { mediaTable } from "@/db/schema/media";
import { cartTable } from "@/db/schema/cart";
import { orderTable } from "@/db/schema/order";
import { contentTable } from "@/db/schema/content";
import { categoryTable } from "@/db/schema/category";
import { customerSimTable } from "@/db/schema/customer-sim.ts";
import { customerOtpTable } from "@/db/schema/customer-otp.ts";
import { customerOtpWebTable } from "@/db/schema/customer-otp-web.ts";
import { trainPaymentTable } from "@/db/schema/train-payment.ts";
import { ppobProductTable } from "@/db/schema/ppob-product.ts";
import { ppobTransTable } from "@/db/schema/ppob-trans.ts";
import { transferSaldoTable } from "@/db/schema/transfer-saldo.ts";
import { customerDepositTable } from "@/db/schema/customer-deposit.ts";
import { orderCashbackTable } from "@/db/schema/order-cashback.ts";
import { withdrawEcommerceTable } from "@/db/schema/withdraw-ecommerce.ts";
import { addsTable } from "@/db/schema/adds.ts";
import { addsBillTable } from "@/db/schema/adds-bill.ts";
import { customerOmsetTable } from "@/db/schema/customer-omset.ts";
import { ppobCategoryTable } from "@/db/schema/ppob-category.ts";
import { ppobProductVendorTable } from "@/db/schema/ppob-product-vendor.ts";
import { customerAddressTable } from "@/db/schema/customer-address.ts";
import { deliveryPriceTable } from "@/db/schema/delivery-price.ts";
import { productPointTable } from "@/db/schema/product-point.ts";
import { shipmentCitySicepatTable } from "@/db/schema/shipment-city-sicepat.ts";
import { shipmentCityJntTable } from "@/db/schema/shipment-city-jnt.ts";
import { shipmentCityIdexpressTable } from "@/db/schema/shipment-city-idexpress.ts";
import { shipmentCityAnterajaTable } from "@/db/schema/shipment-city-anteraja.ts";
import { flashsaleTable } from "@/db/schema/flashsale.ts";
import { flashsaleDetailTable } from "@/db/schema/flashsale-detail.ts";
import { flashsaleCategoryTable } from "@/db/schema/flashsale-category.ts";

export const contentRelations = relations(contentTable, ({ one, many }) => ({
  category: one(categoryTable, {
    fields: [contentTable.catId],
    references: [categoryTable.catId],
  }),
  media: many(mediaTable),
}));

export const mediaRelations = relations(mediaTable, ({ one }) => ({
  content: one(contentTable, {
    fields: [mediaTable.dataId],
    references: [contentTable.contentId],
  }),
}));

export const productRelations = relations(productTable, ({ one, many }) => ({
  category: one(productCategoryTable, {
    fields: [productTable.catId],
    references: [productCategoryTable.catId],
  }),

  attribute: one(productAttributeTable, {
    fields: [productTable.catId],
    references: [productAttributeTable.catId],
  }),

  merchant: one(merchantTable, {
    fields: [productTable.merchantId],
    references: [merchantTable.merchantId],
  }),

  point: one(productPointTable, {
    fields: [productTable.productId],
    references: [productPointTable.productId],
  }),

  wishlist: one(customerWishlistTable, {
    fields: [productTable.productId],
    references: [customerWishlistTable.productId],
  }),

  mediaValues: many(mediaTable),
  productReviews: many(productReviewTable),
  orderDetails: many(orderDetailTable),
  stocks: many(productStockTable),
}));

export const merchantRelations = relations(merchantTable, ({ one, many }) => ({
  order: one(rajaongkirCityTable, {
    fields: [merchantTable.rCityId],
    references: [rajaongkirCityTable.rCityId],
  }),

  city: one(rajaongkirCityTable, {
    fields: [merchantTable.rCityId],
    references: [rajaongkirCityTable.rCityId],
  }),

  customer: one(customerTable, {
    fields: [merchantTable.customerId],
    references: [customerTable.customerId],
  }),

  sicepat: one(shipmentCitySicepatTable, {
    fields: [merchantTable.rCityId],
    references: [shipmentCitySicepatTable.rCityId],
  }),

  jnt: one(shipmentCityJntTable, {
    fields: [merchantTable.rCityId],
    references: [shipmentCityJntTable.rCityId],
  }),

  idexpress: one(shipmentCityIdexpressTable, {
    fields: [merchantTable.rCityId],
    references: [shipmentCityIdexpressTable.rCityId],
  }),

  anteraja: one(shipmentCityAnterajaTable, {
    fields: [merchantTable.rCityId],
    references: [shipmentCityAnterajaTable.rCityId],
  }),

  carts: many(cartTable),
  products: many(productTable),
  addresses: many(customerAddressTable),
}));

export const productCategoryRelations = relations(productCategoryTable, ({ one, many }) => ({
  products: many(productTable),

  parent: one(productCategoryTable, {
    fields: [productCategoryTable.catParent],
    references: [productCategoryTable.catId],
    relationName: "product_category_parent_child",
  }),

  child: many(productCategoryTable, {
    relationName: "product_category_parent_child",
  }),

  recommendations: many(productCategoryRecommendationTable),
}));

export const productCategoryRecommendationRelations = relations(
  productCategoryRecommendationTable,
  ({ one }) => ({
    category: one(productCategoryTable, {
      fields: [productCategoryRecommendationTable.catId],
      references: [productCategoryTable.catId],
    }),
  }),
);

export const productReviewRelations = relations(productReviewTable, ({ one }) => ({
  product: one(productTable, {
    fields: [productReviewTable.productId],
    references: [productTable.productId],
  }),

  customer: one(customerTable, {
    fields: [productReviewTable.customerId],
    references: [customerTable.customerId],
  }),
}));

export const orderDetailRelations = relations(orderDetailTable, ({ one }) => ({
  product: one(productTable, {
    fields: [orderDetailTable.productId],
    references: [productTable.productId],
  }),

  order: one(orderTable, {
    fields: [orderDetailTable.orderId],
    references: [orderTable.orderId],
  }),

  productReview: one(productReviewTable, {
    fields: [orderDetailTable.productId],
    references: [productReviewTable.productId],
  }),

  flash_sale_detail: one(flashsaleDetailTable, {
    fields: [orderDetailTable.fsDetailId],
    references: [flashsaleDetailTable.fsDetailId],
  }),
}));

export const productStockRelations = relations(productStockTable, ({ one }) => ({
  product: one(productTable, {
    fields: [productStockTable.productId],
    references: [productTable.productId],
  }),
}));

export const customerSimRelations = relations(customerSimTable, ({ one, many }) => ({
  customer: one(customerTable, {
    fields: [customerSimTable.customerId],
    references: [customerTable.customerId],
  }),
  customerOtps: many(customerOtpTable),
}));

export const customerOtpRelations = relations(customerOtpTable, ({ one }) => ({
  customer: one(customerTable, {
    fields: [customerOtpTable.customerId],
    references: [customerTable.customerId],
  }),
  sim: one(customerSimTable, {
    fields: [customerOtpTable.cSimId],
    references: [customerSimTable.cSimId],
  }),
}));

export const customerOtpWebRelations = relations(customerOtpWebTable, ({ one }) => ({
  customer: one(customerTable, {
    fields: [customerOtpWebTable.customerId],
    references: [customerTable.customerId],
  }),
}));

export const customerRelations = relations(customerTable, ({ one, many }) => ({
  primaryAddress: one(customerAddressTable, {
    fields: [customerTable.customerId],
    references: [customerAddressTable.customerId],
  }),
  address: one(customerAddressTable, {
    fields: [customerTable.customerId],
    references: [customerAddressTable.customerId],
  }),

  parent: one(customerTable, {
    fields: [customerTable.customerParent],
    references: [customerTable.customerId],
    relationName: "customer_parent_tree",
  }),

  merchant: one(merchantTable, {
    fields: [customerTable.customerId],
    references: [merchantTable.customerId],
  }),

  children: many(customerTable, { relationName: "customer_parent_tree" }),
  sims: many(customerSimTable),
  customerOtps: many(customerOtpTable),
  customerWebOtps: many(customerOtpWebTable),
  deposits: many(customerDepositTable),
  transactions: many(ppobTransTable, {
    relationName: "customer_transactions",
  }),
  transactionRefunds: many(ppobTransTable, {
    relationName: "customer_transaction_refunds",
  }),
  bonusMaster: many(ppobTransTable, {
    relationName: "master_ppob_trans",
  }),
  bonusDealer: many(ppobTransTable, {
    relationName: "dealer_ppob_trans",
  }),
  trains: many(trainPaymentTable, {
    relationName: "customer_trains",
  }),
  trainMaster: many(trainPaymentTable, {
    relationName: "master_train_payment",
  }),
  trainDealer: many(trainPaymentTable, {
    relationName: "dealer_train_payment",
  }),
  transferIn: many(transferSaldoTable, {
    relationName: "transfer_to_customer",
  }),
  transferOut: many(transferSaldoTable, {
    relationName: "transfer_from_customer",
  }),
  orders: many(orderTable, {
    relationName: "customer_orders",
  }),
  orderRefunds: many(orderTable, {
    relationName: "customer_order_refunds",
  }),
  orderCashbacks: many(orderCashbackTable),
  withdraws: many(withdrawEcommerceTable),
  adds: many(addsTable),
  omset: many(customerOmsetTable, {
    relationName: "customer_omset_customer",
  }),
  omsetMaster: many(customerOmsetTable, {
    relationName: "customer_omset_master",
  }),
}));

export const customerDepositRelations = relations(customerDepositTable, ({ one }) => ({
  customer: one(customerTable, {
    fields: [customerDepositTable.customerId],
    references: [customerTable.customerId],
  }),
}));

export const ppobTransRelations = relations(ppobTransTable, ({ one }) => ({
  customer: one(customerTable, {
    fields: [ppobTransTable.customerId],
    references: [customerTable.customerId],
    relationName: "customer_transactions",
  }),

  customerRefund: one(customerTable, {
    fields: [ppobTransTable.customerId],
    references: [customerTable.customerId],
    relationName: "customer_transaction_refunds",
  }),

  master: one(customerTable, {
    fields: [ppobTransTable.masterId],
    references: [customerTable.customerId],
    relationName: "master_ppob_trans",
  }),

  dealer: one(customerTable, {
    fields: [ppobTransTable.dealerId],
    references: [customerTable.customerId],
    relationName: "dealer_ppob_trans",
  }),

  ppobProduct: one(ppobProductTable, {
    fields: [ppobTransTable.ppobId],
    references: [ppobProductTable.ppobId],
  }),
}));

export const trainPaymentRelations = relations(trainPaymentTable, ({ one }) => ({
  customer: one(customerTable, {
    fields: [trainPaymentTable.customerId],
    references: [customerTable.customerId],
    relationName: "customer_trains",
  }),

  master: one(customerTable, {
    fields: [trainPaymentTable.masterId],
    references: [customerTable.customerId],
    relationName: "master_train_payment",
  }),

  dealer: one(customerTable, {
    fields: [trainPaymentTable.dealerId],
    references: [customerTable.customerId],
    relationName: "dealer_train_payment",
  }),
}));

export const transferSaldoRelations = relations(transferSaldoTable, ({ one }) => ({
  to: one(customerTable, {
    fields: [transferSaldoTable.customerTo],
    references: [customerTable.customerId],
    relationName: "transfer_to_customer",
  }),

  from: one(customerTable, {
    fields: [transferSaldoTable.customerFrom],
    references: [customerTable.customerId],
    relationName: "transfer_from_customer",
  }),
}));

export const orderRelations = relations(orderTable, ({ one, many }) => ({
  customer: one(customerTable, {
    fields: [orderTable.customerId],
    references: [customerTable.customerId],
    relationName: "customer_orders",
  }),

  customerRefund: one(customerTable, {
    fields: [orderTable.customerId],
    references: [customerTable.customerId],
    relationName: "customer_order_refunds",
  }),

  merchant: one(merchantTable, {
    fields: [orderTable.merchantId],
    references: [merchantTable.merchantId],
  }),
  details: many(orderDetailTable),
}));

export const orderCashbackRelations = relations(orderCashbackTable, ({ one }) => ({
  customer: one(customerTable, {
    fields: [orderCashbackTable.customerId],
    references: [customerTable.customerId],
  }),
}));

export const withdrawEcommerceRelations = relations(withdrawEcommerceTable, ({ one }) => ({
  customer: one(customerTable, {
    fields: [withdrawEcommerceTable.customerId],
    references: [customerTable.customerId],
  }),
}));

export const addsRelations = relations(addsTable, ({ one, many }) => ({
  customer: one(customerTable, {
    fields: [addsTable.customerId],
    references: [customerTable.customerId],
  }),

  bills: many(addsBillTable),
}));

export const addsBillRelations = relations(addsBillTable, ({ one }) => ({
  adds: one(addsTable, {
    fields: [addsBillTable.addsId],
    references: [addsTable.addsId],
  }),
}));

export const ppobCategoryRelations = relations(ppobCategoryTable, ({ one, many }) => ({
  products: many(ppobProductTable),

  parent: one(ppobCategoryTable, {
    fields: [ppobCategoryTable.catParent],
    references: [ppobCategoryTable.catId],
    relationName: "ppob_category_parent_child",
  }),
  child: many(ppobCategoryTable, {
    relationName: "ppob_category_parent_child",
  }),
}));

export const ppobProductRelations = relations(ppobProductTable, ({ one, many }) => ({
  category: one(ppobCategoryTable, {
    fields: [ppobProductTable.catId],
    references: [ppobCategoryTable.catId],
  }),

  vendors: many(ppobProductVendorTable),
  transactions: many(ppobTransTable),
}));

export const ppobProductVendorRelations = relations(ppobProductVendorTable, ({ one }) => ({
  product: one(ppobProductTable, {
    fields: [ppobProductVendorTable.ppobId],
    references: [ppobProductTable.ppobId],
  }),
}));

export const customerOmsetRelations = relations(customerOmsetTable, ({ one, many }) => ({
  customer: one(customerTable, {
    fields: [customerOmsetTable.customerId],
    references: [customerTable.customerId],
    relationName: "customer_omset_customer",
  }),

  master: one(customerTable, {
    fields: [customerOmsetTable.coMasterId],
    references: [customerTable.customerId],
    relationName: "customer_omset_master",
  }),

  dealer: one(customerOmsetTable, {
    fields: [customerOmsetTable.coDealerId],
    references: [customerOmsetTable.customerId],
    relationName: "customer_omset_dealer_hierarchy",
  }),
  childDealers: many(customerOmsetTable, {
    relationName: "customer_omset_dealer_hierarchy",
  }),

  transactions: many(ppobTransTable),
}));

export const customerAddressRelations = relations(customerAddressTable, ({ one }) => ({
  customer: one(customerTable, {
    fields: [customerAddressTable.customerId],
    references: [customerTable.customerId],
  }),
  city: one(rajaongkirCityTable, {
    fields: [customerAddressTable.rCityId],
    references: [rajaongkirCityTable.rCityId],
  }),
  sicepat: one(shipmentCitySicepatTable, {
    fields: [customerAddressTable.rCityId],
    references: [shipmentCitySicepatTable.rCityId],
  }),
  jnt: one(shipmentCityJntTable, {
    fields: [customerAddressTable.rCityId],
    references: [shipmentCityJntTable.rCityId],
  }),
  idexpress: one(shipmentCityIdexpressTable, {
    fields: [customerAddressTable.rCityId],
    references: [shipmentCityIdexpressTable.rCityId],
  }),
  anteraja: one(shipmentCityAnterajaTable, {
    fields: [customerAddressTable.rCityId],
    references: [shipmentCityAnterajaTable.rCityId],
  }),
}));

export const deliveryPriceRelations = relations(deliveryPriceTable, ({ one }) => ({
  fromCity: one(rajaongkirCityTable, {
    fields: [deliveryPriceTable.dPriceFrom],
    references: [rajaongkirCityTable.rCityId],
  }),
  toCity: one(rajaongkirCityTable, {
    fields: [deliveryPriceTable.dPriceTo],
    references: [rajaongkirCityTable.rCityId],
  }),
}));

export const productPointRelations = relations(productPointTable, ({ one }) => ({
  product: one(productTable, {
    fields: [productPointTable.productId],
    references: [productTable.productId],
  }),
}));

export const rajaongkirCityRelations = relations(rajaongkirCityTable, ({ many }) => ({
  merchant: many(merchantTable),
  customerAddress: many(customerAddressTable),
  deliveryPricesFrom: many(deliveryPriceTable, {
    relationName: "from_city",
  }),
  deliveryPricesTo: many(deliveryPriceTable, {
    relationName: "to_city",
  }),
}));

export const flashsaleRelations = relations(flashsaleTable, ({ many }) => ({
  detail: many(flashsaleDetailTable),
}));

export const flashsaleDetailRelations = relations(flashsaleDetailTable, ({ one, many }) => ({
  flash_sale: one(flashsaleTable, {
    fields: [flashsaleDetailTable.fSaleId],
    references: [flashsaleTable.fSaleId],
  }),

  category: one(flashsaleCategoryTable, {
    fields: [flashsaleDetailTable.fsCategoryId],
    references: [flashsaleCategoryTable.fsCategoryId],
  }),

  product: one(productTable, {
    fields: [flashsaleDetailTable.productId],
    references: [productTable.productId],
  }),

  order_detail: many(orderDetailTable),
}));
