import type { LocalGameEvent, LocalEventListener } from '../controllers/localGameEvents';

/**
 * ═══════════════════════════════════════════════════════════════
 * INTERFACE: IEventDispatcher
 * ═══════════════════════════════════════════════════════════════
 *
 * Abstraction pour tout système d'événements
 * Permet de swapper entre:
 * - EventBusAdapter (local events)
 * - SocketIOAdapter (server events via Socket.io)
 *
 * GameManager et screenStore utilisent cette interface,
 * pas l'implémentation concrète
 */
export interface IEventDispatcher {
    /**
     * Émettre un événement
     *
     * @param event - L'événement à émettre
     *
     * Exemple:
     * ```typescript
     * dispatcher.emit({
     *   type: 'TURN_POST',
     *   payload: { type: 'played', playerId: 0, domino, side: 'right' }
     * });
     * ```
     */
    emit<E extends LocalGameEvent>(event: E): void;

    /**
     * Écouter un type d'événement spécifique
     *
     * @param eventType - Type d'événement à écouter
     * @param listener - Fonction appelée quand l'événement est émis
     * @returns Function pour unsubscribe
     *
     * Exemple:
     * ```typescript
     * const unsubscribe = dispatcher.on('TURN_STATE_GET', (turnState) => {
     *   ('Nouveau tour:', turnState.turn);
     * });
     *
     * // Plus tard, se désabonner:
     * unsubscribe();
     * ```
     */
    on<T extends LocalGameEvent['type']>(
        eventType: T,
        listener: LocalEventListener<Extract<LocalGameEvent, { type: T }>>
    ): () => void;

    /**
     * Arrêter d'écouter un type d'événement
     *
     * @param eventType - Type d'événement (optionnel)
     *
     * Si eventType est fourni: arrête tous les listeners pour ce type
     * Si eventType n'est pas fourni: arrête tous les listeners
     */
    off(eventType?: LocalGameEvent['type']): void;
}
