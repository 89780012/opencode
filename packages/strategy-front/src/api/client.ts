import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

import { apiConfig } from "@/api/config";
import { ApiError } from "@/api/errors";
import type { ApiEnvelope } from "@/types/common";

const isApiEnvelope = (value: unknown): value is ApiEnvelope<unknown> => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeEnvelope = value as Record<string, unknown>;
  return (
    typeof maybeEnvelope.code === "number" &&
    typeof maybeEnvelope.msg === "string"
  );
};

const normalizeAxiosError = (
  error: AxiosError<ApiEnvelope<unknown>>,
): ApiError => {
  if (error.response?.data && isApiEnvelope(error.response.data)) {
    const payload = error.response.data;
    return new ApiError(
      payload.msg || "请求失败",
      payload.code,
      error.response.status,
      payload,
    );
  }

  if (error.code === "ECONNABORTED") {
    return new ApiError("请求超时，请稍后重试", -1, error.response?.status);
  }

  if (error.message === "Network Error") {
    return new ApiError(
      "网络连接异常，请检查后端服务",
      -1,
      error.response?.status,
    );
  }

  return new ApiError(error.message || "请求失败", -1, error.response?.status);
};

// TODO 临时占位
const getToken = () => {
  return "";
};

const httpClient = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!config.skipAuth) {
    const token = getToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => {
    if (response.config.rawResponse) {
      return response;
    }

    const payload = response.data;
    if (isApiEnvelope(payload)) {
      if (payload.code === 200) {
        return payload.data;
      }

      throw new ApiError(
        payload.msg || "请求失败",
        payload.code,
        response.status,
        payload,
      );
    }

    return payload;
  },
  (error) => Promise.reject(normalizeAxiosError(error)),
);

export const request = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return httpClient.get(url, config) as Promise<T>;
  },

  post<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ): Promise<T> {
    return httpClient.post(url, data, config) as Promise<T>;
  },

  put<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ): Promise<T> {
    return httpClient.put(url, data, config) as Promise<T>;
  },

  patch<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
  ): Promise<T> {
    return httpClient.patch(url, data, config) as Promise<T>;
  },

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return httpClient.delete(url, config) as Promise<T>;
  },
};
