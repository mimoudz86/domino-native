import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import type { TrainSlot } from '../../types/train.types';
import { BOARD_CONFIG, calculateWrapperHeight } from '../../config/boardConfig';
import { calculateLineAdjustments, calculateExtraLineAdjustments } from '../../utils/trainCalculations';
import { RNTrainLine } from './RNTrainLine';

interface RNTrainWrapperProps {
  slots: TrainSlot[];
}

export function RNTrainWrapper({ slots }: RNTrainWrapperProps) {
  const activeLines = useMemo(() => {
    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return {
        upper: false,
        pivotLeft: false,
        pivotRight: false,
        lower: false,
        main: false,
      };
    }
    return {
      upper: slots.some(s => s.line === 'upper-line'),
      pivotLeft: slots.some(s => s.line === 'left_up-position'),
      pivotRight: slots.some(s => s.line === 'right_down-position'),
      lower: slots.some(s => s.line === 'lower-line'),
      main: true,
    };
  }, [slots]);

  // Déterminer les endpoints globaux (premier et dernier slot du train complet)
  const firstSlot = useMemo(() => slots?.[0], [slots]);
  const lastSlot = useMemo(() => slots?.[slots?.length - 1], [slots]);

  // Calcule la hauteur réelle selon les dominos en main-line
  const mainLineDominos = useMemo(() => {
    return slots
      .filter(s => s.line === 'main-line')
      .map(s => s.domino);
  }, [slots]);

  const actualHeight = useMemo(() => {
    return calculateWrapperHeight(mainLineDominos);
  }, [mainLineDominos]);

  // Calcule les ajustements pour les translates
  // ⚙️ Main-line reste fixe (translateX: 0) — les autres lignes bougent pour s'aligner
  const lineAdjustments = useMemo(() => calculateLineAdjustments(slots), [slots]);
  const extraAdjustments = useMemo(() => calculateExtraLineAdjustments(slots), [slots]);

  // 🎲 LOG: Décomposition et translates
  useMemo(() => {
  }, [slots, lineAdjustments, extraAdjustments]);

  const styles = useMemo(() => {
    return StyleSheet.create({
      wrapper: {
        width: BOARD_CONFIG.wrapper.width,
        height: actualHeight || BOARD_CONFIG.wrapper.height,
        flexDirection: 'row',
        justifyContent: 'center',
        position: 'relative',
        alignSelf: BOARD_CONFIG.wrapper.alignCenter ? 'center' : 'flex-start',
      },
    });
  }, [actualHeight]);

  const dynamicStyles = styles;

  return (
    <View style={dynamicStyles.wrapper}>
      {/* Colonnes côte à côte : upper | pivot-left | main | pivot-right | lower */}

      {activeLines.upper && (
        <RNTrainLine
          lineType="upper-line"
          slots={slots}
          isActive
          vertical
          translateX={lineAdjustments.left + extraAdjustments.upper}

          firstSlot={firstSlot}
          lastSlot={lastSlot}
        />
      )}

      {activeLines.pivotLeft && (
        <RNTrainLine
          lineType="left_up-position"
          slots={slots}
          isActive
          vertical
          translateX={lineAdjustments.left}

          firstSlot={firstSlot}
          lastSlot={lastSlot}
        />
      )}

      <RNTrainLine
        lineType="main-line"
        slots={slots}
        isActive={activeLines.main}
        vertical
        firstSlot={firstSlot}
        lastSlot={lastSlot}
      />

      {/* Pivot droit */}
      {activeLines.pivotRight && (
        <RNTrainLine
          lineType="right_down-position"
          slots={slots}
          isActive
          vertical
          translateX={lineAdjustments.right}

          firstSlot={firstSlot}
          lastSlot={lastSlot}
        />
      )}

      {/* Lower-line du bas vers le haut (inverse) */}
      {activeLines.lower && (
        <RNTrainLine
          lineType="lower-line"
          slots={slots}
          isActive
          vertical
          inverted
          translateX={lineAdjustments.right + extraAdjustments.lower}

          firstSlot={firstSlot}
          lastSlot={lastSlot}
        />
      )}
    </View>
  );
}

