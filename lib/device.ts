/**
 * 设备检测工具函数
 * 根据UA和屏幕宽度判断是否为移动端
 */

/**
 * 检测是否为移动设备（基于UA）
 */
export function isMobileUserAgent(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const ua = window.navigator.userAgent.toLowerCase();
  const mobileRegex =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  return mobileRegex.test(ua);
}

/**
 * 检测屏幕宽度是否为移动端（小于768px）
 */
export function isMobileScreenWidth(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.innerWidth < 768;
}

/**
 * 综合判断是否为移动端
 * 优先使用屏幕宽度，如果无法获取则使用UA
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  // 优先使用UA判断
  if (isMobileUserAgent()) {
    return true;
  }

  // 兜底使用屏幕宽度判断
  return isMobileScreenWidth();
}

/**
 * 获取设备类型
 */
export function getDeviceType(): "mobile" | "desktop" {
  return isMobileDevice() ? "mobile" : "desktop";
}
