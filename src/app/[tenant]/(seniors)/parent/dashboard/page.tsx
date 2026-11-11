import { Suspense } from "react";
import { ParentDashboardRoute } from "./ParentDashboardRoute";
import { SeniorsContentSkeleton } from "@/presentation/components/templates/seniors/shared/SeniorsContentSkeleton";

export default function ParentDashboardPage() {
  return (
    <Suspense fallback={<SeniorsContentSkeleton />}>
      <ParentDashboardRoute />
    </Suspense>
  );
}
