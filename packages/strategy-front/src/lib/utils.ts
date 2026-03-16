import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化字符串，当字符串长度超过指定长度时进行截断，并在末尾添加省略号
 * @param str 要格式化的字符串
 * @param maxLength 最大长度，默认为50个字符
 * @param suffix 截断后添加的后缀，默认为"..."
 * @returns 格式化后的字符串
 */
export function truncateString(str: string, maxLength: number = 50, suffix: string = "..."): string {
  if (!str || typeof str !== 'string') {
    return '';
  }
  
  if (str.length <= maxLength) {
    return str;
  }
  
  // 确保截断后总长度不超过最大长度，包括后缀
  const truncatedLength = maxLength - suffix.length;
  if (truncatedLength <= 0) {
    // 如果后缀长度已经超过了最大长度，则只返回截断的后缀
    return suffix.substring(0, maxLength);
  }
  
  return str.substring(0, truncatedLength) + suffix;
}