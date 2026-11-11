"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { seniorsBrandCssVars } from "@/shared/lib/seniors-brand";

export type SeniorsThemeMode = "light" | "dark";

const STORAGE_KEY = "seniors-portal-theme";

type SeniorsThemeContextValue = {
  theme: SeniorsThemeMode;
  isDark: boolean;
  setTheme: (mode: SeniorsThemeMode) => void;
  toggleTheme: () => void;
  /** School brand CSS variables -spread onto body-mounted portals, which don't inherit them. */
  brandStyle: CSSProperties;
};

const SeniorsThemeContext = createContext<SeniorsThemeContextValue | null>(null);

function readStoredTheme(): SeniorsThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // ignore
  }
  return "light";
}

function persistTheme(mode: SeniorsThemeMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

export function SeniorsThemeProvider({
  children,
  brandHex,
}: {
  children: React.ReactNode;
  brandHex?: string;
}) {
  // Always start light to avoid SSR/client hydration mismatch, then sync.
  const [theme, setThemeState] = useState<SeniorsThemeMode>("light");

  useEffect(() => {
    setThemeState(readStoredTheme());
  }, []);

  const setTheme = useCallback((mode: SeniorsThemeMode) => {
    setThemeState(mode);
    persistTheme(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: SeniorsThemeMode = prev === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
  }, []);

  const brandStyle = useMemo(
    () => seniorsBrandCssVars(brandHex, theme === "dark"),
    [brandHex, theme],
  );

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme,
      brandStyle,
    }),
    [theme, setTheme, toggleTheme, brandStyle],
  );

  return (
    <SeniorsThemeContext.Provider value={value}>
      <div
        className={
          theme === "dark"
            ? "seniors-portal seniors-dark h-dvh overflow-hidden"
            : "seniors-portal h-dvh overflow-hidden"
        }
        data-theme={theme}
        style={{
          ...brandStyle,
          ...(theme === "dark"
            ? { backgroundColor: "#000000", color: "#e5e5e5" }
            : { backgroundColor: "#f8fafd", color: "#1f2937" }),
        }}
      >
        {children}
      </div>
    </SeniorsThemeContext.Provider>
  );
}

export function useSeniorsTheme() {
  const ctx = useContext(SeniorsThemeContext);
  if (!ctx) {
    return {
      theme: "light" as SeniorsThemeMode,
      isDark: false,
      setTheme: (_mode: SeniorsThemeMode) => {},
      toggleTheme: () => {},
      brandStyle: {} as CSSProperties,
    };
  }
  return ctx;
}
