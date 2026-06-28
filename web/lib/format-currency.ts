/** Format a MYR amount for display (e.g. RM 0.12). */
export function formatMYR(amount: number): string {
  return new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}
