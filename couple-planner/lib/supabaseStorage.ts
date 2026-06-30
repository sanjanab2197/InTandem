import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

function hasPersistentStorage(): boolean {
  return Platform.OS !== 'web' || typeof window !== 'undefined';
}

/** Avoids touching AsyncStorage/window during Expo web SSR (Node has no window). */
export const supabaseStorage = {
  getItem: (key: string) => {
    if (!hasPersistentStorage()) return Promise.resolve(null);
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (!hasPersistentStorage()) return Promise.resolve();
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (!hasPersistentStorage()) return Promise.resolve();
    return AsyncStorage.removeItem(key);
  },
};
