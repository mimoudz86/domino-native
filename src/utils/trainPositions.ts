import type { LayoutRectangle } from 'react-native';

const slotPositions = new Map<number, LayoutRectangle>();

export function registerSlotPosition(index: number, layout: LayoutRectangle) {
  slotPositions.set(index, layout);
  // ❌ Pas de log ici - trop de bruit
}

export function clearSlotPositions() {
  slotPositions.clear();
}

export function calculateClosestSideRN(
  totalSlots: number,
  touchX: number,
  touchY: number
): 'left' | 'right' {
  const first = slotPositions.get(0);
  const last = slotPositions.get(totalSlots - 1);

  if (!first || !last) {
    return 'left';
  }

  const firstCenterX = first.x + first.width / 2;
  const firstCenterY = first.y + first.height / 2;
  const lastCenterX = last.x + last.width / 2;
  const lastCenterY = last.y + last.height / 2;

  const distFirst = Math.hypot(touchX - firstCenterX, touchY - firstCenterY);
  const distLast = Math.hypot(touchX - lastCenterX, touchY - lastCenterY);

  return distFirst <= distLast ? 'left' : 'right';
}
