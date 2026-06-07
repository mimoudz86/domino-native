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
import type { Domino} from '../shared/Domino';
import type { IGameStore } from './IGameStore';
import { clearSlotPositions } from '../utils/trainPositions';
import { GameEngine } from '../controllers/GameEngine';
import { EventBusAdapter } from '../adapters/EventBusAdapter';
import { AIPlayer } from '../controllers/AI_Strategies/AIPlayer';
import { MatchService } from '../services/MatchService';
import { LocalMatchStorage } from '../services/LocalMatchStorage';
import { globalEventEmitter } from '../core/EventEmitter';
import type { ScoringMode, MatchState, MatchConfig } from '../services/IMatchStorage';
import { DEFAULT_MATCH_CONFIG } from '../services/IMatchStorage';

type DraggableStatus = 'none' | 'left' | 'right' | 'both';

type GameStoreState = IGameStore & {
  currentMatchId: string | null;
  currentSetId: string | null;
  currentGameId: string | null;
  currentSetData: any | null;
  currentMatchData: any | null;
  matchService?: MatchService;
  selectedConfig: MatchConfig;
  _isInitializing: boolean;
  _dbInitialized: boolean;
  gameEnded: boolean;
  lastGameData: any | null;
  _handleGameEnded: ((p: any) => void) | null;
  _handleGameSaved: ((p: any) => void) | null;
};

function generateMatchId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `LOCAL_M_${timestamp}_${random}`;
}

