const kenyaMobilePattern = /^\+254(?:1|7)\d{8}$/;

export function normalizeKenyanMobile(input: string) {
  const compact = input.trim().replace(/[\s()-]/g, "");
  let normalized = compact;
  if (/^0(?:1|7)\d{8}$/.test(compact)) {
    normalized = `+254${compact.slice(1)}`;
  } else if (/^254(?:1|7)\d{8}$/.test(compact)) {
    normalized = `+${compact}`;
  } else if (/^(?:1|7)\d{8}$/.test(compact)) {
    normalized = `+254${compact}`;
  }
  return kenyaMobilePattern.test(normalized) ? normalized : null;
}

export function maskedPhoneNumber(phoneNumber: string | null) {
  if (!phoneNumber || phoneNumber.length < 7) return "";
  return `${phoneNumber.slice(0, 4)} ••• ••${phoneNumber.slice(-3)}`;
}
