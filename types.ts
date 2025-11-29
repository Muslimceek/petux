export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  SHOP = 'SHOP'
}

export enum EntityType {
  PLAYER = 'PLAYER',
  OBSTACLE = 'OBSTACLE',
  COIN = 'COIN',
  PARTICLE = 'PARTICLE'
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface PlayerData {
  color: string; // Hex code for the base color
  unlockedColors: string[];
  totalCoins: number;
}

// iOS 26 Liquid Glass Palette (Premium & Organic)
export const DRONE_COLORS = [
  { id: 'pearl', name: 'Pearl White', hex: '#E2E8F0', price: 0, gradient: ['#FFFFFF', '#CBD5E1'] },
  { id: 'onyx', name: 'Midnight Onyx', hex: '#1E293B', price: 100, gradient: ['#475569', '#0F172A'] },
  { id: 'emerald', name: 'Deep Emerald', hex: '#10B981', price: 250, gradient: ['#34D399', '#059669'] },
  { id: 'sapphire', name: 'Ocean Sapphire', hex: '#3B82F6', price: 250, gradient: ['#60A5FA', '#2563EB'] },
  { id: 'amethyst', name: 'Royal Amethyst', hex: '#8B5CF6', price: 500, gradient: ['#A78BFA', '#7C3AED'] },
  { id: 'gold', name: 'Mecca Gold', hex: '#F59E0B', price: 1000, gradient: ['#FCD34D', '#D97706'] },
];