<?php

namespace App\Http\AppV5\Controllers;

use App\Http\AppV5\Models\CustomerVa;
use App\Http\AppV5\Models\Customer;
use App\Http\AppV5\Models\DepositAdmin;
use App\Http\AppV5\Models\DepositVa;
use App\Http\AppV5\Models\FlashSaleDetail;
use App\Http\AppV5\Models\OrderTracking;
use App\Http\AppV5\Models\ProductPrice;
use App\Http\AppV5\Models\ProductStock;
use App\Http\AppV5\Vendors\IdExpressController;
use App\Services\OrderService;
use App\Services\Vendors\XenditPaymentControllerV2;
use App\Services\Vendors\XfersControllerV2;
use App\Services\Vendors\WinPayControllerV2;
use App\Http\AppV5\Vendors\AnterajaController;
use App\Http\AppV5\Vendors\JntController;
use App\Http\AppV5\Vendors\SicepatController;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

use App\Http\AppV5\Vendors\ApiRajaOngkir;
use App\Http\AppV5\Models\PpobTrans;
use App\Http\AppV5\Models\Cart;
use App\Http\AppV5\Models\Order;
use App\Http\AppV5\Models\OrderPayment;
use App\Http\AppV5\Models\OrderCashback;
use App\Http\Admin\Models\OrderDetail;
use App\Http\AppV5\Models\Setting;
use App\Http\AppV5\Models\PaymentMethod;
use App\Http\AppV5\Models\PromoEcommerce;
use App\Http\AppV5\Models\PromoEcommerceUsed;
use App\Http\AppV5\Models\CustomerAddress;
use App\Http\AppV5\Models\Merchant;
use App\Http\AppV5\Models\ShippingCourier;
use App\Http\AppV5\Models\Product;

use App\Http\Service\Vendors\Gcm;
use App\Http\Service\Vendors\Mail\SendMail;
use App\Http\AppV5\Vendors\PrismalinkController;

