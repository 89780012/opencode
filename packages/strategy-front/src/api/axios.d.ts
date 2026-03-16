import "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuth?: boolean; //跳过授权， 登录接口不需要认证，公共接口不需要认证
    rawResponse?: boolean; //返回原始响应, 导出文件需要原始响应
  }
}
