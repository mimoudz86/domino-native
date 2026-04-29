import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { DominoView } from '../DominoView';
// import { useDominoFlash } from '../../hooks/useDominoFlash';
import type { Domino } from '../../shared/models/Domino';

interface MobileTrainLineProps {
  dominos: Domino[];
  dominoSize?: 'small' | 'medium' | 'large';
}

export function MobileTrainLine({ dominos, dominoSize = 'small' }: MobileTrainLineProps) {
  // Flash hook désactivé
  // const { flashOpacity } = useDominoFlash();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={true}
      style={styles.scrollContainer}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={[styles.trainContainer, { opacity: 1 }]}>
        {dominos.map((domino, index) => (
          <View key={index} style={styles.dominoWrapper}>
            <DominoView
              domino={domino}
              size={dominoSize}
              onPress={() => console.log(`Domino ${index} pressed`)}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  trainContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dominoWrapper: {
    marginHorizontal: 0,
  },
});
