
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { backgroundColors } from "./dicebear-options";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const BADGES = [
  { name: 'Newbie', minXP: 0, maxXP: 50, color: 'text-gray-400' },
  { name: 'Contributor', minXP: 51, maxXP: 200, color: 'text-blue-400' },
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
    const currentBadgeIndex = BADGES.findIndex(b => xp >= b.minXP && xp <= b.maxXP);
    if (currentBadgeIndex === -1) {
        // This case handles if XP is somehow outside all ranges, defaulting to finding the current badge.
        const currentBadge = getBadgeForXP(xp);
        const currentIndex = BADGES.findIndex(b => b.name === currentBadge.name);
        if (currentIndex < BADGES.length - 1) {
            return BADGES[currentIndex + 1];
        }
        return null;
    }

    if (currentBadgeIndex < BADGES.length - 1) {
        return BADGES[currentBadgeIndex + 1];
    }
    
    return null;
}

export function buildAvatarUrl(options: Record<string, any>) {
  const baseUrl = 'https://api.dicebear.com/8.x/adventurer/svg';
  const params = new URLSearchParams();
  
  const finalOptions = { 
    ...options,
    scale: 110,
    translateY: 5,
  };

  // This ensures glasses/features appear when selected by the user.
  if (finalOptions.glasses && finalOptions.glasses !== 'None') {
    finalOptions.glassesProbability = 100;
  }
  if (finalOptions.features && finalOptions.features !== 'None') {
    finalOptions.featuresProbability = 100;
  }
  
  // Handle background
  if (finalOptions.backgroundType === 'solid') {
    if (!finalOptions.backgroundColor) {
      // Default color if solid is selected but no color is set yet
      finalOptions.backgroundColor = backgroundColors[0].replace('#','');
    }
  } else {
    // If backgroundType is not 'solid' (i.e., it's 'None'/undefined), make it transparent.
    finalOptions.backgroundColor = 'transparent';
    delete finalOptions.backgroundType;
  }

  for (const [key, value] of Object.entries(finalOptions)) {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        params.set(key, value.join(','));
      }
    } else if (value !== undefined && value !== null && value !== 'None') {
      params.set(key, String(value));
    }
  }
  return `${baseUrl}?${params.toString()}`;
}


export function getSecurityTagline(xp: number): string | null {
  if (xp > 15000) return 'Elite Drop';
  if (xp > 4000) return 'Guardian Insight';
  if (xp > 1000) return 'Underground Discovery';
  return null;
}
