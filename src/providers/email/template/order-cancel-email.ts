type Order = {
  order_number: string;
  order_cancel_note?: string;
  order_payment_type?: string;
  order_subtotal: number;
  order_shipment_price: number;
  order_total: number;
  order_shipment_address?: string;
  customer: {
    customer_name: string;
    customer_msisdn?: string;
  };
  merchant: {
    merchant_name: string;
    address_primary?: {
      c_address_address?: string;
      city?: {
        r_city_subdistrict?: string;
        r_city_name?: string;
        r_city_province?: string;
        r_city_postcode?: string;
      };
    };
  };
  whitelabel?: {
    c_whitelabel_logo?: string;
    c_whitelabel_facebook?: string;
    c_whitelabel_youtube?: string;
    c_whitelabel_twitter?: string;
    c_whitelabel_instagram?: string;
  };
  order_detail: Array<{
    o_detail_product_image: string;
    o_detail_product_name: string;
    o_detail_qty: number;
    o_detail_product_price: number;
    o_detail_subtotal: number;
  }>;
};

const formatIDR = (value: number) => {
  const n = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
  return `Rp ${n}`;
};

const paymentLabel = (type?: string) => {
  const t = (type ?? "").toLowerCase();
  return (t === "balance" ? "saldo" : (type ?? "-")).toUpperCase();
};

