# AUDIT: LocalMatchStorage.ts - Score Persistence

## 📍 Localisation
`src/services/LocalMatchStorage.ts`

---

## 1️⃣ TABLE GAMES SCHEMA

### Colonnes pertinentes
```sql
CREATE TABLE games (
  game_id TEXT PRIMARY KEY,
  p0_remainingpoints INTEGER,    -- ← Pips restants (EN COLONNE MAIS NON UTILISÉE!)
  p1_remainingpoints INTEGER,
  p2_remainingpoints INTEGER,
  p3_remainingpoints INTEGER,
  p0_score INTEGER,              -- ← Points gagnés par chaque joueur
  p1_score INTEGER,
  p2_score INTEGER,
  p3_score INTEGER,
  p0_name TEXT,
  p1_name TEXT,
  // ... autres colonnes
);
```

**Observation:**
- Deux séries de colonnes pour les scores:
  1. `p*_remainingpoints` = pips restants (source correcte)
  2. `p*_score` = points gagnés (calculés une fois, stockés)

---

## 2️⃣ MÉTHODE: saveGame()

### Signature [ligne 327-334]
```typescript
async saveGame(
  gameId: string,
  matchId: string,
  gameIndex: number,
  rawGame: RawGame,
  setId: string,
  earnedPoints: Record<number, number>
): Promise<void>
```

### Code d'insertion [lignes 338-373]
```typescript
await db.runAsync(
  `INSERT INTO games (
    game_id, match_id, set_id, game_index,
    p0_remainingpoints, p1_remainingpoints, p2_remainingpoints, p3_remainingpoints,
    p0_score, p1_score, p2_score, p3_score,
    p0_name, p1_name, p2_name, p3_name,
    // ... autres colonnes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ...)`
  [
    gameId,
    matchId,
    setId,
    gameIndex,
    rawGame.p0_score,     // ← Pips restants (12)
    rawGame.p1_score,     // ← Pips restants (2)
    rawGame.p2_score,     // ← Pips restants (12)
    rawGame.p3_score,     // ← Pips restants (10)
    earnedPoints[0] || 0, // ← Points gagnés (0)
    earnedPoints[1] || 0, // ← Points gagnés (34)
    earnedPoints[2] || 0, // ← Points gagnés (0)
    earnedPoints[3] || 0, // ← Points gagnés (0)
    // ... noms
  ]
);
```

**Mapping:**
```
rawGame.p0_score (12) → p0_remainingpoints (12) ✅
rawGame.p1_score (2)  → p1_remainingpoints (2)  ✅
// ...
earnedPoints[0] (0)   → p0_score (0)            ✅
earnedPoints[1] (34)  → p1_score (34)           ✅
// ...
```

**Status:** ✅ Mapping correct (si earnedPoints était correct)

---

## 3️⃣ MÉTHODE: getLastGame()

### Signature [ligne 417-428]
```typescript
async getLastGame(gameId: string): Promise<{
  p0_score: number;
  p1_score: number;
  p2_score: number;
  p3_score: number;
  p0_name: string;
  // ...
}>
```

### Code d'interrogation [lignes 431-439]
```typescript
const game = await db.getFirstAsync<any>(
  `SELECT p0_remainingpoints, p1_remainingpoints, p2_remainingpoints, p3_remainingpoints,
          p0_score, p1_score, p2_score, p3_score,
          p0_name, p1_name, p2_name, p3_name,
          winner_id, winner_name
   FROM games
   WHERE game_id = ?`,
  [gameId]
);
```

### Retour [lignes 445-456]
```typescript
return {
  p0_score: game.p0_score,   // ← Points gagnés (0)
  p1_score: game.p1_score,   // ← Points gagnés (34)
  p2_score: game.p2_score,   // ← Points gagnés (0)
  p3_score: game.p3_score,   // ← Points gagnés (0)
  p0_name: game.p0_name,
  p1_name: game.p1_name,
  // ...
};
```

**⚠️ PROBLÈME 1:**
- getLastGame() retourne `p0_score, p1_score` (colonnes points gagnés)
- Mais on n'utilise JAMAIS `p*_remainingpoints` (colonnes pips)
- Les colonnes pips sont **STOCKÉES MAIS JAMAIS LUES**

**⚠️ PROBLÈME 2:**
- Si earnedPoints était { } ou { 1: 0 }, alors:
  - p0_score = 0
  - p1_score = 0 (au lieu de 34)
  - p2_score = 0
  - p3_score = 0
- C'est exactement ce qu'on voit dans les logs!

---

## 4️⃣ MÉTHODE: updateMatchScoreTotals()

### Signature [ligne 607-610]
```typescript
async updateMatchScoreTotals(matchId: string, mode: ScoringMode): Promise<void> {
  // Les totaux ne sont plus stockés - ils sont calculés à la demande via getMatchTotals()
  const totals = await this.getMatchTotals(matchId);
  console.log(...);
}
```

**Status:** ℹ️ Désormais une fonction no-op (logging seulement)

---

## 5️⃣ MÉTHODE: getMatchTotals()

### Code [lignes 562-604]
```typescript
async getMatchTotals(matchId: string) {
  const match = await this.getDb().then(db =>
    db.getFirstAsync<any>('SELECT mode FROM matches WHERE match_id = ?', [matchId])
  );

  const games = await this.getGamesForMatch(matchId);

  if (match.mode === 'individual') {
    const scores = calcIndividualScores(games);  // ← RECALCULE!
    return {
      p0_total: scores[0] || 0,
      p1_total: scores[1] || 0,
      // ...
    };
  }
}
```

**⚠️ PROBLÈME 3:**
- `getMatchTotals()` recalcule les scores avec `calcIndividualScores()`
- Mais les scores sont DÉJÀ stockés dans la colonne `p0_score, p1_score`!
- **Calcul redondant:**
  1. calcIndividualScores() dans MatchService
  2. getMatchTotals() recalcule encore

---

## 6️⃣ MÉTHODE: getGamesForMatch()

### Code [lignes 451-475]
```typescript
async getGamesForMatch(matchId: string): Promise<RawGame[]> {
  const db = await this.getDb();
  const games = await db.getAllAsync<any>(
    `SELECT ...
     p0_score, p1_score, p2_score, p3_score,
     ...
     FROM games WHERE match_id = ?`,
    [matchId]
  );

  return games.map((g) => ({
    p0_score: g.p0_score,      // ← Points gagnés, pas pips!
    p1_score: g.p1_score,
    // ...
  }));
}
```

**⚠️ CRITIQUE:**
- getGamesForMatch() retourne RawGame[]
- RawGame.p*_score **devrait** être les PIPS restants
- Mais elle retourne les POINTS GAGNÉS au lieu des PIPS!
- **C'est inversé!**

**Impact:**
- Quand calcIndividualScores() reçoit RawGame[]
- Elle croit que p0_score = pips, mais c'est les points!
- Calcule: total pips - winner pips
- Mais total est les POINTS, pas les PIPS = **CALCUL FAUX**

---

## 7️⃣ ANOMALIE MAJEURE

### Le BUG:
```
saveGame() stoque:
  p0_remainingpoints = 12    (✅ pips)
  p1_remainingpoints = 2     (✅ pips)
  p0_score = 0               (❌ points gagnés mal calculés)
  p1_score = 34              (❌ points gagnés mal calculés)

