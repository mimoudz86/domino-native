import { GlobalDragGhost } from '../GlobalDragGhost';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getPlayerIdAtPosition } from '../../utils/playerPositioning';
import { CurrentPlayerArea } from '../Player/CurrentPlayerArea';
import { OpponentPlayerArea } from '../Player/OpponentPlayerArea';
import { MobileGameWrapper } from './MobileGameWrapper';
import { ScoreSlot } from './ScoreSlot';
import { GameEndModal } from '../GameEnd/GameEndModal';
import { PassNotificationBadge } from '../Player/PassNotificationBadge';
import { useAllPlayers, useGameEndData, useGameEndActions } from '../../store/gameSelectors';

interface MobileGameBoardProps {
  thisPlayerId?: number;
  onBackToHome?: () => void;
}

export function MobileGameBoard({
  thisPlayerId = 0,
  onBackToHome,
}: MobileGameBoardProps) {

  const [isExpanded, setIsExpanded] = useState(false);
  const { gameEnded, lastGameData, currentSetData, currentMatchData, selectedConfig } = useGameEndData();
  const { resetGame, initGame, continueOrNewMatch, resetGameEndState } = useGameEndActions();
  const players = useAllPlayers();

  const toggleExpand = () => setIsExpanded(prev => !prev);

  const handleContinue = async () => {
    resetGameEndState();
    await continueOrNewMatch();
    await initGame(['AI 1', 'AI 2', 'AI 3', 'AI 4'], [true, true, true, true]);
  };

  const handleLeave = () => {
    resetGameEndState();
    resetGame();
    onBackToHome?.();
  };

  if (players.length < 4) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Initialisation du jeu...</Text>
        <GlobalDragGhost />
      </View>
    );
  }

  const bottomPlayer = getPlayerIdAtPosition('bottom', thisPlayerId);
  const rightPlayer = getPlayerIdAtPosition('right', thisPlayerId);
  const topPlayer = getPlayerIdAtPosition('top', thisPlayerId);
  const leftPlayer = getPlayerIdAtPosition('left', thisPlayerId);

  if (isExpanded) {
    // EXPANDED VIEW: Board takes full space + bottomZone
    return (
      <View style={styles.container}>
        {/* EXPANDED BOARD ZONE */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={toggleExpand}
          style={styles.expandedBoardZone}
        >
          <MobileGameWrapper dominoSize="medium" />
        </TouchableOpacity>

        {/* BOTTOM ZONE - Current Player with full hand */}
        <View style={styles.bottomZone}>
          {bottomPlayer === thisPlayerId ? (
            <CurrentPlayerArea
              playerId={bottomPlayer}

              position="bottom"
            />
          ) : (
            <OpponentPlayerArea
              playerId={bottomPlayer}
              position="bottom"
            />
          )}
        </View>

        {/* Buzz Button - Overlay indépendant */}
        {/* <BuzzButton enabled={true} /> */}

        <PassNotificationBadge />
        <GameEndModal
          visible={gameEnded}
          selectedConfig={selectedConfig}
          lastGameData={lastGameData}
          currentSetData={currentSetData}
          currentMatchData={currentMatchData}
          players={players}
          onContinue={handleContinue}
          onLeave={handleLeave}
        />
        <GlobalDragGhost />
      </View>
    );
  }

  // NORMAL VIEW: topZone + mainZone (with opponents) + bottomZone
  return (
    <View style={styles.container}>
      {/* TOP ZONE */}
      <View style={styles.topZone}>
        <View style={styles.menuSlot}>
          <Text style={styles.slotText}>☰</Text>
        </View>
        <View style={styles.topPlayerContainer}>
          <OpponentPlayerArea
            playerId={topPlayer}
            position="top"
          />
        </View>
        <View style={styles.scoreSlot}>
          <ScoreSlot
            setScoreUs={45}
            setScoreThem={32}
            matchScoreUs={2}
            matchScoreThem={1}
            thisPlayerId={thisPlayerId}
          />
        </View>
      </View>

      {/* MAIN ZONE */}
      <View style={styles.mainZone}>
        <View style={styles.leftPlayerContainer}>
          <OpponentPlayerArea
            playerId={leftPlayer}
            position="left"
          />
        </View>
        <TouchableOpacity
          activeOpacity={1}
          onPress={toggleExpand}
          style={styles.gameBoardContainer}
        >
          <MobileGameWrapper />
        </TouchableOpacity>
        <View style={styles.rightPlayerContainer}>
          <OpponentPlayerArea
            playerId={rightPlayer}
            position="right"
          />
        </View>
      </View>

      {/* BOTTOM ZONE - Current Player with full hand */}
      <View style={styles.bottomZone}>
        {bottomPlayer === thisPlayerId ? (
          <CurrentPlayerArea
            playerId={bottomPlayer}
            position="bottom"
          />
        ) : (
          <OpponentPlayerArea
            playerId={bottomPlayer}
            position="bottom"
          />
        )}
      </View>

      {/* Buzz Button - Overlay indépendant */}
      {/* <BuzzButton enabled={true} /> */}

      <PassNotificationBadge />
      <GameEndModal
        visible={gameEnded}
        selectedConfig={selectedConfig}
        lastGameData={lastGameData}
        currentSetData={currentSetData}
        currentMatchData={currentMatchData}
        players={players}
        onContinue={handleContinue}
        onLeave={handleLeave}
      />
      <GlobalDragGhost />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6b4423',
    flexDirection: 'column',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1b4d3e',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
  },
  topZone: {
    flex: 0.12,
    flexDirection: 'row',
    backgroundColor: '#6b4423',
    paddingHorizontal: 4,
  },
  menuSlot: {
    flex: 0.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topPlayerContainer: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  scoreSlot: {
    flex: 0.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotText: {
    color: '#fff',
    fontSize: 20,
  },
  mainZone: {
    flex: 0.76,
    flexDirection: 'row',
  },
  leftPlayerContainer: {
    flex: 0.13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6b4423',
    overflow: 'hidden',
  },
  gameBoardContainer: {
    flex: 0.74,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a8055',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  expandedBoardZone: {
    flex: 0.88,
    backgroundColor: '#2a8055',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  rightPlayerContainer: {
    flex: 0.13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6b4423',
    overflow: 'hidden',
  },
  bottomZone: {
    flex: 0.12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6b4423',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
});
