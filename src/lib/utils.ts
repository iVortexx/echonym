import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const BADGES = [
  { name: 'Newbie', minXP: 0, maxXP: 50, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { name: 'Contributor', minXP: 51, maxXP: 200, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { name: 'Trusted', minXP: 201, maxXP: 500, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { name: 'Legend', minXP: 501, maxXP: Infinity, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
];

export function getBadgeForXP(xp: number) {
  return BADGES.find(badge => xp >= badge.minXP && xp <= badge.maxXP) ?? BADGES[0];
}

export function getNextBadge(xp: number) {
    const currentBadgeIndex = BADGES.findIndex(badge => xp >= badge.minXP && xp <= badge.maxXP);
    if (currentBadgeIndex === -1 || currentBadgeIndex === BADGES.length - 1) {
        return null;
    }
    return BADGES[currentBadgeIndex + 1];
}
