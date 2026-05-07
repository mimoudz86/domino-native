# AUDIT: GameEngine.ts - Score & RemainingPoints

## 📍 Localisation
`src/controllers/GameEngine.ts` (lignes 420-490)

---

## 1️⃣ FLUX DE CALCUL

### A. getRemainingPips() [Ligne 448-451]
```typescript
const rawScores = {
  p0: this.players[0].getRemainingPips(),
  p1: this.players[1].getRemainingPips(),
  p2: this.players[2].getRemainingPips(),
  p3: this.players[3].getRemainingPips()
};
```

**Qu'est-ce que c'est?**
- Appelle `GamePlayer.getRemainingPips()` pour chaque joueur
- Retourne la **somme des pips dans la main** du joueur
- Exemple: Player a [1|5, 3|3] → 1+5+3+3 = 12 pips

**Status:** ✅ CORRECT - Les pips sont bien calculés

---

### B. playerScores [Ligne 441]
```typescript
const playerScores = Score.calculateAllScores(this.players);
```

**Qu'est-ce que c'est?**
- Appelle une méthode `Score.calculateAllScores()` (depuis une classe `Score`)
- Retourne les **scores accumulés de chaque joueur** pendant la partie

**⚠️ PROBLÈME:** 
- Cette classe `Score` n'est pas importée dans ce fichier!
- Elle calcule les scores d'une manière DIFFÉRENTE de `calcIndividualScores()`
- Potentiellement: DEUX CALCULS DIFFÉRENTS DE SCORES

---

### C. gameEnd [Ligne 444]
```typescript
const gameEnd = Score.buildIndividualGameEndState(playerScores, winner?.id || 0, this.winningType);
```

**Qu'est-ce que c'est?**
- Construit un objet `gameEnd` avec les scores formatés
- Contient les scores accumulés du jeu

**Status:** ⚠️ DÉPEND DE `Score.calculateAllScores()`

---

### D. Données ÉMISES [Ligne 455-465]
```typescript
globalEventEmitter.emit('GAME_ENDED', {
  winner: { id, name },
  winningType,
  rawScores,           // ← pips restants (CORRECT)
  gameEnd: {           // ← scores accumulés
    individual: gameEnd
  }
});
```

---

## 2️⃣ REDONDANCES IDENTIFIÉES

| Objet | Source | Contenu |
|-------|--------|---------|
| `rawScores` | `getRemainingPips()` | Pips restants de chaque joueur |
| `playerScores` | `Score.calculateAllScores()` | Scores accumulés |
| `gameEnd` | `Score.buildIndividualGameEndState()` | Scores formatés |
| `scores[]` (adapter) | `this.getPlayers().map()` | Scores accumulés (redondant avec playerScores) |

**⚠️ TROIS SOURCES DIFFÉRENTES DE SCORES!**
1. `playerScores` (depuis Score.calculateAllScores)
2. `gameEnd` (depuis Score.buildIndividualGameEndState)
3. `scores[]` (depuis this.getPlayers())

---

## 3️⃣ DONNÉES ÉMISES VERS MatchService

```typescript
{
  winner: { id, name },
  winningType: "EMPTY_HAND" | "BLOCKED_GAME",
  rawScores: { p0, p1, p2, p3 },    // pips restants
  gameEnd: { individual: {...} }     // scores accumulés
}
```

**Ce qui manque:** aucune indication de COMMENT calculer les points gagnés à partir de rawScores

---

## 4️⃣ PROBLÈMES MAJEURS

### ❌ P1: Classe Score introuvable
- `Score.calculateAllScores()` et `Score.buildIndividualGameEndState()` ne sont pas importés
- Impossible de vérifier la logique
- Potentiellement: calcul différent de MatchService

### ❌ P2: Redondance de calcul
- Scores calculés dans GameEngine
- Scores re-calculés dans MatchService (via calcIndividualScores)
- Deux sources de vérité!

### ❌ P3: rawScores mal nommé
- `p0_score` dans RawGame = pips restants (pas un "score")
- Confusion: "score" peut vouloir dire "points gagnés" ou "pips restants"

### ❌ P4: Pas de calcul des "points gagnés"
- GameEngine envoie seulement les pips restants
- Les "points gagnés" (total - winner_pips) ne sont pas calculés ici
- Doit être calculé plus tard dans MatchService

---

## 5️⃣ QUESTIONS

1. **Où est la classe `Score`?** Est-ce la même logique que `calcIndividualScores()`?
2. **Les deux calculs donnent-ils le même résultat?** (playerScores vs calcIndividualScores)
3. **Pourquoi émettre gameEnd si on va recalculer dans MatchService?**

---

## 6️⃣ RECOMMANDATIONS

1. ✅ Garder `rawScores` (pips) — c'est correct
2. ⚠️ Vérifier la classe `Score` — s'assurer qu'elle correspond à `scoreCalculator.ts`
3. ⚠️ Simplifier: émettre SEULEMENT `rawScores`, pas `gameEnd` (sera recalculé de toute façon)
4. 📝 Renommer RawGame.p*_score en RawGame.p*_pips pour clarifier

