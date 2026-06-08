import type { LocalGameEvent, LocalEventListener } from '../controllers/localGameEvents';

/**
 * ═══════════════════════════════════════════════════════════════
 * INTERFACE: ILocalEventDispatcher
 * ═══════════════════════════════════════════════════════════════
 *
 * Abstraction pour événements locaux (GameEngine simple)
 * Utilisé par EventBusAdapter pour jeu local
 *
 * Note: Différent de IEventDispatcher (qui utilise GameEvent riche)
 * car ici on utilise LocalGameEvent (simple TurnState)
 */
export interface ILocalEventDispatcher {
    /**
     * Émettre un événement local
     */
    emit<E extends LocalGameEvent>(event: E): void;

    /**
     * Écouter un type d'événement spécifique
     * @returns Function pour unsubscribe
     */
    on<T extends LocalGameEvent['type']>(
        eventType: T,
        listener: (payload: any) => void
    ): () => void;

    /**
     * Arrêter d'écouter un type d'événement
     */
    off(eventType?: LocalGameEvent['type']): void;
}
