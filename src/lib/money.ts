export const KOBO_PER_NAIRA = 100n;

export function formatNaira(amount: number | bigint): string {
  return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function formatNairaInput(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits ? new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(BigInt(digits)) : "";
}

export function nairaToKobo(value: string): bigint | null {
  const digits = value.replace(/\D/g, "");
  return digits ? BigInt(digits) * KOBO_PER_NAIRA : null;
}
