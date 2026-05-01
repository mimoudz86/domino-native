/**
 * IGameStore - Interface commune pour tous les stores (Local et Server)
 *
 * Les composants utilisent cette interface.
 * LocalGameStore et ServerGameStore l'implémentent.
 * Zéro dépendance de QUEL store est utilisé.
 */

import type { Domino, TurnState } from '../shared/models/GameTurnState';
import type { ILocalEventDispatcher } from '../core/ILocalEventDispatcher';
import type { MatchConfig } from '../types/MatchConfig';
import type { MatchState } from '../controllers/MatchManager';

type DraggableStatus = 'none' | 'left' | 'right' | 'both';

export interface IGameStore {
  // ═══════════════════════════════════════════
  // STATE (Lecture seule pour les composants)
  // ═══════════════════════════════════════════

  turnState: TurnState | null;
  dispatcher: ILocalEventDispatcher | null;
  isInitialized: boolean;
  dragState: {
    isDragging: boolean;
    domino: Domino | null;
    draggableStatus: DraggableStatus;
  } | null;

  // ═══════════════════════════════════════════
  // ACTIONS (Appelées par les composants)
  // ═══════════════════════════════════════════

  /**
   * Initialiser une nouvelle partie
   */
  initGame: (playerNames?: string[], aiPlayers?: boolean[], config?: MatchConfig) => Promise<void>;

  /**
   * Récupérer l'état du match courant
   */
  getMatchState: () => Promise<MatchState | null>;

  /**
   * Joueur humain joue un domino
   */
  playDomino: (domino: Domino, side: 'left' | 'right', knocked?: boolean) => void;

  /**
   * Joueur humain passe son tour
   */
  pass: () => void;

  /**
   * Réinitialiser le jeu
   */
  resetGame: () => void;

  /**
   * Remplacer le dispatcher (pour socket plus tard)
   */
  setDispatcher: (dispatcher: ILocalEventDispatcher) => void;

  /**
   * Pour debug: accédez directement au dispatcher
   */
  getDispatcher: () => ILocalEventDispatcher | null;

  /**
   * Démarrer un drag d'un domino
   */
  startDrag: (domino: Domino, draggableStatus: DraggableStatus) => void;

  /**
   * Terminer le drag
   */
  endDrag: () => void;

  /**
   * Debug: Afficher toutes les données de match enregistrées
   */
  debugShowAllData: () => Promise<void>;
}
