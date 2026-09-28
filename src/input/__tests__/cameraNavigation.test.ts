import { isAllowedCameraNavigation } from '../camera/navigation';
import { CAMERA_PAGE_BASE_URL } from '../camera/poseCameraPage';

describe('camera WebView navigation', () => {
  it('allows only the camera page', () => {
    expect(isAllowedCameraNavigation(CAMERA_PAGE_BASE_URL)).toBe(true);
    expect(isAllowedCameraNavigation('about:blank')).toBe(true);
  });

  it('refuses everything else', () => {
    expect(isAllowedCameraNavigation('https://cali-incr.local.evil.example/')).toBe(false);
    expect(isAllowedCameraNavigation('https://cali-incr.local/other')).toBe(false);
    expect(isAllowedCameraNavigation('https://example.com/')).toBe(false);
    expect(isAllowedCameraNavigation('javascript:alert(1)')).toBe(false);
  });
});
