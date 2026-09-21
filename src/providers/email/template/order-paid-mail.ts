type City = {
  r_city_subdistrict?: string;
  r_city_name?: string;
  r_city_province?: string;
  r_city_postcode?: string;
};

type AddressPrimary = {
  c_address_address?: string;
  city?: City;
};

type Merchant = {
  merchant_name?: string;
  address_primary?: AddressPrimary;
};

type OrderDetailItem = {
  o_detail_product_image?: string;
  o_detail_product_name?: string;
  o_detail_qty?: number;
  o_detail_product_price?: number;
  o_detail_subtotal?: number;
};

type OrderItem = {
  order_number?: string;
  order_shipment_address?: string;
  merchant?: Merchant;
  order_detail?: OrderDetailItem[];
};

type Whitelabel = {
  c_whitelabel_logo?: string;
  c_whitelabel_facebook?: string;
  c_whitelabel_youtube?: string;
  c_whitelabel_twitter?: string;
  c_whitelabel_instagram?: string;
};

type Customer = {
  customer_name?: string;
  customer_msisdn?: string;
};

export type MailV2Order = {
  o_payment_code?: string;
  o_payment_name?: string;
  o_payment_total?: number;
  o_payment_subtotal?: number;
  o_payment_service?: number;
  o_payment_admin_fee?: number;
  o_payment_create_date?: string; // "YYYY-MM-DD HH:mm:ss"
  customer?: Customer;
  whitelabel?: Whitelabel | null;
  order?: OrderItem[];
};

const formatIDR = (value: number) => {
  const n = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
  return `Rp ${n}`;
};

