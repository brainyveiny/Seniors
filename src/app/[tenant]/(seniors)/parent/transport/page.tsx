import { Suspense } from "react";
import { ParentServicesRoute } from "../_shared/ParentServicesRoute";
import { SeniorsContentSkeleton } from "@/presentation/components/templates/seniors/shared/SeniorsContentSkeleton";

export default function ParentTransportRoutePage() {
  return (
    <Suspense fallback={<SeniorsContentSkeleton />}>
      <ParentServicesRoute view="transport" />
    </Suspense>
  );
}
