import { readStoredAuthSession, writeStoredAuthSession, type StoredAuthSession } from "./auth-session";

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

interface RefreshResponse {
  token?: string;
  refreshToken?: string | null;
  type?: string;
  accessTokenExpiresAt?: string | null;
  refreshTokenExpiresAt?: string | null;
  clientType?: string | null;
}

const AUTH_PATH_PREFIX = "/api/auth/";
const NO_AUTO_REFRESH_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
]);

function isAuthPath(path: string) {
  return path.startsWith(AUTH_PATH_PREFIX);
}

function shouldTryRefresh(path: string) {
  return !NO_AUTO_REFRESH_PATHS.has(path);
}

function resolveAuthToken(providedToken?: string | null) {
  return readStoredAuthSession()?.token ?? providedToken ?? null;
}

function notifySessionCleared() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:session-cleared"));
  }
}

async function tryRefreshAccessToken(): Promise<string | null> {
  const storedSession = readStoredAuthSession();
  if (!storedSession?.refreshToken) {
    return null;
  }

  const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken: storedSession.refreshToken }),
  });

  if (!refreshResponse.ok) {
    if (refreshResponse.status === 400 || refreshResponse.status === 401 || refreshResponse.status === 403) {
      writeStoredAuthSession(null);
      notifySessionCleared();
    }
    return null;
  }

  const payload = (await refreshResponse.json()) as RefreshResponse | { data?: RefreshResponse };
  const resolvedPayload = "data" in payload && payload.data ? payload.data : payload;
  if (!resolvedPayload.token) {
    return null;
  }

  const nextSession: StoredAuthSession = {
    ...storedSession,
    token: resolvedPayload.token,
    tokenType: resolvedPayload.type ?? storedSession.tokenType ?? "Bearer",
    refreshToken: resolvedPayload.refreshToken ?? storedSession.refreshToken ?? null,
    accessTokenExpiresAt: resolvedPayload.accessTokenExpiresAt ?? storedSession.accessTokenExpiresAt ?? null,
    refreshTokenExpiresAt:
      resolvedPayload.refreshTokenExpiresAt ?? storedSession.refreshTokenExpiresAt ?? null,
    clientType: resolvedPayload.clientType ?? storedSession.clientType ?? "WEB",
  };
  writeStoredAuthSession(nextSession);
  return nextSession.token;
}

async function requestWithAutoRefresh(
  path: string,
  options: RequestOptions,
  includeJsonContentType: boolean,
): Promise<Response> {
  const { token, headers, body, idempotencyKey, ...rest } = options;
  const buildHeaders = (authToken: string | null) => ({
    ...(includeJsonContentType ? { "Content-Type": "application/json" } : {}),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    ...headers,
  });

  let authToken = resolveAuthToken(token);
  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: buildHeaders(authToken),
    body,
  });

  if (
    response.status === 401 &&
    !isAuthPath(path) &&
    shouldTryRefresh(path) &&
    Boolean(readStoredAuthSession()?.refreshToken)
  ) {
    const refreshedToken = await tryRefreshAccessToken();
    if (refreshedToken) {
      authToken = refreshedToken;
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        headers: buildHeaders(authToken),
        body,
      });
    }
  }

  return response;
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
  const response = await requestWithAutoRefresh(path, options, true);

  if (!response.ok) {
    return parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function apiBinaryRequest(path: string, options: RequestOptions = {}): Promise<Blob> {
  const response = await requestWithAutoRefresh(path, options, Boolean(options.body));

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
