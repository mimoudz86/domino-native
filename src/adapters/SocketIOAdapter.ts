import { io, Socket } from 'socket.io-client';
import type { GameEvent, EventListener } from '../shared/socketGameEvents';

/**
 * Socket.io Adapter for React Native
 * Bridge between React Native app and backend via Socket.io
 */
export class SocketIOAdapter {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventListener<any>>> = new Map();
  private serverUrl: string;
  private namespace: string;

  constructor(serverUrl?: string, namespace: string = '/public') {
    this.serverUrl = serverUrl || 'http://192.168.1.151:3001'; // Default to dev server
    this.namespace = namespace; // '/public' (Quick Play) ou '/private' (rooms entre amis)
    this.initSocket();
  }

  /**
   * Initialize Socket.io connection
   */
  private initSocket(): void {
    this.socket = io(this.serverUrl + this.namespace, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    if (!this.socket) {
      console.error('[SOCKET-ADAPTER] Failed to create socket');
      return;
    }

    this.socket.on('connect', () => {
      console.log('[SOCKET-ADAPTER] Connected to server:', this.socket?.id);
      this.triggerListeners('connect' as any, { type: 'connect', payload: { socketId: this.socket?.id } } as any);
    });

    this.socket.on('disconnect', () => {
      console.log('[SOCKET-ADAPTER] Disconnected from server');
      this.triggerListeners('disconnect' as any, { type: 'disconnect', payload: {} } as any);
    });

    this.socket.on('error', (error: any) => {
      console.error('[SOCKET-ADAPTER] Socket error:', error);
    });

    this.setupGameEventListeners();
  }

  /**
   * Setup Socket.io listeners for game events
   */
  private setupGameEventListeners(): void {
    if (!this.socket) return;

    // GAME_STARTED: Initialisation complète du jeu
    this.socket.on('GAME_STARTED', (payload: any) => {
      console.log('[SOCKET-ADAPTER] Received GAME_STARTED');
      this.triggerListeners('GAME_STARTED', { type: 'GAME_STARTED', payload } as any);
    });

    // TURN_STATE: État du tour (remplace PLAY_TURN local)
    this.socket.on('TURN_STATE', (payload: any) => {
      console.log('[SOCKET-ADAPTER] Received TURN_STATE');
      this.triggerListeners('TURN_STATE', { type: 'TURN_STATE', payload } as any);
    });

    // GAME_ENDED: Fin du jeu
    this.socket.on('GAME_ENDED', (payload: any) => {
      console.log('[SOCKET-ADAPTER] Received GAME_ENDED');
      this.triggerListeners('GAME_ENDED', { type: 'GAME_ENDED', payload } as any);
    });

    // ROOM_CREATED
    this.socket.on('ROOM_CREATED', (payload: any) => {
      console.log('[SOCKET-ADAPTER] Received ROOM_CREATED');
      this.triggerListeners('ROOM_CREATED', { type: 'ROOM_CREATED', payload } as any);
    });

    // ROOM_JOINED
    this.socket.on('ROOM_JOINED', (payload: any) => {
      console.log('[SOCKET-ADAPTER] Received ROOM_JOINED');
      this.triggerListeners('ROOM_JOINED', { type: 'ROOM_JOINED', payload } as any);
    });

    // PLAYER_JOINED
    this.socket.on('PLAYER_JOINED', (payload: any) => {
      console.log('[SOCKET-ADAPTER] Received PLAYER_JOINED');
      this.triggerListeners('PLAYER_JOINED', { type: 'PLAYER_JOINED', payload } as any);
    });

    // GAME_STARTING: Game is about to start (quick play)
    this.socket.on('GAME_STARTING', (payload: any) => {
      console.log('[SOCKET-ADAPTER] Received GAME_STARTING');
      this.triggerListeners('GAME_STARTING', { type: 'GAME_STARTING', payload } as any);
    });

    // SET_ENDED
    this.socket.on('SET_ENDED', (payload: any) => {
      console.log('[SOCKET-ADAPTER] Received SET_ENDED');
      this.triggerListeners('SET_ENDED', { type: 'SET_ENDED', payload } as any);
    });

    // ERROR
    this.socket.on('ERROR', (payload: any) => {
      console.error('[SOCKET-ADAPTER] Received ERROR:', payload);
    });
  }

  /**
   * Emit an event to the server
   */
  emit<E extends GameEvent>(event: E): void {
    if (!this.socket) {
      console.error('[SOCKET-ADAPTER] Socket not connected, cannot emit', event.type);
      return;
    }

    console.log(`[SOCKET-ADAPTER] Emitting: ${event.type}`);
    this.socket.emit(event.type, event.payload);
  }

  /**
   * Register a listener for a specific event type
   */
  on<T extends GameEvent['type']>(
    eventType: T,
    listener: EventListener<any>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const typeListeners = this.listeners.get(eventType)!;
    typeListeners.add(listener);

    return () => {
      typeListeners.delete(listener);
    };
  }

  /**
   * Remove all listeners
   */
  off(eventType?: GameEvent['type']): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Trigger all listeners for an event
   */
  private triggerListeners(eventType: string, event: GameEvent): void {
    const typeListeners = this.listeners.get(eventType);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          // Les listeners attendent le PAYLOAD déballé (cf. type EventListener = (payload) => void)
          listener((event as any).payload as any);
        } catch (error) {
          console.error(`[SOCKET-ADAPTER] Error in listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Create a room
   */
  async createRoom(playerName: string, aiPlayersCount: number): Promise<{ roomId: string; playerId: number }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      let settled = false;
      let timeoutId: NodeJS.Timeout;

      const unsubscribe = this.on('ROOM_CREATED' as any, (event: any) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        unsubscribe();
        resolve({ roomId: event.payload.roomId, playerId: event.payload.playerId });
      });

      this.socket.emit('CREATE_ROOM', { playerName, aiPlayersCount });

      timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        unsubscribe();
        reject(new Error('CREATE_ROOM timeout'));
      }, 10000);
    });
  }

  /**
   * Join a room
   */
  async joinRoom(roomId: string, playerName: string): Promise<{ playerId: number }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      let settled = false;
      let timeoutId: NodeJS.Timeout;

      const unsubscribe = this.on('ROOM_JOINED' as any, (event: any) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        unsubscribe();
        resolve({ playerId: event.payload.playerId });
      });

      this.socket.emit('JOIN_ROOM', { roomId, playerName });

      timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        unsubscribe();
        reject(new Error('JOIN_ROOM timeout'));
      }, 10000);
    });
  }

  /**
   * Quick play - join available room or create new one
   */
  quickPlay(playerName: string): void {
    if (!this.socket) {
      console.error('[SOCKET-ADAPTER] Socket not connected');
      return;
    }

    console.log(`[SOCKET-ADAPTER] Emitting QUICK_PLAY with playerName: ${playerName}`);
    this.socket.emit('QUICK_PLAY', { playerName });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      console.log('[SOCKET-ADAPTER] Disconnected');
    }
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}
