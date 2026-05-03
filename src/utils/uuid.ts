/**
 * Simple UUID v4 generator for React Native
 * Suffisant pour générer des IDs uniques pour les matches et games
 */

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Générer un ID simple basé sur timestamp + random
 * Plus léger qu'UUID si uuid est trop lourd
 */
export function generateSimpleId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
