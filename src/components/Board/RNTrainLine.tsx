import React, { useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import type { Domino } from '../../shared/Domino';
import type { TrainLineType, TrainSlot } from '../../types/train.types';
import { BOARD_CONFIG } from '../../config/boardConfig';
import { DominoView } from '../DominoView';
import { registerSlotPosition } from '../../utils/trainPositions';
import { useDragState } from '../../store/gameSelectors';

interface RNTrainLineProps {
  lineType: TrainLineType;
  slots: TrainSlot[];
  isActive: boolean;
  vertical?: boolean;
  inverted?: boolean;
  translateX?: number;
  firstSlot?: TrainSlot;
  lastSlot?: TrainSlot;
}

type DraggableStatus = 'none' | 'left' | 'right' | 'both' | undefined;

function getHighlightStyle(status: DraggableStatus, isLeft: boolean, isRight: boolean): any {
  if (!status || status === 'none') return null;
  if (status === 'left' && isLeft) return { borderColor: '#00cc00', borderWidth: 2 };
  if (status === 'right' && isRight) return { borderColor: '#00cc00', borderWidth: 2 };
  if (status === 'both') {
    if (isLeft) return { borderColor: '#ff9500', borderWidth: 2 };
    if (isRight) return { borderColor: '#ff0000', borderWidth: 2 };
  }
  return null;
}

export function RNTrainLine({
  lineType,
  slots,
  isActive,
  vertical = false,
  inverted = false,
  translateX = 0,
  firstSlot,
  lastSlot,
}: RNTrainLineProps) {
  const dragState = useDragState();
  // Refs pour chaque slot - pour measureInWindow
  const slotRefs = useRef<Map<number, View>>(new Map()).current;

  const lineSlots = (slots && Array.isArray(slots)) ? slots.filter(s => s.line === lineType) : [];

  const visualSlots = useMemo(() => {
    const swapDomino = (d: Domino): Domino => ({
      ...d,
      left: d.right,
      right: d.left,
    });

    // ✅ CALCULER globalIndex AVANT transformations
    let result = lineSlots.map((slot, visualIndex) => ({
      ...slot,
      visualIndex,
      globalIndex: slots.indexOf(slot),
    }));

    if (lineType === 'upper-line') {
      result = lineSlots
        .slice()
        .reverse()
        .map((slot, visualIndex) => ({
          ...slot,
          domino: swapDomino(slot.domino),
          visualIndex,
          globalIndex: slots.indexOf(slot),
        }));
    }

    if (lineType === 'lower-line') {
      result = lineSlots.map((slot, visualIndex) => ({
        ...slot,
        domino: swapDomino(slot.domino),
        visualIndex,
        globalIndex: slots.indexOf(slot),
      }));
    }

    if (inverted) {
      result = result.reverse();
    }

    return result;
  }, [lineSlots, lineType, inverted, slots]);

  // ✅ Utiliser measureInWindow pour obtenir les positions ABSOLUTES
  useEffect(() => {
    const measureSlots = async () => {
      slotRefs.forEach((ref, globalIndex) => {
        if (ref) {
          ref.measureInWindow((x, y, width, height) => {
            registerSlotPosition(globalIndex, { x, y, width, height } as any);
          });
        }
      });
    };

    // Petit délai pour s'assurer que les layouts sont calculés
    const timeout = setTimeout(measureSlots, 100);
    return () => clearTimeout(timeout);
  }, [slots, visualSlots]);

  const isPivot =
    lineType === 'left_up-position' || lineType === 'right_down-position';

  const flexDir = vertical ? 'column' : 'row';
  const isBottomAligned = lineType === 'right_down-position' || lineType === 'lower-line';

  const transformStyle = [{ translateX }];

  if (!slots || !Array.isArray(slots) || lineSlots.length === 0) {
    return <View style={styles.line} />;
  }

  return (
    <View
      style={[
        styles.line,
        vertical && styles.lineVertical,
        vertical && isBottomAligned && styles.lineBottomAligned,
        styles[lineType as keyof typeof styles],
        !isActive && styles.inactive,
        {
          flexDirection: flexDir,
          transform: transformStyle,
        },
      ]}
    >
      {visualSlots.map((slot, lineIndex) => {
        const isDouble = slot.domino.left === slot.domino.right;
        const showHorizontal = isPivot || isDouble;
        const globalIndex = (slot as any).globalIndex;

        const isLeftEndpoint = slot === firstSlot;
        const isRightEndpoint = slot === lastSlot;
        const highlightStyle = getHighlightStyle(dragState?.draggableStatus, isLeftEndpoint, isRightEndpoint);

        return (
          <View
            key={`${lineType}-${slot.visualIndex}`}
            ref={(ref) => {
              if (ref && globalIndex !== -1) {
                slotRefs.set(globalIndex, ref);
              }
            }}
            style={highlightStyle}
          >
            <DominoView
              domino={slot.domino}
              size={BOARD_CONFIG.domino.size}
              vertical={!showHorizontal}
              disabled
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#ddd',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    width: BOARD_CONFIG?.wrapper?.columnWidth || 64,
  },
  lineVertical: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: BOARD_CONFIG?.wrapper?.columnWidth || 64,
  },
  lineBottomAligned: {
    justifyContent: 'flex-end',
  },
  'main-line': {
    backgroundColor: 'transparent',
  },
  'upper-line': {
    backgroundColor: 'transparent',
  },
  'lower-line': {
    backgroundColor: 'transparent',
  },
  'left_up-position': {
    backgroundColor: 'transparent',
  },
  'right_down-position': {
    backgroundColor: 'transparent',
  },
  inactive: {
    opacity: 0.5,
  },
});
