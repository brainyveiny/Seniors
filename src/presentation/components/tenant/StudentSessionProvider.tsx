"use client";

import { createContext, useContext, useLayoutEffect } from "react";
import {
  setStudentSession,
  type StudentSession,
} from "@/application/services/student-session";

interface StudentSessionServerValue {
  session: StudentSession | null;
  hydrated: boolean;
}

const StudentSessionServerContext = createContext<StudentSessionServerValue | null>(
  null,
);

export function StudentSessionProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: StudentSession | null;
}) {
  useLayoutEffect(() => {
    if (initialSession) {
      setStudentSession(initialSession);
    }
  }, [initialSession]);

  return (
    <StudentSessionServerContext.Provider
      value={{ session: initialSession, hydrated: true }}
    >
      {children}
    </StudentSessionServerContext.Provider>
  );
}

export function useServerStudentSession(): StudentSessionServerValue | null {
  return useContext(StudentSessionServerContext);
}
