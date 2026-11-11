"use client";

import { useRouter } from "next/navigation";
import { SeniorsAuthDrawer } from "@/presentation/components/templates/seniors/SeniorsAuthDrawer";

export default function SeniorsLoginIndexPage() {
  const router = useRouter();

  return (
    <SeniorsAuthDrawer
      open
      presentation="page"
      onClose={() => router.push("/seniors")}
      mode="login"
      platformMode
      onRequestSignup={() => router.push("/seniors/signup")}
    />
  );
}
