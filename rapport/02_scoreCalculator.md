# AUDIT: scoreCalculator.ts - Score Calculation Logic

## 📍 Localisation
`src/shared/scoring/scoreCalculator.ts`

---

## 1️⃣ STRUCTURE DES TYPES

### RawGame (lignes 4-21)
```typescript
export type RawGame = {
  p0_score: number;      // ⚠️ CONFUSION: ce sont les PIPS RESTANTS, pas un "score"
  p1_score: number;
  p2_score: number;
  p3_score: number;
  p0_name, p1_name, p2_name, p3_name: string;
  p0_type, p1_type, p2_type, p3_type: 'human' | 'AI';
  winner_id: number;
  winner_name: string;
  winning_type: 'EMPTY_HAND' | 'BLOCKED_GAME';
  set_number?: number;
};
```

**⚠️ PROBLÈME CRITIQUE:** 
- `p0_score` est appelé "score" mais contient les **PIPS RESTANTS**
- En Domino, "score" = "points gagnés", pas "pips"
- Nomenclature trompeuse!

---

## 2️⃣ FONCTIONS DE CALCUL

### A. isDrawGameIndividual() [lignes 24-31]
**Entrée:** RawGame  
**Sortie:** boolean

```typescript
const pips = [game.p0_score, game.p1_score, game.p2_score, game.p3_score];
const maxPips = Math.max(...pips);
const countWithMaxPips = pips.filter(p => p === maxPips).length;
return countWithMaxPips >= 2;
```

**Logique:** 
- Si jeu bloqué + 2+ joueurs avec les MÊMES pips max → DRAW
- Cas de draw: pas de points distribués

**Status:** ✅ CORRECT

---

### B. isDrawGameTeam() [lignes 35-47]
**Entrée:** RawGame  
**Sortie:** boolean

```typescript
const teamVPips = [game.p0_score, game.p2_score];
const teamHPips = [game.p1_score, game.p3_score];
// Check if any V player has same pips as any H player
```

**Logique:** 
- Si jeu bloqué + un joueur TeamV a mêmes pips qu'un joueur TeamH → DRAW

**Status:** ✅ CORRECT

---

### C. calcIndividualScores() [lignes 51-62]
**Entrée:** RawGame[]  
**Sortie:** Record<number, number> (pointage par joueur)

```typescript
return games.reduce((acc, g) => {
  if (isDrawGameIndividual(g)) return acc;  // Draw = pas de points
  
  const total = g.p0_score + g.p1_score + g.p2_score + g.p3_score;
  const winnerPips = [g.p0_score, g.p1_score, g.p2_score, g.p3_score][g.winner_id];
  acc[g.winner_id] = (acc[g.winner_id] || 0) + (total - winnerPips);
  return acc;
}, {} as Record<number, number>);
```

**Logique:**
- Accumule les scores de PLUSIEURS games
- Pour chaque game: winner récolte (total pips - winner pips)
- Les non-gagnants ne gagnent pas de points (pas créés dans acc)

**Exemple:**
```
Game 1: p0: 12, p1: 2, p2: 12, p3: 10, winner: p1
  total = 36
  winner pips = 2
  p1 earned = 36 - 2 = 34
  Résultat: { 1: 34 }

Game 2: p0: 5, p1: 3, p2: 4, p3: 6, winner: p3
  total = 18
  winner pips = 6
  p3 earned = 18 - 6 = 12
  Résultat: { 1: 34, 3: 12 }
```

**⚠️ COMPORTEMENT IMPORTANT:**
- Les non-gagnants NE SONT PAS dans l'objet retourné (undefined)
- Quand on accède à `earnedPoints[0]`, ça retourne `undefined`
- Avec `earnedPoints[0] || 0`, ça devient 0 (correct en Domino)

**Status:** ✅ LOGIQUE CORRECTE MAIS TROMPEUSE

---

### D. calcTeamScores() [lignes 66-82]
**Entrée:** RawGame[]  
**Sortie:** { teamV: number; teamH: number }

