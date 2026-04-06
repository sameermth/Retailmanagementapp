export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export interface ApiErrorPayload {
  status?: number;
  code?: string;
  error?: string;
  message?: string;
  feature?: string;
  plan?: string;
  upgradeRequired?: boolean;
  validationErrors?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  feature?: string;
  plan?: string;
  upgradeRequired?: boolean;
  validationErrors?: Record<string, string>;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      feature?: string;
      plan?: string;
      upgradeRequired?: boolean;
      validationErrors?: Record<string, string>;
    } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? 500;
    this.code = options.code;
    this.feature = options.feature;
    this.plan = options.plan;
    this.upgradeRequired = options.upgradeRequired;
    this.validationErrors = options.validationErrors;
  }
}

interface RequestOptions extends RequestInit {
  token?: string | null;
  idempotencyKey?: string;
}

async function parseError(response: Response): Promise<never> {
  let payload: ApiErrorPayload | null = null;

  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = null;
  }

  const fallbackMessage =
    response.status === 401
      ? "You are not authorized. Please login again."
      : response.status === 403
        ? "Your account does not have permission for this action."
        : "Something went wrong while talking to the backend.";

  throw new ApiError(payload?.message || payload?.error || fallbackMessage, {
    status: response.status,
    code: payload?.code,
    feature: payload?.feature,
    plan: payload?.plan,
    upgradeRequired: payload?.upgradeRequired,
    validationErrors: payload?.validationErrors,
  });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, body, idempotencyKey, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...headers,
    },
    body,
  });

  if (!response.ok) {
    return parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function apiBinaryRequest(path: string, options: RequestOptions = {}): Promise<Blob> {
  const { token, headers, body, idempotencyKey, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...headers,
    },
    body,
  });

  if (!response.ok) {
    return parseError(response);
  }

  return response.blob();
}

export function createIdempotencyKey(prefix: string, seed: unknown) {
  const text = typeof seed === "string" ? seed : JSON.stringify(seed);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return `${prefix}-${Math.abs(hash)}`;
}
