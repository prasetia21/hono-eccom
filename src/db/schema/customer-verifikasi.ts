import { pgTable, bigint, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { enumCvPks, enumCvStatus, enumStatus1660 } from "./enums";

export const customerVerifikasiTable = pgTable(
  "_customer_verifikasi",
  {
    cvId: bigint("cv_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    customerId: bigint("customer_id", { mode: "number" }),
    cvName: varchar("cv_name", { length: 50 }),
    cvNik: varchar("cv_nik", { length: 16 }),
    cvNpwp: varchar("cv_npwp", { length: 255 }),
    cvWhatsapp: varchar("cv_whatsapp", { length: 20 }),
    cvAdress: text("cv_adress"),
    cvLatitude: text("cv_latitude"),
    cvLongitude: text("cv_longitude"),
    cvFileKtp: text("cv_file_ktp"),
    cvFileSelfie: text("cv_file_selfie"),
    cvPks: enumCvPks("cv_pks").default("tidak"),
    cvQris: enumCvPks("cv_qris").default("tidak"),
    cvStatus: enumCvStatus("cv_status"),
    topupEdc: enumStatus1660("topup_edc").default("non-active"),
    cvRejectNote: text("cv_reject_note"),
    cvCreateDate: timestamp("cv_create_date", { withTimezone: true }),
    cvActiveDate: timestamp("cv_active_date", { withTimezone: true }),
  },
  (t) => ({
    customerIdx: index("_customer_verifikasi_Index 2").on(t.customerId),
    createDateIdx: index("_customer_verifikasi_cv_create_date").on(t.cvCreateDate.desc()),
    statusIdx: index("_customer_verifikasi_cv_status").on(t.cvStatus),
  }),
);

export type CustomerVerifikasi = typeof customerVerifikasiTable.$inferSelect;
export type NewCustomerVerifikasi = typeof customerVerifikasiTable.$inferInsert;