```typescript
return games.reduce((acc, g) => {
  if (isDrawGameTeam(g)) return acc;
  
  const isWinnerV = g.winner_id === 0 || g.winner_id === 2;
  if (isWinnerV) {
    acc.teamH += g.p1_score + g.p3_score;  // TeamH marque les pips de TeamV
  } else {
    acc.teamV += g.p0_score + g.p2_score;  // TeamV marque les pips de TeamH
  }
  return acc;
}, { teamV: 0, teamH: 0 });
```

**Logique:**
- Mode TEAM: si Team V gagne, Team H marque les pips des membres de Team V
- Accumule sur PLUSIEURS games

**Status:** ✅ CORRECT

---

## 3️⃣ FONCTIONS D'ÉTATS

### E. isSetFinished() [lignes 118-132]
```typescript
if (mode === 'individual') {
  const scores = calcIndividualScores(gamesInSet);
  return Object.values(scores).some(s => s >= maxPoints);
}
```

**What:** Détecte si quelqu'un a >= maxPoints dans ce set  
**Status:** ✅ CORRECT

---

### F. isMatchFinished() [lignes 135-140]
```typescript
return numSetsFinished === numSets;
```

**What:** Détecte si tous les sets sont terminés  
**Status:** ✅ CORRECT

---

### G. getMatchWinner() [lignes 143-...]
Retourne le gagnant du match  
**Status:** ✅ À VÉRIFIER (code coupé)

---

## 4️⃣ REDONDANCES DÉTECTÉES

### Même logique en deux endroits:
1. **GameEngine** → `Score.calculateAllScores()` (classe importée ailleurs)
2. **scoreCalculator** → `calcIndividualScores()` (fonction ici)

**❓ Ces deux font-elles la même chose?**

---

## 5️⃣ FLUX D'UTILISATION ACTUEL

```
GameEngine.getRemainingPips()
  ↓ rawScores = { p0: 12, p1: 2, ... }
  ↓
MatchService.recordGameResult()
  ↓ rawGame = RawGame(p0_score: 12, p1_score: 2, ...)
  ↓
scoreCalculator.calcIndividualScores([rawGame])
  ↓ Retourne: { 1: 34 } (seul le winner)
  ↓
saveGame() → earnedPoints[0] || 0 = 0
           earnedPoints[1] || 0 = 34
           earnedPoints[2] || 0 = 0
           earnedPoints[3] || 0 = 0
```

---

## 6️⃣ PROBLÈMES MAJEURS

### ❌ P1: RawGame.p*_score mal nommé
- Contient PIPS RESTANTS, pas "score"
- Source de confusion majeure dans tout le code

### ❌ P2: calcIndividualScores() retourne un objet "creux"
- Non-gagnants ne sont pas dans l'objet
- Oblige à utiliser `earnedPoints[i] || 0` partout
- Pas de structure cohérente

### ❌ P3: Deux systèmes de calcul de scores
- GameEngine utilise `Score.calculateAllScores()`
- MatchService utilise `calcIndividualScores()`
- Sont-elles synchronisées?

### ❌ P4: Pas de calcul des "points gagnés" basé sur rawScores
- `calcIndividualScores()` prend RawGame en entrée
- Mais RawGame.p*_score sont les PIPS, pas les POINTS
- La logique fonctionne par accident (car pips = source de points)

---

## 7️⃣ RECOMMANDATIONS

1. **Renommer RawGame**:
   ```typescript
   export type RawGame = {
     p0_remaining_pips: number;    // ← clair!
     p1_remaining_pips: number;
     // ... ou p*_pips_remaining
   ```

2. **Refactoriser calcIndividualScores()**:
   ```typescript
   // Au lieu de retourner { 1: 34 } (objet creux)
   // Retourner { 0: 0, 1: 34, 2: 0, 3: 0 } (complet)
   ```

3. **Vérifier la classe Score**:
   - S'assurer qu'elle fait la même chose que calcIndividualScores()
   - Consolider les deux en une seule source de vérité

4. **Ajouter des tests**:
   - Vérifier que les deux systèmes donnent les mêmes résultats

