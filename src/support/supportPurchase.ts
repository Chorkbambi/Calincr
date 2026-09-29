/**
 * "Support the developer" payment: a voluntary tip that unlocks nothing.
 *
 * Not wired yet. A real payment must go through the stores' in-app purchase
 * (App Store guideline 3.1.1, Google Play Billing), which needs a native module
 * missing from Expo Go (see README "Support button"). Until then this reports
 * 'unavailable' and nothing is charged.
 */
export type SupportPurchaseResult = 'paid' | 'cancelled' | 'unavailable';

export const SUPPORT_PRICE_LABEL = '€1.99';

export async function purchaseSupport(): Promise<SupportPurchaseResult> {
  return 'unavailable';
}
