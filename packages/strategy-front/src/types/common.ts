/**
 * 通用响应结构
 */
export interface ApiEnvelope<T = unknown> {
  code: number;
  msg: string;
  data: T;
}