export function orderCancelledEmail(params: { order: Order; urlAsset: string }) {
  const { order, urlAsset } = params;
  const year = new Date().getFullYear();

  const hasWL = !!order.whitelabel;
  const wlLogo = order.whitelabel?.c_whitelabel_logo;

  const merchantAddr = [
    order.merchant?.address_primary?.c_address_address,
    order.merchant?.address_primary?.city?.r_city_subdistrict,
    order.merchant?.address_primary?.city?.r_city_name,
    order.merchant?.address_primary?.city?.r_city_province,
    order.merchant?.address_primary?.city?.r_city_postcode,
  ]
    .filter(Boolean)
    .join(", ");

  const productRows = order.order_detail
    .map((p) => {
      return `
        <tr>
          <td style="float: left;margin-bottom: 10px">
            <img src="${urlAsset}/media/image/${p.o_detail_product_image}" width="70" style="border-radius: 10px;display: block;margin: 0 auto;padding: 0;">
          </td>
          <td style="width: 60%;vertical-align: top">
            <p style="margin: 0 0 5px 0;padding: 0;">${p.o_detail_product_name}</p>
            <p style="margin: 0 0 5px 0;">
              <b>${p.o_detail_qty} X <span style="color: #FA591D">${formatIDR(p.o_detail_product_price)}</span></b>
            </p>
          </td>
          <td style="float: right;vertical-align: top;">
            <p style="color: #FA591D;margin: 0;font-weight: bold;vertical-align: top;margin-bottom: 55px;">
              ${formatIDR(p.o_detail_subtotal)}
            </p>
          </td>
        </tr>
      `;
    })
    .join("");

  const logoHtml = hasWL
    ? wlLogo
      ? `<img src="${urlAsset}/media/image/customer_wl/${wlLogo}" alt="" width="180" style="margin-bottom: 30px;">`
      : ""
    : `<img src="https://s3.exampleweb.com/media/image/logo.png" alt="eexample.id" width="140" style="margin-bottom: 30px;padding: 15px 0 10px 0px">`;

  const socialHtml = !hasWL
    ? `
      <table border="0" cellpadding="0" cellspacing="0" align="center" style="text-align: center;margin-top:20px;">
        <tr>
          <td>
            <a style="text-decoration: none;" target="_blank" href="https://www.facebook.com/eexample">
              <img style="margin-left: 5px;margin-right: 5px;" src="https://i.postimg.cc/pdR9qW6c/facebook.png" alt="">
            </a>
          </td>
          <td>
            <a style="text-decoration: none;" target="_blank" href="https://www.youtube.com/channel/UCqB2iiWqspNi2oM8nrJpRyw/featured">
              <img style="margin-left: 5px;margin-right: 5px;" src="https://i.postimg.cc/6qkqRtZ0/youtube.png" alt="">
            </a>
          </td>
          <td>
            <a style="text-decoration: none;" target="_blank" href="https://twitter.com/exampleweb">
              <img style="margin-left: 5px;margin-right: 5px;" src="https://i.postimg.cc/mkzhttPk/twitter.png" alt="">
            </a>
          </td>
          <td>
            <a style="text-decoration: none;" target="_blank" href="https://www.instagram.com/eexample_id">
              <img style="margin-left: 5px;margin-right: 5px;" src="https://i.postimg.cc/G2SHLkh6/instagram-logo-round.png" alt="">
            </a>
          </td>
        </tr>
      </table>
    `
    : `
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

  const footerCopyright = hasWL
    ? `&copy; ${year}, Whitelabel`
    : `&copy; ${year}, PT Belanja Pasti Indonesia`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Pesanan #${order.order_number} | eBelanja.id</title>
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
                <tr><td>${logoHtml}</td></tr>
              </table>

              <table align="center" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="text-align: center;">
                    <img src="https://i.postimg.cc/43s5vDn7/x-mark.png">
                  </td>
                </tr>
                <tr>
                  <td>
                    <h2 style="color: #444444;font-size: 22px;font-weight: bold;margin-top: 10px;margin-bottom: 10px;padding-bottom: 0;text-transform: uppercase;display: inline-block;line-height: 1;">Pesanan Dibatalkan</h2>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 5px 0;">Hai <b>${order.customer.customer_name}</b>,</p>
              <p style="margin: 0px 0 0 0;">Pesanan anda telah dibatalkan, dana akan segera dikembalikan.</p>

              <p style="margin: 15px 0 0 0;">No. Invoice: <span style="color:#5DB300;font-weight:bold">${order.order_number}</span></p>
              <p style="margin: 10px 0 0 0;">Catatan: <span style="color:#FF4C4C;font-weight:bold">${order.order_cancel_note ?? "-"}</span></p>
              <p style="margin: 10px 0 0 0;">Toko: <b style="color:#5DB300">${order.merchant.merchant_name}</b></p>

              <table border="0" cellpadding="0" cellspacing="0" align="left" style="margin-top:20px;margin-bottom: 20px;width: 100%;">
                ${productRows}
                <tr>
                  <td colspan="3" style="border-top: 1px solid #ddd;"><br></td>
                </tr>

                <tr>
                  <td colspan="2" style="line-height: 35px;font-size: 13px;color: #000000;text-align:left;border-right: unset;border-collapse: collapse;">
                    Metode Pembayaran :</td>
                  <td colspan="3" class="price" style="line-height: 35px;text-align: right;padding-right: 28px;font-size: 13px;color: #000000;text-align:right;border-left: unset;border-collapse: collapse;">
                    <b style="color:#FA591D">${paymentLabel(order.order_payment_type)}</b>
                  </td>
                </tr>

                <tr>
                  <td colspan="2" style="line-height: 35px;font-size: 13px;color: #000000;text-align:left;border-right: unset;border-collapse: collapse;">
                    Subtotal:</td>
                  <td colspan="3" class="price" style=" line-height: 35px;text-align: right;padding-right: 28px;font-size: 13px;color: #000000;text-align:right;border-left: unset;border-collapse: collapse;">
                    <b>${formatIDR(order.order_subtotal)}</b>
                  </td>
                </tr>

                <tr>
                  <td colspan="2" style="line-height: 35px;font-size: 13px;color: #000000;text-align:left;border-right: unset;border-collapse: collapse;">
                    Diskon :</td>
                  <td colspan="3" class="price" style="line-height: 35px;text-align: right;padding-right: 28px;font-size: 13px;color: #000000;text-align:right;border-left: unset;border-collapse: collapse;">
                    <b>Rp -${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(0)}</b>
                  </td>
                </tr>

                <tr>
                  <td colspan="2" style="border-bottom: 1px solid #ddd;line-height: 35px;font-size: 13px;color: #000000;text-align:left;border-right: unset;border-collapse: collapse;padding-bottom: 20px;">Ongkir :</td>
                  <td colspan="3" class="price" style="border-bottom: 1px solid #ddd;line-height: 35px;text-align: right;padding-right: 28px;font-size: 13px;color: #000000;text-align:right;border-left: unset;border-collapse: collapse;">
                    <b>${formatIDR(order.order_shipment_price)}</b>
                  </td>
                </tr>

                <tr>
                  <td colspan="2" style="line-height: 35px;font-size: 13px;color: #000000;text-align:left;border-right: unset;border-collapse: collapse;"><b>Total Belanja</b></td>
                  <td colspan="3" class="price" style="line-height: 30px;text-align: right;padding-right: 28px;font-size: 13px;color: #000000;text-align:right;border-left: unset;border-collapse: collapse;color: #FA591D">
                    <b>${formatIDR(order.order_total)}</b>
                  </td>
                </tr>
              </table>

              <h5 style="margin:0">Detail Pengembalian</h5>
              <table border="0" cellpadding="0" cellspacing="0" align="left" style="width: 100%;">
                <tr>
                  <td colspan="2" style="border-bottom: 1px solid #ddd;line-height: 40px;font-size: 13px;color: #000000;text-align:left;border-right: unset;border-collapse: collapse;">
                    Total Belanja</td>
                  <td colspan="3" class="price" style="border-bottom: 1px solid #ddd;line-height: 35px;text-align: right;padding-right: 28px;font-size: 13px;color: #000000;text-align:right;border-left: unset;border-collapse: collapse;">
                    <b>${formatIDR(order.order_total)}</b>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="line-height: 35px;font-size: 13px;color: #000000;text-align:left;border-right: unset;border-collapse: collapse;">
                    <h4 style="margin:0">Total Pengembalian</h4>
                  </td>
                  <td colspan="3" class="price" style="line-height: 30px;text-align: right;padding-right: 28px;font-size: 13px;color: #000000;text-align:right;border-left: unset;border-collapse: collapse;color: #FA591D">
                    <b>${formatIDR(order.order_total)}</b>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" border="0" align="left" style="width: 100%;margin-top: 30px;margin-bottom: 30px;">
                <tbody>
                  <tr>
                    <td style="font-size: 13px; font-weight: 400; color: #444444; letter-spacing: 0.2px;width: 50%;">
                      <h5 style="color: #444;text-align: left;font-weight: 400;margin-top: -15px;">
                        ALAMAT PENGIRIM</h5>
                      <p style="text-align: left;font-weight: normal; font-size: 14px; color: #000000;line-height: 21px; margin-top: 0;">
                        ${merchantAddr}
                      </p>
                    </td>

                    <td width="57" height="25" class="user-info">
                      <img src="https://i.postimg.cc/d10hcWv8/space.jpg" alt=" " height="25" width="57">
                    </td>

                    <td class="user-info" style="font-size: 13px; font-weight: 400; color: #444444; letter-spacing: 0.2px;width: 50%;">
                      <h5 style="color: #444;text-align: left;font-weight: 400;">
                        ALAMAT TUJUAN</h5>

                      <p><b>${order.customer.customer_name}</b></p>
                      <p style="text-align: left;font-weight: normal; font-size: 14px; color: #000000;line-height: 21px; margin-top: 0;">
                        ${order.order_shipment_address ?? "-"}
                      </p>
                      <p>Telp: ${order.customer.customer_msisdn ?? "-"}</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table style="text-align: center;background-color: #fafafa;border-radius: 0 0 10px 10px;" align="center" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 30px;">
            <div>
              <h4 style="color: #444444;font-size: 22px;font-weight: bold;margin-top: 10px;margin-bottom: 10px;padding-bottom: 0;text-transform: uppercase;display: inline-block;line-height: 1;margin:0;text-align: center;">
                Ikuti kami
              </h4>
            </div>

            ${socialHtml}

            <div style="border-top: 1px solid #ddd; margin: 20px auto 0;"></div>
            <table style="margin-top:20px;" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><p style="font-size:13px; margin:0;">${footerCopyright}</p></td>
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
