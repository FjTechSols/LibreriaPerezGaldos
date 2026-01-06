/**
 * Tax Calculation Utilities
 * 
 * All prices in the application are displayed WITH tax included.
 * These utilities help calculate the breakdown for invoices.
 */

/**
 * Calculate price without tax from a price that includes tax
 * @param priceWithTax - Price including tax
 * @param taxRate - Tax rate as percentage (e.g., 4 for 4%, 21 for 21%)
 * @returns Price without tax
 * 
 * Formula: Price without tax = Price with tax / (1 + (tax rate / 100))
 * Example: €30 with 4% tax = €30 / 1.04 = €28.85
 */
export function calculatePriceWithoutTax(priceWithTax: number, taxRate: number): number {
  if (taxRate === 0) return priceWithTax;
  return priceWithTax / (1 + (taxRate / 100));
}

/**
 * Calculate tax amount from a price that includes tax
 * @param priceWithTax - Price including tax
 * @param taxRate - Tax rate as percentage (e.g., 4 for 4%, 21 for 21%)
 * @returns Tax amount
 * 
 * Formula: Tax amount = Price with tax - Price without tax
 * Example: €30 with 4% tax = €30 - €28.85 = €1.15
 */
export function calculateTaxAmount(priceWithTax: number, taxRate: number): number {
  if (taxRate === 0) return 0;
  const priceWithoutTax = calculatePriceWithoutTax(priceWithTax, taxRate);
  return priceWithTax - priceWithoutTax;
}

/**
 * Calculate price with tax from a price without tax
 * @param priceWithoutTax - Price without tax
 * @param taxRate - Tax rate as percentage (e.g., 4 for 4%, 21 for 21%)
 * @returns Price with tax
 * 
 * Formula: Price with tax = Price without tax * (1 + (tax rate / 100))
 * Example: €28.85 with 4% tax = €28.85 * 1.04 = €30.00
 */
export function calculatePriceWithTax(priceWithoutTax: number, taxRate: number): number {
  return priceWithoutTax * (1 + (taxRate / 100));
}

/**
 * Calculate invoice totals with tax breakdown
 * @param items - Array of items with price (including tax) and quantity
 * @param taxRate - Tax rate as percentage
 * @returns Object with subtotal (without tax), tax amount, and total (with tax)
 */
export function calculateInvoiceTotals(
  items: Array<{ price: number; quantity: number }>,
  taxRate: number
): {
  subtotalWithoutTax: number;
  taxAmount: number;
  totalWithTax: number;
} {
  const totalWithTax = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const subtotalWithoutTax = calculatePriceWithoutTax(totalWithTax, taxRate);
  const taxAmount = totalWithTax - subtotalWithoutTax;

  return {
    subtotalWithoutTax: Number(subtotalWithoutTax.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    totalWithTax: Number(totalWithTax.toFixed(2))
  };
}
