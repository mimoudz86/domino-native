import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTrainOnBoard } from '../../store/gameSelectors';
import { buildTrainSlots } from '../../utils/trainCalculations';
import { RNTrainWrapper } from './RNTrainWrapper';

interface MobileGameWrapperProps {
  dominoSize?: 'small' | 'medium' | 'large';
}

export function MobileGameWrapper({ dominoSize = 'small' }: MobileGameWrapperProps) {
  const trainOnBoard = useTrainOnBoard();

  const slots = useMemo(() => {
    return buildTrainSlots(trainOnBoard);
  }, [trainOnBoard]);

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
