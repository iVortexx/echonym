"use client";

import { Progress } from "@/components/ui/progress";
import { getBadgeForXP, getNextBadge } from "@/lib/utils";

type XPBarProps = {
  xp: number;
};

export function XPBar({ xp }: XPBarProps) {
  const currentBadge = getBadgeForXP(xp);
  const nextBadge = getNextBadge(xp);

  const progress = nextBadge
    ? Math.round(((xp - currentBadge.minXP) / (nextBadge.minXP - currentBadge.minXP)) * 100)
    : 100;

  return (
    <div className="space-y-2">
        <div className="flex justify-between items-baseline text-sm">
            <span className="font-semibold text-foreground">{xp.toLocaleString()} XP</span>
            {nextBadge && (
                 <span className="text-muted-foreground">
                    Next Badge: {nextBadge.name} at {nextBadge.minXP.toLocaleString()} XP
                </span>
            )}
        </div>
      <Progress value={progress} className="h-3 bg-primary/20" />
    </div>
  );
}
