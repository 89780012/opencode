import axios from "axios";
import type { AxiosRequestConfig } from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_OPENCODE_BASE_URL || "/opencode",
  timeout: Number(import.meta.env.VITE_API_TIMEOUT ?? 15000),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export const opencode = {
  get<T>(url: string, config?: AxiosRequestConfig) {
    return client.get<T>(url, config).then((r) => r.data);
  },

  post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>) {
    return client.post<T>(url, data, config).then((r) => r.data);
  },

  put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>) {
    return client.put<T>(url, data, config).then((r) => r.data);
  },

  patch<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>) {
    return client.patch<T>(url, data, config).then((r) => r.data);
  },

  delete<T>(url: string, config?: AxiosRequestConfig) {
    return client.delete<T>(url, config).then((r) => r.data);
  },
};
