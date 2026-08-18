export const KOBO_PER_NAIRA = 100n;
export const NAIRA_SYMBOL = String.fromCodePoint(0x20a6);

export function formatNaira(amount: number | bigint): string {
  return `${NAIRA_SYMBOL}${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function formatNairaInput(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits ? new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(BigInt(digits)) : "";
}

export function nairaToKobo(value: string): bigint | null {
  const digits = value.replace(/\D/g, "");
  return digits ? BigInt(digits) * KOBO_PER_NAIRA : null;
}
