/**
 * Normalizes a value to a human-readable string.
 * Supports strings, numbers, and objects with a 'label' property.
 */
export function ensureString(val) {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return val.toString();
  if (val && typeof val === 'object' && val.label) return val.label;
  return '';
}

/**
 * Normalizes an array of mixed strings/objects into an array of clean strings.
 */
export function ensureStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(ensureString).filter(s => s.length > 0);
}
