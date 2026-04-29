import { Gesture } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { Domino } from '../shared/models/GameTurnState';
import { useActiveGameStore } from '../store/gameStoreContext';
import { calculateClosestSideRN } from '../utils/trainPositions';

type DraggableStatus = 'none' | 'left' | 'right' | 'both';

export function useDragInteraction(
  domino: Domino,
  draggableStatus: DraggableStatus,
  ghostX: SharedValue<number>,
  ghostY: SharedValue<number>,
  ghostVisible: SharedValue<number>,
) {
  const { startDrag, endDrag, playDomino, turnState } = useActiveGameStore();
  const totalSlots = turnState?.board?.trainOnBoard?.length ?? 0;

  const gesture = Gesture.Pan()
    .minDistance(10)
    .onStart((e) => {
      ghostX.value = e.absoluteX;
      ghostY.value = e.absoluteY;
      ghostVisible.value = 1;
      runOnJS(startDrag)(domino, draggableStatus);
    })
    .onUpdate((e) => {
      ghostX.value = e.absoluteX;
      ghostY.value = e.absoluteY;
    })
    .onEnd((e) => {
      ghostVisible.value = 0;
      if (totalSlots > 0) {
        const side = calculateClosestSideRN(totalSlots, e.absoluteX, e.absoluteY);
        const resolvedSide = draggableStatus === 'both' ? side : (draggableStatus as 'left' | 'right');
        runOnJS(playDomino)(domino, resolvedSide, false);
      }
      runOnJS(endDrag)();
    })
    .onFinalize(() => {
      ghostVisible.value = 0;
      runOnJS(endDrag)();
    });

  return gesture;
}
