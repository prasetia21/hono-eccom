import { and, eq, sql } from "drizzle-orm";
import { customerTable } from "@/db/schema";
import { db } from "@/libs/postgresql";

type AuthData = {
  customer_id: string;
  c_wallet_status: "active" | string;
  sm_key?: string | null;
};

export class BalanceService {
  async get(authData: AuthData, plusLimit = false): Promise<number> {
    let balance = 0;

    const customerId = Number(authData.customer_id);
    if (!Number.isFinite(customerId)) throw new Error("Invalid customer_id");

    const row = await db
      .select()
      .from(customerTable)
      .where(
        and(eq(customerTable.customerId, customerId), eq(customerTable.customerStatus, "active")),
      )
      .limit(1);

    const dataCus = row[0];

    if (dataCus && dataCus.customerWallet === "1" && authData.c_wallet_status === "active") {
      balance = await this.getSaldo(authData.customer_id);

      if (plusLimit) {
        if (dataCus.customerMinus === "1") {
          const saldoMinus = Number(dataCus.customerMinus ?? 0);

          if (saldoMinus > 0 && dataCus.customerSmKey === (authData.sm_key ?? null)) {
            balance += saldoMinus;
          }
        }
      }
    }

    return balance;
  }

  async get_balance(customerId: string): Promise<number> {
    return await this.getSaldo(customerId);
  }

