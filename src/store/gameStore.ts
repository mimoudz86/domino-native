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
import { GameEngine } from '../controllers/GameEngine';
import { EventBusAdapter } from '../adapters/EventBusAdapter';
import { AIPlayer } from '../controllers/AI_Strategies/AIPlayer';
import { MatchService } from '../services/MatchService';
import { LocalMatchStorage } from '../services/LocalMatchStorage';
import { globalEventEmitter } from '../core/EventEmitter';
import type { ScoringMode, MatchState } from '../controllers/MatchManager';
import type { MatchConfig } from '../types/MatchConfig';
import { DEFAULT_MATCH_CONFIG } from '../types/MatchConfig';

type DraggableStatus = 'none' | 'left' | 'right' | 'both';

type GameStoreState = IGameStore & {
  currentMatchId: string | null;
  matchService?: MatchService;
  _isInitializing: boolean;
  _dbInitialized: boolean;
};

function generateMatchId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `LOCAL_M_${timestamp}_${random}`;
}

async function sendMatchToServer(matchId: string, config: MatchConfig): Promise<void> {
  try {
    const serverUrl = 'http://192.168.1.151:3000';
    const payload = {
      match_id: matchId,
      mode: config.mode,
      max_points: config.maxPoints,
      num_sets: config.numSets,
      current_set: 1,
      games_count: 0,
      match_finished: 0,
      scores: {},
      created_at: new Date().toISOString()
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${serverUrl}/api/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[GAME-STORE] Match creation failed on server: ${response.status}`);
      return;
    }

    console.log(`LOG  [GAME-STORE] 📤 MATCH_SENT_TO_SERVER {"matchId":"${matchId}"}`);
  } catch (error) {
    console.warn('[GAME-STORE] Could not reach server for match creation:', error);
  }
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  // Initial state
  turnState: null,
  dispatcher: null,
  isInitialized: false,
  dragState: null,
  currentMatchId: null,
  matchService: undefined,
  _isInitializing: false,
  _dbInitialized: false,

  // ═══════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════

  startNewMatch: async (config: MatchConfig = DEFAULT_MATCH_CONFIG) => {
    // Initialiser la BD une seule fois
    if (!get()._dbInitialized) {
      console.log(`[GAME-STORE] 🗄️  Initializing database...`);
      await LocalMatchStorage.initializeDatabase();
      set({ _dbInitialized: true });
    }

    // Nettoyer les anciens listeners AVANT de créer une nouvelle MatchService
    globalEventEmitter.removeAllListeners('GAME_ENDED');

    // Générer un nouveau matchId
    const matchId = generateMatchId();
    console.log(`[GAME-STORE] 🆕 MATCH_CREATED {"matchId":"${matchId}","mode":"${config.mode}","maxPoints":${config.maxPoints}}`);

    // Créer le match dans la BD
    const storage = new LocalMatchStorage(config);
    await storage.createMatch(matchId, config);

    // Envoyer le match au serveur
    await sendMatchToServer(matchId, config);

    // Créer le MatchService avec le matchId (enregistre le listener GAME_ENDED)
    const matchService = new MatchService(storage, matchId);

    // Mettre à jour l'état du store
    set({ currentMatchId: matchId, matchService });
  },

  continueOrNewMatch: async (config: MatchConfig = DEFAULT_MATCH_CONFIG) => {
    const currentMatchId = get().currentMatchId;

    if (!currentMatchId) {
      console.error('[GAME-STORE] ❌ No currentMatchId found, creating new match instead');
      get().resetGame();
      await get().startNewMatch(config);
      return;
    }

    // Récupérer l'état du match SPÉCIFIQUE par son ID (pas le dernier actif)
    const storage = new LocalMatchStorage(config);
    const matchState = await storage.getMatchStateById(currentMatchId);

    if (matchState?.matchFinished) {
      // Match terminé → créer un nouveau match
      console.log(`[GAME-STORE] 🔄 MATCH_FINISHED detected, creating NEW match`);
      get().resetGame();
      await get().startNewMatch(config);
    } else {
      // Match continue → recréer MatchService avec le même matchId
      console.log(`[GAME-STORE] ➡️  CONTINUING match ${currentMatchId}`);
      get().resetGame();

      // Recréer MatchService pour le même match
      globalEventEmitter.removeAllListeners('GAME_ENDED');

      // Récupérer le dernier gameIndex du match pour ne pas créer de doublon
      const lastGameIndex = await storage.getLastGameIndex(currentMatchId);
      console.log(`[GAME-STORE] 🔢 LAST_GAME_INDEX=${lastGameIndex}`);

      const matchService = new MatchService(storage, currentMatchId, lastGameIndex);
      set({ matchService });
    }
  },

  initGame: async (
    playerNames = ['You', 'Bot 1', 'Bot 2', 'Bot 3'],
    aiPlayers = [false, true, true, true],
    config: MatchConfig = DEFAULT_MATCH_CONFIG
  ) => {
    // Guard: si déjà en train d'initialiser, retourner
    if (get()._isInitializing) {
      return;
    }

    set({ _isInitializing: true });

    // Vérifier que startNewMatch() a été appelé
    const matchService = get().matchService;
    if (!matchService) {
      console.error('[GAME-STORE] ❌ startNewMatch() must be called before initGame()');
      set({ _isInitializing: false });
      return;
    }

    // Créer GameEngine
    const engine = new GameEngine({
      playerNames,
      aiPlayers
    });

    // 3. Créer EventBusAdapter (le pont)
    const adapter = new EventBusAdapter(engine);

    // 4. Créer les AIPlayers (pour tous les joueurs IA)
    const aiPlayerInstances = playerNames.map((name, idx) => {
      if (aiPlayers[idx]) {
        return new AIPlayer(idx, 'random', adapter); // Stratégie par défaut: random
      }
      return null;
    }).filter(Boolean);

    // 5. Écouter les mises à jour
    adapter.on('GAME_STARTED', (payload: any) => {
      console.log(`LOG  [GAME-STORE] 🚀 LISTENER_GAME_STARTED {"players":${payload.players?.length},"startingPlayer":"${payload.players?.[payload.currentPlayerIndex]?.name}"}`);
      set({ turnState: payload });
    });

    adapter.on('PLAY_TURN', (payload: any) => {
      console.log(`LOG  [GAME-STORE] ⏸️  LISTENER_PLAY_TURN {"player":"${payload.yourName}","hand":${payload.yourDominos?.length},"playable":${payload.playables?.length}}`);
      set({ turnState: payload });
    });

    adapter.on('TURN_UPDATED', (payload: any) => {
      const playerStats = payload.players?.map((p: any) => `${p.name}:${p.dominoCount}${p.hasPassed ? '🚫' : ''}`).join(' | ');
      console.log(`LOG  [GAME-STORE] 📊 LISTENER_TURN_UPDATED {"nextPlayer":"${payload.players?.[payload.nextPlayerIndex]?.name}","players":"${playerStats}"}`);
      set({ turnState: payload });
    });

    adapter.on('GAME_ENDED', (payload: any) => {
      const scores = payload.scores?.map((s: any) => `${s.playerName}:${s.score}`).join(' | ');
      console.log(`LOG  [GAME-STORE] 🏆 LISTENER_GAME_ENDED {"winner":"${payload.winner?.name}","scores":"${scores}"}`);
      set({ turnState: payload });
    });

    // 6. Initialiser le jeu
    await engine.initGame();

    // 7. Initialiser l'état du store
    set({
      dispatcher: adapter,
      matchService,
      turnState: engine.getCurrentState(),
      isInitialized: true,
      _isInitializing: false,
    });

    // 8. Émettre GAME_STARTED
    adapter.emit({
      type: 'GAME_STARTED',
      payload: engine.getGameStartedState()
    });

    // 9. Démarrer la boucle de jeu (en background - pas await)
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
      // Garder matchService et currentMatchId pour continuer le match
      // Ils ne seront réinitialisés que via startNewMatch() ou continueOrNewMatch()
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

  getMatchState: async (): Promise<MatchState | null> => {
    return get().matchService?.getMatchState() ?? null;
  },

  // Debug methods
  debugShowAllData: async () => {
    const matchService = get().matchService;
    if (matchService) {
      await matchService.debugLogAllData();
    } else {
      console.log('[GAME-STORE] No MatchService initialized');
    }
  },

  debugExportDatabase: async () => {
    const matchService = get().matchService;
    if (matchService) {
      const json = await matchService.exportDatabase();
      console.log('[GAME-STORE] Database exported. Copy from debugger console.');
      return json;
    } else {
      console.log('[GAME-STORE] No MatchService initialized');
      return '{}';
    }
  },
}));
