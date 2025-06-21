import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const BADGES = [
  { name: 'Newbie', minXP: 0, maxXP: 50, color: 'text-slate-400' },
  { name: 'Contributor', minXP: 51, maxXP: 200, color: 'text-emerald-400' },
  { name: 'Trusted', minXP: 201, maxXP: 500, color: 'text-sky-400' },
  { name: 'Legend', minXP: 501, maxXP: Infinity, color: 'text-violet-400' },
];

export const ALLOWED_TAGS = ['security', 'reverse-eng', 'web-security', 'malware', 'cve', 'networking', 'crypto', 'forensics'];

export function getBadgeForXP(xp: number) {
  let foundBadge = BADGES[0];
  for (let i = BADGES.length - 1; i >= 0; i--) {
    if (xp >= BADGES[i].minXP) {
      foundBadge = BADGES[i];
      break;
    }
  }
  return foundBadge;
}

export function getNextBadge(xp: number) {
    const currentBadgeIndex = BADGES.findIndex(badge => xp >= badge.minXP && xp < badge.maxXP);
    if (currentBadgeIndex === -1 || currentBadgeIndex === BADGES.length - 1) {
        return null;
    }
    return BADGES[currentBadgeIndex + 1];
}

export function buildAvatarUrl(options: Record<string, string | string[]>) {
  const baseUrl = 'https://api.dicebear.com/8.x/adventurer/svg';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (Array.isArray(value)) {
      params.set(key, value.join(','));
    } else {
      params.set(key, value);
    }
  }
  return `${baseUrl}?${params.toString()}`;
}
