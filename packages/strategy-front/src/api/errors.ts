import type { ApiEnvelope } from "@/types/common";

export class ApiError extends Error {
  code: number;
  status?: number;
  payload?: ApiEnvelope<unknown>;

  constructor(
    message: string,
    code = -1,
    status?: number,
    payload?: ApiEnvelope<unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.payload = payload;
  }
}
