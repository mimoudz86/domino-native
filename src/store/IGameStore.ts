/**
 * IGameStore - Interface commune pour tous les stores (Local et Server)
 *
 * Les composants utilisent cette interface.
 * LocalGameStore et ServerGameStore l'implémentent.
 * Zéro dépendance de QUEL store est utilisé.
 */

import type { Domino } from '../shared/Domino';
import type { TurnState } from '../controllers/localGameEvents';
import type { ILocalEventDispatcher } from '../core/ILocalEventDispatcher';
import type { MatchConfig, MatchState } from '../services/IMatchStorage';

type DraggableStatus = 'none' | 'left' | 'right' | 'both';

export interface IGameStore {
  // ═══════════════════════════════════════════
  // STATE (Lecture seule pour les composants)
  // ═══════════════════════════════════════════

  turnState: TurnState | null;
  dispatcher: ILocalEventDispatcher | null;
  isInitialized: boolean;
  currentMatchId: string | null;
  selectedConfig: MatchConfig;
  dragState: {
    isDragging: boolean;
    domino: Domino | null;
    draggableStatus: DraggableStatus;
  } | null;

  // Game end modal state
  gameEnded: boolean;
  currentGameData: any | null;
  currentSetId: string | null;
  currentGameId: string | null;
  currentSetData: any | null;
  currentMatchData: any | null;

  // ═══════════════════════════════════════════
  // ACTIONS (Appelées par les composants)
  // ═══════════════════════════════════════════

  /**
   * Créer un nouveau match (génère matchId, crée dans BD)
   */
  startNewMatch: (config?: MatchConfig) => Promise<void>;

  /**
   * Continuer match existant ou créer nouveau si terminé (utilise selectedConfig)
   */
  continueOrNewMatch: () => Promise<void>;

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
   * Définir la config sélectionnée par l'utilisateur (utilisée pour tous les matchs)
   */
  setSelectedConfig: (config: MatchConfig) => void;

  /**
   * Debug: Afficher toutes les données de match enregistrées
   */
  debugShowAllData: () => Promise<void>;

  /**
   * Récupérer les données de stats (JSON formaté)
   */
  getStatsData: () => Promise<string>;

  /**
   * Supprimer toutes les données de la DB
   */
  removeAllData: () => Promise<void>;

  /**
   * Réinitialiser l'état du game end modal
   */
  resetGameEndState: () => void;
}
