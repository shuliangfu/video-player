/**
 * @module @dreamer/video-player/utils/logger
 *
 * @fileoverview 统一的日志管理器
 *
 * 提供统一的日志接口，支持日志级别控制。
 * 用于视频播放器库内部的日志记录和调试。
 *
 * 主要功能：
 * - 日志级别控制（DEBUG、INFO、WARN、ERROR、NONE）
 * - 日志前缀设置
 * - 统一的日志输出接口
 *
 * @example
 * ```typescript
 * import { logger, LogLevel } from "jsr:@dreamer/video-player/utils/logger";
 *
 * logger.setLevel(LogLevel.DEBUG);
 * logger.debug("调试信息");
 * logger.info("普通信息");
 * ```
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * 日志管理器
 */
class Logger {
  private level: LogLevel = LogLevel.WARN;
  private prefix: string = "[VideoPlayer]";

  /**
   * 设置日志级别
   *
   * @param level - 日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 设置日志前缀
   *
   * @param prefix - 日志前缀
   */
  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  /**
   * 调试日志
   *
   * @param message - 日志消息
   * @param args - 额外参数
   */
  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`${this.prefix} [DEBUG]`, message, ...args);
    }
  }

  /**
   * 信息日志
   *
   * @param message - 日志消息
   * @param args - 额外参数
   */
  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`${this.prefix} [INFO]`, message, ...args);
    }
  }

  /**
   * 警告日志
   *
   * @param message - 日志消息
   * @param args - 额外参数
   */
  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`${this.prefix} [WARN]`, message, ...args);
    }
  }

  /**
   * 错误日志
   *
   * @param message - 日志消息
   * @param args - 额外参数
   */
  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`${this.prefix} [ERROR]`, message, ...args);
    }
  }
}

/**
 * 默认日志管理器实例
 */
export const logger = new Logger();

/**
 * 创建带前缀的日志管理器
 *
 * @param prefix - 日志前缀
 * @returns 日志管理器实例
 */
export function createLogger(prefix: string): Logger {
  const log = new Logger();
  log.setPrefix(prefix);
  return log;
}
