import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useActiveGameStore } from '../../store/gameStoreContext';
import { buildTrainSlots } from '../../utils/trainCalculations';
import { RNTrainWrapper } from './RNTrainWrapper';

interface MobileGameWrapperProps {
  dominoSize?: 'small' | 'medium' | 'large';
}

export function MobileGameWrapper({ dominoSize = 'small' }: MobileGameWrapperProps) {
  const { turnState } = useActiveGameStore();

  const slots = useMemo(() => {
    const trainOnBoard = (turnState as any)?.board?.trainOnBoard ?? [];
    return buildTrainSlots(trainOnBoard);
  }, [turnState]);

  return (
    <View style={styles.container}>
      <RNTrainWrapper slots={slots} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});
