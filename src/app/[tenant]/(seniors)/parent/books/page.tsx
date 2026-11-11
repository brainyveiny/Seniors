import { Suspense } from "react";
import { ParentServicesRoute } from "../_shared/ParentServicesRoute";
import { SeniorsContentSkeleton } from "@/presentation/components/templates/seniors/shared/SeniorsContentSkeleton";

export default function ParentBooksRoutePage() {
  return (
    <Suspense fallback={<SeniorsContentSkeleton />}>
      <ParentServicesRoute view="books" />
    </Suspense>
  );
}
