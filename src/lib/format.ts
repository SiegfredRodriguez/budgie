export type BalanceSign = "none" | "minus" | "signed";

/**
 * Formats an amount as `CUR 1,234.56`.
 *
 * `sign` controls how negative/positive amounts are marked:
 * - "minus" (default): a leading "-" on negative amounts, nothing on positive — a balance.
 * - "none": no sign at all — an amount the user is entering (always read as positive).
 * - "signed": a leading "-" or "+" — an individual transaction in a ledger.
 */
export function formatBalance(amount: number, currency: string, sign: BalanceSign = "minus"): string {
	const parts = Math.abs(amount).toFixed(2).split(".");
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	const prefix = sign === "none" ? "" : amount < 0 ? "-" : sign === "signed" ? "+" : "";
	return `${currency} ${prefix}${parts[0]}.${parts[1]}`;
}
