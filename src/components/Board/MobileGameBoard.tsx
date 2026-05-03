import { GlobalDragGhost } from '../GlobalDragGhost';
import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { PlayerTurnState, TurnState } from '../../shared/models/GameTurnState';
import { DominoModel } from '../../shared/models/Domino';
import { getPlayerIdAtPosition } from '../../utils/playerPositioning';
import { CurrentPlayerArea } from '../Player/CurrentPlayerArea';
import { OpponentPlayerArea } from '../Player/OpponentPlayerArea';
import { MobileGameWrapper } from './MobileGameWrapper';
import { ScoreSlot } from './ScoreSlot';
import { GameEndModal } from '../GameEnd/GameEndModal';
import { PassNotificationBadge } from '../Player/PassNotificationBadge';
import { useActiveGameStore } from '../../store/gameStoreContext';
import { LocalMatchStorage } from '../../services/LocalMatchStorage';
import { MatchService } from '../../services/MatchService';
import { DEFAULT_MATCH_CONFIG } from '../../types/MatchConfig';

interface MobileGameBoardProps {
  players?: PlayerTurnState[];
  thisPlayerId?: number;
  gameState?: TurnState;
  onBackToHome?: () => void;
}

// Mock dominos for all players
const MOCK_DOMINOS = [
  new DominoModel(6, 5),
  new DominoModel(5, 4),
  new DominoModel(4, 3),
  new DominoModel(3, 2),
  new DominoModel(2, 1),
  new DominoModel(1, 0),
  new DominoModel(6, 6),
];

// Mock players for testing
const MOCK_PLAYERS: PlayerTurnState[] = [
  {
    id: 0,
    name: 'Aliceasaurus',
    dominos: MOCK_DOMINOS,
    dominoCount: 7,
    playables: [0, 2, 6],
    placements: ['both', 'left', 'both'],
    hasPassed: false,
    canPlay: true,
  },
  {
    id: 1,
    name: 'Bobalonius',
    dominos: null as any,
    dominoCount: 7,
    playables: [],
    placements: [],
    hasPassed: false,
    canPlay: false,
  },
  {
    id: 2,
    name: 'CharlieMax',
    dominos: null as any,
    dominoCount: 7,
    playables: [],
    placements: [],
    hasPassed: true,
    canPlay: false,
  },
  {
    id: 3,
    name: 'DianaQueen',
    dominos: null as any,
    dominoCount: 7,
    playables: [],
    placements: [],
    hasPassed: false,
    canPlay: false,
  },
];

export function MobileGameBoard({
  players: initialPlayers = MOCK_PLAYERS,
  thisPlayerId = 0,
  gameState,
  onBackToHome,
}: MobileGameBoardProps) {

  const [isExpanded, setIsExpanded] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState('');
  const [gameEndState, setGameEndState] = useState<any | null>(null);
  const { resetGame, dispatcher, initGame, startNewMatch, getMatchState, currentMatchId, continueOrNewMatch } = useActiveGameStore();

  const toggleExpand = () => setIsExpanded(prev => !prev);

  useEffect(() => {
    if (!dispatcher) {
      return;
    }

    const handleGameEnd = (payload: any) => {
      const winnerName = payload.winner?.name || 'Joueur inconnu';
      setWinner(winnerName);
      setGameEndState(payload);
      setGameEnded(true);
    };

    const unsubscribe = dispatcher.on('GAME_ENDED', handleGameEnd);

    return () => {
      unsubscribe();
    };
  }, [dispatcher]);

  const handleContinue = async () => {
    setGameEnded(false);
    setWinner('');
    setGameEndState(null);
    await continueOrNewMatch();
    await initGame(['AI 1', 'AI 2', 'AI 3', 'AI 4'], [true, true, true, true]);
  };

  const handleLeave = () => {
    // [COMMENTED-v1] console.log(`[MOBILE-GAME-BOARD] Leaving game`);
    setGameEnded(false);
    setWinner('');
    setGameEndState(null);
    resetGame();
    if (onBackToHome) {
      onBackToHome();
    }
  };

  // ✅ SOLUTION: useMemo avec dépendance à gameState
  // Recalculer les joueurs chaque fois que gameState change
  const players = useMemo(() => {
    if (gameState && gameState.players && gameState.players.length > 0) {
      // Utiliser les données réelles de gameState
      return gameState.players;
    }
    // Fallback aux mocks si pas de gameState
    return initialPlayers;
  }, [gameState, gameState?.players, gameState?.currentPlayerIndex]);

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
              players={players}
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
          gameEndState={gameEndState}
          thisPlayerId={thisPlayerId}
          mode="solo"
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
            players={players}
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
        gameEndState={gameEndState}
        thisPlayerId={thisPlayerId}
        mode="solo"
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
