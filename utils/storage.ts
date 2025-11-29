import { PlayerData, DRONE_COLORS } from '../types';

const STORAGE_KEY = 'neon_core_data_v1';

const DEFAULT_DATA: PlayerData = {
  color: DRONE_COLORS[0].hex,
  unlockedColors: [DRONE_COLORS[0].hex],
  totalCoins: 0,
};

export const loadPlayerData = (): PlayerData => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : DEFAULT_DATA;
  } catch (e) {
    console.error("Failed to load save data", e);
    return DEFAULT_DATA;
  }
};

export const savePlayerData = (data: PlayerData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save data", e);
  }
};