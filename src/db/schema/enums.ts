import { pgEnum } from "drizzle-orm/pg-core";

export const enumZeroOne = pgEnum("enum_adds_premium", ["0", "1"]);
export const enumContentStatus = pgEnum("enum_content_status", [
  "new",
  "publish",
  "draft",
  "reject",
]);
export const enumContentType = pgEnum("enum_content_type", ["ebelanja", "topup", "gadgetgo"]);
export const enumMediaType = pgEnum("enum_media_type", [
  "image",
  "document",
  "audio",
  "video",
  "360",
]);
export const enumContactStatus = pgEnum("enum_contact_status", [
  "new",
  "replied",
  "forward",
  "read",
]);
export const enumCWhitelabelMerchantProduct = pgEnum("enum_c_whitelabel_merchant_product", [
  "all",
  "self",
]);
export const enumStatus1660 = pgEnum("enum_status_1660", ["active", "non-active"]);
export const enumCWhitelabelType = pgEnum("enum_c_whitelabel_type", ["sales", "whitelabel"]);
export const enumCWhitelabelMarkupType = pgEnum("enum_c_whitelabel_markup_type", [
  "margin",
  "price",
]);
export const enumMerchantPlatform = pgEnum("enum_merchant_platform", [
  "all",
  "ebelanja",
  "gadgetgo",
]);
export const enumCWhitelabelStatus = pgEnum("enum_c_whitelabel_status", ["active", "non-active"]);
export const enumProductCondition = pgEnum("enum_product_condition", ["baru", "bekas"]);
export const enumProductStatus = pgEnum("enum_product_status", [
  "new",
  "publish",
  "draft",
  "block",
  "delete",
]);
export const enumProductGrade = pgEnum("enum_product_grade", ["s", "a", "b", "c"]);
export const enumAttrFormType = pgEnum("enum_attr_form_type", [
  "text",
  "number",
  "email",
  "textarea",
  "texteditor",
  "date",
  "checkbox",
  "radio",
  "select",
]);
export const enumPmTopupMetodePay = pgEnum("enum_pm_topup_metode_pay", ["1", "0"]);
export const enumCatPlatform = pgEnum("enum_cat_platform", ["ebelanja", "gadgetgo"]);
export const enumPsGrade = pgEnum("enum_ps_grade", ["s", "a", "b", "c"]);
export const enumODetailStatus = pgEnum("enum_o_detail_status", ["ok", "cancel", "refund"]);
export const enumOrderPaymentType = pgEnum("enum_order_payment_type", [
  "balance",
  "cod",
  "transfer",
  "va",
  "debit",
  "retail",
]);
export const enumOrderShipmentType = pgEnum("enum_order_shipment_type", ["driver", "courier"]);
export const enumOrderShipmentCost = pgEnum("enum_order_shipment_cost", ["merchant", "ebelanja"]);
export const enumOrderStatus = pgEnum("enum_order_status", [
  "pending_payment",
  "paid",
  "process",
  "pickup",
  "finish",
  "cancel",
  "refund",
]);
export const enumCartStatus = pgEnum("enum_cart_status", ["on", "off"]);
export const enumCustomerLevel = pgEnum("enum_customer_level", ["master", "dealer", "agent"]);
export const enumCustomerGender = pgEnum("enum_customer_gender", ["Pria", "Wanita"]);
export const enumBankStatusPajak = pgEnum("enum_bank_status_pajak", ["rfak", "rmi"]);
export const enumCustomerBisnisType = pgEnum("enum_customer_bisnis_type", [
  "counter",
  "personal",
  "warung",
  "minimarket",
  "loketppob",
]);
export const enumCustomerTfSaldo = pgEnum("enum_customer_tf_saldo", ["close", "open", "downline"]);
export const enumCustomerStatus = pgEnum("enum_customer_status", [
  "new",
  "active",
  "block",
  "delete",
]);

export const customerOtpSectionEnum = pgEnum("enum_c_otp_status", [
  "signup",
  "signin",
  "withdraw",
  "verification",
  "delete",
  "wallet",
]);

export const customerOtpWebSectionEnum = pgEnum("enum_cw_otp_section", [
  "signup",
  "signin",
  "withdraw",
  "verification",
]);

export const customerOtpStatusEnum = pgEnum("enum_c_otp_status", [
  "new",
  "using",
  "used",
  "expirated",
]);

export const enumCSimStatus = pgEnum("enum_c_sim_status", ["active", "block"]);

