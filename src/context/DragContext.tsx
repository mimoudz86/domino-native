import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Domino } from '../shared/Domino';

/**
 * Global drag state for the ghost domino (visual feedback during drag)
 *
 * Flow:
 * 1. useDragDetection.handleGranted() → startDrag()
 * 2. useDragDetection.handleMove() → updateDragPos()
 * 3. useDragDetection.handleRelease() → endDrag()
 * 4. GlobalDragGhost reads this context and renders the ghost at ghostPos
 */
interface DragContextType {
  isDragging: boolean;
  ghostPos: { x: number; y: number };
  draggedDomino: Domino | null;
  startDrag: (domino: Domino, pos: { x: number; y: number }) => void;
  updateDragPos: (pos: { x: number; y: number }) => void;
  endDrag: () => void;
}

const DragContext = createContext<DragContextType | undefined>(undefined);

export function DragContextProvider({ children }: { children: React.ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
  const [draggedDomino, setDraggedDomino] = useState<Domino | null>(null);

  const startDrag = useCallback((domino: Domino, pos: { x: number; y: number }) => {
    setIsDragging(true);
    setDraggedDomino(domino);
    setGhostPos(pos);
  }, []);

  const updateDragPos = useCallback((pos: { x: number; y: number }) => {
    setGhostPos(pos);
  }, []);

  const endDrag = useCallback(() => {
    setIsDragging(false);
    setDraggedDomino(null);
    setGhostPos({ x: 0, y: 0 });
  }, []);

  const value: DragContextType = {
    isDragging,
    ghostPos,
    draggedDomino,
    startDrag,
    updateDragPos,
    endDrag,
  };

  return (
    <DragContext.Provider value={value}>
      {children}
    </DragContext.Provider>
  );
}

export function useDragContext() {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDragContext must be used within DragContextProvider');
  }
  return context;
}
