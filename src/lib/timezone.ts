// lib/timezone.ts
// 统一的时区处理工具库，使用Luxon处理东八区时间

import { DateTime } from 'luxon'

// 东八区时区标识
export const CHINA_TIMEZONE = 'Asia/Shanghai'

/**
 * 获取当前东八区时间
 */
export function nowInChina(): DateTime {
  return DateTime.now().setZone(CHINA_TIMEZONE)
}

/**
 * 获取东八区今天的开始时间（00:00:00）
 */
export function startOfDayInChina(date?: DateTime): DateTime {
  const target = date || nowInChina()
  return target.setZone(CHINA_TIMEZONE).startOf('day')
}

/**
 * 获取东八区今天的结束时间（23:59:59.999）
 */
export function endOfDayInChina(date?: DateTime): DateTime {
  const target = date || nowInChina()
  return target.setZone(CHINA_TIMEZONE).endOf('day')
}

/**
 * 将UTC时间转换为东八区时间
 */
export function utcToChinaTime(utcDate: Date | string): DateTime {
  return DateTime.fromJSDate(new Date(utcDate)).setZone(CHINA_TIMEZONE)
}

/**
 * 将东八区时间转换为UTC时间（用于数据库存储）
 */
export function chinaTimeToUtc(chinaDateTime: DateTime): Date {
  return chinaDateTime.toUTC().toJSDate()
}

/**
 * 格式化东八区时间为字符串
 */
export function formatChinaTime(date: DateTime | Date | string, format = 'yyyy-MM-dd HH:mm:ss'): string {
  let dt: DateTime
  
  if (date instanceof DateTime) {
    dt = date.setZone(CHINA_TIMEZONE)
  } else {
    dt = DateTime.fromJSDate(new Date(date)).setZone(CHINA_TIMEZONE)
  }
  
  return dt.toFormat(format)
}

/**
 * 检查两个时间是否是同一天（东八区）
 */
export function isSameDayInChina(date1: DateTime | Date | string, date2: DateTime | Date | string): boolean {
  const dt1 = date1 instanceof DateTime ? date1 : DateTime.fromJSDate(new Date(date1))
  const dt2 = date2 instanceof DateTime ? date2 : DateTime.fromJSDate(new Date(date2))
  
  const china1 = dt1.setZone(CHINA_TIMEZONE)
  const china2 = dt2.setZone(CHINA_TIMEZONE)
  
  return china1.hasSame(china2, 'day')
}

/**
 * 获取指定时间在东八区的小时数（0-23）
 */
export function getHourInChina(date: DateTime | Date | string): number {
  const dt = date instanceof DateTime ? date : DateTime.fromJSDate(new Date(date))
  return dt.setZone(CHINA_TIMEZONE).hour
}

/**
 * 获取指定时间在东八区的分钟数（0-59）
 */
export function getMinuteInChina(date: DateTime | Date | string): number {
  const dt = date instanceof DateTime ? date : DateTime.fromJSDate(new Date(date))
  return dt.setZone(CHINA_TIMEZONE).minute
}

/**
 * 简化版：如果当前环境已经是东八区，直接使用本地时间
 */
export function getTodayStart(): Date {
  // 检查是否在东八区环境
  const localOffset = new Date().getTimezoneOffset()
  const chinaOffset = -480 // 东八区是 UTC+8，即 -480 分钟
  
  if (localOffset === chinaOffset) {
    // 当前环境就是东八区，直接使用本地时间
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  } else {
    // 不是东八区环境，使用Luxon转换
    return chinaTimeToUtc(startOfDayInChina())
  }
}

export function getTodayEnd(): Date {
  const localOffset = new Date().getTimezoneOffset()
  const chinaOffset = -480
  
  if (localOffset === chinaOffset) {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    return today
  } else {
    return chinaTimeToUtc(endOfDayInChina())
  }
}

/**
 * 调试用：打印时区转换信息
 */
export function debugTimezone(date: Date | string, label = ''): void {
  const dt = DateTime.fromJSDate(new Date(date))
  
  console.log(`${label ? `[${label}] ` : ''}Timezone Debug:`)
  console.log(`  UTC: ${dt.toUTC().toISO()}`)
  console.log(`  China: ${dt.setZone(CHINA_TIMEZONE).toISO()}`)
  console.log(`  Local: ${dt.toLocal().toISO()}`)
}