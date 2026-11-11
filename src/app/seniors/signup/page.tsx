"use client";

import { useRouter } from "next/navigation";
import { SeniorsAuthDrawer } from "@/presentation/components/templates/seniors/SeniorsAuthDrawer";

export default function SeniorsSignupPage() {
  const router = useRouter();

  return (
    <SeniorsAuthDrawer
      open
      presentation="page"
      onClose={() => router.push("/seniors")}
      mode="signup"
      platformMode
      onRequestLogin={() => router.push("/seniors/login")}
    />
  );
}
