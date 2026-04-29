import { useState, useCallback } from "react";

const PREFIX = "menu-master:";

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const prefixedKey = PREFIX + key;

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(prefixedKey);
      if (item === null) return defaultValue;
      const parsed = JSON.parse(item);
      // Restore Set from array
      if (defaultValue instanceof Set) {
        return new Set(parsed) as unknown as T;
      }
      return parsed as T;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const nextValue = value instanceof Function ? value(prev) : value;
      try {
        // Serialize Set as array
        const toStore = nextValue instanceof Set ? Array.from(nextValue) : nextValue;
        localStorage.setItem(prefixedKey, JSON.stringify(toStore));
      } catch {
        // localStorage full or unavailable - silently fail
      }
      return nextValue;
    });
  }, [prefixedKey]);

  return [storedValue, setValue];
}
