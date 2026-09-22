type ErrorBody = { code?: string; message?: string; fields?: string[] };

// Keeps the historical `HTTP_<status>` message so existing callers keep working.
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly detail?: string;

  constructor(status: number, code?: string, detail?: string) {
    super(`HTTP_${status}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export async function toApiError(res: Response): Promise<ApiError> {
  let body: ErrorBody | null = null;
  try {
    body = (await res.json()) as ErrorBody;
  } catch {
    body = null;
  }
  return new ApiError(res.status, body?.code, body?.message);
}
