"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { GamificationPingResult, GamificationSnapshot } from "@/domain/seniors/gamification-types";
import { consumeSeniorsStudentLoginBurst } from "@/application/services/seniors-session";
import { SeniorsCoinBurst } from "@/presentation/components/templates/seniors/gamification/SeniorsCoinBurst";
import {
  SENIORS_GAMIFICATION_EVENT,
  pingSeniorsGamification,
} from "@/presentation/components/templates/seniors/gamification/ping-seniors-gamification";

type Burst = {
  id: number;
  amount: number;
  origin: { x: number; y: number };
  target: { x: number; y: number };
};

type GamificationContextValue = {
  snapshot: GamificationSnapshot | null;
  ready: boolean;
};

const GamificationContext = createContext<GamificationContextValue>({
  snapshot: null,
  ready: false,
});

export function useSeniorsGamification() {
  return useContext(GamificationContext);
}

function coinHudTarget() {
  const targetEl = document.getElementById("seniors-coin-hud");
  const targetBox = targetEl?.getBoundingClientRect();
  if (targetBox) {
    return {
      x: targetBox.left + targetBox.width / 2 - 14,
      y: targetBox.top + targetBox.height / 2 - 14,
    };
  }
  return { x: window.innerWidth - 72, y: 28 };
}

function screenCenter() {
  return {
    x: window.innerWidth / 2 - 14,
    y: window.innerHeight / 2 - 14,
  };
}

async function waitForCoinHud(maxMs = 2000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (document.getElementById("seniors-coin-hud")) return;
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }
}

export function SeniorsGamificationProvider({
  tenant,
  children,
}: {
  tenant: string;
  children: React.ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<GamificationSnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [burst, setBurst] = useState<Burst | null>(null);

  const playBurst = useCallback(async (amount: number) => {
    await waitForCoinHud();
    setBurst({
      id: Date.now(),
      amount,
      origin: screenCenter(),
      target: coinHudTarget(),
    });
  }, []);

  const applyPing = useCallback(
    (result: GamificationPingResult, options?: { celebrateLogin?: boolean }) => {
      setSnapshot({
        streak: result.streak,
        longestStreak: result.longestStreak,
        coins: result.coins,
        totalCoins: result.totalCoins,
        lastActiveDate: result.lastActiveDate,
        atRisk: result.atRisk,
        todayActive: result.todayActive,
      });
      // Coin burst only once right after student login -not on daily visit or activity pings.
      if (options?.celebrateLogin) {
        void playBurst(result.coinsAwarded);
      }
    },
    [playBurst],
  );

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const celebrateLogin = consumeSeniorsStudentLoginBurst();
      try {
        const res = await fetch(`/api/tenants/${encodeURIComponent(tenant)}/seniors/gamification`);
        if (res.ok) {
          const json = (await res.json()) as GamificationSnapshot;
          if (!cancelled) setSnapshot(json);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setReady(true);
      }
      const ping = await pingSeniorsGamification(tenant, "visit", { dispatch: false });
      if (!cancelled && ping) applyPing(ping, { celebrateLogin });
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [tenant, applyPing]);

  useEffect(() => {
    function onEvent(e: Event) {
      const detail = (e as CustomEvent<GamificationPingResult>).detail;
      if (!detail) return;
      applyPing(detail);
    }
    window.addEventListener(SENIORS_GAMIFICATION_EVENT, onEvent);
    return () => window.removeEventListener(SENIORS_GAMIFICATION_EVENT, onEvent);
  }, [applyPing]);

  const value = useMemo(() => ({ snapshot, ready }), [snapshot, ready]);

  return (
    <GamificationContext.Provider value={value}>
      {children}
      {burst ? (
        <SeniorsCoinBurst
          key={burst.id}
          amount={burst.amount}
          origin={burst.origin}
          target={burst.target}
          onDone={() => setBurst(null)}
        />
      ) : null}
    </GamificationContext.Provider>
  );
}
