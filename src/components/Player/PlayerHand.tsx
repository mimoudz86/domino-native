import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import type { Domino } from '../../shared/Domino';
import type { PlayTurnPayload } from '../../shared/GameEvent';
import { DominoView } from '../DominoView';
import { useActiveGameStore } from '../../store/gameStoreContext';
import { useDragDetection } from '../../hooks/useDragDetection';

interface PlayerHandProps {
  playerId: number;
  orientation?: 'vertical' | 'horizontal';
  position?: 'bottom' | 'right' | 'top' | 'left';
}

type DraggableStatus = 'none' | 'left' | 'right' | 'both';

interface DraggableDominoViewItemProps {
  domino: Domino;
  draggableStatus: DraggableStatus;
  onTap: () => void;
  opacity: number;
  backgroundColor: string;
  slotKey: string;
  playerId: number;
}

function DraggableDominoViewItem({
  domino,
  draggableStatus,
  onTap,
  opacity,
  backgroundColor,
  slotKey,
  playerId,
}: DraggableDominoViewItemProps) {
  const { isDragging, panHandlers } = useDragDetection(
    domino,
    draggableStatus,
    playerId
  );
  const isPlayable = draggableStatus !== 'none';

  return (
    <View
      key={slotKey}
      style={[
        styles.dominoSlot,
        { opacity: isDragging ? 0.3 : opacity, backgroundColor },
      ]}
      {...panHandlers}
    >
      <DominoView
        domino={domino}
        size="large"
        vertical={true}
        disabled={!isPlayable}
        onPress={onTap}
      />
      {/* ❌ PAS DE GHOST ICI - utilise GlobalDragGhost au niveau MobileGameBoard */}
    </View>
  );
}

export function PlayerHand({
  playerId,
  orientation = 'horizontal',
  position: positionProp = 'bottom',
}: PlayerHandProps) {
  const { playDomino, turnState } = useActiveGameStore();

  const playerState = useMemo((): PlayTurnPayload | null => {
    if (!turnState) {
      return null;
    }

    const payload = turnState as any;
    if (payload.yourIndex !== undefined && payload.yourDominos) {
      return payload;
    }

    return null;
  }, [turnState]);

  const isHorizontal =
    orientation === 'horizontal' || positionProp === 'bottom' || positionProp === 'top';

  const isOurTurn = playerState?.yourIndex === playerId;
  if (isOurTurn) {
    // console.log(`[HUMAN PLAYER] 👤 It's your turn! Playables: ${playerState?.playables.join(', ')}`);
  }

  const getDraggableStatus = (
    dominoIndex: number
  ): 'none' | 'left' | 'right' | 'both' => {
    if (!playerState) return 'none';
    const playableIdx = playerState.playables.indexOf(dominoIndex);
    if (playableIdx === -1) {
      return 'none';
    }
    return (playerState.placements[playableIdx] as 'left' | 'right' | 'both') || 'both';
  };

  const getDraggableStatusMemo = useMemo(
    () => getDraggableStatus,
    [playerState]
  );

  const dominoElements = useMemo(() => {
    if (!playerState || !isOurTurn) {
      return [];
    }

    return playerState.yourDominos.map((domino, index) => {
      const draggableStatus = getDraggableStatusMemo(index);
      const isPlayable = draggableStatus !== 'none';

      const opacityValue = isPlayable ? 1 : 0.65;
      const bgColor = isPlayable ? 'transparent' : 'rgba(100, 100, 100, 0.15)';

      return (
        <DraggableDominoViewItem
          key={`domino-${playerId}-${index}`}
          domino={domino}
          draggableStatus={draggableStatus}
          slotKey={`domino-${playerId}-${index}`}
          opacity={opacityValue}
          backgroundColor={bgColor}
          playerId={playerId}
          onTap={() => {
            if (isPlayable && isOurTurn) {
              const validSide = draggableStatus === 'both' ? 'left' : draggableStatus;
              playDomino(domino, validSide as 'left' | 'right', false);
            }
          }}
        />
      );
    });
  }, [playerState, playerId, isOurTurn, playDomino, getDraggableStatusMemo]);

  if (!isOurTurn) {
    return (
      <View style={styles.scrollContainer}>
        {/* Placeholder */}
      </View>
    );
  }

  return (
    <View style={styles.scrollContainer}>
      <View style={styles.handContainer}>
        {dominoElements}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  handContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 1,
    flexWrap: 'wrap',
  },
  dominoSlot: {
    marginHorizontal: 1,
    marginVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlot: {
    width: 40,
    height: 80,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 2,
    backgroundColor: '#f9fafb',
  },
});
