import { create } from 'zustand';
import { SocketIOAdapter } from '../adapters/SocketIOAdapter';

export interface Player {
  id: number;
  name: string;
  isAI: boolean;
}

export interface SocketStoreState {
  // Connection state
  isConnected: boolean;
  socketId: string | undefined;
  serverUrl: string;

  // Room state
  roomId: string | null;
  playerId: number | null;
  playerName: string | null;
  roomPlayers: Player[];

  // Game state
  currentPlayerId: number | null;
  gameStartedPayload: any | null;
  turnState: any | null;
  gameStarted: boolean;
  gameEnded: boolean;
  gameEndedPayload: any | null;

  // End-game view data — mappé depuis GameEndedPayload serveur vers la shape
  // attendue par GameEndModal/SoloTable (p{id}_score / p{id}_sets_won).
  currentGameData: any | null;
  currentSetData: any | null;
  currentMatchData: any | null;
  selectedConfig: any | null;

  // Error handling
  error: string | null;

  // Adapter instance
  adapter: SocketIOAdapter | null;

  // Actions
  setServerUrl: (url: string) => void;
  initAdapter: (serverUrl?: string, namespace?: string) => void;
  setConnected: (connected: boolean) => void;
  setSocketId: (id: string | undefined) => void;
  setRoomId: (roomId: string) => void;
  setPlayerId: (playerId: number) => void;
  setPlayerName: (name: string) => void;
  setRoomPlayers: (players: Player[]) => void;
  setCurrentPlayerId: (id: number) => void;
  setGameStartedPayload: (payload: any) => void;
  setTurnState: (state: any) => void;
  setGameStarted: (started: boolean) => void;
  setGameEnded: (ended: boolean) => void;
  setGameEndedPayload: (payload: any) => void;
  setError: (error: string | null) => void;
  playDomino: (domino: any, side: 'left' | 'right', knocked?: boolean) => void;
  passTurn: () => void;
  // End-game actions (compat IGameStore — en socket, le serveur gère la relance via GAME_READY)
  resetGameEndState: () => void;
  continueOrNewMatch: () => Promise<void>;
  initGame: (names?: string[], ai?: boolean[]) => Promise<void>;
  resetGame: () => void;
  disconnect: () => void;
  reset: () => void;
}

