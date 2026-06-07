import { create } from 'zustand';
import { SocketIOAdapter } from '../adapters/SocketIOAdapter';

export interface SocketStoreState {
  // Connection state
  isConnected: boolean;
  socketId: string | undefined;
  serverUrl: string;

  // Room state
  roomId: string | null;
  playerId: number | null;
  playerName: string | null;

  // Game state
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
  initAdapter: (serverUrl?: string) => void;
  setConnected: (connected: boolean) => void;
  setSocketId: (id: string | undefined) => void;
  setRoomId: (roomId: string) => void;
  setPlayerId: (playerId: number) => void;
  setPlayerName: (name: string) => void;
  setTurnState: (state: any) => void;
  setGameStarted: (started: boolean) => void;
  setGameEnded: (ended: boolean) => void;
  setGameEndedPayload: (payload: any) => void;
  setError: (error: string | null) => void;
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
  turnState: null,
  gameStarted: false,
  gameEnded: false,
  gameEndedPayload: null,
  error: null,
  adapter: null,

  // Initialize Socket.io adapter
  initAdapter: (serverUrl?: string) => {
    const url = serverUrl || get().serverUrl;
    console.log(`[SOCKET-STORE] Initializing adapter with URL: ${url}`);

    const adapter = new SocketIOAdapter(url);
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

    // Setup listeners for game events
    const unsubscribeGameStarted = adapter.on('GAME_STARTED' as any, (payload: any) => {
      console.log('[SOCKET-STORE] GAME_STARTED received');
      set({ gameStarted: true, turnState: null });
    });

    const unsubscribeTurnState = adapter.on('TURN_STATE' as any, (payload: any) => {
      console.log('[SOCKET-STORE] TURN_STATE received');
      set({ turnState: payload });
    });

    const unsubscribeGameEnded = adapter.on('GAME_ENDED' as any, (payload: any) => {
      console.log('[SOCKET-STORE] GAME_ENDED received');
      set({ gameEnded: true, gameEndedPayload: payload });
    });

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeGameStarted();
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
  setTurnState: (state: any) => set({ turnState: state }),
  setGameStarted: (started: boolean) => set({ gameStarted: started }),
  setGameEnded: (ended: boolean) => set({ gameEnded: ended }),
  setGameEndedPayload: (payload: any) => set({ gameEndedPayload: payload }),
  setError: (error: string | null) => set({ error }),

  disconnect: () => {
    const { adapter } = get();
    if (adapter) {
      adapter.disconnect();
      set({
        adapter: null,
        isConnected: false,
        roomId: null,
        playerId: null,
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
      turnState: null,
      gameStarted: false,
      gameEnded: false,
      gameEndedPayload: null,
      error: null,
      adapter: null
    });
  }
}));
