import { Suspense } from "react";
import { ParentSectionRoute } from "../_shared/ParentSectionRoute";
import { SeniorsContentSkeleton } from "@/presentation/components/templates/seniors/shared/SeniorsContentSkeleton";

export default function ParentCalendarRoutePage() {
  return (
    <Suspense fallback={<SeniorsContentSkeleton />}>
      <ParentSectionRoute view="calendar" />
    </Suspense>
  );
}
