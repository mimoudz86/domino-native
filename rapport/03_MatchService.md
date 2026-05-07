# AUDIT: MatchService.ts - Score Persistence & Calculation

## 📍 Localisation
`src/services/MatchService.ts` - méthode `recordGameResult()`

---

## 1️⃣ FLUX D'ENTRÉE

### Payload reçu de GameEngine
```typescript
{
  winner: { id: 1, name: "AI 2" },
  winningType: "BLOCKED_GAME",
  rawScores: { p0: 12, p1: 2, p2: 12, p3: 10 },
  gameEnd: { individual: {...} }
}
```

---

## 2️⃣ ÉTAPE 1: Construction de RawGame

### Code [lignes 62-80]
```typescript
const rawGame: RawGame = {
  p0_score: payload.rawScores.p0,      // 12
  p1_score: payload.rawScores.p1,      // 2
  p2_score: payload.rawScores.p2,      // 12
  p3_score: payload.rawScores.p3,      // 10
  p0_name: payload.gameEnd?.individual?.players?.[0]?.name,
  // ... autres noms
  winner_id: payload.winner.id,        // 1
  winner_name: payload.winner.name,    // "AI 2"
  winning_type: payload.winningType,   // "BLOCKED_GAME"
  set_number: activeMatch.currentSet   // 1
};
```

**Status:** ✅ CORRECT - RawGame bien construit à partir du payload

---

## 3️⃣ ÉTAPE 2: Calcul des Points Gagnés

### Code [lignes 83-84]
```typescript
const earnedPoints = calcIndividualScores([rawGame]);
console.log(`LOG  [MATCH-SERVICE] 🎯 EARNED_POINTS ...`);
```

**Qu'est-ce qui se passe?**

Input:
```
RawGame {
  p0_score: 12, p1_score: 2, p2_score: 12, p3_score: 10,
  winner_id: 1
}
```

Calcul dans `calcIndividualScores()`:
```
total = 12 + 2 + 12 + 10 = 36
winnerPips = [12, 2, 12, 10][1] = 2
earnedPoints[1] = 36 - 2 = 34
Retour: { 1: 34 }
```

**Output:**
```
earnedPoints = { 1: 34 }
earnedPoints[0] = undefined → 0
earnedPoints[1] = 34
earnedPoints[2] = undefined → 0
earnedPoints[3] = undefined → 0
```

**⚠️ PROBLÈME 1:** 
- Le log affiche "EARNED_POINTS p0:0, p1:34, p2:0, p3:0"
- Mais les logs observés montraient "p0:0, p1:0, p2:0, p3:0"
- **Cela veut dire que earnedPoints[1] vaut 0, pas 34!**
- Donc soit: `calcIndividualScores()` retourne un objet vide
- Soit: `payload.rawScores` est mal rempli

---

## 4️⃣ ÉTAPE 3: Sauvegarde en BD

### Code [ligne 87]
```typescript
await this.storage.saveGame(gameId, this.matchId, this.gameIndex, rawGame, setId, earnedPoints);
```

**Paramètres passés:**
- gameId: "LOCAL_G_LOCAL_S_LOCAL_M_1778..._1_10"
- rawGame: { p0_score: 12, p1_score: 2, ... } ← pips
- earnedPoints: { 1: 34 } ← points gagnés

---

## 5️⃣ ÉTAPE 4: Récupération du Game Sauvegardé

### Code [ligne 92]
```typescript
const gameData = await this.storage.getLastGame(gameId);
```

**Ce que retourne getLastGame():**
```typescript
{
  p0_score: 0,      // ← Vient de earnedPoints[0] (0)
  p1_score: 0,      // ← Vient de earnedPoints[1] (DEVRAIT ÊTRE 34!)
  p2_score: 0,
  p3_score: 0,
  p0_name: "AI 1",
  p1_name: "AI 2",
  // ...
}
```

**⚠️ PROBLÈME 2:** 
- gameData.p1_score = 0 au lieu de 34
- C'est parce que `earnedPoints[1]` était 0 au moment du save
- **Confirme que `calcIndividualScores()` retournait { } ou { 1: 0 }**

---

## 6️⃣ ÉTAPE 5: Émission de GAME_SAVED

### Code [lignes 96-97]
```typescript
console.log(`LOG  [MATCH-SERVICE] 📤 GAME_SAVED {"gameId":"..."}`);
await globalEventEmitter.emit('GAME_SAVED', { gameId, matchId: this.matchId, gameData, setData });
```

**Payload émis:**
```typescript
{
  gameId: "LOCAL_G_...",
  matchId: "LOCAL_M_...",
  gameData: { p0_score: 0, p1_score: 0, p2_score: 0, p3_score: 0, ... },
  setData: { p0_score: 0, p1_score: 0, ... }
}
```

