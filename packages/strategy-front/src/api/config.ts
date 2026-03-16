const defaultTimeout = 15000;
const envTimeout = Number(import.meta.env.VITE_API_TIMEOUT ?? defaultTimeout);

export const apiConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: Number.isFinite(envTimeout) ? envTimeout : defaultTimeout,
};
