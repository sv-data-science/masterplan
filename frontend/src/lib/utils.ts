import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export function getAvailabilityColor(status: string) {
  switch (status) {
    case 'available': return 'text-green-400 bg-green-400/10';
    case 'retiring_soon': return 'text-yellow-400 bg-yellow-400/10';
    case 'retired': return 'text-red-400 bg-red-400/10';
    case 'out_of_stock': return 'text-gray-400 bg-gray-400/10';
    default: return 'text-gray-400 bg-gray-400/10';
  }
}

export function getAvailabilityLabel(status: string) {
  switch (status) {
    case 'available': return 'Available';
    case 'retiring_soon': return 'Retiring Soon';
    case 'retired': return 'Retired';
    case 'out_of_stock': return 'Out of Stock';
    default: return 'Unknown';
  }
}

export function getRarityColor(rarity: string) {
  switch (rarity) {
    case 'common': return 'text-gray-300';
    case 'uncommon': return 'text-green-400';
    case 'rare': return 'text-blue-400';
    case 'ultra_rare': return 'text-purple-400';
    default: return 'text-gray-300';
  }
}

export function getLevelTitle(level: number) {
  if (level < 5) return 'Brick Novice';
  if (level < 10) return 'Junior Builder';
  if (level < 20) return 'Master Builder';
  if (level < 35) return 'Expert Collector';
  if (level < 50) return 'Elite Archivist';
  return 'Legendary Collector';
}

export function xpForNextLevel(level: number) {
  return Math.floor(100 * Math.pow(1.5, level));
}