const parseSqlDateTime = (s?: string) => {
  if (!s) return new Date();
  const isoLike = s.replace(" ", "T"); // "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ss"
  const d = new Date(isoLike);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

const formatEmailDate = (sqlDate?: string) => {
  const d = parseSqlDateTime(sqlDate);
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("weekday")}, ${get("day")} ${get("month")} ${get("year")} ${get("hour")}:${get("minute")}`;
};

function merchantAddressText(orderItem: OrderItem) {
  const a = orderItem.merchant?.address_primary;
  const c = a?.city;
  return [
    a?.c_address_address,
    c?.r_city_subdistrict,
    c?.r_city_name,
    c?.r_city_province,
    c?.r_city_postcode,
  ]
    .filter(Boolean)
    .join(", ");
}

function logoHtml(order: MailV2Order, urlAsset: string) {
  const hasWL = !!order.whitelabel;
  const wlLogo = order.whitelabel?.c_whitelabel_logo;

  if (hasWL && wlLogo) {
    return `<img src="${urlAsset}/media/image/customer_wl/${wlLogo}" alt="" width="180" style="margin-bottom: 30px;">`;
  }

  return `<img src="https://s3.belanjapasti.com/media/image/logo.png" alt="ebelanja.id" width="140" style="margin-bottom: 30px;padding: 15px 0 10px 0px">`;
}

function socialHtml(order: MailV2Order) {
  const hasWL = !!order.whitelabel;

  if (!hasWL) {
    return `
      <table border="0" cellpadding="0" cellspacing="0" align="center" style="text-align: center;margin-top:20px;">
        <tr>
          <td>
            <a style="text-decoration: none;" target="_blank" href="https://www.facebook.com/ebelanja">
              <img style="margin-left: 5px;margin-right: 5px;" src="https://i.postimg.cc/pdR9qW6c/facebook.png" alt="">
            </a>
          </td>
          <td>
            <a style="text-decoration: none;" target="_blank" href="https://www.youtube.com/channel/UCqB2iiWqspNi2oM8nrJpRyw/featured">
              <img style="margin-left: 5px;margin-right: 5px;" src="https://i.postimg.cc/6qkqRtZ0/youtube.png" alt="">
            </a>
          </td>
          <td>
            <a style="text-decoration: none;" target="_blank" href="https://twitter.com/belanjapasti">
              <img style="margin-left: 5px;margin-right: 5px;" src="https://i.postimg.cc/mkzhttPk/twitter.png" alt="">
            </a>
          </td>
          <td>
            <a style="text-decoration: none;" target="_blank" href="https://www.instagram.com/ebelanja_id">
              <img style="margin-left: 5px;margin-right: 5px;" src="https://i.postimg.cc/G2SHLkh6/instagram-logo-round.png" alt="">
            </a>
          </td>
        </tr>
      </table>
    `;
  }

  return `
    <table border="0" cellpadding="0" cellspacing="0" align="center" style="text-align: center;margin-top:20px;">
      <tr>
        <td>
          <a style="text-decoration: none;" target="_blank" href="${order.whitelabel?.c_whitelabel_facebook ?? "#"}">
            <img style="margin-left: 5px;margin-right: 5px;" src="https://i.postimg.cc/pdR9qW6c/facebook.png" alt="">
          </a>
        </td>
        <td>
          <a style="text-decoration: none;" target="_blank" href="${order.whitelabel?.c_whitelabel_youtube ?? "#"}">
            <img style="margin-left: 5px;margin-right: 5px;" src="https://i.postimg.cc/6qkqRtZ0/youtube.png" alt="">
          </a>
        </td>
        <td>
          <a style="text-decoration: none;" target="_blank" href="${order.whitelabel?.c_whitelabel_twitter ?? "#"}">
            <img style="margin-left: 5px;margin-right: 5px;" src="https://i.postimg.cc/mkzhttPk/twitter.png" alt="">
          </a>
        </td>
        <td>
          <a style="text-decoration: none;" target="_blank" href="${order.whitelabel?.c_whitelabel_instagram ?? "#"}">
            <img style="margin-left: 5px;margin-right: 5px;" src="https://i.postimg.cc/G2SHLkh6/instagram-logo-round.png" alt="">
          </a>
        </td>
      </tr>
    </table>
  `;
}

function footerCopyright(order: MailV2Order) {
  const year = new Date().getFullYear();
  return order.whitelabel
    ? `&copy; ${year}, Whitelabel`
    : `&copy; ${year}, PT Belanja Pasti Indonesia`;
}

function renderOrderItems(order: MailV2Order, urlAsset: string) {
  const paymentCode = order.o_payment_code ?? "-";
  const items = order.order ?? [];

  return items
    .map((orderItem) => {
      const orderNumber = orderItem.order_number ?? "-";
      const merchantName = orderItem.merchant?.merchant_name ?? "-";
      const addrFrom = merchantAddressText(orderItem);
      const addrTo = orderItem.order_shipment_address ?? "-";
      const custName = order.customer?.customer_name ?? "-";
      const custPhone = order.customer?.customer_msisdn ?? "-";

      const details = (orderItem.order_detail ?? [])
        .map((d) => {
          return `
            <tr>
              <td style="vertical-align:top;padding-bottom:10px">
                <table cellspacing="0" cellpadding="0">
                  <tbody>
                    <tr style="vertical-align:top">
                      <td style="width:60px;">
                        <img src="${urlAsset}/media/image/${d.o_detail_product_image ?? ""}" style="display:inline-block;width:60px;height:60px;border-radius:8px">
                      </td>
                      <td style="padding-left:10px">
                        <p style="margin:0 0 5px 0;color:rgba(49,53,59,0.96);line-height:1.4;font-size:12px">
                          ${d.o_detail_product_name ?? "-"}
                        </p>
                        <p style="color:rgba(49,53,59,0.96);margin:0 0 5px 0;font-weight:bold;font-size:12px">
                          ${d.o_detail_qty ?? 0} X ${formatIDR(d.o_detail_product_price ?? 0)}
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td style="vertical-align:top;text-align:right;width:120px;font-size:13px">
                <b>${formatIDR(d.o_detail_subtotal ?? 0)}</b>
              </td>
            </tr>
          `;
        })
        .join("");

      return `
        <tr>
          <td colspan="2">
            <p style="margin:0 0 10px 0">
              <span style="margin-right:5px;color:rgba(49,53,59,0.96);font-size: 14px;"><b>No. Invoice:</b></span>
              <a style="color:#5db300;text-decoration:none">
                ${paymentCode}/${orderNumber}
              </a>
            </p>
          </td>
        </tr>

        <tr>
          <td colspan="2">
            <p style="margin:0 0 25px 0">
              <span style="margin-right:5px;color:rgba(49,53,59,0.96);font-size: 14px;"><b>Toko:</b></span>
              <a style="color:#5db300;text-decoration:none;font-weight:bold;margin-right:5px">
                ${merchantName}
              </a>
            </p>
          </td>
        </tr>

        <tr>
          <td>
            <table cellspacing="0" cellpadding="0" style="width:100%">
              <tbody>
                ${details}
              </tbody>
            </table>
          </td>
        </tr>

        <tr>
          <td colspan="2">
            <table cellpadding="0" cellspacing="0" border="0" align="left" style="width: 100%;margin-top: 10px;margin-bottom: 10px;">
              <tbody>
                <tr style="align-items: flex-start;">
                  <td style="font-size: 13px; font-weight: 400; color: #444444; letter-spacing: 0.2px;width: 50%;" valign="top">
                    <span style="margin-right:5px;color:rgba(49,53,59,0.96);font-size: 14px;"><b>Alamat Pengirim</b></span>
                    <p style="text-align: left;font-weight: normal; font-size: 14px; color: #707070;line-height: 21px;margin-top: 0;">
                      ${addrFrom}
                    </p>
                  </td>

                  <td class="user-info" style="font-size: 13px; font-weight: 400; color: #444444; letter-spacing: 0.2px;width: 50%;" valign="top">
                    <span style="margin-right:5px;color:rgba(49,53,59,0.96);font-size: 14px;"><b>Alamat Tujuan</b></span>
                    <p style="text-align: left;font-weight: normal; font-size: 14px; color: #707070;line-height: 21px;margin-top: 0;">
                      <b>${custName}</b>
                      ${addrTo}
                      (Telp: ${custPhone})
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>

        <tr>
          <td colspan="3" style="border-top: 1px solid #ddd;"><br></td>
        </tr>
      `;
    })
    .join("");
}

export function orderPaidMail(params: { order: MailV2Order; urlAsset: string }) {
  const { order, urlAsset } = params;

  const paymentCode = order.o_payment_code ?? "-";
  const custName = order.customer?.customer_name ?? "-";
  const createdAt = formatEmailDate(order.o_payment_create_date);

  const orderRows = renderOrderItems(order, urlAsset);

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Pesanan #${paymentCode} | eBelanja.id</title>
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans&family=Roboto:wght@300;400;700;900&display=swap" rel="stylesheet ">
</head>

<body style="margin: 0;">
<div style="font-family: 'Roboto', sans-serif;background-color: #e2e2e2;font-size: 17px;">
  <div style="margin: 20px auto;margin: 0 auto;width: 650px;padding: 20px 20px;">
    <table border="0" cellpadding="0" cellspacing="0" style="padding: 0 30px;background-color: #fff; -webkit-box-shadow: 0px 0px 14px -4px rgba(0, 0, 0, 0.2705882353);box-shadow: 0px 0px 14px -4px rgba(0, 0, 0, 0.2705882353);width: 100%;border-radius: 10px 10px 0 0;">
      <tbody>
        <tr>
          <td>
            <table border="0" cellpadding="0" cellspacing="0" style="margin-top:20px;">
              <tr>
                <td>
                  ${logoHtml(order, urlAsset)}
                </td>
              </tr>
            </table>

            <table align="center" cellpadding="0" cellspacing="0" style="margin-top:20px;">
              <tr>
                <td style="text-align: center;">
                  <img src="https://i.postimg.cc/KjwkNt6t/check.png">
                </td>
              </tr>
              <tr>
                <td>
                  <h2 style="color: #444444;font-size: 22px;font-weight: bold;margin-top: 10px;margin-bottom: 10px;padding-bottom: 0;text-transform: uppercase;display: inline-block;line-height: 1;">Pembayaran Berhasil</h2>
                </td>
              </tr>
            </table>

            <p style="margin: 30px 0 5px 0;font-size:14px;">Hai <b>${custName}</b>,</p>
            <p style="margin: 0px 0 0 0;font-size:14px;">Pembayaran terverifikasi dan pesanan telah diteruskan ke penjual</p>

            <table border="0" cellpadding="0" cellspacing="0" style="margin-top:20px;">
              <tr>
                <td>
                  <h5 style="color: #444444;font-size: 18px;font-weight: bold;margin-top: 10px;margin-bottom: 10px;padding-bottom: 0;display: inline-block;line-height: 1;">Detail Pembayaran</h5>
                </td>
              </tr>
            </table>

            <table style="background:#f3f4f5;border-radius:8px;padding:20px;width:100%" cellspacing="0" cellpadding="0">
              <tbody>
                <tr style="vertical-align:top;padding-bottom:10px">
                  <td width="30%" style="padding:0 0 15px 0">
                    <p style="color:rgba(49,53,59,0.68);font-size:12px;margin:0">Total Bayar</p>
                  </td>
                  <td width="70%" style="padding:0 0 15px 0">
                    <p style="margin:0">
                      <b style="color:#fa591d;font-size:14px">${formatIDR(order.o_payment_total ?? 0)}</b>
                    </p>
                  </td>
                </tr>

                <tr style="vertical-align:top">
                  <td width="30%" style="padding:0 0 15px 0">
                    <p style="color:rgba(49,53,59,0.68);font-size:12px;margin:0">Metode Pembayaran</p>
                  </td>
                  <td width="70%" style="padding:0 0 15px 0">
                    <p style="margin:0">
                      <span style="color:rgba(49,53,59,0.96);font-weight:bold;font-size:14px">
                        ${order.o_payment_name ?? "-"}
                      </span>
                    </p>
                  </td>
                </tr>

                <tr style="vertical-align:top">
                  <td width="30%">
                    <p style="color:rgba(49,53,59,0.68);font-size:12px;margin:0">Waktu Pembayaran</p>
                  </td>
                  <td width="70%">
                    <p style="margin:0;font-weight:bold;font-size:14px;color:rgba(49,53,59,0.96)">
                      ${createdAt} WIB
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>

            <p style="margin: 20px 0 20px 0;font-size:14px;">*Jangan menginformasikan bukti dan data pembayaran kepada pihak manapun kecuali eBelanja.id</p>

            <table border="0" cellpadding="0" cellspacing="0" style="margin-top:20px;">
              <tr>
                <td>
                  <h5 style="color: #444444;font-size: 18px;font-weight: bold;margin-top: 10px;margin-bottom: 10px;padding-bottom: 0;display: inline-block;line-height: 1;">Detail Pembayaran</h5>
                </td>
              </tr>
            </table>

            <table border="0" cellpadding="0" cellspacing="0" align="left" style="margin:0 0 20px 0;width: 100%;">
              <tr>
                <td colspan="2" style="line-height: 35px;font-size: 13px;color: #707070;text-align:left;border-right: unset;border-collapse: collapse;">Subtotal:</td>
                <td colspan="3" class="price" style=" line-height: 35px;text-align: right;padding-right: 0px;font-size: 13px;color: #000000;text-align:right;border-left: unset;border-collapse: collapse;">
                  <b>${formatIDR(order.o_payment_subtotal ?? 0)}</b>
                </td>
              </tr>

              <tr>
                <td colspan="2" style="line-height: 35px;font-size: 13px;color: #707070;text-align:left;border-right: unset;border-collapse: collapse;">Diskon :</td>
                <td colspan="3" class="price" style="line-height: 35px;text-align: right;padding-right: 0px;font-size: 13px;color: #000000;text-align:right;border-left: unset;border-collapse: collapse;">
                  <b>Rp -${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(0)}</b>
                </td>
              </tr>

              <tr>
                <td colspan="2" style="line-height: 35px;font-size: 13px;color: #707070;text-align:left;border-right: unset;border-collapse: collapse;">Ongkir :</td>
                <td colspan="3" class="price" style="line-height: 35px;text-align: right;padding-right: 0px;font-size: 13px;color: #000000;text-align:right;border-left: unset;border-collapse: collapse;">
                  <b>${formatIDR(order.o_payment_service ?? 0)}</b>
                </td>
              </tr>

              <tr>
                <td colspan="2" style="line-height: 35px;font-size: 13px;color: #707070;text-align:left;border-right: unset;border-collapse: collapse;padding-bottom: 20px;">Biaya Layanan :</td>
                <td colspan="3" class="price" style="line-height: 35px;text-align: right;padding-right: 0px;font-size: 13px;color: #000000;text-align:right;border-left: unset;border-collapse: collapse;">
                  <b>${formatIDR(order.o_payment_admin_fee ?? 0)}</b>
                </td>
              </tr>

              <tr><td colspan="3" style="border-top: 1px solid #ddd;"><br></td></tr>

              <tr>
                <td colspan="2" style="line-height: 35px;font-size: 13px;color: #000000;text-align:left;border-right: unset;border-collapse: collapse;"><b>Total Belanja</b></td>
                <td colspan="3" class="price" style="line-height: 30px;text-align: right;padding-right: 0px;font-size: 13px;color: #000000;text-align:right;border-left: unset;border-collapse: collapse;color: #FA591D">
                  <b>${formatIDR(order.o_payment_total ?? 0)}</b>
                </td>
              </tr>
            </table>

            <table border="0" cellpadding="0" cellspacing="0" style="margin:20px 0 10px 0;">
              <tr>
                <td>
                  <h5 style="color: #444444;font-size: 18px;font-weight: bold;margin-top: 10px;margin-bottom: 10px;padding-bottom: 0;display: inline-block;line-height: 1;">Rincian Pesanan</h5>
                </td>
              </tr>
            </table>

            <table border="0" cellpadding="0" cellspacing="0" align="left" style="margin:0 0 20px 0;width: 100%;">
              ${orderRows}
            </table>

          </td>
        </tr>
      </tbody>
    </table>

    <table style="text-align: center;background-color: #fafafa;border-radius: 0 0 10px 10px;" align="center" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding: 30px;">
          <div>
            <h4 style="color: #444444;font-size: 22px;font-weight: bold;margin-top: 10px;margin-bottom: 10px;padding-bottom: 0;text-transform: uppercase;display: inline-block;line-height: 1;margin:0;text-align: center;">Ikuti kami</h4>
          </div>

          ${socialHtml(order)}

          <div style="border-top: 1px solid #ddd; margin: 20px auto 0;"></div>
          <table style="margin-top:20px;" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td><p style="font-size:13px; margin:0;">${footerCopyright(order)}</p></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

  </div>
</div>
</body>
</html>`;
}
