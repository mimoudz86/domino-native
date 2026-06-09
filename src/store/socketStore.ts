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
      set({ gameEnded: true, gameEndedPayload: payload });
    });

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeRoomJoined();
      unsubscribeGameStarted();
      unsubscribeGameStarting();
      unsubscribeTurnState();
      unsubscribeGameEnded();
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
        gameEndedPayload: null
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
      error: null,
      adapter: null
    });
  }
}));
