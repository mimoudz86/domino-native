import { useRef, useCallback, useEffect } from 'react';
import { PanResponder, type GestureResponderEvent, type PanResponderGestureState } from 'react-native';
import type { Domino } from '../shared/Domino';
import { useActiveGameStore } from '../store/gameStoreContext';
import { useDragContext } from '../context/DragContext';
import { calculateClosestSideRN } from '../utils/trainPositions';

type DraggableStatus = 'none' | 'left' | 'right' | 'both';

interface DragState {
  domino: Domino | null;
  draggableStatus: DraggableStatus;
  playerId: number | null;
  isDragging: boolean;
  startPos: { x: number; y: number } | null;
  currentPos: { x: number; y: number } | null;
}

const DRAG_THRESHOLD = 10;

export function useDragDetection(domino: Domino | null, draggableStatus: DraggableStatus, playerId: number | null) {
  const { playDomino, turnState } = useActiveGameStore();
  const { startDrag, updateDragPos, endDrag } = useDragContext();

  const currentValuesRef = useRef({ domino, draggableStatus, playerId });

  useEffect(() => {
    currentValuesRef.current = { domino, draggableStatus, playerId };
  }, [domino, draggableStatus, playerId]);

  const dragState = useRef<DragState>({
    domino: null,
    draggableStatus: 'none',
    playerId: null,
    isDragging: false,
    startPos: null,
    currentPos: null,
  });

  const totalSlots = turnState?.board?.trainOnBoard?.length ?? 0;

  const handleGranted = useCallback((e: GestureResponderEvent) => {
    const { domino: currentDomino, draggableStatus: currentStatus, playerId: currentPlayerId } = currentValuesRef.current;

    if (!currentDomino || currentStatus === 'none' || currentPlayerId == null) {
      return;
    }

    const { pageX, pageY } = e.nativeEvent;
    dragState.current.domino = currentDomino;
    dragState.current.draggableStatus = currentStatus;
    dragState.current.playerId = currentPlayerId;
    dragState.current.startPos = { x: pageX, y: pageY };
    dragState.current.currentPos = { x: pageX, y: pageY };
    dragState.current.isDragging = false;

    startDrag(currentDomino, { x: pageX, y: pageY });
  }, [startDrag]);

  const handleMove = useCallback((e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    if (!dragState.current.startPos) return;

    const distance = Math.hypot(gestureState.dx, gestureState.dy);

    if (distance > DRAG_THRESHOLD && !dragState.current.isDragging) {
      dragState.current.isDragging = true;
    }

    const { pageX, pageY } = e.nativeEvent;
    dragState.current.currentPos = { x: pageX, y: pageY };
    updateDragPos({ x: pageX, y: pageY });
  }, [updateDragPos]);

  const handleRelease = useCallback((e: GestureResponderEvent) => {
    if (!dragState.current.startPos || !dragState.current.domino) {
      resetDrag();
      return;
    }

    const { isDragging, domino: dragDomino, draggableStatus: dragStatus, currentPos } = dragState.current;

    if (!isDragging) {
      resetDrag();
      return;
    }

    // console.log(`[DRAG-RELEASE] currentPos=${currentPos}, totalSlots=${totalSlots}, dragDomino=${dragDomino?.left}|${dragDomino?.right}`);

    if (currentPos) {
      let finalSide: 'left' | 'right';

      if (totalSlots > 1) {
        // Board avec 2+ dominos: calculer le côté basé sur la position
        const side = calculateClosestSideRN(totalSlots, currentPos.x, currentPos.y);
        finalSide = dragStatus === 'both' ? side : (dragStatus as 'left' | 'right');
      } else {
        // 0 ou 1 domino: les deux côtés sont pareils, mettre 'left' par défaut
        finalSide = dragStatus === 'both' ? 'left' : (dragStatus as 'left' | 'right');
      }

      // console.log(`[DRAG-RELEASE] ✅ Calling playDomino(${dragDomino?.left}|${dragDomino?.right}, ${finalSide})`);
      playDomino(dragDomino, finalSide, false);
    } else {
      // console.log(`[DRAG-RELEASE] ❌ NOT calling playDomino - missing currentPos`);
    }

    resetDrag();
  }, [playDomino, totalSlots, endDrag]);

  const resetDrag = useCallback(() => {
    dragState.current = {
      domino: null,
      draggableStatus: 'none',
      playerId: null,
      isDragging: false,
      startPos: null,
      currentPos: null,
    };
    endDrag();
  }, [endDrag]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => currentValuesRef.current.draggableStatus !== 'none',
      onMoveShouldSetPanResponder: () => currentValuesRef.current.draggableStatus !== 'none',
      onPanResponderGrant: handleGranted,
      onPanResponderMove: handleMove,
      onPanResponderRelease: handleRelease,
      onPanResponderTerminate: handleRelease,
    })
  ).current;

  return {
    isDragging: dragState.current.isDragging,
    panHandlers: panResponder.panHandlers,
  };
}