export const useSocketStore = create<SocketStoreState>((set, get) => ({
  // Initial state
  isConnected: false,
  socketId: undefined,
  serverUrl: 'http://192.168.1.151:3001',
  roomId: null,
  playerId: null,
  playerName: null,
  roomPlayers: [],
  currentPlayerId: null,
  gameStartedPayload: null,
  turnState: null,
  gameStarted: false,
  gameEnded: false,
  gameEndedPayload: null,
  currentGameData: null,
  currentSetData: null,
  currentMatchData: null,
  selectedConfig: null,
  error: null,
  adapter: null,

  // Initialize Socket.io adapter
  initAdapter: (serverUrl?: string, namespace: string = '/public') => {
    const url = serverUrl || get().serverUrl;
    console.log(`[SOCKET-STORE] Initializing adapter with URL: ${url}${namespace}`);

    const adapter = new SocketIOAdapter(url, namespace);
    set({ adapter, serverUrl: url });

    // Setup listeners for connection changes
    const unsubscribeConnect = adapter.on('connect' as any, () => {
      set({ isConnected: true, socketId: adapter.getSocketId() });
      console.log('[SOCKET-STORE] Connected');
    });

    const unsubscribeDisconnect = adapter.on('disconnect' as any, () => {
      set({ isConnected: false });
      console.log('[SOCKET-STORE] Disconnected');
    });

    // Setup listeners for room events
    const unsubscribeRoomJoined = adapter.on('ROOM_JOINED' as any, (payload: any) => {
      console.log('[SOCKET-STORE] ROOM_JOINED received:', payload);
      set({
        roomId: payload.roomId,
        playerId: payload.playerId
      });
    });

    // Setup listeners for game events
    const unsubscribeGameStarted = adapter.on('GAME_STARTED' as any, (payload: any) => {
      console.log('[SOCKET-STORE] GAME_STARTED received:', payload);
      // NE PAS écraser turnState: le TURN_STATE peut arriver avant GAME_STARTED
      set({
        gameStarted: true,
        gameStartedPayload: payload,
        currentPlayerId: payload.firstPlayerId
      });
    });

    const unsubscribeGameStarting = adapter.on('GAME_STARTING' as any, (payload: any) => {
      console.log('[SOCKET-STORE] GAME_STARTING received (quick play)');
      set({ gameStarted: true });
    });

    const unsubscribeTurnState = adapter.on('TURN_STATE' as any, (payload: any) => {
      console.log('[SOCKET-STORE] TURN_STATE received:', payload);
      set({
        turnState: payload,
        currentPlayerId: payload.currentPlayerId
      });
    });

    const unsubscribeGameEnded = adapter.on('GAME_ENDED' as any, (payload: any) => {
      console.log('[SOCKET-STORE] GAME_ENDED received');
      // Mapper le payload canonique → shape attendue par GameEndModal/SoloTable (p{id}_*)
      const nameOf = (id: number) => payload.players?.find((pl: any) => pl.id === id)?.name ?? `P${id}`;
      const g = payload.game, s = payload.set, m = payload.match;
      set({
        gameEnded: true,
        gameEndedPayload: payload,
        selectedConfig: { mode: payload.mode, maxPoints: payload.config?.maxPoints, numSets: payload.config?.numSets },
        currentGameData: {
          winner_id: g.winnerId,
          winner_name: g.winnerName,
          winning_type: g.winningType,
          p0_score: g.individualScores.p0, p1_score: g.individualScores.p1, p2_score: g.individualScores.p2, p3_score: g.individualScores.p3,
          p0_name: nameOf(0), p1_name: nameOf(1), p2_name: nameOf(2), p3_name: nameOf(3),
          teamV_score: g.teamScores.V, teamH_score: g.teamScores.H
        },
        currentSetData: {
          p0_score: s.individualTotals.p0, p1_score: s.individualTotals.p1, p2_score: s.individualTotals.p2, p3_score: s.individualTotals.p3,
          teamV_score: s.teamTotals.V, teamH_score: s.teamTotals.H
        },
        currentMatchData: {
          p0_sets_won: m.individualSetsWon.p0, p1_sets_won: m.individualSetsWon.p1, p2_sets_won: m.individualSetsWon.p2, p3_sets_won: m.individualSetsWon.p3,
          teamV_sets_won: m.teamSetsWon.V, teamH_sets_won: m.teamSetsWon.H
        }
      });
    });

    // GAME_READY : le serveur a relancé la partie suivante → fermer le modal de fin
    const unsubscribeGameReady = adapter.on('GAME_READY' as any, () => {
      console.log('[SOCKET-STORE] GAME_READY received - dismissing end-game modal');
      set({ gameEnded: false, currentGameData: null, currentSetData: null, currentMatchData: null });
    });

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeRoomJoined();
      unsubscribeGameStarted();
      unsubscribeGameStarting();
      unsubscribeTurnState();
      unsubscribeGameEnded();
      unsubscribeGameReady();
    };
  },

  setServerUrl: (url: string) => set({ serverUrl: url }),
  setConnected: (connected: boolean) => set({ isConnected: connected }),
  setSocketId: (id: string | undefined) => set({ socketId: id }),
  setRoomId: (roomId: string) => set({ roomId }),
  setPlayerId: (playerId: number) => set({ playerId }),
  setPlayerName: (name: string) => set({ playerName: name }),
  setRoomPlayers: (players: Player[]) => set({ roomPlayers: players }),
  setCurrentPlayerId: (id: number) => set({ currentPlayerId: id }),
  setGameStartedPayload: (payload: any) => set({ gameStartedPayload: payload }),
  setTurnState: (state: any) => set({ turnState: state }),
  setGameStarted: (started: boolean) => set({ gameStarted: started }),
  setGameEnded: (ended: boolean) => set({ gameEnded: ended }),
  setGameEndedPayload: (payload: any) => set({ gameEndedPayload: payload }),
  setError: (error: string | null) => set({ error }),

  // Game actions - send to server
  playDomino: (domino: any, side: 'left' | 'right', knocked: boolean = false) => {
    const { adapter, playerId } = get();
    if (adapter) {
      console.log(`[SOCKET-STORE] Sending TURN_POST: playerId=${playerId}, domino=${JSON.stringify(domino)}, side=${side}`);
      adapter.emit({
        type: 'TURN_POST' as any,
        payload: {
          type: 'played',
          mode: 'socket',
          playerId: playerId ?? 0,
          domino,
          side,
          knocked
        }
      });
    }
  },

  passTurn: () => {
    const { adapter, playerId, playerName } = get();
    if (adapter) {
      console.log(`[SOCKET-STORE] Sending TURN_POST: pass`);
      adapter.emit({
        type: 'TURN_POST' as any,
        payload: {
          type: 'passed',
          mode: 'socket',
          playerId: playerId ?? 0,
          playerName: playerName ?? 'Unknown'
        }
      });
    }
  },

  // End-game actions (compat IGameStore). En mode socket, c'est le SERVEUR qui
  // relance la partie suivante (GAME_READY) → ces actions ne font que gérer l'UI locale.
  resetGameEndState: () => set({
    gameEnded: false, currentGameData: null, currentSetData: null, currentMatchData: null
  }),
  continueOrNewMatch: async () => {
    // No-op : le serveur enchaîne automatiquement (handleAutoRestart → GAME_READY)
  },
  initGame: async () => {
    // No-op : l'init est gérée côté serveur
  },
  resetGame: () => set({
    gameEnded: false, currentGameData: null, currentSetData: null, currentMatchData: null
  }),

  disconnect: () => {
    const { adapter } = get();
    if (adapter) {
      adapter.disconnect();
      set({
        adapter: null,
        isConnected: false,
        roomId: null,
        playerId: null,
        roomPlayers: [],
        currentPlayerId: null,
        gameStartedPayload: null,
        gameStarted: false,
        gameEnded: false,
        turnState: null,
        gameEndedPayload: null,
        currentGameData: null,
        currentSetData: null,
        currentMatchData: null,
        selectedConfig: null
      });
    }
  },

  reset: () => {
    set({
      isConnected: false,
      socketId: undefined,
      roomId: null,
      playerId: null,
      playerName: null,
      roomPlayers: [],
      currentPlayerId: null,
      gameStartedPayload: null,
      turnState: null,
      gameStarted: false,
      gameEnded: false,
      gameEndedPayload: null,
      currentGameData: null,
      currentSetData: null,
      currentMatchData: null,
      selectedConfig: null,
      error: null,
      adapter: null
    });
  }
}));
