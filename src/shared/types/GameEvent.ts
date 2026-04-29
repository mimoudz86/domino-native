/**
 * GameEvent Types - Partagés entre frontend et backend
 *
 * Définit tous les événements de communication du jeu
 * Utilisé par EventBusAdapter (frontend) et Socket.io (backend)
 */

import type { Domino } from '../models/Domino';
import type { TurnState } from '../models/GameTurnState';

/**
 * Types d'événements supportés
 */
export type GameEvent =
    // | { type: 'START_GAME_REQUEST'; payload: {} }  // DISABLED: Auto-start handled by server
    | { type: 'RESTART_GAME'; payload: {} }
    | { type: 'LEAVE_ROOM'; payload: { playerId: number } }
    | { type: 'GAME_READY'; payload: {} }
    | { type: 'TURN_STATE_GET'; payload: TurnState }
    | { type: 'TURN_POST'; payload: TurnPostPayload }
    | { type: 'GAME_ENDED'; payload: GameEndedPayload }
    | { type: 'SET_ENDED'; payload: { winningTeam: 'V' | 'H'; finalScores: { teamV: number; teamH: number }; roundsPlayed: number; teamVWins: number; teamHWins: number } };

/**
 * Payload pour TURN_POST
 * - 'played': Un joueur place un domino
 * - 'passed': Un joueur passe son tour
 */
export type TurnPostPayload =
    | {
        type: 'played';
        playerId: number;
        domino: Domino;
        side: 'left' | 'right';
    }
    | {
        type: 'passed';
        playerId: number;
        playerName: string;  // 🎯 NEW: Include player name in passed action
    };

/**
 * Payload pour GAME_ENDED
 */
export interface GameEndedPayload {
    winner: {
        id: number;
        name: string;
        score?: number;
    };
    scores?: Array<{
        playerId: number;
        playerName: string;
        score: number;
    }>;
}

/**
 * Type pour les event listeners
 */
export type EventListener<E extends GameEvent> = (payload: E['payload']) => void;
