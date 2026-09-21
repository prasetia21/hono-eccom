/** PhoneService::normalize: nomor Indonesia menjadi format 62xxx. */
export const toPhonePrefix62 = (input: string): string | null => {
  const phone = input.replace(/[ ().]/g, "").trim();

  if (/[^+0-9]/.test(phone)) {
    return null;
  }

  if (phone.startsWith("+62")) {
    return phone.slice(1);
  }

  if (phone.startsWith("62")) {
    return phone;
  }

  if (phone.startsWith("0")) {
    return `62${phone.slice(1)}`;
  }

  return null;
};

export const toPhonePrefix0 = (input: string): string => {
  // Bersihkan semua karakter pemisah umum (spasi, strip, titik, kurung)
  let normalized = input.replace(/[\s().-]/g, "");

  // Ubah awalan +62 menjadi 0
  if (normalized.startsWith("+62")) {
    normalized = "0" + normalized.slice(3);
  }
  // Ubah awalan 62 (tanpa +) menjadi 0
  else if (normalized.startsWith("62")) {
    normalized = "0" + normalized.slice(2);
  }

  return normalized;
};