export const enumPpobTransStatus = pgEnum("enum_ppob_trans_status", [
  "pending_payment",
  "pending",
  "booking",
  "success",
  "failed",
  "refund",
]);
export const enumPpobInjectType = pgEnum("enum_ppob_inject_type", ["margin", "cashback", "persen"]);
export const enumDepositType = pgEnum("enum_deposit_type", ["topup", "payment", "ppob"]);
export const enumDepositMethod = pgEnum("enum_deposit_method", [
  "transfer",
  "retail",
  "va",
  "cash",
  "direct_debit",
  "qris",
]);
export const enumDepositTaxStatus = pgEnum("enum_deposit_tax_status", ["normal", "rfak", "rmi"]);
export const enumDepositStatus = pgEnum("enum_deposit_status", [
  "new",
  "pending",
  "success",
  "cancel",
  "pending_acc",
]);
export const enumTPaymentType = pgEnum("enum_t_payment_type", ["wallet", "transfer"]);
export const enumTPaymentStatus = pgEnum("enum_t_payment_status", [
  "pending",
  "success",
  "cancel",
  "refund",
]);
export const enumCTransferStatus = pgEnum("enum_c_transfer_status", [
  "new",
  "pending",
  "success",
  "cancel",
]);
export const enumDepositType7025 = pgEnum("enum_deposit_type_7025", ["customer", "merchant"]);
export const enumWithdrawWallet = pgEnum("enum_withdraw_wallet", ["transfer", "balance"]);
export const enumWithdrawStatus = pgEnum("enum_withdraw_status", [
  "new",
  "process",
  "finish",
  "cancel",
]);
export const enumAddsCondition = pgEnum("enum_adds_condition", ["new", "second"]);
export const enumAddsStatus = pgEnum("enum_adds_status", [
  "pending",
  "publish",
  "draft",
  "block",
  "delete",
]);
export const enumPpobModel = pgEnum("enum_ppob_model", ["topup", "ppob"]);
export const enumPpobType = pgEnum("enum_ppob_type", ["margin", "cashback"]);
export const enumPpobStatusTransaction = pgEnum("enum_ppob_status_transaction", [
  "normal",
  "lambat",
]);
export const enumBannerStatus = pgEnum("enum_banner_status", ["publish", "draft"]);
export const enumCatModel = pgEnum("enum_cat_model", [
  "voucher",
  "pulsa",
  "pulsa-transfer",
  "game",
  "data",
  "inquiry",
  "payment",
  "emoney",
  "voucher-inject",
  "multi-voucher",
  "voucher-redeem",
]);

export const enumCatType = pgEnum("enum_cat_type", ["pembelian", "pembayaran"]);

export const enumCatStatusFee = pgEnum("enum_cat_status_fee", ["direct", "monthly"]);
export const enumABillStatus = pgEnum("enum_a_bill_status", ["pending", "success", "failed"]);

export const enumPvModel = pgEnum("enum_pv_model", [
  "pulsa",
  "game",
  "pln_pascabayar",
  "pln_prabayar",
  "pln_nontaglist",
  "telkom",
  "tv",
  "multi_finance",
  "pdam",
  "pdam_surabaya",
  "telepon_pascabayar",
  "asuransi",
  "kartu_kredit",
  "bpjsks",
  "bpjstk",
  "pertagas",
  "pgn",
  "pbb",
  "internet",
  "emoney",
  "esamsat",
]);

export const enumMessageType = pgEnum("enum_message_type", ["customer", "merchant"]);
export const enumMessageSection = pgEnum("enum_message_section", [
  "deposit",
  "ppob",
  "ecommerce",
  "other",
]);
export const enumMessageStatus = pgEnum("enum_message_status", ["open", "close"]);
export const enumMessageReplay = pgEnum("enum_replay_by_admin", ["1", "0"]);
export const enumFsDetailStatus = pgEnum("enum_fs_detail_status", [
  "active",
  "non-active",
  "out-stock",
]);
export const enumPcRecommendStatus = pgEnum("enum_pc_recommend_status", ["1", "0"]);
export const enumPaymentMethodGroup = pgEnum("enum_payment_method_group", [
  "retail",
  "va",
  "qris",
  "saldo",
  "cod",
]);
export const enumPaymentMethodStatus = pgEnum("enum_payment_method_status", ["1", "0"]);

export const enumPaymentType = pgEnum("enum_o_payment_type", [
  "balance",
  "cod",
  "transfer",
  "va",
  "debit",
  "retail",
  "qris",
]);

export const enumPaymentStatus = pgEnum("enum_o_payment_status", [
  "pending",
  "success",
  "cancel",
  "expired",
  "refund",
]);

export const enumPromoSection = pgEnum("enum_promo_section", ["cashback", "shipment"]);

export const enumPromoTypeValue = pgEnum("enum_promo_type_value", ["percent", "nominal"]);

export const enumPromoType = pgEnum("enum_promo_type", ["category", "product"]);

export const enumPromoPaymentMethod = pgEnum("enum_promo_payment_method", [
  "cod",
  "saldo",
  "debit",
]);

export const enumPromoVisible = pgEnum("enum_promo_visible", ["public", "private"]);

export const enumLimitStatus = pgEnum("enum_limit_status", ["pending", "accepted", "rejected"]);

export const enumCvStatus = pgEnum("enum_cv_status", ["pending", "reject", "active"]);

export const enumCvPks = pgEnum("enum_cv_pks", ["ya", "tidak"]);

export const enumPpobTransStatus3248 = pgEnum("enum_ppob_trans_status_3248", [
  "pending",
  "booking",
  "success",
  "failed",
  "refund",
]);

export const enumRLimitStatus = pgEnum("enum_r_limit_status", [
  "pending",
  "success",
  "cancel",
  "waiting_approval",
]);
