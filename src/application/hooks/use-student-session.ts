"use client";

import { useEffect, useState } from "react";
import {
  clearStudentSession,
  fetchStudentSessionFromServer,
  setStudentSession,
  type StudentSession,
} from "@/application/services/student-session";
import { useServerStudentSession } from "@/presentation/components/tenant/StudentSessionProvider";

/** Avoid hydration mismatch -never seed from localStorage when server snapshot exists. */
export function useStudentSession(tenant: string) {
  const serverCtx = useServerStudentSession();

  const [session, setSession] = useState<StudentSession | null>(() => {
    if (serverCtx?.hydrated) return serverCtx.session;
    return null;
  });

  const [ready, setReady] = useState(() => serverCtx?.hydrated ?? false);

  useEffect(() => {
    let ignore = false;

    void fetchStudentSessionFromServer(tenant)
      .then((serverSession) => {
        if (ignore) return;
        if (serverSession) {
          setStudentSession(serverSession);
          setSession(serverSession);
          return;
        }
        clearStudentSession(tenant);
        setSession(null);
      })
      .catch(() => {
        /* Network blip -keep cookie/local session until next check. */
      })
      .finally(() => {
        if (!ignore) setReady(true);
      });

    return () => {
      ignore = true;
    };
  }, [tenant]);

  return { session, ready };
}
