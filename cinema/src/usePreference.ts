import { useState } from "react";
/** Personal, allowlisted preferences. Corrupt/blocked storage never breaks entry. */
export function usePreference<T extends string>(
  key: string,
  choices: readonly T[],
  fallback: T,
) {
  const [value, update] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (choices.includes(stored as T)) return stored as T;
    } catch {}
    return fallback;
  });
  const change = (next: T) => {
    if (!choices.includes(next)) return;
    update(next);
    try {
      localStorage.setItem(key, next);
    } catch {}
  };
  return [value, change] as const;
}
