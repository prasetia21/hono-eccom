import { pgTable, bigint, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import {
  enumZeroOne,
  enumStatus1660,
  enumCWhitelabelType,
  enumCWhitelabelMerchantProduct,
  enumCWhitelabelMarkupType,
} from "./enums";

export const customerWhitelabelTable = pgTable(
  "_customer_whitelabel",
  {
    cWhitelabelId: bigint("c_whitelabel_id", { mode: "number" })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    customerId: bigint("customer_id", { mode: "number" }).notNull(),
    cWhitelabelName: varchar("c_whitelabel_name", { length: 50 }).notNull().default(""),
    cWhitelabelLogo: varchar("c_whitelabel_logo", { length: 50 }).notNull().default(""),
    cWhitelabelColor: varchar("c_whitelabel_color", { length: 50 }).notNull().default(""),
    cWhitelabelPackage: varchar("c_whitelabel_package", { length: 50 }).notNull().default(""),
    cWhitelabelVersion: varchar("c_whitelabel_version", { length: 10 }).notNull(),
    cWhitelabelPlaystore: text("c_whitelabel_playstore").notNull(),
    cWhitelabelReply: varchar("c_whitelabel_reply", { length: 50 }).notNull(),
    cWhitelabelAbout: text("c_whitelabel_about").notNull(),
    cWhitelabelTerm: text("c_whitelabel_term").notNull(),
    cWhitelabelPrivacy: text("c_whitelabel_privacy").notNull(),
    cWhitelabelCs: varchar("c_whitelabel_cs", { length: 50 }).notNull(),
    cWhitelabelWhatsapp: varchar("c_whitelabel_whatsapp", { length: 20 }),
    cWhitelabelEmail: varchar("c_whitelabel_email", { length: 50 }).notNull(),
    cWhitelabelPassword: varchar("c_whitelabel_password", { length: 225 }),
    cWhitelabelFacebook: varchar("c_whitelabel_facebook", { length: 50 }),
    cWhitelabelTwitter: varchar("c_whitelabel_twitter", { length: 50 }),
    cWhitelabelInstagram: varchar("c_whitelabel_instagram", { length: 50 }),
    cWhitelabelYoutube: varchar("c_whitelabel_youtube", { length: 50 }),
    cWhitelabelAdress: text("c_whitelabel_adress"),
    cWhitelabelUrlWeb: varchar("c_whitelabel_url_web", { length: 255 }),
    cWhitelabelCity: varchar("c_whitelabel_city", { length: 50 }),
    cWhitelabelProvince: varchar("c_whitelabel_province", { length: 50 }),
    cWhitelabelMarkup: enumZeroOne("c_whitelabel_markup").default("1"),
    cWhitelabelStatus: enumStatus1660("c_whitelabel_status").notNull(),
    cWhitelabelType: enumCWhitelabelType("c_whitelabel_type").notNull().default("whitelabel"),
    cWhitelabelOtp: text("c_whitelabel_otp"),
    cWhitelabelToken: varchar("c_whitelabel_token", { length: 100 }).notNull().default(""),
    cWhitelabelMerchantProduct: enumCWhitelabelMerchantProduct(
      "c_whitelabel_merchant_product",
    ).default("all"),
    cWhitelabelBanner: varchar("c_whitelabel_banner", { length: 100 }),
    cWhitelabelIframeGmaps: text("c_whitelabel_iframe_gmaps"),
    cWhitelabelMarkupArea: enumZeroOne("c_whitelabel_markup_area").default("1"),
    cWhitelabelMarkupType: enumCWhitelabelMarkupType("c_whitelabel_markup_type").default("margin"),
    cWhitelabelCreateDate: timestamp("c_whitelabel_create_date", { withTimezone: true }).notNull(),
    apiToken: text("api_token"),
    apiTokenUpdate: timestamp("api_token_update", { withTimezone: true }),
  },
  (t) => ({
    createDateIdx: index("_customer_whitelabel_c_whitelabel_create_date").on(
      t.cWhitelabelCreateDate.desc(),
    ),
    statusIdx: index("_customer_whitelabel_c_whitelabel_status").on(t.cWhitelabelStatus),
    tokenIdx: index("_customer_whitelabel_c_whitelabel_token").on(t.cWhitelabelToken),
    customerIdIdx: index("_customer_whitelabel_customer_id").on(t.customerId),
  }),
);

export type CustomerWhitelabel = typeof customerWhitelabelTable.$inferSelect;
export type NewCustomerWhitelabel = typeof customerWhitelabelTable.$inferInsert;