**⚠️ PROBLÈME 3:**
- setData aussi a tous les scores à 0
- C'est un pattern cohérent: tous les scores = 0 = BUG GÉNÉRAL

---

## 7️⃣ ÉTAPE 6: Mise à Jour Match Scores

### Code [ligne 99]
```typescript
await this.storage.updateMatchScoreTotals(this.matchId, activeMatch.config.mode);
```

**Qu'est-ce que c'est?**
- Appelle `updateMatchScoreTotals()` qui:
  1. Récupère tous les games du match
  2. Recalcule les totaux de points
  3. Stocke dans la table matches

**⚠️ REDONDANCE:**
- On vient de calculer earnedPoints et de les stocker
- Maintenant on recalcule les mêmes points
- **DEUX FOIS LA MÊME CHOSE**

---

## 8️⃣ REDONDANCES IDENTIFIÉES

| Étape | Action | Source | Destination |
|-------|--------|--------|-------------|
| 2 | Calcul points | `calcIndividualScores([rawGame])` | Variable earnedPoints |
| 3 | Sauvegarde | earnedPoints | Colonne p0_score, p1_score dans games |
| 4 | Récupération | games table | gameData |
| 6 | Recalcul | `getGamesForMatch()` + `calcIndividualScores()` | matches table |

**Redondance P1:**
- Points calculés en étape 2
- Points recalculés en étape 6
- **Pourquoi calculer deux fois?**

**Redondance P2:**
- earnedPoints stockés dans games table
- Puis recalculés à partir de games table
- **Pourquoi ne pas juste stocker rawGame?**

---

## 9️⃣ DIAGRAMME DE FLUX COMPLET

```
GameEngine
  ├─ getRemainingPips() → rawScores { p0: 12, p1: 2, ... }
  └─ emit GAME_ENDED

MatchService.recordGameResult()
  ├─ Étape 1: RawGame(p0_score: 12, ...)
  ├─ Étape 2: earnedPoints = calcIndividualScores() → { 1: 34 }
  ├─ Étape 3: saveGame(rawGame, earnedPoints)
  │    └─ INSERT games (p0_score: 0, p1_score: 34, ...)
  ├─ Étape 4: gameData = getLastGame() → { p0_score: 0, p1_score: 34, ... }
  ├─ Étape 5: emit GAME_SAVED { gameData }
  ├─ Étape 6: updateMatchScoreTotals()
  │    ├─ getGamesForMatch()
  │    └─ calcIndividualScores() ← RECALCUL!
  └─ Étape 7: Calculer si set/match fini
       └─ UTILISE earnedPoints à nouveau!
```

---

## 🔟 PROBLÈMES MAJEURS

### ❌ P1: Triple calcul des points
1. Calcul 1 (étape 2): earnedPoints
2. Calcul 2 (étape 6): updateMatchScoreTotals()
3. Calcul 3 (étape 7): isSetFinished()

### ❌ P2: Stockage redondant
- earnedPoints stockés dans games table
- Mais aussi calculés à partir de games table

### ❌ P3: Pas de validation
- earnedPoints = 0 pour tous les joueurs
- Aucun log d'erreur ou warning
- Passe silencieusement

### ❌ P4: earnedPoints = {1: 34} retourné comme "0, 0, 0, 0"
- earnedPoints[0] || 0 = 0
- earnedPoints[1] || 0 = 34 (CORRECT)
- earnedPoints[2] || 0 = 0
- earnedPoints[3] || 0 = 0
- Mais les logs montraient TOUS les points à 0
- **Indique que earnedPoints[1] était vraiment 0**

---

## 1️⃣1️⃣ RECOMMANDATIONS

### 1. Supprimer le calcul de earnedPoints ici
```typescript
// ❌ NE PAS FAIRE
const earnedPoints = calcIndividualScores([rawGame]);
await this.storage.saveGame(gameId, this.matchId, this.gameIndex, rawGame, setId, earnedPoints);

// ✅ À LA PLACE
await this.storage.saveGame(gameId, this.matchId, this.gameIndex, rawGame, setId);
```

### 2. Stocker SEULEMENT rawGame (pips)
- Ne pas stocker earnedPoints dans la BD
- Les points seront calculés à la demande

### 3. Simplifier updateMatchScoreTotals()
- Ou la supprimer complètement
- Les totaux seront toujours calculés à partir des games

### 4. Ajouter une validation
```typescript
// Vérifier que rawScores ne sont pas tous 0
if (Object.values(payload.rawScores).every(v => v === 0)) {
  console.error("⚠️ All remaining pips are 0 - this is suspicious!");
}
```

