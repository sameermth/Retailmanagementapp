export const AUTH_STORAGE_KEY = "auth.session";

export interface StoredAuthSession<User = unknown> {
  token: string;
  tokenType: string;
  refreshToken?: string | null;
  accessTokenExpiresAt?: string | null;
  refreshTokenExpiresAt?: string | null;
  clientType?: string | null;
  user: User;
}

export function readStoredAuthSession<User = unknown>(): StoredAuthSession<User> | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuthSession<User>;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function writeStoredAuthSession<User = unknown>(session: StoredAuthSession<User> | null) {
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}
