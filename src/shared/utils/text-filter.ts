const templates = [
  "Halo! Demi keamanan akun Anda, berikut adalah kode OTP {wl_name} yang Anda minta: {otp}. Harap jangan bagikan kode ini kepada siapa pun. Kode ini hanya berlaku selama {time} menit.",
  "Terima kasih telah menggunakan layanan kami. Kode verifikasi (OTP) {wl_name} Anda adalah: {otp}. Jaga kerahasiaan kode ini dan segera gunakan sebelum kadaluwarsa.",
  "Kami menerima permintaan {param}. Untuk melanjutkan, masukkan kode OTP {wl_name} berikut: {otp}. Demi perlindungan data Anda, jangan berikan kode ini kepada siapa pun.",
  "Kode keamanan {wl_name} Anda adalah {otp}. Kode ini diperlukan untuk menyelesaikan proses {param}. Pastikan Anda tidak membagikan kode ini kepada pihak lain.",
  "Hai! Untuk menyelesaikan proses {param}, gunakan kode OTP {wl_name} berikut: {otp}. Ingat, kode ini bersifat rahasia dan hanya berlaku sementara. Mohon gunakan segera.",
  "Hai! Ini dia kode OTP {wl_name} kamu: {otp}. Jangan sampai dikasih ke orang lain ya. Kode ini cuma berlaku beberapa menit aja, jadi buruan dipakai!",
  "Yuk, lanjut prosesnya! Masukkan kode {wl_name} ini: {otp}. Ini kodenya cuma buat kamu, jangan dibocorin ke siapa pun ya. Cepet dipake sebelum hangus!",
  "Halo! Kamu minta kode OTP {wl_name}, kan? Nih ya: {otp}. Jangan sampai salah masukin, dan inget, ini rahasia. 😎",
  "Horee~ Kode OTP {wl_name} kamu udah siap nih: {otp}. Langsung aja masukin biar prosesnya cepet kelar. Kodenya sebentar doang aktifnya, lho!",
  "Hey! Ini kode OTP {wl_name}-nya: {otp}. Buat kamu doang nih, jangan disebarin ke siapa-siapa. Pakai sekarang sebelum expired, ya!",
];

const templateOrder: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

let currentIndex = 0;

function shuffleArray(arr: number[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i]!, arr[j]!] = [arr[j]!, arr[i]!];
  }
}

export function randomTextOTP(
  otp: string,
  time = 5,
  param: string | null = null,
  platform: "ebelenja" | "gadgetgo" = "ebelenja",
): string {
  const wlName = platform === "ebelenja" ? "eBelanja.id" : "Gadgetgo";

  if (currentIndex >= templateOrder.length) {
    shuffleArray(templateOrder);
    currentIndex = 0;
  }

  const index = templateOrder[currentIndex]!;
  currentIndex++;

  let text = templates[index]!;
  text = text.replace("{otp}", otp);
  text = text.replace("{time}", String(time));
  text = text.replace("{param}", param ?? "verifikasi");
  text = text.replaceAll("{wl_name}", wlName);

  return text;
}
