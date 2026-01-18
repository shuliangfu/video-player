/**
 * @module @dreamer/video-player/utils/network
 *
 * @fileoverview 网络工具函数
 *
 * 用于检测网络状态和优化播放策略。
 * 提供网络状态检测、质量级别建议等功能。
 *
 * 主要功能：
 * - 网络状态检测
 * - 连接类型检测
 * - 质量级别建议
 * - 低延迟模式建议
 *
 * @example
 * ```typescript
 * import { getNetworkStatus } from "jsr:@dreamer/video-player/utils/network";
 *
 * const networkStatus = getNetworkStatus();
 * if (networkStatus.effectiveType === "4g") {
 *   // 使用高质量
 * }
 * ```
 */

/**
 * 网络连接类型
 */
export type NetworkConnectionType =
  | "bluetooth"
  | "cellular"
  | "ethernet"
  | "none"
  | "wifi"
  | "wimax"
  | "other"
  | "unknown";

/**
 * 网络有效类型（基于带宽和 RTT 估算）
 */
export type NetworkEffectiveType = "slow-2g" | "2g" | "3g" | "4g" | "5g";

/**
 * 网络状态信息
 */
export interface NetworkInfo {
  /** 是否在线 */
  online: boolean;
  /** 连接类型（wifi, cellular, ethernet 等） */
  type?: NetworkConnectionType;
  /** 网络有效类型（基于带宽和 RTT 估算，WiFi 通常为 4g 或 5g） */
  effectiveType?: NetworkEffectiveType;
  /** 下行速度（Mbps，如果可用） */
  downlink?: number;
  /** RTT（往返时间，ms，如果可用） */
  rtt?: number;
  /** 是否节省数据模式 */
  saveData?: boolean;
}

/**
 * 获取网络状态
 *
 * @returns 网络状态信息
 *
 * @remarks
 * - `type`: 连接类型（wifi, cellular, ethernet 等）
 * - `effectiveType`: 基于带宽和 RTT 估算的有效类型
 *   - WiFi 连接通常会被识别为 "4g" 或 "5g"（取决于带宽）
 *   - 移动网络会返回对应的 "2g", "3g", "4g", "5g"
 */
export function getNetworkStatus(): NetworkInfo {
  const connection = (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  return {
    online: navigator.onLine,
    type: connection?.type as NetworkConnectionType | undefined,
    effectiveType: connection?.effectiveType as
      | NetworkEffectiveType
      | undefined,
    downlink: connection?.downlink,
    rtt: connection?.rtt,
    saveData: connection?.saveData,
  };
}

/**
 * 根据网络状态建议质量级别
 *
 * @param totalLevels - 总质量级别数
 * @returns 建议的质量级别索引（-1 表示自动）
 *
 * @remarks
 * - WiFi 连接通常会被识别为 "4g" 或 "5g"（取决于带宽）
 * - 移动网络根据实际类型返回对应建议
 */
export function suggestQualityLevel(totalLevels: number): number {
  const network = getNetworkStatus();

  if (!network.online) {
    return -1; // 离线时使用自动
  }

  // WiFi 连接通常可以使用最高质量
  if (network.type === "wifi" || network.type === "ethernet") {
    return 0; // 最高质量
  }

  // 根据网络有效类型建议质量
  switch (network.effectiveType) {
    case "slow-2g":
    case "2g":
      // 2G 网络：使用最低质量
      return Math.max(0, totalLevels - 1);
    case "3g":
      // 3G 网络：使用中等质量
      return Math.floor(totalLevels / 2);
    case "4g":
    case "5g":
      // 4G/5G 网络或 WiFi（被识别为 4g/5g）：可以使用最高质量
      return 0;
    default:
      // 未知网络：使用自动
      return -1;
  }
}

/**
 * 检查是否应该启用低延迟模式
 *
 * @returns 是否应该启用低延迟模式
 *
 * @remarks
 * - WiFi 和以太网连接通常支持低延迟模式
 * - 4G/5G 移动网络在 RTT < 100ms 时也支持
 */
export function shouldUseLowLatency(): boolean {
  const network = getNetworkStatus();

  // WiFi 或以太网连接通常支持低延迟
  if (network.type === "wifi" || network.type === "ethernet") {
    return network.rtt === undefined || network.rtt < 100;
  }

  // 4G/5G 网络且 RTT 较低时，可以使用低延迟模式
  return (network.effectiveType === "4g" || network.effectiveType === "5g") &&
    (network.rtt === undefined || network.rtt < 100);
}
