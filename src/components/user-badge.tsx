import { cn, getBadgeForXP } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type UserBadgeProps = {
  xp: number;
  className?: string;
};

export function UserBadge({ xp, className }: UserBadgeProps) {
  const badgeInfo = getBadgeForXP(xp);

  if (!badgeInfo) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs px-2 py-0.5 rounded-full border',
        badgeInfo.color,
        className
      )}
    >
      {badgeInfo.name}
    </Badge>
  );
}
