/**
 * LocalGameStore - Store Zustand pour jeu LOCAL (GameEngine + Bots)
 *
 * Implémente IGameStore pour être interchangeable avec ServerGameStore.
 * Gère: GameEngine, EventBusAdapter, AIPlayers.
 *
 * Les composants utilisent UNIQUEMENT via l'interface IGameStore.
 */

import { create } from 'zustand';
import type { ILocalEventDispatcher } from '../core/ILocalEventDispatcher';
import type { LocalGameEvent } from '../controllers/LocalGameEvent';
import type { Domino, TurnState } from '../shared/models/GameTurnState';
import type { IGameStore } from './IGameStore';
import { clearSlotPositions } from '../utils/trainPositions';

type DraggableStatus = 'none' | 'left' | 'right' | 'both';
import { GameEngine } from '../controllers/GameEngine';
import { EventBusAdapter } from '../adapters/EventBusAdapter';
import { AIPlayer } from '../controllers/AI_Strategies/AIPlayer';

type GameStoreState = IGameStore;

export const useGameStore = create<GameStoreState>((set, get) => ({
  // Initial state
  turnState: null,
  dispatcher: null,
  isInitialized: false,
  dragState: null,
  _isInitializing: false,

  // ═══════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════

  initGame: async (playerNames = ['You', 'Bot 1', 'Bot 2', 'Bot 3'], aiPlayers = [false, true, true, true]) => {
    // Guard: si déjà en train d'initialiser, retourner
    if (get()._isInitializing) {
      // console.log(`[GAME-STORE] initGame already in progress, skipping`);
      return;
    }

    // console.log(`[GAME-STORE] initGame called`);
    set({ _isInitializing: true });

    // 1. Créer GameEngine
    const engine = new GameEngine({
      playerNames,
      aiPlayers
    });

    // 2. Créer EventBusAdapter (le pont)
    const adapter = new EventBusAdapter(engine);

    // 3. Créer les AIPlayers (pour tous les joueurs IA)
    const aiPlayerInstances = playerNames.map((name, idx) => {
      if (aiPlayers[idx]) {
        return new AIPlayer(idx, 'random', adapter); // Stratégie par défaut: random
      }
      return null;
    }).filter(Boolean);

    // 4. Écouter les mises à jour
    adapter.on('GAME_STARTED', (payload: any) => {
      console.log(`[GAME-STORE] 🚀 LISTENER_GAME_STARTED`, {
        boardSize: payload.board?.trainOnBoard?.length || 0,
        playerCount: payload.players?.length || 0,
        currentPlayer: payload.players?.[payload.currentPlayerIndex]?.name
      });
      set({ turnState: payload });
    });

    adapter.on('PLAY_TURN', (payload: any) => {
      console.log(`[GAME-STORE] ⏸️  LISTENER_PLAY_TURN`, {
        turnNumber: payload.turnNumber,
        yourName: payload.yourName,
        dominoInHand: payload.yourDominos?.length || 0,
        playableCount: payload.playables?.length || 0,
        canPlay: payload.canPlay,
        boardSize: payload.board?.trainOnBoard?.length || 0
      });
      set({ turnState: payload });
    });

    adapter.on('TURN_UPDATED', (payload: any) => {
      const playerStats = payload.players?.map((p: any) => `${p.name}:${p.dominoCount}${p.hasPassed ? '🚫' : ''}`).join(' | ');
      console.log(`[GAME-STORE] 📊 LISTENER_TURN_UPDATED`, {
        turnNumber: payload.turnNumber,
        nextPlayerName: payload.players?.[payload.nextPlayerIndex]?.name,
        boardSize: payload.board?.trainOnBoard?.length || 0,
        playerStats: playerStats
      });
      set({ turnState: payload });
    });

    adapter.on('GAME_ENDED', (payload: any) => {
      console.log(`[GAME-STORE] 🏆 LISTENER_GAME_ENDED`, {
        winner: payload.winner?.name,
        winnerId: payload.winner?.id,
        finalScores: payload.scores?.map((s: any) => ({ name: s.playerName, score: s.score }))
      });
      set({ turnState: payload });
    });

    // 5. Initialiser le jeu
    await engine.initGame();

    // 6. Initialiser l'état du store
    set({
      dispatcher: adapter,
      turnState: engine.getCurrentState(),
      isInitialized: true,
    });

    // 7. Émettre GAME_STARTED
    adapter.emit({
      type: 'GAME_STARTED',
      payload: engine.getGameStartedState()
    });

    // 8. Démarrer la boucle de jeu (en background - pas await)
    engine.startGameLoop(adapter);
  },

  playDomino: (domino: Domino, side: 'left' | 'right', knocked: boolean = false) => {
    const dispatcher = get().dispatcher;

    if (!dispatcher) {
      console.warn('Dispatcher not initialized');
      return;
    }

    // console.log(`[HUMAN PLAYER] 🎮 Played ${domino.left}|${domino.right} on ${side}`);

    // Émettre PLAY_RESPONSE → EventBusAdapter → GameEngine
    dispatcher.emit({
      type: 'PLAY_RESPONSE',
      payload: {
        playerId: 0, // Toujours le joueur 0 (You)
        domino,
        side,
        knocked,
      },
    });
  },

  pass: () => {
    const dispatcher = get().dispatcher;

    if (!dispatcher) {
      console.warn('Dispatcher not initialized');
      return;
    }

    // console.log(`[HUMAN PLAYER] 🚫 Passed`);

    // Émettre PLAY_PASSED → EventBusAdapter → GameEngine
    dispatcher.emit({
      type: 'PLAY_PASSED',
      payload: {
        playerId: 0, // Toujours le joueur 0 (You)
      },
    });
  },

  resetGame: () => {
    clearSlotPositions();
    set({
      turnState: null,
      dispatcher: null,
      isInitialized: false,
      dragState: null,
      _isInitializing: false,
    });
  },

  setDispatcher: (dispatcher: ILocalEventDispatcher) => {
    set({ dispatcher });
  },

  getDispatcher: () => get().dispatcher,

  startDrag: (domino: Domino, draggableStatus: DraggableStatus) => {
    set({
      dragState: {
        isDragging: true,
        domino,
        draggableStatus,
      }
    });
  },

  endDrag: () => {
    set({ dragState: null });
  },
}));