class OrderController extends Controller
{

public function transaction_v3(Request $request)
    {
        $authData                   = $request->get('authData');
        $c_address_id               = $request->input('customer_address');
        $payment_method_alias       = $request->input('payment_method');
        $order_shipment_courier     = $request->input('order_shipment_courier');
        $order_shipment_delivery    = $request->input('order_shipment_delivery');
        $promo_alias                = $request->input('promo_alias');
        $product_cart_notes         = $request->input('product_cart_notes');
        $vendor                     = $request->input('vendor');
        $customer_id                = $authData["customer_id"];

        $dataCust = Customer::where('customer_id', '=', $authData['customer_id'])->first();

        if ($dataCust && $dataCust->customer_status == 'active') {
            $validator = Validator::make($request->all(), [
                'payment_method' => 'required',
                'customer_address' => 'required',
            ]);
            if ($validator->fails()) {
                return collect([
                    'success' => false,
                    'message' => $validator->errors()
                                           ->all(),
                ])->toJson();
            }

            //promo validation
            if (!empty($promo_alias)) {
                $promo_ecommerce = PromoEcommerce::where('promo_alias', '=', $promo_alias)->first();
                //check promo data
                if (!$promo_ecommerce) {
                    $res['success'] = false;
                    $res['message'] = 'Promo sudah tidak tersedia mohon gunakan promo lainnya.';
                    return response($res);
                }

                //check promo used
                if ($promo_ecommerce->promo_qty <= $promo_ecommerce->promo_used) {
                    $res['success'] = false;
                    $res['message'] = 'Promo sudah tidak tersedia atau sudah melampaui batas penggunaan. Mohon gunakan promo lainnya';
                    return response($res);
                }

                //check promo payment method
                switch ($promo_ecommerce->promo_payment_method) {
                    case "saldo":
                        $pm_name = "Saldo";
                        break;
                    case "cod":
                        $pm_name = "COD";
                        break;
                    case "direct_debit":
                        $pm_name = "Debit Instan";
                        break;
                    case "debit":
                        $pm_name = "Debit Instan";
                        break;
                    case "va":
                        $pm_name = "Virtual Account";
                        break;
                    default:
                        $pm_name = $promo_ecommerce->promo_payment_method;

                }
                if ($payment_method_alias != $promo_ecommerce->promo_payment_method) {
                    return collect([
                        'success' => false,
                        'message' => 'Promo yang anda gunakan harus menggunakan metode pembayaran ' . $pm_name,
                    ])->toJson();
                }

                //check promo period
                $promo_ecommerce_test_period = PromoEcommerce::where('promo_alias', '=', $promo_alias)
                    ->whereDoesntHave('promo_ecommerce_used', function ($q) use ($promo_alias, $customer_id) {
                        $q->where('customer_id', '=', $customer_id)
                            ->whereRaw("EXTRACT(DAY FROM (NOW() - _promo_used.promo_used_create_date)) < (SELECT promo_periode FROM _promo WHERE promo_alias = ?)", [$promo_alias]);
                    })
                    ->first();

                if (!$promo_ecommerce_test_period) {
                    $res['success'] = false;
                    $res['message'] = 'Periode voucher ' . $promo_ecommerce->promo_periode . ' hari, anda bisa menggunakan voucher ini kembali setelah periode berakhir.';
                    return response($res);
                }
            }

            //check pin transaksi
            if ($payment_method_alias == 'saldo') {
                if (!empty($request->input('pin'))) {
                    $pinEnc = hash('sha256', hash('sha256', $dataCust->customer_phone.$dataCust->customer_code).md5(md5(md5(md5(hash('sha256', $request->input('pin')))))). env('SECRET_KEY') . $dataCust->customer_email);

                    if(md5($pinEnc) !== $dataCust->customer_password_trx){
                        return collect([
                            'success' => false,
                            'message'    => 'PIN yang anda masukkan salah',
                        ])->toJson();
                    }
                } else {
                    return collect([
                        'success' => false,
                        'message'    => 'Anda belum memasukkan PIN transaksi',
                    ])->toJson();
                }
            }

            //address check
            $customerAddr = CustomerAddress::with('city')
                ->where('c_address_id', '=', $c_address_id)
                ->where('customer_id', $authData['customer_id'])
                ->where('c_address_primary', '1')
                ->first();

            if (!$customerAddr) {
                return collect([
                    'success' => false,
                    'message' => 'Alamat customer tidak ditemukan.',
                ])->toJson();
            }

            //cod check
            if ($payment_method_alias == 'cod' && empty($order_shipment_delivery)) {
                return collect([
                    'success' => false,
                    'message' => 'Metode pembayaran cod hanya bisa digunakan ketika menggunakan pengiriman via delivery.',
                ])->toJson();
            }

            //payment method check
            $paymentMethod = PaymentMethod::where('payment_method_alias', $payment_method_alias)
                ->where('payment_method_status', '1')
                ->first();

            if (!$paymentMethod) {
                return collect([
                    'success' => false,
                    'message' => 'Metode pembayaran tidak ditemukan.',
                ])->toJson();
            }

            //cart & product check
            $flash_sale = new FlashSaleController();
            $product = new ProductController();
            $qty_minus_check = false;
            $product_hpp_check = false;
            $product_stock_check = false;
            $flash_sale_check = "";

            $cartData = Cart::with(['merchant' => function ($q) {
                $q->select('merchant_id', 'customer_id', 'r_city_id');
                $q->groupBy('merchant_id', 'customer_id', 'r_city_id');
                $q->with('city');
                },
            ])
                ->selectRaw("_cart.*")
                ->with('product', function ($q) {
                    $q->with([
                        'ongoing_fs_detail' => function ($m) {
                            $m->with(['order_detail' => function ($q) {
                                $q->selectRaw('_order_detail.fs_detail_id, SUM(_order_detail.o_detail_qty) as count_order');
                                $q->groupBy('_order_detail.fs_detail_id');
                                            },
                                        ]);
                        },
                        'grosir' => function ($q) {
                            $q->orderBy('p_price_qty', 'ASC');
                        },
                    ])
                        ->where('product_status', '=', 'publish');
                })
                ->with('variant')
                ->join('_product', function ($q) {
                    $q->on('_cart.product_id', '=', '_product.product_id')
                        ->where('_product.product_status', '=', 'publish');
                })
                ->where('_cart.customer_id', $authData['customer_id'])
                ->where('_cart.cart_status', 'on')
                ->get()
                ->map(function ($q) use($product, $flash_sale, &$qty_minus_check, &$product_hpp_check, &$product_stock_check, &$flash_sale_check) {
                    $price = $product->product_price($q->product, $q->product->ongoing_fs_detail, $q->product->grosir, $q->qty);
                    $stock = $product->product_stock($q->product, $q->product->ongoing_fs_detail, $q->variant);

                    $q->product_stock = $stock;
                    $q->product_discount = $price["product_discount"];
                    $q->product_price_publish = $price["product_price_publish"];
                    $q->product_price = $price["product_price"];
                    $q->product_price_hpp = $price["product_hpp"];
                    $q->product_grosir = $price["product_grosir"];
                    $q->product_weight = $q->product->product_weight;

                    $q->total_amount_hpp = $q->product_price_hpp * $q->qty;
                    $q->total_amount = $q->product_price * $q->qty;

                    if($q->qty < 0){
                        $qty_minus_check = true;
                    }
                    if($q->product_price < $q->product_price_hpp){
                        $product_hpp_check = true;
                    }
                    if($q->product_stock < $q->qty) {
                        $product_stock_check = true;
                    }
                    if($q->product->ongoing_fs_detail != 0) {
                        $data_flash = $flash_sale->flash_sale_check($q->product_id, $q->product->ongoing_fs_detail->fs_detail_id);
                        if ($data_flash['success'] == false) {
                            $flash_sale_check = $data_flash['message'];
                        }
                    }

                    return $q;
                })->filter();

            if(!$cartData || count($cartData) == 0) {
                return collect([
                    'success' => false,
                    'message' => 'Keranjang masih kosong. Silahkan pilih salah satu barang yang ada dikeranjang.',
                ])->toJson();
            }
            if($qty_minus_check){
                return collect([
                    'success' => false,
                    'message' => 'Keranjang masih kosong. Silahkan pilih salah satu barang yang ada dikeranjang.',
                ])->toJson();
            }
            if($product_hpp_check){
                return collect([
                    'success' => false,
                    'message' => 'Terdapat produk yang tidak dapat diproses. Silahkan hubungi toko telebih dahulu',
                ])->toJson();
            }
            if($product_stock_check){
                return collect([
                    'success' => false,
                    'message' => 'Terdapat produk dengan stok yang tidak mencukupi. Silahkan hubungi toko telebih dahulu',
                ])->toJson();
            }
            if($flash_sale_check != ""){
                return collect([
                    'success' => false,
                    'refresh' => true,
                    'message' => $flash_sale_check . '. Data produk berubah mohon cek kembali pesanan anda',
                ])->toJson();
            }

            //shipment price
            $order_shipment_package = 0;
            if (!empty($order_shipment_delivery || !empty($order_shipment_courier))) {
                if (!empty($order_shipment_delivery)) {
                    foreach ($order_shipment_delivery as $delivery) {
                        $jml_bayar = !empty($delivery['item']['jumlah_pembayaran']) ? $delivery['item']['jumlah_pembayaran'] : 0;

                        $order_shipment_package = $order_shipment_package + intval($jml_bayar);
                    }
                }
                if (!empty($order_shipment_courier)) {
                    foreach ($order_shipment_courier as $courier) {
                        $c_value = !empty($courier['data_courier']['const']['value']) ? $courier['data_courier']['const']['value'] : 0;

                        $order_shipment_package = $order_shipment_package + $c_value;
                    }
                }
            } else {
                return collect([
                    'success' => false,
                    'message' => 'Order gagal,metode pengiriman tidak ditemukan.',
                ])->toJson();
            }

            //count total
            $sub_total = $cartData->sum('total_amount');
            $order_total = $sub_total + $order_shipment_package;

            $lock = Cache::store('cache')->lock('apps:race:order_transactionv3:' . $authData['customer_id'], 5);

            if($lock->get()) {
                $lock_trx = Cache::store('cache')->lock('apps:order_transactionv3:' . $authData['customer_id'].':'.$paymentMethod->payment_method_group.':'.$order_total, 180);

                if ($lock_trx->get()) {
                    $balance = \Balance::get($authData, true);

                    //cek saldo
                    if ($paymentMethod->payment_method_alias == 'saldo') {
                        if ($balance < $order_total) {
                            return collect([
                                'success' => false,
                                'message'    => 'Uang Muka tidak cukup untuk melakukan transaksi ini',
                            ])->toJson();
                        }
                    }

                    switch ($paymentMethod->payment_method_group) {
                        case "saldo":
                            $payment_type = 'balance';
                            $status = 'success';
                            $order_payment_status = 'paid';
                            break;
                        case "cod":
                            $payment_type = 'cod';
                            $status = 'pending';
                            $order_payment_status = 'pending_payment';
                            break;
                        case "debit":
                            $payment_type = 'debit';
                            $status = 'pending';
                            $order_payment_status = 'pending_payment';
                            break;
                        case "direct_debit":
                            $payment_type = 'debit';
                            $status = 'pending';
                            $order_payment_status = 'pending_payment';
                            break;
                        case "va":
                            $payment_type = 'va';
                            $status = 'pending';
                            $order_payment_status = 'pending_payment';
                            break;
                        case "qris":
                            $payment_type = 'qris';
                            $status = 'pending';
                            $order_payment_status = 'pending_payment';
                            break;
                        case "retail":
                            $payment_type = 'retail';
                            $status = 'pending';
                            $order_payment_status = 'pending_payment';
                            break;
                        default:
                            $payment_type = '';
                            $status = 'cancel';
                            $order_payment_status = 'cancel';
                    }

                    //grouping cart by merchant
                    $collection = $cartData;
                    $groupedCart = $collection->groupBy('merchant_id');
                    $groupedCart->all();
                    //end cart check

                    // handle promo ongkir di tabel payment_order
                    $totalShipment = 0;
                    if (!empty($order_shipment_delivery || !empty($order_shipment_courier))) {
                        if (!empty($promo_alias)) {
                            $promo_ecommerce = PromoEcommerce::where('promo_alias', '=', $promo_alias)->first();

                            if ($promo_ecommerce->promo_section == 'shipment') {
                                $promo_nominal = $this->countPromoOngkirOrderPaymentAmount($promo_ecommerce, $order_shipment_package, $groupedCart, $order_shipment_delivery, $order_shipment_courier);
                                $order_shipment_package = ($order_shipment_package - $promo_nominal < 0) ? 0 : $order_shipment_package - $promo_nominal;
                            }
                        }
                    }

                    if(intval($sub_total) < 0){
                        return collect([
                            'success' => false,
                            'message' => 'Subtotal tidak boleh minus/dibawah 0.',
                        ])->toJson();
                    }
                    if(intval($order_shipment_package) < 0){
                        return collect([
                            'success' => false,
                            'message' => 'Total kurir tidak boleh minus/dibawah 0.',
                        ])->toJson();
                    }
                    if(intval($order_total) < 0){
                        return collect([
                            'success' => false,
                            'message' =>'Total tidak boleh minus/dibawah 0.',
                        ])->toJson();
                    }

                    //Retail
                    if ($paymentMethod->payment_method_group == 'retail' && $order_total < 10000) {
                        return collect([
                            'success' => false,
                            'message' => 'Minimal Pembayaran 10.000',
                        ])->toJson();
                    }
                    else if ($paymentMethod->payment_method_group == 'retail' || $paymentMethod->payment_method_group == "va" || $paymentMethod->payment_method_group == 'qris') {
                        $param = [
                            "vendor" => $vendor,
                            "type" => $request->input("type"),
                            "payment_method" => $paymentMethod,
                            "payment_method_alias" => $payment_method_alias,
                            "payment_type" => $payment_type,
                            "status" => $status,
                            "order_payment_status" => $order_payment_status,
                            "sub_total" => $sub_total,
                            "order_total" => $order_total,
                            "order_shipment_package" => $order_shipment_package,
                            "order_shipment_note" => $request->input('order_shipment_note', ''),
                        ];

                        return $this->payment_method_request_v2($param, $customerAddr,$groupedCart,$order_shipment_courier,$order_shipment_delivery, $authData);
                    }
                    else {
                        $order_payment = new OrderPayment();

                        $order_payment->customer_id             = $authData['customer_id'];
                        $order_payment->payment_method_id       = $paymentMethod->payment_method_id;
                        $order_payment->o_payment_code          = 'INV/' . date('Ymd');
                        $order_payment->o_payment_trx_id        = OrderService::generate_trx_id();
                        $order_payment->o_payment_type          = $payment_type;
                        $order_payment->o_payment_group         = $paymentMethod->payment_method_group;
                        $order_payment->o_payment_name          = $paymentMethod->payment_method_name;
                        $order_payment->o_payment_desc          = $paymentMethod->payment_method_desc;
                        $order_payment->o_payment_bank          = $paymentMethod->payment_method_3rdparty;
                        $order_payment->o_payment_subtotal      = intval($sub_total);
                        $order_payment->o_payment_service       = intval($order_shipment_package);
                        $order_payment->o_payment_total         = intval($order_total);
                        $order_payment->o_payment_status        = $status;
                        $order_payment->o_payment_create_date   = Carbon::now();

                        if ($order_payment->save()) {
                            $dataNotif['customer'] = $authData;
                            $dataNotif['order_payment'] = $order_payment;

                            $address = $customerAddr->c_address_address . ', ' .
                                $customerAddr->city->r_city_subdistrict . ', ' .
                                $customerAddr->city->r_city_name . ', ' .
                                $customerAddr->city->r_city_province . ', ' .
                                $customerAddr->city->r_city_postcode;

                            $index_order = 0;
                            $order = null;

                            foreach ($groupedCart as $key => $cart) {
                                $order = new Order();

                                //sub_total
                                $sub_total_by_merchant = collect($cart)->sum('total_amount');

                                $order_shipment_type_by_merchant = '';
                                $order_shipment_price_by_merchant = '';
                                $order_shipment_courier_by_merchant = '';
                                $order_shipment_package_by_merchant = '';
                                $shippingEstimasi_by_merchant = '';
                                $order_paid_date = null;

                                //order_shipment
                                if (!empty($order_shipment_delivery)) {
                                    $shipment = collect($order_shipment_delivery)->firstWhere('merchant_id', '=', $key);

                                    $jml_bayar = !empty($shipment['item']['jumlah_pembayaran']) ? $shipment['item']['jumlah_pembayaran'] : 0;

                                    $order_shipment_type_by_merchant = 'driver';
                                    $order_shipment_price_by_merchant = $jml_bayar;
                                    $order_shipment_courier_by_merchant = 'Driver';
                                    $order_shipment_package_by_merchant = 'eBelenja Delivery';
                                    $shippingEstimasi_by_merchant = '24 Jam';
                                    $order_paid_date = null;
                                }
                                if (!empty($order_shipment_courier) && $order_shipment_price_by_merchant == '') {
                                    $shipment = collect($order_shipment_courier)->firstWhere('merchant_id', '=', $key);

                                    $order_shipment_type_by_merchant = 'courier';
                                    $order_shipment_price_by_merchant = !empty($shipment['data_courier']['const']['value']) ? $shipment['data_courier']['const']['value'] : 0;
                                    $order_shipment_courier_by_merchant = !empty($shipment['courier']['name']) ? $shipment['courier']['name'] : '';
                                    $order_shipment_package_by_merchant = !empty($shipment['data_courier']['service']) ? $shipment['data_courier']['service'] : '';
                                    $shippingEstimasi_by_merchant = !empty($shipment['data_courier']['const']['etd']) ? $shipment['data_courier']['const']['etd'] : '';
                                    $order_paid_date = Carbon::now();
                                }

//                    $order_shipment_price_by_merchant_no_promo = $order_shipment_price_by_merchant;

                                // handle promo ongkir di tabel order
                                if (!empty($promo_ecommerce) && !empty($promo_alias)) {
                                    if ($promo_ecommerce->promo_section == 'shipment') {
                                        $promo_nominal = $this->countPromoOngkirOrderAmount($promo_ecommerce, $order_shipment_price_by_merchant, $groupedCart);
                                        $order_shipment_price_by_merchant = $order_shipment_price_by_merchant - $promo_nominal < 0 ? 0 : $order_shipment_price_by_merchant - $promo_nominal;
                                    }
                                }
                                //---------------------

                                $order->order_number = $this->order_number($key);
                                $order->o_payment_id = $order_payment->o_payment_id;
                                $order->customer_id = $authData['customer_id'];
                                $order->merchant_id = $key;
                                $order->order_payment_type = $payment_type;
                                $order->driver_id = 1;
                                $order->payment_method_id = $paymentMethod->payment_method_id;
                                $order->payment_method_group = $paymentMethod->payment_method_group;
                                $order->payment_method_name = $paymentMethod->payment_method_name;
                                $order->payment_method_desc = $paymentMethod->payment_method_desc;
                                $order->order_subtotal = $sub_total_by_merchant;
                                $order->order_shipment_price = $order_shipment_price_by_merchant;
                                $order->order_shipment_type = $order_shipment_type_by_merchant;
                                $order->order_shipment_courier = $order_shipment_courier_by_merchant;
                                $order->order_shipment_package = $order_shipment_package_by_merchant;
                                $order->order_shipment_time = $shippingEstimasi_by_merchant;
                                $order->order_total = $sub_total_by_merchant + $order_shipment_price_by_merchant;
                                $order->order_shipment_cost = 'ebelanja';
                                $order->order_shipment_date = Carbon::now()->addDay();
                                $order->r_city_id = $customerAddr->r_city_id;
                                $order->order_shipment_to = $customerAddr->c_address_name;
                                $order->order_shipment_address = $address;
                                $order->order_shipment_note = $request->input('order_shipment_note', '');
                                $order->order_shipment_phone = $customerAddr->c_address_phone;
//                    $order->order_shipment_resi               = null;
                                $order->order_status = $order_payment_status;
                                $order->order_paid_date = $order_paid_date;
                                $order->order_create_date = Carbon::now();

                                if ($order->save()) {

                                    if (!empty($promo_alias)) {
                                        $promo_ecommerce = PromoEcommerce::where('promo_alias', '=', $promo_alias)->first();
                                        $promo_used = new PromoEcommerceUsed();

                                        if ($promo_ecommerce->promo_section == 'cashback') {
                                            //----------------handle promo cashback---------
                                            $promo_nominal = $this->countPromoCBAmount($promo_ecommerce, $order_payment);

                                            $order_cashback = new OrderCashback();
                                            $order_cashback->o_payment_id = $order_payment->o_payment_id;
                                            $order_cashback->customer_id = $authData['customer_id'];
                                            $order_cashback->o_cashback_nominal = $promo_nominal;
                                            $order_cashback->o_cashback_status = 'new';
                                            $order_cashback->o_cashback_update_date = Carbon::now();
                                            $order_cashback->o_cashback_create_date = Carbon::now();
                                            $order_cashback->save();

                                            $promo_used->promo_id = $promo_ecommerce->promo_id;
                                            $promo_used->customer_id = $authData['customer_id'];
                                            $promo_used->order_id = $order->order_id;
                                            $promo_used->o_payment_id = $order_payment->o_payment_id;
                                            $promo_used->order_total = $order_payment->o_payment_subtotal;
                                            $promo_used->promo_nominal = $promo_nominal;
                                            $promo_used->promo_used_status = "1";
                                            $promo_used->promo_used_create_date = Carbon::now();

                                            if ($promo_used->save()) {
                                                $promo_ecommerce->promo_used = $promo_ecommerce->promo_used + 1;
                                                $promo_ecommerce->save();
                                            }
                                        } else if ($promo_ecommerce->promo_section == 'shipment') {
                                            //----------------handle promo ongkir---------
                                            $promo_nominal = $this->countPromoOngkirOrderPaymentAmount($promo_ecommerce, $order_shipment_package, $groupedCart, $order_shipment_delivery, $order_shipment_courier);
                                            $final_promo_nominal = ($order_shipment_package - $promo_nominal < 0) ? $promo_nominal - $order_shipment_package : $promo_nominal;

                                            $promo_used = new PromoEcommerceUsed();
                                            $promo_used->promo_id = $promo_ecommerce->promo_id;
                                            $promo_used->customer_id = $authData['customer_id'];
                                            $promo_used->order_id = $order->order_id;
                                            $promo_used->o_payment_id = $order_payment->o_payment_id;
                                            $promo_used->order_total = $order_payment->o_payment_subtotal;
                                            $promo_used->promo_nominal = $final_promo_nominal;
                                            $promo_used->promo_used_status = "1";
                                            $promo_used->promo_used_create_date = Carbon::now();

                                            if ($promo_used->save()) {
                                                $promo_ecommerce->promo_used = $promo_ecommerce->promo_used + 1;
                                                $promo_ecommerce->save();
                                            }
                                        }
                                    }

                                    //order detail
                                    $dataCart = $cart;

                                    $dataNotif['order'][$index_order] = $order;
                                    $order_total_hpp = 0;

                                    for ($i = 0; $i < count($dataCart); $i++) {
                                        $orderDetail = new OrderDetail();

                                        $orderDetail->order_id = $order->order_id;
                                        $orderDetail->product_id = $dataCart[$i]['product_id'];
                                        $orderDetail->o_detail_product_name = $dataCart[$i]['product']['product_name'];
                                        $orderDetail->o_detail_product_image = $dataCart[$i]['product']['product_image_1'];
                                        $orderDetail->o_detail_product_price = $dataCart[$i]['product_price'];
                                        $orderDetail->o_detail_product_hpp = $dataCart[$i]['product_price_hpp'];
                                        $orderDetail->o_detail_product_margin = ($dataCart[$i]['product_price'] - $dataCart[$i]['product_price_hpp']);
                                        $orderDetail->o_detail_subtotal_hpp = $dataCart[$i]['product_price_hpp'] * $dataCart[$i]['qty'];
                                        $orderDetail->o_detail_subtotal_margin = ($dataCart[$i]['product_price'] - $dataCart[$i]['product_price_hpp']) * $dataCart[$i]['qty'];
                                        $orderDetail->o_detail_product_weight = !empty($dataCart[$i]['product']['product_weight']) ? $dataCart[$i]['product']['product_weight'] : 1000;
                                        $orderDetail->o_detail_subtotal = $dataCart[$i]['total_amount'];
                                        $orderDetail->o_detail_qty = $dataCart[$i]['qty'];
                                        $orderDetail->ps_id = $dataCart[$i]['ps_id'];
                                        $orderDetail->fs_detail_id = ($dataCart[$i]['product']['ongoing_fs_detail']) ? $dataCart[$i]['product']['ongoing_fs_detail']['fs_detail_id'] : '';
                                        $orderDetail->o_detail_product_grosir = $dataCart[$i]['product_grosir'];
                                        $orderDetail->o_detail_create_date = Carbon::now();
                                        //note
                                        if (!empty($product_cart_notes)) {
                                            $o_detail_note = '';

                                            foreach ($product_cart_notes as $item) {
                                                if ($item['cart_id'] == $dataCart[$i]['cart_id']) {
                                                    $o_detail_note = $item['note'];
                                                }
                                            }
                                            if ($o_detail_note != '') {
                                                $orderDetail->o_detail_note = $o_detail_note;
                                            }
                                        }

                                        $orderDetail->save();

                                        $order_total_hpp += $orderDetail->o_detail_product_hpp * $orderDetail->o_detail_qty;
                                        $dataNotif['order'][$index_order]['order_detail'][$i] = $orderDetail;

                                        //buy point
                                        $point = new ProductPointController();
                                        for ($x = 0; $x < $dataCart[$i]['qty']; $x++) {
                                            $point->product_point($dataCart[$i]['product_id'], 'buy');
                                        }

                                        $product_name = substr($dataCart[$i]['product']['product_name'], 0, 20) . '... ' . (($dataCart[$i]['variant']) ? '(' . $dataCart[$i]['variant']['ps_option'] . ')' : '');

                                        //mengurangi stock
                                        $p_stock = Product::where('product_id', '=', $orderDetail->product_id)->first();
                                        $p_stock->product_stock = $p_stock->product_stock - $orderDetail->o_detail_qty;

                                        if ($p_stock->product_stock < 0) {
                                            return response([
                                                'success' => false,
                                                'message' => 'Stock ' . $product_name . 'tidak mencukupi.',
                                            ]);
                                        }

                                        $p_stock->save();

                                        if ($dataCart[$i]['fs_detail_id'] != 0) {
                                            $fs_stock = FlashSaleDetail::where('fs_detail_id', '=', $dataCart[$i]['fs_detail_id'])->first();
                                            $fs_stock->fs_detail_product_stock = $fs_stock->fs_detail_product_stock - $orderDetail->o_detail_qty;

                                            if ($fs_stock->fs_detail_product_stock < 0) {
                                                return response([
                                                    'success' => false,
                                                    'message' => 'Stock flash sale ' . $product_name . 'tidak mencukupi.',
                                                ]);
                                            }

                                            $fs_stock->save();
                                        }
                                        else if ($dataCart[$i]['ps_id'] != 0) {
                                            $ps_stock = ProductStock::where('ps_id', '=', $dataCart[$i]['ps_id'])->first();
                                            $ps_stock->ps_stock = $ps_stock->ps_stock - $orderDetail->o_detail_qty;

                                            if ($ps_stock->ps_stock < 0) {
                                                return response([
                                                    'success' => false,
                                                    'message' => 'Stock ' . $product_name . 'tidak mencukupi.',
                                                ]);
                                            }

                                            $ps_stock->save();
                                        }
                                    }

                                    $dataNotif['order'][$index_order]['order_total_hpp'] = $order_total_hpp;
                                } else {
                                    return collect([
                                        'success' => false,
                                        'message' => 'Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!',
                                        'error_code' => '0003',
                                    ])->toJson();
                                }

                                $gcm = new Gcm();
                                $gcm->send('cus-' . $cart[0]['merchant']['customer_id'], 'order-merchant', $dataNotif, 'Pesanan Baru', 'ada pesanan baru, ketuk untuk melihat detail.');
                                $gcm->send('cus-lite-' . $cart[0]['merchant']['customer_id'], 'order-merchant', $dataNotif, 'Pesanan Baru', 'ada pesanan baru, ketuk untuk melihat detail.');

                                $index_order++;
                            }

                            Cart::where('customer_id', $authData['customer_id'])
                                ->where('cart_status', 'on')
                                ->delete();

                            $cartController = new CartController();
                            $cartController->send_mail_order_v2($order_payment->o_payment_id);

                            $lastOrder = $order
                                ? Order::where('order_id', '=', $order->order_id)->with('order_payment')->first()
                                : null;

                            return collect([
                                'success'   => true,
                                'message'   => 'Order berhasil, order anda sedang diproses.',
                                'dataNotif' => $dataNotif,
                                'order'     => $lastOrder,
                            ])->toJson();
                        } else {
                            return collect([
                                'success' => false,
                                'message' => 'Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!',
                                'error_code' => '0002',
                            ])->toJson();
                        }
                    }
                }
                else {
                    return collect([
                        'success' => false,
                        'message' => 'Ada transaksi sebelumnya sedang berlangsung. Silahkan cek histori transaksi.',
                        'error_code' => '0001',
                    ])->toJson();
                }
            }
            else {
                return collect([
                    'success' => false,
                    'message' => 'Tunggu 5 detik untuk melakukan transaksi lagi.',
                    'error_code' => '0001',
                ])->toJson();
            }
        } else {
            return collect([
                'success' => false,
                'message' => 'Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!',
                'error_code' => '0001',
            ])->toJson();
        }
    }

