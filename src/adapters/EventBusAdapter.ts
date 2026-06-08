/**
 * EventBusAdapter - Coordinateur d'événements pour le jeu local
 *
 * Architecture séquentielle:
 * 1. EventBusAdapter émet PLAY_TURN au joueur courant
 * 2. Joueur/IA répond avec PLAY_RESPONSE
 * 3. EventBusAdapter valide et émet TURN_UPDATED (broadcast)
 * 4. Quand partie terminée → GAME_ENDED
 *
 * GameEngine est un pur state-manager (pas de dépendance au bus)
 */

import type { ILocalEventDispatcher } from '../core/ILocalEventDispatcher';
import type { LocalGameEvent} from '../shared/localGameEvents';
import { GameEngine } from '../controllers/GameEngine';

export class EventBusAdapter implements ILocalEventDispatcher {
  private listeners: Map<LocalGameEvent['type'], Set<Function>> = new Map();
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on('PLAY_RESPONSE', (payload: any) => {
      // console.log(`[ADAPTER] Received PLAY_RESPONSE:`, payload);
      const success = this.engine.handlePlayResponse(payload, this);
      // console.log(`[ADAPTER] handlePlayResponse returned:`, success);
      if (success) {
        this.engine.resolvePlayResponse(payload);
      } else {
        // console.log(`[ADAPTER] ❌ Play response validation FAILED`);
      }
    });

    this.on('PASS_HIDDEN', (payload: any) => {
      // [COMMENTED-v1] console.log(`[ADAPTER] 📡 PASS_HIDDEN received from UI`);
      this.engine.onPassHidden();
    });
  }

  /**
   * Émettre un événement à tous les listeners
   */
  emit<E extends LocalGameEvent>(event: E): void {
    const eventType = event.type as LocalGameEvent['type'];
    const listeners = this.listeners.get(eventType);

    if (eventType === 'PLAY_TURN') {
      // console.log(`[ADAPTER-EMIT] PLAY_TURN emitted to ${listeners?.size || 0} listeners`);
    }

    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event.payload);
        } catch (error) {
          console.error(`Error in listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Enregistrer un listener pour un type d'événement
   */
  on<T extends LocalGameEvent['type']>(
    eventType: T,
    listener: (payload: any) => void
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const listeners = this.listeners.get(eventType)!;
    listeners.add(listener);

    // Retourner la fonction de désabonnement
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  /**
   * Arrêter d'écouter un type d'événement
   */
  off(eventType?: LocalGameEvent['type']): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Accédez au GameEngine (pour debug ou accès direct si nécessaire)
   */
  getGameEngine(): GameEngine {
    return this.engine;
  }
}
