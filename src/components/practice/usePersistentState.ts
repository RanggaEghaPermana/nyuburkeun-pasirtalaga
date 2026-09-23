import { useEffect, useState } from "react";

type StoredValue<T> = {
  version: 1;
  data: T;
};

export function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) return initialValue;

      const parsed = JSON.parse(stored) as StoredValue<T>;
      return parsed.version === 1 ? parsed.data : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      const payload: StoredValue<T> = { version: 1, data: value };
      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // Penyimpanan dapat ditolak pada mode privat; alat tetap bisa dipakai selama tab terbuka.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
