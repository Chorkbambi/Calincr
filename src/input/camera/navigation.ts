import { CAMERA_PAGE_BASE_URL } from './poseCameraPage';

/**
 * Only the camera page itself may load in the WebView: every other navigation is refused
 * (silently — nothing is ever opened in an external browser).
 */
export function isAllowedCameraNavigation(url: string): boolean {
  return url === 'about:blank' || url === CAMERA_PAGE_BASE_URL || url.startsWith(`${CAMERA_PAGE_BASE_URL}#`);
}

/**
 * react-native-webview opens any URL that fails `originWhitelist` in the phone's browser.
 * We let everything through that first check and refuse navigations in
 * `onShouldStartLoadWithRequest` instead, so a refused URL is simply not loaded.
 */
export const WEBVIEW_ORIGIN_WHITELIST = ['*'];
