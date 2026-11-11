"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  resolve: ((value: boolean) => void) | null;
};

const CLOSED: ConfirmState = {
  open: false,
  title: "",
  message: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  resolve: null,
};

const SeniorsConfirmContext = createContext<{
  confirm: (options: ConfirmOptions) => Promise<boolean>;
} | null>(null);

export function useSeniorsConfirm() {
  const ctx = useContext(SeniorsConfirmContext);
  if (!ctx) {
    throw new Error("useSeniorsConfirm must be used within SeniorsConfirmProvider");
  }
  return ctx;
}

export function SeniorsConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>(CLOSED);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        title: options.title ?? "Confirm",
        message: options.message,
        confirmLabel: options.confirmLabel ?? "Confirm",
        cancelLabel: options.cancelLabel ?? "Cancel",
        resolve,
      });
    });
  }, []);

  function close(result: boolean) {
    state.resolve?.(result);
    setState(CLOSED);
  }

  useEffect(() => {
    if (!state.open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state.open, state.resolve]);

  return (
    <SeniorsConfirmContext.Provider value={{ confirm }}>
      {children}
      {mounted && state.open
        ? createPortal(
            <div className="seniors-theme-layer fixed inset-0 z-[100] flex items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
                aria-label="Cancel"
                onClick={() => close(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="seniors-confirm-title"
                className="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#ffffff)] p-5 shadow-2xl"
              >
                <h3
                  id="seniors-confirm-title"
                  className="text-center text-base font-bold text-[var(--sp-text-strong,#111827)]"
                >
                  {state.title}
                </h3>
                <p className="mt-2 text-center text-sm leading-relaxed text-[var(--sp-muted,#6B7280)]">
                  {state.message}
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-[var(--sp-border,#E5E7EB)] bg-[var(--sp-surface,#ffffff)] px-4 py-2.5 text-sm font-semibold text-[var(--sp-text-strong,#374151)] transition hover:bg-[var(--sp-surface-3,#F3F4F6)]"
                    onClick={() => close(false)}
                  >
                    {state.cancelLabel}
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl bg-[var(--sp-text-strong,#111827)] px-4 py-2.5 text-sm font-semibold text-[var(--sp-on-accent,#ffffff)] transition hover:opacity-90"
                    onClick={() => close(true)}
                  >
                    {state.confirmLabel}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </SeniorsConfirmContext.Provider>
  );
}
