/**
 * Reads a localStorage key, first moving over a value saved under its old
 * name. Until October 2026 the keys mixed "lpm:" and "lpm-" and some were in
 * Italian; now they are all "lpm-" and English. The old names can go once
 * returning visitors have been carried over.
 */
export function getStored(key: string, legacy: string): string | null {
  const value = localStorage.getItem(key);
  if (value !== null) return value;
  const old = localStorage.getItem(legacy);
  if (old !== null) {
    localStorage.setItem(key, old);
    localStorage.removeItem(legacy);
  }
  return old;
}
