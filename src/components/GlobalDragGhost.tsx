import React from 'react';
import { View } from 'react-native';
import { useDragContext } from '../context/DragContext';
import { DominoView } from './DominoView';

export function GlobalDragGhost() {
  const { isDragging, ghostPos, draggedDomino } = useDragContext();

  if (!isDragging || !draggedDomino) return null;

  return (
    <View
      style={{
        position: 'absolute',
        left: ghostPos.x - 20,
        top: ghostPos.y - 40,
        zIndex: 999,
        pointerEvents: 'none',
      }}
    >
      <DominoView domino={draggedDomino} size="large" vertical={true} disabled />
    </View>
  );
}
