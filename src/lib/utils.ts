
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const BADGES = [
  { name: 'Newbie', minXP: 0, maxXP: 50, color: 'text-slate-400' },
  { name: 'Contributor', minXP: 51, maxXP: 200, color: 'text-sky-400' },
  { name: 'Trusted', minXP: 201, maxXP: 500, color: 'text-green-500' },
  { name: 'Legend', minXP: 501, maxXP: 1000, color: 'text-yellow-500' },
  { name: 'Influencer', minXP: 1001, maxXP: 2000, color: 'text-orange-500' },
  { name: 'Veteran', minXP: 2001, maxXP: 4000, color: 'text-indigo-500' },
  { name: 'Guardian', minXP: 4001, maxXP: 8000, color: 'text-purple-500' },
  { name: 'Explorer', minXP: 8001, maxXP: 15000, color: 'text-teal-500' },
  { name: 'Elite', minXP: 15001, maxXP: 30000, color: 'text-pink-500' },
  { name: 'Immortal', minXP: 30001, maxXP: 50000, color: 'text-red-600' },
  { name: 'Mythical', minXP: 50001, maxXP: Infinity, color: 'text-fuchsia-600' },
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
    const currentBadge = getBadgeForXP(xp);
    const currentBadgeIndex = BADGES.findIndex(b => b.name === currentBadge.name);

    if (currentBadgeIndex >= BADGES.length - 1) {
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
