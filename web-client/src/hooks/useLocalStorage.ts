import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing state synchronized with localStorage
 * @param key - The localStorage key
 * @param defaultValue - The default value if key doesn't exist
 * @returns A tuple of [value, setValue] similar to useState
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state from localStorage or use default value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  // Update localStorage when state changes
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setStoredValue((prev) => {
        // Allow value to be a function (like useState)
        const valueToStore = value instanceof Function ? value(prev) : value;

        // Remove from localStorage if value is null or undefined
        if (valueToStore === null || valueToStore === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(valueToStore));
        }
        
        return valueToStore;
      });
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]); // Remove storedValue from dependencies!

  // Listen for changes to localStorage from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.storageArea === localStorage) {
        try {
          const newValue = e.newValue ? JSON.parse(e.newValue) : defaultValue;
          setStoredValue(newValue);
        } catch (error) {
          console.warn(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, defaultValue]);

  return [storedValue, setValue];
}