    public function payment_method_request_v2($data,$customerAddr,$groupedCart,$order_shipment_courier,$order_shipment_delivery, $authData)
    {
        $type_payment           = "";
        $payment_code           = "";
        $payment_bank_to_number = "";
        $va_bank                = "";
        $va_number              = "";
        $va_bank_refid          = "";
        $tutorial               = "";

        if($data['payment_method']['payment_method_group'] == 'qris') {
            $adminFee = (int) ceil(($data['sub_total']+$data['order_shipment_package'])*$data['payment_method']['payment_method_admin_price']/100);

            $data['payment_method']['payment_method_admin_price'] = $adminFee;
        }

        $order_payment = new OrderPayment();

        $order_payment->customer_id                 = $authData['customer_id'];
        $order_payment->payment_method_id           = $data['payment_method']['payment_method_id'];
        $order_payment->o_payment_trx_id            = OrderService::generate_trx_id();
        $order_payment->o_payment_code              = 'INV/' . date('Ymd');
        $order_payment->o_payment_type              = $data['payment_type'];
        $order_payment->o_payment_group             = $data['payment_method']['payment_method_group'];
        $order_payment->o_payment_name              = $data['payment_method']['payment_method_name'];
        $order_payment->o_payment_desc              = $data['payment_method']['payment_method_desc'];
        $order_payment->o_payment_bank              = $data['payment_method']['payment_method_3rdparty'];
        $order_payment->o_payment_subtotal          = $data['sub_total'];
        $order_payment->o_payment_service           = $data['order_shipment_package'];
        $order_payment->o_payment_admin_fee         = $data['payment_method']['payment_method_admin_price'];
        $order_payment->o_payment_total             = $data['sub_total']+$data['payment_method']['payment_method_admin_price']+$data['order_shipment_package'];
        $order_payment->o_payment_status            = $data['status'];
        $order_payment->o_payment_va_bank           = $va_bank;
        $order_payment->o_payment_va_number         = $va_number;
        $order_payment->o_payment_va_bank_refid     = $va_bank_refid;
        $order_payment->o_payment_retail_bank       = $type_payment;
        $order_payment->o_payment_retail_code       = $payment_code;
        $order_payment->o_payment_retail_bank_refid = $payment_bank_to_number;
        $order_payment->o_payment_create_date       = Carbon::now();

        if ($order_payment->save()) {
            if ($order_payment->o_payment_bank == 'XFERS') {
                if ($order_payment->o_payment_group == 'va') {

                    $bank = str_replace("va_", "", $data['payment_method']['payment_method_alias']);
                    $xfers = new XfersControllerV2();

                    $biaya_admin = $data['payment_method']['payment_method_admin_price'];
                    $param = [
                        'bankShortCode' => $bank,
                        'amount' => round($data['order_total']) + round($biaya_admin),
                        'referenceId' => $order_payment->o_payment_trx_id,
                        'displayName' => substr($authData['customer_name'], 0, 2) . "XXX",
                        'model'         => 'VA_Dynamic',
                    ];
                    $response = $xfers->virtual_account($param);

                    if ($response['success']) {
                        $dataResponse = $xfers->parse_response_inq($param['model'], $response['data']);

                        if ($dataResponse == null) {
                            $res['success'] = false;
                            $res['message'] = 'Pembayaran gagal, silahkan coba beberapa saat lagi.';

                            return response($res);
                        }

                        $order_payment->o_payment_va_bank       = $dataResponse['BankShortCode'];
                        $order_payment->o_payment_va_number     = $dataResponse['AccountNo'];
                        $order_payment->o_payment_expired_date  = $dataResponse['ExpiredAt'];

                        if ($order_payment->save()) {
                            $tutorial = json_decode(file_get_contents(storage_path('app/tutorial/va/' . strtolower($bank) . '_' . strtolower($order_payment->o_payment_bank) . '.json')), true);

                            $dataNotif['customer'] = $authData;
                            $dataNotif['order_payment'] = $order_payment;

                            $address = $customerAddr->c_address_address . ', ' .
                                $customerAddr->city->r_city_subdistrict . ', ' .
                                $customerAddr->city->r_city_name . ', ' .
                                $customerAddr->city->r_city_province . ', ' .
                                $customerAddr->city->r_city_postcode;

                            $index_order = 0;

                            foreach ($groupedCart as $key => $cart) {
                                $order = new Order();

                                //sub_total
                                $sub_total_by_merchant = collect($cart)->sum('total_amount');

                                $order_shipment_type_by_merchant = '';
                                $order_shipment_price_by_merchant = '';
                                $order_shipment_courier_by_merchant = '';
                                $order_shipment_package_by_merchant = '';
                                $shippingEstimasi_by_merchant = '';
                                $order_paid_date = null;

                                //order_shipment
                                if (!empty($order_shipment_delivery)) {
                                    $shipment = collect($order_shipment_delivery)->firstWhere('merchant_id', '=', $key);

                                    $jml_bayar = !empty($shipment['item']['jumlah_pembayaran']) ? $shipment['item']['jumlah_pembayaran'] : 0;

                                    $order_shipment_type_by_merchant = 'driver';
                                    $order_shipment_price_by_merchant = $jml_bayar;
                                    $order_shipment_courier_by_merchant = 'Driver';
                                    $order_shipment_package_by_merchant = 'eBelenja Delivery';
                                    $shippingEstimasi_by_merchant = '24 Jam';
                                    $order_paid_date = null;
                                }
                                if (!empty($order_shipment_courier) && $order_shipment_price_by_merchant == '') {
                                    $shipment = collect($order_shipment_courier)->firstWhere('merchant_id', '=', $key);

                                    $order_shipment_type_by_merchant = 'courier';
                                    $order_shipment_price_by_merchant = !empty($shipment['data_courier']['const']['value']) ? $shipment['data_courier']['const']['value'] : 0;
                                    $order_shipment_courier_by_merchant = !empty($shipment['courier']['name']) ? $shipment['courier']['name'] : '';
                                    $order_shipment_package_by_merchant = !empty($shipment['data_courier']['service']) ? $shipment['data_courier']['service'] : '';
                                    $shippingEstimasi_by_merchant = !empty($shipment['data_courier']['const']['etd']) ? $shipment['data_courier']['const']['etd'] : '';
                                    $order_paid_date = Carbon::now();
                                }

                                // handle promo ongkir di tabel order
                                if (!empty($promo_ecommerce) && !empty($promo_alias)) {
                                    if ($promo_ecommerce->promo_section == 'shipment') {
                                        $promo_nominal = $this->countPromoOngkirOrderAmount($promo_ecommerce, $order_shipment_price_by_merchant, $groupedCart);
                                        $order_shipment_price_by_merchant = $order_shipment_price_by_merchant - $promo_nominal < 0 ? 0 : $order_shipment_price_by_merchant - $promo_nominal;
                                    }
                                }

                                $order_total = round($sub_total_by_merchant) + round($order_shipment_price_by_merchant) + round($biaya_admin);

                                $order->order_number = $this->order_number($key);
                                $order->o_payment_id = $order_payment->o_payment_id;
                                $order->customer_id = $authData['customer_id'];
                                $order->merchant_id = $key;
                                $order->order_payment_type = $data['payment_type'];
                                $order->driver_id = 1; //$request->input('driver_id');
                                $order->payment_method_id = $data['payment_method']['payment_method_id'];
                                $order->payment_method_group = $data['payment_method']['payment_method_group'];
                                $order->payment_method_name = $data['payment_method']['payment_method_name'];
                                $order->payment_method_desc = $data['payment_method']['payment_method_desc'];
                                $order->order_subtotal = $sub_total_by_merchant; //
                                $order->order_shipment_price = $order_shipment_price_by_merchant; //
                                $order->order_shipment_type = $order_shipment_type_by_merchant;
                                $order->order_shipment_courier = $order_shipment_courier_by_merchant;
                                $order->order_shipment_package = $order_shipment_package_by_merchant;
                                $order->order_shipment_time = $shippingEstimasi_by_merchant;
                                $order->order_total = $order_total;
                                $order->order_shipment_cost = 'ebelanja';
                                $order->order_shipment_date = Carbon::now()->addDay();
                                $order->r_city_id = $customerAddr->r_city_id;
                                $order->order_shipment_to = $customerAddr->c_address_name;
                                $order->order_shipment_address = $address;
                                $order->order_shipment_note = $data['order_shipment_note'];
                                $order->order_shipment_phone = $customerAddr->c_address_phone;
                                $order->order_status = $data['order_payment_status'];
                                $order->order_paid_date = $order_paid_date;
                                $order->order_create_date = Carbon::now();

                                if ($order->save()) {

                                    if (!empty($promo_alias)) {
                                        $promo_ecommerce = PromoEcommerce::where('promo_alias', '=', $promo_alias)->first();
                                        $promo_used = new PromoEcommerceUsed();

                                        if ($promo_ecommerce->promo_section == 'cashback') {
                                            //----------------handle promo cashback---------
                                            $promo_nominal = $this->countPromoCBAmount($promo_ecommerce, $order_payment);

                                            $order_cashback = new OrderCashback();
                                            $order_cashback->o_payment_id = $order_payment->o_payment_id;
                                            $order_cashback->customer_id = $authData['customer_id'];
                                            $order_cashback->o_cashback_nominal = $promo_nominal;
                                            $order_cashback->o_cashback_status = 'new';
                                            $order_cashback->o_cashback_update_date = Carbon::now();
                                            $order_cashback->o_cashback_create_date = Carbon::now();
                                            $order_cashback->save();

                                            $promo_used->promo_id = $promo_ecommerce->promo_id;
                                            $promo_used->customer_id = $authData['customer_id'];
                                            $promo_used->order_id = $order->order_id;
                                            $promo_used->o_payment_id = $order_payment->o_payment_id;
                                            $promo_used->order_total = $order_payment->o_payment_subtotal;
                                            $promo_used->promo_nominal = $promo_nominal;
                                            $promo_used->promo_used_status = "1";
                                            $promo_used->promo_used_create_date = Carbon::now();

                                            if ($promo_used->save()) {
                                                $promo_ecommerce->promo_used = $promo_ecommerce->promo_used + 1;
                                                $promo_ecommerce->save();
                                            }
                                        } else if ($promo_ecommerce->promo_section == 'shipment') {
                                            //----------------handle promo ongkir---------
                                            $promo_nominal = $this->countPromoOngkirOrderPaymentAmount($promo_ecommerce, $data['order_shipment_package'], $groupedCart, $order_shipment_delivery, $order_shipment_courier);
                                            $final_promo_nominal = ($data['order_shipment_package'] - $promo_nominal < 0) ? $promo_nominal - $data['order_shipment_package'] : $promo_nominal;

                                            $promo_used = new PromoEcommerceUsed();
                                            $promo_used->promo_id = $promo_ecommerce->promo_id;
                                            $promo_used->customer_id = $authData['customer_id'];
                                            $promo_used->order_id = $order->order_id;
                                            $promo_used->o_payment_id = $order_payment->o_payment_id;
                                            $promo_used->order_total = $order_payment->o_payment_subtotal;
                                            $promo_used->promo_nominal = $final_promo_nominal;
                                            $promo_used->promo_used_status = "1";
                                            $promo_used->promo_used_create_date = Carbon::now();

                                            if ($promo_used->save()) {
                                                $promo_ecommerce->promo_used = $promo_ecommerce->promo_used + 1;
                                                $promo_ecommerce->save();
                                            }
                                        }
                                    }

                                    //order detail
                                    $dataCart = $cart;

                                    $dataNotif['order'][$index_order] = $order;
                                    $order_total_hpp = 0;

                                    for ($i = 0; $i < count($dataCart); $i++) {
                                        $orderDetail = new OrderDetail();

                                        $orderDetail->order_id = $order->order_id;
                                        $orderDetail->product_id = $dataCart[$i]['product_id'];
                                        $orderDetail->o_detail_product_name = $dataCart[$i]['product']['product_name'];
                                        $orderDetail->o_detail_product_image = $dataCart[$i]['product']['product_image_1'];
                                        $orderDetail->o_detail_product_price = $dataCart[$i]['product_price'];
                                        $orderDetail->o_detail_product_hpp = $dataCart[$i]['product_price_hpp'];
                                        $orderDetail->o_detail_product_margin = ($dataCart[$i]['product_price'] - $dataCart[$i]['product_price_hpp']);
                                        $orderDetail->o_detail_subtotal_hpp = $dataCart[$i]['product_price_hpp'] * $dataCart[$i]['qty'];
                                        $orderDetail->o_detail_subtotal_margin = ($dataCart[$i]['product_price'] - $dataCart[$i]['product_price_hpp']) * $dataCart[$i]['qty'];
                                        $orderDetail->o_detail_product_weight = !empty($dataCart[$i]['product']['product_weight']) ? $dataCart[$i]['product']['product_weight'] : 1000;
                                        $orderDetail->o_detail_subtotal = $dataCart[$i]['total_amount'];
                                        $orderDetail->o_detail_qty = $dataCart[$i]['qty'];
                                        $orderDetail->ps_id = $dataCart[$i]['ps_id'];
                                        $orderDetail->fs_detail_id = ($dataCart[$i]['product']['ongoing_fs_detail']) ? $dataCart[$i]['product']['ongoing_fs_detail']['fs_detail_id'] : '';
                                        $orderDetail->o_detail_product_grosir = $dataCart[$i]['product_grosir'];
                                        $orderDetail->o_detail_create_date = Carbon::now();
                                        //note
                                        if (!empty($product_cart_notes)) {
                                            $o_detail_note = '';

                                            foreach ($product_cart_notes as $item) {
                                                if ($item['cart_id'] == $dataCart[$i]['cart_id']) {
                                                    $o_detail_note = $item['note'];
                                                }
                                            }
                                            if ($o_detail_note != '') {
                                                $orderDetail->o_detail_note = $o_detail_note;
                                            }
                                        }

                                        $orderDetail->save();

                                        $order_total_hpp += $orderDetail->o_detail_product_hpp * $orderDetail->o_detail_qty;
                                        $dataNotif['order'][$index_order]['order_detail'][$i] = $orderDetail;

                                        //buy point
                                        $point = new ProductPointController();
                                        for ($x = 0; $x < $dataCart[$i]['qty']; $x++) {
                                            $point->product_point($dataCart[$i]['product_id'], 'buy');
                                        }

                                        $product_name = substr($dataCart[$i]['product']['product_name'], 0, 20) . '... ' . (($dataCart[$i]['variant']) ? '(' . $dataCart[$i]['variant']['ps_option'] . ')' : '');

                                        //mengurangi stock
                                        $p_stock = Product::where('product_id', '=', $orderDetail->product_id)->first();
                                        $p_stock->product_stock = $p_stock->product_stock - $orderDetail->o_detail_qty;

                                        if ($p_stock->product_stock < 0) {
                                            return response([
                                                'success' => false,
                                                'message'    => 'Stock '.$product_name.'tidak mencukupi.',
                                            ]);
                                        }

                                        $p_stock->save();

                                        if ($dataCart[$i]['fs_detail_id'] != 0) {
                                            $fs_stock = FlashSaleDetail::where('fs_detail_id', '=', $dataCart[$i]['fs_detail_id'])->first();
                                            $fs_stock->fs_detail_product_stock = $fs_stock->fs_detail_product_stock - $orderDetail->o_detail_qty;

                                            if ($fs_stock->fs_detail_product_stock < 0) {
                                                return response([
                                                    'success' => false,
                                                    'message'    => 'Stock flash sale '.$product_name.'tidak mencukupi.',
                                                ]);
                                            }

                                            $fs_stock->save();
                                        } else if ($dataCart[$i]['ps_id'] != 0) {
                                            $ps_stock = ProductStock::where('ps_id', '=', $dataCart[$i]['ps_id'])->first();
                                            $ps_stock->ps_stock = $ps_stock->ps_stock - $orderDetail->o_detail_qty;

                                            if ($ps_stock->ps_stock < 0) {
                                                return response([
                                                    'success' => false,
                                                    'message'    => 'Stock '.$product_name.'tidak mencukupi.',
                                                ]);
                                            }

                                            $ps_stock->save();
                                        }

                                    }

                                    $dataNotif['order'][$index_order]['order_total_hpp'] = $order_total_hpp;
                                } else {
                                    return collect([
                                        'success' => false,
                                        'message'       => 'Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!',
                                        'error_code' => '0003',
                                    ])->toJson();
                                }

                                $gcm = new Gcm();
                                $gcm->send('cus-' . $cart[0]['merchant']['customer_id'], 'order-merchant', $dataNotif, 'Pesanan Baru', 'ada pesanan baru, ketuk untuk melihat detail.');
                                $gcm->send('cus-lite-' . $cart[0]['merchant']['customer_id'], 'order-merchant', $dataNotif, 'Pesanan Baru', 'ada pesanan baru, ketuk untuk melihat detail.');

                                $index_order++;
                            }

                            Cart::where('customer_id', $authData['customer_id'])
                                ->where('cart_status', 'on')
                                ->delete();

                            $cartController = new CartController();
                            $cartController->send_mail_order_v2($order_payment->o_payment_id);

                            $lastOrder = Order::where('order_id', '=', $order->order_id)->with('order_payment')->first();

                            return collect([
                                'success'   => true,
                                'message'   => 'Payment berhasil!',
                                'data'      => 'Order berhasil, order anda sedang diproses.',
                                'payment'   => $order_payment,
                                'dataNotif' => $dataNotif,
                                'order'     => $lastOrder,
                                'tutorial'  => $tutorial,
                            ])->toJson();

                        } else {
                            return collect([
                                'success' => false,
                                'message'       => 'Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!',
                                'error_code' => '0003',
                            ])->toJson();
                        }
                    }
                }
            }elseif ($order_payment->o_payment_bank == 'Winpay'){
                if ($order_payment->o_payment_group == 'qris') {
                    $winpay = new WinPayControllerV2;
                    $biaya_admin = $data['payment_method']['payment_method_admin_price'];
                    $expiredTime = Carbon::now()->copy()->addHours(3)->toIso8601String();

                    $param = [
                        "partnerRef"  => 'ecommerce_'.$order_payment->o_payment_trx_id,
                        "nominal"       => round($data['order_total']) + round($biaya_admin),
                        "staticInfo"    => false,
                        'expiredTime'   => $expiredTime,
                    ];

                    $response = $winpay->generate_qris($param);

                    if(!empty($response) && ($response['data']['responseCode'] ?? '') === "2004700"){
                        $date = Carbon::parse($response['data']['additionalInfo']['expiredAt']);
                        $expired = $date->format('Y-m-d H:i:s');

                        $order_payment->o_payment_qris_url      = $response['data']['qrUrl'];
                        $order_payment->o_payment_expired_date  = $expired;

                        if ($order_payment->save()) {

                            $dataNotif['customer'] = $authData;
                            $dataNotif['order_payment'] = $order_payment;

                            $address = $customerAddr->c_address_address . ', ' .
                                $customerAddr->city->r_city_subdistrict . ', ' .
                                $customerAddr->city->r_city_name . ', ' .
                                $customerAddr->city->r_city_province . ', ' .
                                $customerAddr->city->r_city_postcode;

                            $index_order = 0;

                            foreach ($groupedCart as $key => $cart) {
                                $order = new Order();

                                //sub_total
                                $sub_total_by_merchant = collect($cart)->sum('total_amount');

                                $order_shipment_type_by_merchant = '';
                                $order_shipment_price_by_merchant = '';
                                $order_shipment_courier_by_merchant = '';
                                $order_shipment_package_by_merchant = '';
                                $shippingEstimasi_by_merchant = '';
                                $order_paid_date = null;

                                //order_shipment
                                if (!empty($order_shipment_delivery)) {
                                    $shipment = collect($order_shipment_delivery)->firstWhere('merchant_id', '=', $key);

                                    $jml_bayar = !empty($shipment['item']['jumlah_pembayaran']) ? $shipment['item']['jumlah_pembayaran'] : 0;

                                    $order_shipment_type_by_merchant = 'driver';
                                    $order_shipment_price_by_merchant = $jml_bayar;
                                    $order_shipment_courier_by_merchant = 'Driver';
                                    $order_shipment_package_by_merchant = 'eBelenja Delivery';
                                    $shippingEstimasi_by_merchant = '24 Jam';
                                    $order_paid_date = null;
                                }
                                if (!empty($order_shipment_courier) && $order_shipment_price_by_merchant == '') {
                                    $shipment = collect($order_shipment_courier)->firstWhere('merchant_id', '=', $key);

                                    $order_shipment_type_by_merchant = 'courier';
                                    $order_shipment_price_by_merchant = !empty($shipment['data_courier']['const']['value']) ? $shipment['data_courier']['const']['value'] : 0;
                                    $order_shipment_courier_by_merchant = !empty($shipment['courier']['name']) ? $shipment['courier']['name'] : '';
                                    $order_shipment_package_by_merchant = !empty($shipment['data_courier']['service']) ? $shipment['data_courier']['service'] : '';
                                    $shippingEstimasi_by_merchant = !empty($shipment['data_courier']['const']['etd']) ? $shipment['data_courier']['const']['etd'] : '';
                                    $order_paid_date = Carbon::now();
                                }

                                // handle promo ongkir di tabel order
                                if (!empty($promo_ecommerce) && !empty($promo_alias)) {
                                    if ($promo_ecommerce->promo_section == 'shipment') {
                                        $promo_nominal = $this->countPromoOngkirOrderAmount($promo_ecommerce, $order_shipment_price_by_merchant, $groupedCart);
                                        $order_shipment_price_by_merchant = $order_shipment_price_by_merchant - $promo_nominal < 0 ? 0 : $order_shipment_price_by_merchant - $promo_nominal;
                                    }
                                }

                                $order_total = round($sub_total_by_merchant) + round($order_shipment_price_by_merchant) + round($biaya_admin);

                                $order->order_number = $this->order_number($key);
                                $order->o_payment_id = $order_payment->o_payment_id;
                                $order->customer_id = $authData['customer_id'];
                                $order->merchant_id = $key;
                                $order->order_payment_type = $data['payment_type'];
                                $order->driver_id = 1; //$request->input('driver_id');
                                $order->payment_method_id = $data['payment_method']['payment_method_id'];
                                $order->payment_method_group = $data['payment_method']['payment_method_group'];
                                $order->payment_method_name = $data['payment_method']['payment_method_name'];
                                $order->payment_method_desc = $data['payment_method']['payment_method_desc'];
                                $order->order_subtotal = $sub_total_by_merchant; //
                                $order->order_shipment_price = $order_shipment_price_by_merchant; //
                                $order->order_shipment_type = $order_shipment_type_by_merchant;
                                $order->order_shipment_courier = $order_shipment_courier_by_merchant;
                                $order->order_shipment_package = $order_shipment_package_by_merchant;
                                $order->order_shipment_time = $shippingEstimasi_by_merchant;
                                $order->order_total = $order_total;
                                $order->order_shipment_cost = 'ebelanja';
                                $order->order_shipment_date = Carbon::now()->addDay();
                                $order->r_city_id = $customerAddr->r_city_id;
                                $order->order_shipment_to = $customerAddr->c_address_name;
                                $order->order_shipment_address = $address;
                                $order->order_shipment_note = $data['order_shipment_note'];
                                $order->order_shipment_phone = $customerAddr->c_address_phone;
                                $order->order_status = $data['order_payment_status'];
                                $order->order_paid_date = $order_paid_date;
                                $order->order_create_date = Carbon::now();

                                if ($order->save()) {

                                    if (!empty($promo_alias)) {
                                        $promo_ecommerce = PromoEcommerce::where('promo_alias', '=', $promo_alias)->first();
                                        $promo_used = new PromoEcommerceUsed();

                                        if ($promo_ecommerce->promo_section == 'cashback') {
                                            //----------------handle promo cashback---------
                                            $promo_nominal = $this->countPromoCBAmount($promo_ecommerce, $order_payment);

                                            $order_cashback = new OrderCashback();
                                            $order_cashback->o_payment_id = $order_payment->o_payment_id;
                                            $order_cashback->customer_id = $authData['customer_id'];
                                            $order_cashback->o_cashback_nominal = $promo_nominal;
                                            $order_cashback->o_cashback_status = 'new';
                                            $order_cashback->o_cashback_update_date = Carbon::now();
                                            $order_cashback->o_cashback_create_date = Carbon::now();
                                            $order_cashback->save();

                                            $promo_used->promo_id = $promo_ecommerce->promo_id;
                                            $promo_used->customer_id = $authData['customer_id'];
                                            $promo_used->order_id = $order->order_id;
                                            $promo_used->o_payment_id = $order_payment->o_payment_id;
                                            $promo_used->order_total = $order_payment->o_payment_subtotal;
                                            $promo_used->promo_nominal = $promo_nominal;
                                            $promo_used->promo_used_status = "1";
                                            $promo_used->promo_used_create_date = Carbon::now();

                                            if ($promo_used->save()) {
                                                $promo_ecommerce->promo_used = $promo_ecommerce->promo_used + 1;
                                                $promo_ecommerce->save();
                                            }
                                        } else if ($promo_ecommerce->promo_section == 'shipment') {
                                            //----------------handle promo ongkir---------
                                            $promo_nominal = $this->countPromoOngkirOrderPaymentAmount($promo_ecommerce, $data['order_shipment_package'], $groupedCart, $order_shipment_delivery, $order_shipment_courier);
                                            $final_promo_nominal = ($data['order_shipment_package'] - $promo_nominal < 0) ? $promo_nominal - $data['order_shipment_package'] : $promo_nominal;

                                            $promo_used = new PromoEcommerceUsed();
                                            $promo_used->promo_id = $promo_ecommerce->promo_id;
                                            $promo_used->customer_id = $authData['customer_id'];
                                            $promo_used->order_id = $order->order_id;
                                            $promo_used->o_payment_id = $order_payment->o_payment_id;
                                            $promo_used->order_total = $order_payment->o_payment_subtotal;
                                            $promo_used->promo_nominal = $final_promo_nominal;
                                            $promo_used->promo_used_status = "1";
                                            $promo_used->promo_used_create_date = Carbon::now();

                                            if ($promo_used->save()) {
                                                $promo_ecommerce->promo_used = $promo_ecommerce->promo_used + 1;
                                                $promo_ecommerce->save();
                                            }
                                        }
                                    }

                                    //order detail
                                    $dataCart = $cart;

                                    $dataNotif['order'][$index_order] = $order;
                                    $order_total_hpp = 0;

                                    for ($i = 0; $i < count($dataCart); $i++) {
                                        $orderDetail = new OrderDetail();

                                        $orderDetail->order_id = $order->order_id;
                                        $orderDetail->product_id = $dataCart[$i]['product_id'];
                                        $orderDetail->o_detail_product_name = $dataCart[$i]['product']['product_name'];
                                        $orderDetail->o_detail_product_image = $dataCart[$i]['product']['product_image_1'];
                                        $orderDetail->o_detail_product_price = $dataCart[$i]['product_price'];
                                        $orderDetail->o_detail_product_hpp = $dataCart[$i]['product_price_hpp'];
                                        $orderDetail->o_detail_product_margin = ($dataCart[$i]['product_price'] - $dataCart[$i]['product_price_hpp']);
                                        $orderDetail->o_detail_subtotal_hpp = $dataCart[$i]['product_price_hpp'] * $dataCart[$i]['qty'];
                                        $orderDetail->o_detail_subtotal_margin = ($dataCart[$i]['product_price'] - $dataCart[$i]['product_price_hpp']) * $dataCart[$i]['qty'];
                                        $orderDetail->o_detail_product_weight = !empty($dataCart[$i]['product']['product_weight']) ? $dataCart[$i]['product']['product_weight'] : 1000;
                                        $orderDetail->o_detail_subtotal = $dataCart[$i]['total_amount'];
                                        $orderDetail->o_detail_qty = $dataCart[$i]['qty'];
                                        $orderDetail->ps_id = $dataCart[$i]['ps_id'];
                                        $orderDetail->fs_detail_id = ($dataCart[$i]['product']['ongoing_fs_detail']) ? $dataCart[$i]['product']['ongoing_fs_detail']['fs_detail_id'] : '';
                                        $orderDetail->o_detail_product_grosir = $dataCart[$i]['product_grosir'];
                                        $orderDetail->o_detail_create_date = Carbon::now();
                                        //note
                                        if (!empty($product_cart_notes)) {
                                            $o_detail_note = '';

                                            foreach ($product_cart_notes as $item) {
                                                if ($item['cart_id'] == $dataCart[$i]['cart_id']) {
                                                    $o_detail_note = $item['note'];
                                                }
                                            }
                                            if ($o_detail_note != '') {
                                                $orderDetail->o_detail_note = $o_detail_note;
                                            }
                                        }

                                        $orderDetail->save();

                                        $order_total_hpp += $orderDetail->o_detail_product_hpp * $orderDetail->o_detail_qty;
                                        $dataNotif['order'][$index_order]['order_detail'][$i] = $orderDetail;

                                        //buy point
                                        $point = new ProductPointController();
                                        for ($x = 0; $x < $dataCart[$i]['qty']; $x++) {
                                            $point->product_point($dataCart[$i]['product_id'], 'buy');
                                        }

                                        $product_name = substr($dataCart[$i]['product']['product_name'], 0, 20) . '... ' . (($dataCart[$i]['variant']) ? '(' . $dataCart[$i]['variant']['ps_option'] . ')' : '');

                                        //mengurangi stock
                                        $p_stock = Product::where('product_id', '=', $orderDetail->product_id)->first();
                                        $p_stock->product_stock = $p_stock->product_stock - $orderDetail->o_detail_qty;

                                        if ($p_stock->product_stock < 0) {
                                            return response([
                                                'success' => false,
                                                'message' => 'Stock ' . $product_name . 'tidak mencukupi.',
                                            ]);
                                        }

                                        $p_stock->save();

                                        if ($dataCart[$i]['fs_detail_id'] != 0) {
                                            $fs_stock = FlashSaleDetail::where('fs_detail_id', '=', $dataCart[$i]['fs_detail_id'])->first();
                                            $fs_stock->fs_detail_product_stock = $fs_stock->fs_detail_product_stock - $orderDetail->o_detail_qty;

                                            if ($fs_stock->fs_detail_product_stock < 0) {
                                                return response([
                                                    'success' => false,
                                                    'message' => 'Stock flash sale ' . $product_name . 'tidak mencukupi.',
                                                ]);
                                            }

                                            $fs_stock->save();
                                        } else if ($dataCart[$i]['ps_id'] != 0) {
                                            $ps_stock = ProductStock::where('ps_id', '=', $dataCart[$i]['ps_id'])->first();
                                            $ps_stock->ps_stock = $ps_stock->ps_stock - $orderDetail->o_detail_qty;

                                            if ($ps_stock->ps_stock < 0) {
                                                return response([
                                                    'success' => false,
                                                    'message' => 'Stock ' . $product_name . 'tidak mencukupi.',
                                                ]);
                                            }

                                            $ps_stock->save();
                                        }

                                    }

                                    $dataNotif['order'][$index_order]['order_total_hpp'] = $order_total_hpp;
                                } else {
                                    return collect([
                                        'success' => false,
                                        'message' =>'Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!',
                                        'error_code' => '0003',
                                    ])->toJson();
                                }

                                $gcm = new Gcm();
                                $gcm->send('cus-' . $cart[0]['merchant']['customer_id'], 'order-merchant', $dataNotif, 'Pesanan Baru', 'ada pesanan baru, ketuk untuk melihat detail.');
                                $gcm->send('cus-lite-' . $cart[0]['merchant']['customer_id'], 'order-merchant', $dataNotif, 'Pesanan Baru', 'ada pesanan baru, ketuk untuk melihat detail.');

                                $index_order++;
                            }

                            Cart::where('customer_id', $authData['customer_id'])
                                ->where('cart_status', 'on')
                                ->delete();

                            $cartController = new CartController();
                            $cartController->send_mail_order_v2($order_payment->o_payment_id);

                            $lastOrder = Order::where('order_id', '=', $order->order_id)->with('order_payment')->first();

                            return collect([
                                'success'   => true,
                                'message'   => 'Payment berhasil!',
                                'data'      => 'Order berhasil, order anda sedang diproses.',
                                'payment'   => $order_payment,
                                'dataNotif' => $dataNotif,
                                'order'     => $lastOrder,
                            ])->toJson();

                        } else {
                            return collect([
                                'success' => false,
                                'message' => 'Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!',
                                'error_code' => '0003',
                            ])->toJson();
                        }
                    }
                    else {
                        return collect([
                            'success' => false,
                            'message' => $response['data']['responseCode'],
                            'error_code' => '0003',
                            ])->toJson();
                        }
                    }

            }elseif ($order_payment->o_payment_bank == 'Xendit'){
                if($order_payment->o_payment_group == 'retail'){
                    $xendit = new XenditPaymentControllerV2();

                    $biaya_admin = $data['payment_method']['payment_method_admin_price'];

                    $xenditData = [
                        'name'                  => $authData['customer_name'],
                        'external_id'           => 'ECOMMERCE'.'_'. strtoupper($data['payment_method']['payment_method_3rdparty']) . '_' . strtoupper($data['payment_method']['payment_method_alias']) . '_' . rand(0, 99999),
                        'retail_outlet_name'    => strtoupper($data['payment_method']['payment_method_alias']),
                        'expected_amount'       => $order_payment->o_payment_total + $biaya_admin,
                    ];

                    $response = $xendit->RetailCreatePayment($xenditData);

                    if ($response == null || array_key_exists('error_code', $response)) {
                        $res['success'] = false;
                        $res['message'] = 'Pembayaran gagal. Silahkan ulangi beberapa saat lagi';

                        return $res;
                    }

                    $order_payment->o_payment_retail_bank       = $response['retail_outlet_name'];
                    $order_payment->o_payment_retail_code       = $response['payment_code'];
                    $order_payment->o_payment_retail_bank_refid = $response['id'];
                    $order_payment->o_payment_expired_date      = $response['expiration_date'];

                    if ($order_payment->save()) {
                        $tutorial = json_decode(file_get_contents(storage_path('app/tutorial/retail/' . strtolower($data['payment_method']['payment_method_alias']) . '_' . strtolower($order_payment->o_payment_bank) . '.json')), true);

                        $dataNotif['customer'] = $authData;
                        $dataNotif['order_payment'] = $order_payment;

                        $address = $customerAddr->c_address_address . ', ' .
                            $customerAddr->city->r_city_subdistrict . ', ' .
                            $customerAddr->city->r_city_name . ', ' .
                            $customerAddr->city->r_city_province . ', ' .
                            $customerAddr->city->r_city_postcode;

                        $index_order = 0;

                        foreach ($groupedCart as $key => $cart) {
                            $order = new Order();

                            //sub_total
                            $sub_total_by_merchant = collect($cart)->sum('total_amount');

                            $order_shipment_type_by_merchant = '';
                            $order_shipment_price_by_merchant = '';
                            $order_shipment_courier_by_merchant = '';
                            $order_shipment_package_by_merchant = '';
                            $shippingEstimasi_by_merchant = '';
                            $order_paid_date = null;

                            //order_shipment
                            if (!empty($order_shipment_delivery)) {
                                $shipment = collect($order_shipment_delivery)->firstWhere('merchant_id', '=', $key);

                                $jml_bayar = !empty($shipment['item']['jumlah_pembayaran']) ? $shipment['item']['jumlah_pembayaran'] : 0;

                                $order_shipment_type_by_merchant = 'driver';
                                $order_shipment_price_by_merchant = $jml_bayar;
                                $order_shipment_courier_by_merchant = 'Driver';
                                $order_shipment_package_by_merchant = 'eBelenja Delivery';
                                $shippingEstimasi_by_merchant = '24 Jam';
                                $order_paid_date = null;
                            }
                            if (!empty($order_shipment_courier) && $order_shipment_price_by_merchant == '') {
                                $shipment = collect($order_shipment_courier)->firstWhere('merchant_id', '=', $key);

                                $order_shipment_type_by_merchant = 'courier';
                                $order_shipment_price_by_merchant = !empty($shipment['data_courier']['const']['value']) ? $shipment['data_courier']['const']['value'] : 0;
                                $order_shipment_courier_by_merchant = !empty($shipment['courier']['name']) ? $shipment['courier']['name'] : '';
                                $order_shipment_package_by_merchant = !empty($shipment['data_courier']['service']) ? $shipment['data_courier']['service'] : '';
                                $shippingEstimasi_by_merchant = !empty($shipment['data_courier']['const']['etd']) ? $shipment['data_courier']['const']['etd'] : '';
                                $order_paid_date = Carbon::now();
                            }

                            // handle promo ongkir di tabel order
                            if (!empty($promo_ecommerce) && !empty($promo_alias)) {
                                if ($promo_ecommerce->promo_section == 'shipment') {
                                    $promo_nominal = $this->countPromoOngkirOrderAmount($promo_ecommerce, $order_shipment_price_by_merchant, $groupedCart);
                                    $order_shipment_price_by_merchant = $order_shipment_price_by_merchant - $promo_nominal < 0 ? 0 : $order_shipment_price_by_merchant - $promo_nominal;
                                }
                            }

                            $order_total = round($sub_total_by_merchant) + round($order_shipment_price_by_merchant) + round($data['payment_method']['payment_method_admin_price']);

                            $order->order_number = $this->order_number($key);
                            $order->o_payment_id = $order_payment->o_payment_id;
                            $order->customer_id = $authData['customer_id'];
                            $order->merchant_id = $key;
                            $order->order_payment_type = $data['payment_type'];
                            $order->driver_id = 1; //$request->input('driver_id');
                            $order->payment_method_id = $data['payment_method']['payment_method_id'];
                            $order->payment_method_group = $data['payment_method']['payment_method_group'];
                            $order->payment_method_name = $data['payment_method']['payment_method_name'];
                            $order->payment_method_desc = $data['payment_method']['payment_method_desc'];
                            $order->order_subtotal = $sub_total_by_merchant; //
                            $order->order_shipment_price = $order_shipment_price_by_merchant; //
                            $order->order_shipment_type = $order_shipment_type_by_merchant;
                            $order->order_shipment_courier = $order_shipment_courier_by_merchant;
                            $order->order_shipment_package = $order_shipment_package_by_merchant;
                            $order->order_shipment_time = $shippingEstimasi_by_merchant;
                            $order->order_total = $order_total;
                            $order->order_shipment_cost = 'ebelanja';
                            $order->order_shipment_date = Carbon::now()->addDay();
                            $order->r_city_id = $customerAddr->r_city_id;
                            $order->order_shipment_to = $customerAddr->c_address_name;
                            $order->order_shipment_address = $address;
                            $order->order_shipment_note = $data['order_shipment_note'];
                            $order->order_shipment_phone = $customerAddr->c_address_phone;
                            $order->order_status = $data['order_payment_status'];
                            $order->order_paid_date = $order_paid_date;
                            $order->order_create_date = Carbon::now();

                            if ($order->save()) {

                                if (!empty($promo_alias)) {
                                    $promo_ecommerce = PromoEcommerce::where('promo_alias', '=', $promo_alias)->first();
                                    $promo_used = new PromoEcommerceUsed();

                                    if ($promo_ecommerce->promo_section == 'cashback') {
                                        //----------------handle promo cashback---------
                                        $promo_nominal = $this->countPromoCBAmount($promo_ecommerce, $order_payment);

                                        $order_cashback = new OrderCashback();
                                        $order_cashback->o_payment_id = $order_payment->o_payment_id;
                                        $order_cashback->customer_id = $authData['customer_id'];
                                        $order_cashback->o_cashback_nominal = $promo_nominal;
                                        $order_cashback->o_cashback_status = 'new';
                                        $order_cashback->o_cashback_update_date = Carbon::now();
                                        $order_cashback->o_cashback_create_date = Carbon::now();
                                        $order_cashback->save();

                                        $promo_used->promo_id = $promo_ecommerce->promo_id;
                                        $promo_used->customer_id = $authData['customer_id'];
                                        $promo_used->order_id = $order->order_id;
                                        $promo_used->o_payment_id = $order_payment->o_payment_id;
                                        $promo_used->order_total = $order_payment->o_payment_subtotal;
                                        $promo_used->promo_nominal = $promo_nominal;
                                        $promo_used->promo_used_status = "1";
                                        $promo_used->promo_used_create_date = Carbon::now();

                                        if ($promo_used->save()) {
                                            $promo_ecommerce->promo_used = $promo_ecommerce->promo_used + 1;
                                            $promo_ecommerce->save();
                                        }
                                    } else if ($promo_ecommerce->promo_section == 'shipment') {
                                        //----------------handle promo ongkir---------
                                        $promo_nominal = $this->countPromoOngkirOrderPaymentAmount($promo_ecommerce, $data['order_shipment_package'], $groupedCart, $order_shipment_delivery, $order_shipment_courier);
                                        $final_promo_nominal = ($data['order_shipment_package'] - $promo_nominal < 0) ? $promo_nominal - $data['order_shipment_package'] : $promo_nominal;

                                        $promo_used = new PromoEcommerceUsed();
                                        $promo_used->promo_id = $promo_ecommerce->promo_id;
                                        $promo_used->customer_id = $authData['customer_id'];
                                        $promo_used->order_id = $order->order_id;
                                        $promo_used->o_payment_id = $order_payment->o_payment_id;
                                        $promo_used->order_total = $order_payment->o_payment_subtotal;
                                        $promo_used->promo_nominal = $final_promo_nominal;
                                        $promo_used->promo_used_status = "1";
                                        $promo_used->promo_used_create_date = Carbon::now();

                                        if ($promo_used->save()) {
                                            $promo_ecommerce->promo_used = $promo_ecommerce->promo_used + 1;
                                            $promo_ecommerce->save();
                                        }
                                    }
                                }

                                //order detail
                                $dataCart = $cart;

                                $dataNotif['order'][$index_order] = $order;
                                $order_total_hpp = 0;

                                for ($i = 0; $i < count($dataCart); $i++) {
                                    $orderDetail = new OrderDetail();

                                    $orderDetail->order_id = $order->order_id;
                                    $orderDetail->product_id = $dataCart[$i]['product_id'];
                                    $orderDetail->o_detail_product_name = $dataCart[$i]['product']['product_name'];
                                    $orderDetail->o_detail_product_image = $dataCart[$i]['product']['product_image_1'];
                                    $orderDetail->o_detail_product_price = $dataCart[$i]['product_price'];
                                    $orderDetail->o_detail_product_hpp = $dataCart[$i]['product_price_hpp'];
                                    $orderDetail->o_detail_product_margin = ($dataCart[$i]['product_price'] - $dataCart[$i]['product_price_hpp']);
                                    $orderDetail->o_detail_subtotal_hpp = $dataCart[$i]['product_price_hpp'] * $dataCart[$i]['qty'];
                                    $orderDetail->o_detail_subtotal_margin = ($dataCart[$i]['product_price'] - $dataCart[$i]['product_price_hpp']) * $dataCart[$i]['qty'];
                                    $orderDetail->o_detail_product_weight = !empty($dataCart[$i]['product']['product_weight']) ? $dataCart[$i]['product']['product_weight'] : 1000;
                                    $orderDetail->o_detail_subtotal = $dataCart[$i]['total_amount'];
                                    $orderDetail->o_detail_qty = $dataCart[$i]['qty'];
                                    $orderDetail->ps_id = $dataCart[$i]['ps_id'];
                                    $orderDetail->fs_detail_id = ($dataCart[$i]['product']['ongoing_fs_detail']) ? $dataCart[$i]['product']['ongoing_fs_detail']['fs_detail_id'] : '';
                                    $orderDetail->o_detail_product_grosir = $dataCart[$i]['product_grosir'];
                                    $orderDetail->o_detail_create_date = Carbon::now();
                                    //note
                                    if (!empty($product_cart_notes)) {
                                        $o_detail_note = '';

                                        foreach ($product_cart_notes as $item) {
                                            if ($item['cart_id'] == $dataCart[$i]['cart_id']) {
                                                $o_detail_note = $item['note'];
                                            }
                                        }
                                        if ($o_detail_note != '') {
                                            $orderDetail->o_detail_note = $o_detail_note;
                                        }
                                    }

                                    $orderDetail->save();

                                    $order_total_hpp += $orderDetail->o_detail_product_hpp * $orderDetail->o_detail_qty;
                                    $dataNotif['order'][$index_order]['order_detail'][$i] = $orderDetail;

                                    //buy point
                                    $point = new ProductPointController();
                                    for ($x = 0; $x < $dataCart[$i]['qty']; $x++) {
                                        $point->product_point($dataCart[$i]['product_id'], 'buy');
                                    }

                                    $product_name = substr($dataCart[$i]['product']['product_name'], 0, 20) . '... ' . (($dataCart[$i]['variant']) ? '(' . $dataCart[$i]['variant']['ps_option'] . ')' : '');

                                    //mengurangi stock
                                    $p_stock = Product::where('product_id', '=', $orderDetail->product_id)->first();
                                    $p_stock->product_stock = $p_stock->product_stock - $orderDetail->o_detail_qty;

                                    if ($p_stock->product_stock < 0) {
                                        return response([
                                            'success' => false,
                                            'message'    => 'Stock '.$product_name.'tidak mencukupi.',
                                        ]);
                                    }

                                    $p_stock->save();

                                    if ($dataCart[$i]['fs_detail_id'] != 0) {
                                        $fs_stock = FlashSaleDetail::where('fs_detail_id', '=', $dataCart[$i]['fs_detail_id'])->first();
                                        $fs_stock->fs_detail_product_stock = $fs_stock->fs_detail_product_stock - $orderDetail->o_detail_qty;

                                        if ($fs_stock->fs_detail_product_stock < 0) {
                                            return response([
                                                'success' => false,
                                                'message'    => 'Stock flash sale '.$product_name.'tidak mencukupi.',
                                            ]);
                                        }

                                        $fs_stock->save();
                                    } else if ($dataCart[$i]['ps_id'] != 0) {
                                        $ps_stock = ProductStock::where('ps_id', '=', $dataCart[$i]['ps_id'])->first();
                                        $ps_stock->ps_stock = $ps_stock->ps_stock - $orderDetail->o_detail_qty;

                                        if ($ps_stock->ps_stock < 0) {
                                            return response([
                                                'success' => false,
                                                'message'    => 'Stock '.$product_name.'tidak mencukupi.',
                                            ]);
                                        }

                                        $ps_stock->save();
                                    }

                                }

                                $dataNotif['order'][$index_order]['order_total_hpp'] = $order_total_hpp;
                            } else {
                                return collect([
                                    'success' => false,
                                    'message'       => 'Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!',
                                    'error_code' => '0003',
                                ])->toJson();
                            }

                            $gcm = new Gcm();
                            $gcm->send('cus-' . $cart[0]['merchant']['customer_id'], 'order-merchant', $dataNotif, 'Pesanan Baru', 'ada pesanan baru, ketuk untuk melihat detail.');
                            $gcm->send('cus-lite-' . $cart[0]['merchant']['customer_id'], 'order-merchant', $dataNotif, 'Pesanan Baru', 'ada pesanan baru, ketuk untuk melihat detail.');

                            $index_order++;
                        }

                        Cart::where('customer_id', $authData['customer_id'])
                            ->where('cart_status', 'on')
                            ->delete();

                        $cartController = new CartController();
                        $cartController->send_mail_order_v2($order_payment->o_payment_id);

                        $lastOrder = Order::where('order_id', '=', $order->order_id)->with('order_payment')->first();

                        return collect([
                            'success'   => true,
                            'message'   => 'Payment berhasil!',
                            'data'      => 'Order berhasil, order anda sedang diproses.',
                            'payment'   => $order_payment,
                            'dataNotif' => $dataNotif,
                            'order'     => $lastOrder,
                            'tutorial'  => $tutorial,
                        ])->toJson();

                    } else {
                        return collect([
                            'success' => false,
                            'message'       => 'Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!',
                            'error_code' => '0003',
                        ])->toJson();
                    }
                }
            }

        }else{
            return collect([
                'success'       => false,
                'message'       => 'Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!',
                'error_code' => '0002',
            ])->toJson();
        }
    }


}