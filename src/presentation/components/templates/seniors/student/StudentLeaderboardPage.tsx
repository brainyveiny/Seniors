"use client";

import { Trophy } from "lucide-react";
import type { SiteContext } from "@/application/hooks/use-site-context";
import { SeniorsSchoolLeaderboard } from "@/presentation/components/templates/seniors/gamification/SeniorsSchoolLeaderboard";
import { StudentPageHero } from "@/presentation/components/templates/seniors/student/StudentPageChrome";

export function StudentLeaderboardPage({ ctx }: { ctx: SiteContext }) {
  return (
    <div className="space-y-6">
      <StudentPageHero
        icon={Trophy}
        title="Leaderboard"
        subtitle="Every student in the school, with their class. Ranked by daily streak, then merit coins."
      />
      <SeniorsSchoolLeaderboard tenant={ctx.tenant} hideIntro />
    </div>
  );
}
