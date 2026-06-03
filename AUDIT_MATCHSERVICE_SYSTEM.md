# 🔍 AUDIT: MatchService Event-Driven Architecture (domino-native)

**Date:** 2026-06-03  
**Objectif:** Documenter le système pour réplication sur domino-vite

---

## 1️⃣ ARCHITECTURE GLOBALE

### Flux Principal
```
GameEngine (moteur de jeu)
    ↓ émet GAME_ENDED event
    ↓
globalEventEmitter
    ↓
MatchService (écoute + orchestre)
    ├─ Récupère données du game
    ├─ Appelle GameCoreLogic (calculs)
    ├─ Persiste via LocalMatchStorage
    └─ Émet events (GAME_SAVED, MATCH_UPDATED, etc)
```

### Responsabilités
| Composant | Rôle |
|-----------|------|
| **GameEngine** | Moteur de jeu pur (pas de logique match) |
| **MatchService** | Orchestrateur: écoute → calcule → persiste → émet |
| **GameCoreLogic** | Calculs stateless (scores, set finished, winner) |
| **LocalMatchStorage** | Persistence SQLite |
| **globalEventEmitter** | Communication inter-composants |

---

## 2️⃣ CYCLE DE VIE DÉTAILLÉ

### Phase A: Initialisation Match
MatchService créé et listeners setup dans gameStore.startNewMatch()

### Phase B: Pendant le jeu
GameEngine.startGameLoop() → Jouer coups → Vérifier arrêt → emit('GAME_ENDED')

### Phase C: Après GAME_ENDED
MatchService.recordGameResult() → calcul → persistence → events

---

## 3️⃣ PAYLOADS & TYPES

### A. GAME_ENDED Payload
```typescript
{
  winner: { id: 0, name: 'Player 1' },
  winningType: 'EMPTY_HAND' | 'BLOCKED_GAME',
  rawScores: { p0: 12, p1: 2, p2: 5, p3: 8 }  // PIPS!
}
```

### B. RawGame (cœur du système)
```typescript
export type RawGame = {
  p0_pips_remaining: number;  // ⭐ PIPS restants
  p1_pips_remaining: number;
  p2_pips_remaining: number;
  p3_pips_remaining: number;
  p0_name: string;
  p1_name: string;
  p2_name: string;
  p3_name: string;
  p0_type: 'human' | 'AI';
  p1_type: 'human' | 'AI';
  p2_type: 'human' | 'AI';
  p3_type: 'human' | 'AI';
  winner_id: number;
  winner_name: string;
  winning_type: 'EMPTY_HAND' | 'BLOCKED_GAME';
  set_number?: number;
};
```

### C. Calcul des POINTS (à partir de PIPS)
```
GameCoreLogic.calcIndividualScores(games: RawGame[])
  Input: Games avec pips restants
  Output: { playerId: earnedPoints }
```

### D. Événements Émis
| Événement | Quand |
|-----------|-------|
| `GAME_SAVED` | Après recordToGame/recordToSet |
| `MATCH_UPDATED` | Chaque game |
| `MATCH_COMPLETED` | Tous sets finis |

---

## 4️⃣ CALCULS CLÉS

- **calcIndividualScores**: { playerId: earnedPoints }
- **calcTeamScores**: { teamV: points, teamH: points }
- **isSetFinished**: boolean (vérifie maxPoints atteints)
- **isMatchFinished**: boolean (vérifie tous sets terminés)
- **getMatchWinner**: MatchWinner (joueur/équipe gagnant)

**Important:** Jamais stocké, calculé à la demande!

---

## 5️⃣ PERSISTENCE

### Opérations
- **recordToGame**: Stocker PIPS restants (pas points!)
- **recordToSet**: Mettre à jour set finished (basé sur scores calculés)
- **recordToMatch**: Mettre à jour match finished et winner

---

## 6️⃣ PATTERN CRITIQUE: PIPS vs POINTS

- **PIPS:** Dominos restants (stocké en DB)
- **POINTS:** Gagnés par joueur (calculé à la demande)
- Jamais confondre!

---

## 7️⃣ FILES CLÉS

| Fichier | Rôle |
|---------|------|
| MatchService.ts | Orchestrateur |
| GameCoreLogic.ts | Calculs |
| LocalMatchStorage.ts | Persistence |
| IMatchStorage.ts | Types |

---

## 8️⃣ POUR DOMINO-VITE: À ADAPTER

1. globalEventEmitter → SocketIOAdapter
2. LocalMatchStorage → API REST/Socket
3. Garder GameCoreLogic (réutilisable)
4. Garder MatchService pattern
5. Adapter types si besoin
