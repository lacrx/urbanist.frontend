import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const STRAPI_URL = process.env.GATSBY_STRAPI_URL || "";
const LS_KEY = "sto_admin";

type AuthState = {
  isAdmin: boolean;
  userName: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
};

const AuthContext = createContext<AuthState>({
  isAdmin: false,
  userName: null,
  login: async () => "No auth provider",
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_KEY) === "true";
  });
  const [userName, setUserName] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(`${LS_KEY}_name`);
  });
  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    if (!STRAPI_URL) return "Admin login not configured";
    try {
      const res = await fetch(`${STRAPI_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        return err?.error?.message || "Invalid email or password";
      }
      const data = await res.json();
      const name = data.data?.user?.firstname || data.data?.user?.email || email;
      localStorage.setItem(LS_KEY, "true");
      localStorage.setItem(`${LS_KEY}_name`, name);
      document.documentElement.classList.add("authed");
      setIsAdmin(true);
      setUserName(name);
      return null;
    } catch {
      return "Could not reach the server";
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(`${LS_KEY}_name`);
    document.documentElement.classList.remove("authed");
    setIsAdmin(false);
    setUserName(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAdmin, userName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