async function sendMatchToServer(matchId: string, config: MatchConfig): Promise<void> {
  try {
    const serverUrl = 'http://192.168.117.186:3000';
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
  currentSetId: null,
  currentGameId: null,
  currentSetData: null,
  currentMatchData: null,
  matchService: undefined,
  selectedConfig: DEFAULT_MATCH_CONFIG,
  _isInitializing: false,
  _dbInitialized: false,
  gameEnded: false,
  lastGameData: null,
  _handleGameEnded: null,
  _handleGameSaved: null,

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
    const prev = get();
    if (prev._handleGameEnded) globalEventEmitter.off('GAME_ENDED', prev._handleGameEnded);
    if (prev._handleGameSaved) globalEventEmitter.off('GAME_SAVED', prev._handleGameSaved);
    if (prev.matchService)     prev.matchService.cleanup();

    // Nettoyer les matchs "in progress" AVANT de créer un nouveau
    const storage = new LocalMatchStorage(config);
    await storage.cleanupIncompleteMatchesBeforeNew();

    // Générer un nouveau matchId
    const matchId = generateMatchId();
    console.log(`[GAME-STORE] 🆕 MATCH_CREATED {"matchId":"${matchId}","mode":"${config.mode}","maxPoints":${config.maxPoints},"numSets":${config.numSets}}`);

    // Créer le match dans la BD
    await storage.createMatch(matchId, config);

    // Vérifier que le set actif existe
    const activeSetId = await storage.getActiveSetId(matchId);
    console.log(`[GAME-STORE] ✅ MATCH_AND_SETS_CREATED {"matchId":"${matchId}","activeSetId":"${activeSetId || 'NULL'}"}`);

    // Envoyer le match au serveur
    await sendMatchToServer(matchId, config);

    // Créer le MatchService avec le matchId
    const matchService = new MatchService(storage, matchId);
    console.log(`LOG  [GAME-STORE] 📋 MATCH_SERVICE_CREATED {"matchId":"${matchId}"}`);

    // Listener pour GAME_ENDED - afficher le modal immédiatement (players encore disponibles)
    const handleGameEnded = (payload: any) => {
      set({ gameEnded: true });
    };

    globalEventEmitter.on('GAME_ENDED', handleGameEnded);

    // Listener pour GAME_SAVED - récupérer les données du game, du set, et du match pour afficher dans le modal
    const handleGameSaved = (payload: any) => {
      set({
        lastGameData: payload.gameData,
        currentGameId: payload.gameId,
        currentSetId: payload.setData?.set_id,
        currentSetData: payload.setData,
        currentMatchData: payload.matchData
      });
    };

    globalEventEmitter.on('GAME_SAVED', handleGameSaved);

    // Mettre à jour l'état du store
    set({
      currentMatchId: matchId,
      matchService,
      _handleGameEnded: handleGameEnded,
      _handleGameSaved: handleGameSaved,
    });
  },

  continueOrNewMatch: async () => {
    const currentMatchId = get().currentMatchId;
    const selectedConfig = get().selectedConfig;

    if (!currentMatchId) {
      console.error('[GAME-STORE] ❌ No currentMatchId found, creating new match instead');
      get().resetGame();
      await get().startNewMatch(selectedConfig);
      return;
    }

    const storage = new LocalMatchStorage(selectedConfig);
    const match = await storage.getActiveMatch(currentMatchId);

    if (!match) {
      console.log(`[GAME-STORE] 🔄 MATCH_${currentMatchId} not found, creating NEW match`);
      get().resetGame();
      await get().startNewMatch(selectedConfig);
      return;
    }

    // Vérifier si le match est fini
    const isFinished = await storage.isMatchFinished(currentMatchId);
    if (isFinished) {
      console.log(`[GAME-STORE] ✅ MATCH_${currentMatchId} is finished, creating NEW match`);
      get().resetGame();
      await get().startNewMatch(selectedConfig);
      return;
    }

    console.log(`[GAME-STORE] ➡️  CONTINUING match ${currentMatchId}`);
    const existingMatchService = get().matchService;

    if (existingMatchService) {
      const lastGameIndex = await storage.getLastGameIndex(currentMatchId);
      existingMatchService.resetGameIndex(lastGameIndex);
      console.log(`[GAME-STORE] ♻️  REUSING_MATCHSERVICE {"matchId":"${currentMatchId}","gameIndex":${lastGameIndex}}`);
    } else {
      console.log(`[GAME-STORE] ⚠️  EXISTING_MATCHSERVICE_NOT_FOUND, creating new one`);
      const lastGameIndex = await storage.getLastGameIndex(currentMatchId);
      const matchService = new MatchService(storage, currentMatchId, lastGameIndex);
      set({ matchService });
    }

    get().resetGame();
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
      console.log(`LOG  [GAME-STORE] 🚀 LISTENER_GAME_STARTED {"players":${payload.players?.length},"startingPlayer":"${payload.players?.[payload.currentPlayerId]?.name}"}`);
      set({ turnState: payload });
    });

    adapter.on('PLAY_TURN', (payload: any) => {
      console.log(`LOG  [GAME-STORE] ⏸️  LISTENER_PLAY_TURN {"player":"${payload.yourName}","hand":${payload.yourDominos?.length},"playable":${payload.playables?.length}}`);
      set({ turnState: payload });
    });

    adapter.on('TURN_UPDATED', (payload: any) => {
      const playerStats = payload.players?.map((p: any) => `${p.name}:${p.dominoCount}${p.hasPassed ? '🚫' : ''}`).join(' | ');
      console.log(`LOG  [GAME-STORE] 📊 LISTENER_TURN_UPDATED {"nextPlayer":"${payload.players?.[payload.nextPlayerId]?.name}","players":"${playerStats}"}`);
      set({ turnState: payload });
    });

    adapter.on('GAME_ENDED', (payload: any) => {
      // Ne pas remplacer turnState - on garde les joueurs intacts
      // set({ turnState: payload });
    });

    // 6. Initialiser le jeu
    await engine.initGame();

    // 7. Initialiser l'état du store
    set({
      dispatcher: adapter,
      matchService,
      turnState: engine.stateBuilder.buildCurrentState(),
      isInitialized: true,
      _isInitializing: false,
    });

    // 8. Émettre GAME_STARTED
    adapter.emit({
      type: 'GAME_STARTED',
      payload: engine.stateBuilder.buildStartGame()
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
        type: 'played',
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
    // NE PAS nettoyer le MatchService listener ici - il doit rester pour les prochains games
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

  setSelectedConfig: (config: MatchConfig) => {
    console.log(`[GAME-STORE] 📋 CONFIG_SELECTED {"mode":"${config.mode}","maxPoints":${config.maxPoints},"numSets":${config.numSets}}`);
    set({ selectedConfig: config });
  },

  getMatchState: async (): Promise<MatchState | null> => {
    return get().matchService?.getMatchState() ?? null;
  },

  // Debug methods

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

  debugShowAllData: async () => {
    const matchService = get().matchService;
    if (matchService) {
      const json = await matchService.exportDatabase();
      console.log('[GAME-STORE] All match data:', JSON.parse(json));
    } else {
      console.log('[GAME-STORE] No MatchService initialized');
    }
  },

  // Stats methods
  getStatsData: async (): Promise<string> => {
    try {
      const storage = new LocalMatchStorage();
      const matches = await storage.getAllMatchesStats();
      const totalGames = matches.reduce((sum, m) => sum + m.games_count, 0);

      const data = {
        timestamp: new Date().toISOString(),
        summary: {
          total_matches: matches.length,
          total_games: totalGames,
          finished_matches: matches.filter(m => m.match_finished === 'Finished').length,
          in_progress_matches: matches.filter(m => m.match_finished === 'In Progress').length,
        },
        matches: matches.map(m => ({
          '#': m.index,
          'Games': m.games_count,
          'Sets': m.num_sets,
          'Winner': m.winner,
          'Status': m.match_finished,
          'Mode': m.mode,
          'Created': m.created_at.substring(0, 10),
          'setPoints': m.setPoints,
        })),
      };

      console.log('[GAME-STORE] Stats data retrieved successfully');
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('[GAME-STORE] Error getting stats:', error);
      return JSON.stringify({ error: `Failed to get stats: ${error}` }, null, 2);
    }
  },

  removeAllData: async (): Promise<void> => {
    try {
      const storage = new LocalMatchStorage();
      await storage.cleanupDatabase();
      console.log('[GAME-STORE] 🧹 Database cleaned up - all data removed');
    } catch (error) {
      console.error('[GAME-STORE] Error cleaning up database:', error);
      throw error;
    }
  },

  resetGameEndState: () => {
    set({
      gameEnded: false,
      lastGameData: null,
      currentGameId: null,
      currentSetData: null,
      currentMatchData: null,
    });
  },
}));