  async getSaldo(customerId: string) {
    const q = sql`
            SELECT (
                       COALESCE(_deposit.deposit_total, 0) +
                       COALESCE(_summary.s_bonus_total, 0) +
                       COALESCE(_ppob_cashback.cashback_total, 0) +
                       COALESCE(_ppob_master.bonus_master, 0) +
                       COALESCE(_ppob_dealer.bonus_dealer, 0) +
                       COALESCE(_tf_in.transfer_in, 0) +
                       COALESCE(_train_cashback.train_cashback, 0) +
                       COALESCE(_train_master.train_master, 0) +
                       COALESCE(_ord_refund.order_refund_total, 0) +
                       COALESCE(_wd.withdraw_total, 0) -
                       COALESCE(_summary.s_ppob_total, 0) -
                       COALESCE(_ppob_trx.ppob_total, 0) -
                       COALESCE(_tf_out.transfer_out, 0) -
                       COALESCE(_ord.order_total, 0) -
                       COALESCE(_train.train_total, 0) -
                       COALESCE(_ads.ads_total, 0)
                       ) AS total
            FROM \`_customer\` c
                     LEFT JOIN (SELECT customer_id,
                                       COALESCE(SUM(pt_summary_price + pt_summary_admin), 0) AS s_ppob_total,
                                       COALESCE(SUM(
                                                        pt_summary_margin_master +
                                                        pt_summary_margin_dealer +
                                                        pt_summary_markup_master +
                                                        pt_summary_markup_dealer +
                                                        pt_summary_cashback_master +
                                                        pt_summary_cashback_dealer +
                                                        pt_summary_cashback_trans
                                                ), 0) AS s_bonus_total
                                FROM \`_ppob_trans_summary\`
                                WHERE MD5(MD5(CONCAT(MD5(customer_id), pt_summary_count, pt_summary_date,
                                                     MD5(CONCAT(pt_summary_date, pt_summary_end_date,
                                                                pt_summary_start_date, customer_id, pt_summary_price,
                                                                pt_summary_admin, pt_summary_margin_company,
                                                                pt_summary_margin_master, pt_summary_margin_dealer,
                                                                pt_summary_markup_company, pt_summary_markup_master,
                                                                pt_summary_markup_dealer, pt_summary_cashback_company,
                                                                pt_summary_cashback_master, pt_summary_cashback_dealer,
                                                                pt_summary_cashback_trans))))) = BINARY pt_summary_key
                                  AND customer_id = ${customerId}) AS _summary
                                ON c.customer_id = _summary.customer_id
                     LEFT JOIN (SELECT customer_id, SUM(deposit_amount) AS deposit_total
                                FROM \`_customer_deposit\`
                                WHERE deposit_status = 'success'
                                  AND deposit_amount >= 0
                                  AND MD5(
                                              MD5(
                                                      CONCAT(
                                                              deposit_status,
                                                              customer_id,
                                                              deposit_id,
                                                              BINARY MD5(deposit_bank_to),
                                                              MD5(MD5(deposit_create_date)),
                                                              deposit_amount
                                                      )
                                              )
                                      ) = BINARY deposit_key
                                  AND customer_id = ${customerId}) AS _deposit
                                ON c.customer_id = _deposit.customer_id
                     LEFT JOIN (SELECT customer_id,
                                       COALESCE(SUM(ppob_trans_price + ppob_trans_admin_bank), 0) AS ppob_total
                                FROM \`_ppob_trans\`
                                WHERE ppob_trans_status IN ('pending', 'success')
                                  AND ppob_trans_price >= 0
                                  AND ppob_trans_admin_bank >= 0
                                  AND customer_id = ${customerId}) AS _ppob_trx
                                ON c.customer_id = _ppob_trx.customer_id
                     LEFT JOIN (SELECT customer_id, COALESCE(SUM(ppob_trans_cashback_trans), 0) AS cashback_total
                                FROM \`_ppob_trans\`
                                WHERE ppob_trans_status = 'success'
                                  AND ppob_trans_cashback_trans >= 0
                                  AND customer_id = ${customerId}) AS _ppob_cashback
                                ON c.customer_id = _ppob_cashback.customer_id
                     LEFT JOIN (SELECT master_id,
                                       SUM(ppob_trans_margin_master + ppob_trans_cashback_master +
                                           ppob_trans_markup_master) AS bonus_master
                                FROM \`_ppob_trans\`
                                WHERE ppob_trans_status = 'success'
                                  AND master_id = ${customerId}) AS _ppob_master
                                ON c.customer_id = _ppob_master.master_id
                     LEFT JOIN (SELECT dealer_id,
                                       SUM(ppob_trans_margin_dealer + ppob_trans_cashback_dealer +
                                           ppob_trans_markup_dealer) AS bonus_dealer
                                FROM \`_ppob_trans\`
                                WHERE ppob_trans_status = 'success'
                                  AND dealer_id = ${customerId}) AS _ppob_dealer
                                ON c.customer_id = _ppob_dealer.dealer_id
                     LEFT JOIN (SELECT customer_from, COALESCE(SUM(transfer_amount), 0) AS transfer_out
                                FROM \`_transfer_saldo\`
                                WHERE transfer_amount >= 0
                                  AND MD5(MD5(CONCAT(transfer_amount, MD5(customer_from), transfer_id,
                                      MD5(MD5(transfer_create_date)), customer_to))) = BINARY transfer_key
                                  AND customer_from = ${customerId}) AS _tf_out
                                ON c.customer_id = _tf_out.customer_from
                     LEFT JOIN (SELECT customer_to, COALESCE(SUM(transfer_amount), 0) AS transfer_in
                                FROM \`_transfer_saldo\`
                                WHERE transfer_amount >= 0
                                  AND MD5(MD5(CONCAT(transfer_amount, MD5(customer_from), transfer_id,
                                      MD5(MD5(transfer_create_date)), customer_to))) = BINARY transfer_key
                                  AND customer_to = ${customerId}) AS _tf_in
                                ON c.customer_id = _tf_in.customer_to
                     LEFT JOIN (SELECT customer_id, COALESCE(SUM(order_total), 0) AS order_total
                                FROM \`_order\`
                                WHERE order_status IN ('paid', 'process', 'pickup', 'finish', 'refund')
                                  AND order_payment_type = 'balance'
                                  AND order_total >= 0
                                  AND customer_id = ${customerId}) AS _ord
                                ON c.customer_id = _ord.customer_id
                     LEFT JOIN (SELECT customer_id, COALESCE(SUM(order_total), 0) AS order_refund_total
                                FROM \`_order\`
                                WHERE order_status = 'refund'
                                  AND order_total >= 0
                                  AND customer_id = ${customerId}) AS _ord_refund
                                ON c.customer_id = _ord_refund.customer_id
                     LEFT JOIN (SELECT customer_id, COALESCE(SUM(t_payment_total), 0) AS train_total
                                FROM \`_train_payment\`
                                WHERE t_payment_status IN ('pending', 'success')
                                  AND t_payment_total >= 0
                                  AND customer_id = ${customerId}) AS _train
                                ON c.customer_id = _train.customer_id
                     LEFT JOIN (SELECT customer_id, COALESCE(SUM(t_payment_cashback), 0) AS train_cashback
                                FROM \`_train_payment\`
                                WHERE t_payment_status = 'success'
                                  AND t_payment_cashback >= 0
                                  AND customer_id = ${customerId}) AS _train_cashback
                                ON c.customer_id = _train_cashback.customer_id
                     LEFT JOIN (SELECT master_id, SUM(t_payment_cashback_master) AS train_master
                                FROM \`_train_payment\`
                                WHERE t_payment_status = 'success'
                                  AND master_id = ${customerId}) AS _train_master
                                ON c.customer_id = _train_master.master_id
                     LEFT JOIN (SELECT dealer_id, SUM(t_payment_cashback_dealer) AS train_dealer
                                FROM \`_train_payment\`
                                WHERE t_payment_status = 'success'
                                  AND dealer_id = ${customerId}) AS _train_dealer
                                ON c.customer_id = _train_dealer.dealer_id
                     LEFT JOIN (SELECT customer_id, SUM(a_bill_amount) AS ads_total
                                FROM \`_adds_bill\`
                                         JOIN _adds ON _adds_bill.adds_id = _adds.adds_id
                                WHERE a_bill_status in ('pending', 'success')
                                  AND customer_id = ${customerId}) AS _ads
                                ON c.customer_id = _ads.customer_id
                     LEFT JOIN (SELECT customer_id, SUM(withdraw_amount) AS withdraw_total
                                FROM \`_withdraw_ecommerce\`
                                WHERE withdraw_wallet = 'balance'
                                  AND withdraw_status = 'finish'
                                  AND withdraw_amount > 0
                                  AND customer_id = ${customerId}) AS _wd
                                ON c.customer_id = _wd.customer_id
            WHERE c.customer_id = ${customerId} LIMIT 1
        `;

    const [rows] = (await db.execute(q)) as unknown as [Array<{ total: number | null }>, any];

    const total = rows?.[0]?.total ?? 0;

    return Number(total);
  }
}
