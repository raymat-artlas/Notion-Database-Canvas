/**
 * Generate a unique ID
 * Falls back to timestamp + random string if crypto.randomUUID is not available
 */
export function generateId(prefix?: string): string {
  const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return prefix ? `${prefix}-${uniqueId}` : uniqueId;
}