getGamesForMatch() retourne:
  p0_score = 0               (❌ croit que c'est des pips)
  p1_score = 34              (❌ croit que c'est des pips)

calcIndividualScores() calcule:
  total = 0 + 34 + 0 + ? = FAUX!
```

---

## 8️⃣ REDONDANCES COMPLÈTES

| Donnée | Stockée? | Lue? | Recalculée? | État |
|--------|----------|------|-------------|------|
| p*_remainingpoints (pips) | OUI ✅ | NON ❌ | - | Inutile |
| p*_score (earnedPoints) | OUI ✅ | OUI ✅ | OUI ❌ | Redondant |
| Scores totaux | NON | OUI | OUI | Toujours calculé |

---

## 9️⃣ FLUX D'ERREUR

```
GameEngine: rawScores = { p0: 12, p1: 2, ... } ✅

MatchService:
  rawGame = { p0_score: 12, p1_score: 2, ... } ✅
  earnedPoints = calcIndividualScores([rawGame]) 
    → earnedPoints = { 1: 34 } ✅
  saveGame(..., earnedPoints)

LocalMatchStorage.saveGame():
  INSERT games (
    p0_remainingpoints = 12,
    p1_remainingpoints = 2,
    p0_score = 0,          (earnedPoints[0] || 0)
    p1_score = 34,         (earnedPoints[1] || 0)
  ) ✅

LocalMatchStorage.getGamesForMatch():
  SELECT p0_score (34), p1_score (0), ...
  Retourne RawGame { p0_score: 0, p1_score: 34, ... }
  
  ❌ PROBLÈME: croit que 0, 34 sont des PIPS
  ❌ Mais ce sont des POINTS!

calcIndividualScores(games):
  total = 0 + 34 + 0 + ? = FAUX TOTAL
  winner_pips = 0
  earned = total - 0 = FAUX!
```

---

## 🔟 RECOMMANDATIONS

### 1. Supprimer earnedPoints du stockage
```typescript
// ❌ NE PAS STOCKER:
p0_score, p1_score, ...

// ✅ STOCKER SEULEMENT:
p0_remainingpoints, p1_remainingpoints, ...
```

### 2. Refactoriser getGamesForMatch()
```typescript
// Retourner SEULEMENT les pips (vrai RawGame)
return games.map((g) => ({
  p0_score: g.p0_remainingpoints,  // ← pips, pas points!
  p1_score: g.p1_remainingpoints,
  // ...
}));
```

### 3. Renommer pour clarté
```typescript
// Dans la table:
p0_pips_remaining  (au lieu de p0_remainingpoints)

// Dans RawGame:
p0_pips_remaining  (au lieu de p0_score)
```

### 4. Supprimer getLastGame()
- Elle retourne des points gagnés
- Mais ces points devront être recalculés anyway
- Mieux d'avoir une fonction qui retourne RawGame avec pips

### 5. Consolider calcIndividualScores()
- Une seule source de vérité
- Calculée à la demande, jamais stockée
- Cache si besoin de performance

