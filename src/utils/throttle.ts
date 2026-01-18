/**
 * @module @dreamer/video-player/utils/throttle
 *
 * @fileoverview 节流和防抖工具函数
 *
 * 用于优化高频事件的性能。
 * 提供节流和防抖函数，用于优化播放器事件处理。
 *
 * 主要功能：
 * - 节流函数（throttle）
 * - 防抖函数（debounce）
 * - 性能优化
 *
 * @example
 * ```typescript
 * import { throttle, debounce } from "jsr:@dreamer/video-player/utils/throttle";
 *
 * const throttledFn = throttle(() => {
 *   console.log("节流执行");
 * }, 1000);
 *
 * const debouncedFn = debounce(() => {
 *   console.log("防抖执行");
 * }, 500);
 * ```
 */

/**
 * 节流函数
 * 在指定时间间隔内最多执行一次
 *
 * @param func - 要节流的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 节流后的函数
 *
 * @example
 * ```typescript
 * const throttled = throttle(() => {
 *   console.log('执行');
 * }, 250);
 *
 * // 快速调用多次，但每 250ms 最多执行一次
 * throttled();
 * throttled();
 * throttled();
 * ```
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  delay: number,
): T {
  let lastCall = 0;
  let timeoutId: number | undefined;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      func(...args);
    } else {
      // 确保最后一次调用也会执行
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, delay - timeSinceLastCall);
    }
  }) as T;
}

/**
 * 防抖函数
 * 在指定时间间隔内只执行最后一次调用
 *
 * @param func - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的函数
 *
 * @example
 * ```typescript
 * const debounced = debounce(() => {
 *   console.log('执行');
 * }, 300);
 *
 * // 快速调用多次，但只执行最后一次
 * debounced();
 * debounced();
 * debounced();
 * ```
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number,
): T {
  let timeoutId: number | undefined;

  return ((...args: Parameters<T>) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  }) as T;
}
