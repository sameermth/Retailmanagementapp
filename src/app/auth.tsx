import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { readStoredAuthSession, writeStoredAuthSession, type StoredAuthSession } from "./lib/auth-session";
import { ApiError, apiRequest } from "./lib/api";
import { defaultCapabilities, type FeatureKey, type SubscriptionCapabilities } from "./features";

const CAPABILITIES_STORAGE_PREFIX = "auth.capabilities";
const ENABLE_SUBSCRIPTION_CAPABILITIES =
  import.meta.env.VITE_ENABLE_SUBSCRIPTION_CAPABILITIES === "true";

export interface MembershipSummary {
  userId?: number;
  organizationId: number;
  organizationCode?: string | null;
  organizationName?: string | null;
  defaultBranchId?: number | null;
  roleCode?: string | null;
  roleName?: string | null;
  active?: boolean;
}

export interface AuthUser {
  id: number;
  organizationId?: number | null;
  organizationCode?: string | null;
  organizationName?: string | null;
  defaultBranchId?: number | null;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  memberships: MembershipSummary[];
}

export interface DemoOrganization {
  id: string;
  ownerUserId: number;
  gstRegistered: boolean;
  gstin: string;
  legalName: string;
  tradeName: string;
  businessType: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface DemoBranch {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

interface AuthSession {
  token: string;
  tokenType: string;
  refreshToken?: string | null;
  accessTokenExpiresAt?: string | null;
  refreshTokenExpiresAt?: string | null;
  clientType?: string | null;
  user: AuthUser;
}

interface LoginPayload {
  username: string;
  password: string;
  organizationId?: number;
}

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  token: string | null;
  isPlatformAdmin: boolean;
  capabilities: SubscriptionCapabilities;
  canAccess: (feature: FeatureKey | null) => boolean;
  hasPermission: (permission: string | null) => boolean;
  hasAnyPermission: (permissions: string[] | null | undefined) => boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (organizationId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function capabilitiesStorageKey(userId: number) {
  return `${CAPABILITIES_STORAGE_PREFIX}.${userId}`;
}

function writeStoredSession(session: AuthSession | null) {
  writeStoredAuthSession<AuthUser>(session as StoredAuthSession<AuthUser> | null);
}

function readStoredSession(): AuthSession | null {
  return readStoredAuthSession<AuthUser>() as AuthSession | null;
}

function readStoredCapabilities(userId: number): SubscriptionCapabilities {
  const raw = localStorage.getItem(capabilitiesStorageKey(userId));

  if (!raw) {
    return defaultCapabilities();
  }

  try {
    return JSON.parse(raw) as SubscriptionCapabilities;
  } catch {
    localStorage.removeItem(capabilitiesStorageKey(userId));
    return defaultCapabilities();
  }
}

function writeStoredCapabilities(userId: number, capabilities: SubscriptionCapabilities) {
  localStorage.setItem(capabilitiesStorageKey(userId), JSON.stringify(capabilities));
}

interface JwtResponse {
  token: string;
  refreshToken?: string | null;
  type: string;
  accessTokenExpiresAt?: string | null;
  refreshTokenExpiresAt?: string | null;
  clientType?: string | null;
  id: number;
  organizationId?: number | null;
  organizationCode?: string | null;
  organizationName?: string | null;
  username: string;
  email: string;
  roles: string[];
  permissions?: string[] | null;
  memberships?: MembershipSummary[] | null;
  subscriptionVersion?: number | null;
  subscriptionPlanCode?: string | null;
  subscriptionStatus?: string | null;
  subscriptionFeatures?: string[] | null;
}

function capabilitiesFromJwt(response: JwtResponse): SubscriptionCapabilities {
  const recognizedFeatures = (response.subscriptionFeatures ?? []).reduce<
    Partial<Record<FeatureKey, boolean>>
  >((features, feature) => {
    features[feature as FeatureKey] = true;
    return features;
  }, {});

  return {
    ...defaultCapabilities(),
    plan: response.subscriptionPlanCode || "UNSPECIFIED",
    subscriptionStatus:
      (response.subscriptionStatus as SubscriptionCapabilities["subscriptionStatus"]) || "UNKNOWN",
    features: recognizedFeatures,
    source: "backend",
  };
}

function createSessionFromJwt(response: JwtResponse, currentSession?: AuthSession | null): AuthSession {
  const memberships =
    response.memberships && response.memberships.length > 0
      ? response.memberships
      : currentSession?.user.memberships ?? [];
  const activeMembership =
    memberships.find((membership) => membership.organizationId === response.organizationId) ??
    memberships[0];

  return {
    token: response.token ?? currentSession?.token ?? "",
    tokenType: response.type ?? currentSession?.tokenType ?? "Bearer",
    refreshToken: response.refreshToken ?? currentSession?.refreshToken ?? null,
    accessTokenExpiresAt: response.accessTokenExpiresAt ?? currentSession?.accessTokenExpiresAt ?? null,
    refreshTokenExpiresAt:
      response.refreshTokenExpiresAt ?? currentSession?.refreshTokenExpiresAt ?? null,
    clientType: response.clientType ?? currentSession?.clientType ?? null,
    user: {
      id: response.id ?? currentSession?.user.id ?? 0,
      organizationId: response.organizationId ?? activeMembership?.organizationId ?? null,
      organizationCode: response.organizationCode ?? activeMembership?.organizationCode ?? null,
      organizationName: response.organizationName ?? activeMembership?.organizationName ?? null,
      defaultBranchId: activeMembership?.defaultBranchId ?? null,
      username: response.username ?? currentSession?.user.username ?? "",
      email: response.email ?? currentSession?.user.email ?? "",
      roles: response.roles ?? currentSession?.user.roles ?? [],
      permissions: response.permissions ?? currentSession?.user.permissions ?? [],
      memberships: memberships.length > 0 ? memberships : currentSession?.user.memberships ?? [],
    },
  };
}

async function fetchCapabilities(token: string): Promise<SubscriptionCapabilities> {
  if (!ENABLE_SUBSCRIPTION_CAPABILITIES) {
    return defaultCapabilities();
  }

  try {
    const response = await apiRequest<Partial<SubscriptionCapabilities>>("/api/subscription/capabilities", {
      method: "GET",
      token,
    });

    return {
      ...defaultCapabilities(),
      ...response,
      features: {
        ...defaultCapabilities().features,
        ...(response.features ?? {}),
      },
      limits: response.limits ?? {},
      source: "backend",
    };
  } catch {
    return defaultCapabilities();
  }
}

function normalizePermission(value: string) {
  return value.trim().toLowerCase().replace(/[\s:-]+/g, ".");
}

function isPlatformPermission(permission: string | null | undefined) {
  if (!permission) {
    return false;
  }

  const normalized = normalizePermission(permission);
  return normalized === "platform.manage" || normalized.startsWith("platform.");
}

function isPlatformAdminUser(user: AuthUser | null) {
  if (!user) {
    return false;
  }

  const normalizedPermissions = new Set(user.permissions.map(normalizePermission));
  if (normalizedPermissions.has("platform.manage")) {
    return true;
  }

  return user.roles.some((role) => {
    const normalized = role.replace(/^ROLE_/, "").toUpperCase();
    return normalized === "PLATFORM_ADMIN" || normalized === "SUPER_ADMIN";
  });
}

function hasElevatedRole(user: AuthUser | null) {
  if (!user) {
    return false;
  }

  return user.roles.some((role) => {
    const normalized = role.replace(/^ROLE_/, "").toUpperCase();
    return normalized === "OWNER" || normalized === "ADMIN" || normalized === "SUPER_ADMIN";
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [capabilities, setCapabilities] = useState<SubscriptionCapabilities>(defaultCapabilities());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedSession = readStoredSession();
    setSession(storedSession);
    setCapabilities(storedSession?.user ? readStoredCapabilities(storedSession.user.id) : defaultCapabilities());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    function handleSessionCleared() {
      setSession(null);
      setCapabilities(defaultCapabilities());
    }

    window.addEventListener("auth:session-cleared", handleSessionCleared);
    return () => {
      window.removeEventListener("auth:session-cleared", handleSessionCleared);
    };
  }, []);

  useEffect(() => {
    if (!session?.token || !session.user) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const nextCapabilities = await fetchCapabilities(session.token);

        if (cancelled) {
          return;
        }

        writeStoredCapabilities(session.user.id, nextCapabilities);
        setCapabilities((current) =>
          nextCapabilities.source === "fallback" && current.source === "backend"
            ? current
            : nextCapabilities,
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          writeStoredSession(null);
          setSession(null);
          setCapabilities(defaultCapabilities());
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.token, session?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(session?.token),
      isLoading,
      user: session?.user ?? null,
      token: session?.token ?? null,
      isPlatformAdmin: isPlatformAdminUser(session?.user ?? null),
      capabilities,
      canAccess(feature) {
        if (!feature) {
          return true;
        }

        const subscriptionActive =
          capabilities.subscriptionStatus === "ACTIVE" ||
          capabilities.subscriptionStatus === "TRIAL" ||
          capabilities.subscriptionStatus === "UNKNOWN";

        if (!subscriptionActive) {
          return false;
        }

        const value = capabilities.features[feature];
        return value ?? true;
      },
      hasPermission(permission) {
        if (!permission) {
          return true;
        }

        if (!session?.user) {
          return false;
        }

        if (isPlatformPermission(permission)) {
          return isPlatformAdminUser(session.user);
        }

        if (hasElevatedRole(session.user)) {
          return true;
        }

        const userPermissions = session.user.permissions;
        if (userPermissions.length === 0) {
          return true;
        }

        const normalizedUserPermissions = new Set(userPermissions.map(normalizePermission));
        return normalizedUserPermissions.has(normalizePermission(permission));
      },
      hasAnyPermission(requiredPermissions) {
        if (!requiredPermissions || requiredPermissions.length === 0) {
          return true;
        }

        if (!session?.user) {
          return false;
        }

        if (requiredPermissions.some((permission) => isPlatformPermission(permission))) {
          return requiredPermissions.some((permission) =>
            isPlatformPermission(permission) ? isPlatformAdminUser(session.user) : false,
          );
        }

        if (hasElevatedRole(session.user)) {
          return true;
        }

        const userPermissions = session.user.permissions;
        if (userPermissions.length === 0) {
          return true;
        }

        const normalizedUserPermissions = new Set(userPermissions.map(normalizePermission));
        if (
          normalizedUserPermissions.has("*") ||
          normalizedUserPermissions.has("all") ||
          normalizedUserPermissions.has("all.permissions")
        ) {
          return true;
        }

        return requiredPermissions.some((permission) =>
          normalizedUserPermissions.has(normalizePermission(permission)),
        );
      },
      async login(payload) {
        const response = await apiRequest<JwtResponse>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            username: payload.username.trim(),
            password: payload.password,
            clientType: "WEB",
            ...(payload.organizationId ? { organizationId: payload.organizationId } : {}),
          }),
        });

        const nextSession = createSessionFromJwt(response, null);
        const nextCapabilities = ENABLE_SUBSCRIPTION_CAPABILITIES
          ? await fetchCapabilities(nextSession.token)
          : capabilitiesFromJwt(response);
        writeStoredSession(nextSession);
        writeStoredCapabilities(nextSession.user.id, nextCapabilities);
        setSession(nextSession);
        setCapabilities(
          nextCapabilities.source === "fallback" ? capabilitiesFromJwt(response) : nextCapabilities,
        );
      },
      async register(payload) {
        const response = await apiRequest<JwtResponse>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            username: payload.username.trim(),
            email: payload.email.trim().toLowerCase(),
            password: payload.password,
            firstName: payload.firstName,
            lastName: payload.lastName,
            phone: payload.phone,
          }),
        });

        const nextSession = createSessionFromJwt(response, null);
        const nextCapabilities = ENABLE_SUBSCRIPTION_CAPABILITIES
          ? await fetchCapabilities(nextSession.token)
          : capabilitiesFromJwt(response);
        writeStoredSession(nextSession);
        writeStoredCapabilities(nextSession.user.id, nextCapabilities);
        setSession(nextSession);
        setCapabilities(
          nextCapabilities.source === "fallback" ? capabilitiesFromJwt(response) : nextCapabilities,
        );
      },
      async logout() {
        if (session?.token) {
          try {
            await apiRequest<void>("/api/auth/logout", {
              method: "POST",
              token: session.token,
              body: session.refreshToken ? JSON.stringify({ refreshToken: session.refreshToken }) : undefined,
            });
          } catch {
            // Clear local session even if backend logout fails.
          }
        }

        writeStoredSession(null);
        setSession(null);
        setCapabilities(defaultCapabilities());
      },
      async switchOrganization(organizationId) {
        if (!session?.token) {
          throw new Error("You are not logged in.");
        }

        const response = await apiRequest<JwtResponse>("/api/auth/switch-organization", {
          method: "POST",
          token: session.token,
          body: JSON.stringify({ organizationId }),
        });

        const nextSession = createSessionFromJwt(response, session);
        const nextCapabilities = ENABLE_SUBSCRIPTION_CAPABILITIES
          ? await fetchCapabilities(nextSession.token)
          : capabilitiesFromJwt(response);
        writeStoredSession(nextSession);
        writeStoredCapabilities(nextSession.user.id, nextCapabilities);
        setSession(nextSession);
        setCapabilities(
          nextCapabilities.source === "fallback" ? capabilitiesFromJwt(response) : nextCapabilities,
        );
      },
    }),
    [capabilities, isLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
