/**
 * "Support the developer" payment: a voluntary tip that unlocks nothing.
 *
 * Goes through the official in-app purchase of the stores (App Store guideline 3.1.1,
 * Google Play Billing) with a consumable product, so it can be bought again.
 * Apple / Google handle the whole payment: the app never sees card or account details,
 * it only receives "purchased" and closes the transaction. Nothing is saved.
 *
 * expo-iap is a native module missing from Expo Go: it is loaded lazily and only in a
 * store build (EAS), so the rest of the app keeps running in Expo Go.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import type { Purchase } from 'expo-iap';

/** Same product id in App Store Connect and Google Play Console (consumable, €1.99). */
export const SUPPORT_PRODUCT_ID = 'com.chorkbambi.calincr.support';

/** Shown until the store gives the localized price. */
export const SUPPORT_FALLBACK_PRICE = '€1.99';

export type SupportPurchaseResult = 'paid' | 'cancelled' | 'pending' | 'unavailable' | 'failed';

type ExpoIap = typeof import('expo-iap');

/** The store module, or null in Expo Go / on the web / if the native module is missing. */
function loadIap(): ExpoIap | null {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-iap') as ExpoIap;
  } catch {
    return null;
  }
}

const isOurs = (purchase: Purchase) => purchase.productId === SUPPORT_PRODUCT_ID;

/** Closes a paid support purchase (consumed: it can be bought again, and Google won't refund it). */
async function finish(iap: ExpoIap, purchase: Purchase): Promise<void> {
  await iap.finishTransaction({ purchase, isConsumable: true });
}

/** Localized price from the store ("1,99 €", "$1.99"…), or null when purchases are unavailable. */
export async function loadSupportPrice(): Promise<string | null> {
  const iap = loadIap();
  if (!iap) return null;
  try {
    await iap.initConnection();
    const products = await iap.fetchProducts({ skus: [SUPPORT_PRODUCT_ID], type: 'in-app' });
    const product = products?.find((p) => p.id === SUPPORT_PRODUCT_ID);
    return product?.displayPrice ?? null;
  } catch {
    return null;
  }
}

/**
 * Closes support purchases left open (app closed during the payment, pending payment accepted later).
 * Call once at startup; errors are ignored.
 */
export async function finishPendingSupportPurchases(): Promise<void> {
  const iap = loadIap();
  if (!iap) return;
  try {
    await iap.initConnection();
    const purchases = await iap.getAvailablePurchases();
    for (const p of purchases ?? []) {
      if (isOurs(p) && p.purchaseState === 'purchased') await finish(iap, p);
    }
  } catch {
    // Store unreachable: the store will offer the transaction again next time.
  }
}

/** Opens the store's payment sheet and waits for the result. */
export async function purchaseSupport(): Promise<SupportPurchaseResult> {
  const iap = loadIap();
  if (!iap) return 'unavailable';
  try {
    await iap.initConnection();
    const products = await iap.fetchProducts({ skus: [SUPPORT_PRODUCT_ID], type: 'in-app' });
    if (!products?.some((p) => p.id === SUPPORT_PRODUCT_ID)) return 'unavailable';
  } catch {
    return 'unavailable';
  }

  return new Promise<SupportPurchaseResult>((resolve) => {
    let done = false;
    const settle = (result: SupportPurchaseResult) => {
      if (done) return;
      done = true;
      updated.remove();
      failed.remove();
      resolve(result);
    };
    const updated = iap.purchaseUpdatedListener((purchase) => {
      if (!isOurs(purchase)) return;
      if (purchase.purchaseState === 'pending') {
        settle('pending');
        return;
      }
      finish(iap, purchase)
        .then(() => settle('paid'))
        .catch(() => settle('failed'));
    });
    const failed = iap.purchaseErrorListener((error) => {
      settle(String(error.code) === 'user-cancelled' ? 'cancelled' : 'failed');
    });
    iap
      .requestPurchase({
        request: { apple: { sku: SUPPORT_PRODUCT_ID }, google: { skus: [SUPPORT_PRODUCT_ID] } },
        type: 'in-app',
      })
      .catch((error: { code?: unknown }) => settle(String(error?.code) === 'user-cancelled' ? 'cancelled' : 'failed'));
  });
}
