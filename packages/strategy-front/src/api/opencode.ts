import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_OPENCODE_BASE_URL || "/opencode",
  timeout: Number(import.meta.env.VITE_API_TIMEOUT ?? 15000),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export const opencode = {
  get<T>(url: string) {
    return client.get<T>(url).then((r) => r.data);
  },

  post<T, D = unknown>(url: string, data?: D) {
    return client.post<T>(url, data).then((r) => r.data);
  },

  put<T, D = unknown>(url: string, data?: D) {
    return client.put<T>(url, data).then((r) => r.data);
  },

  patch<T, D = unknown>(url: string, data?: D) {
    return client.patch<T>(url, data).then((r) => r.data);
  },

  delete<T>(url: string) {
    return client.delete<T>(url).then((r) => r.data);
  },
};
