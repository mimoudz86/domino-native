# 📋 AUDIT COMPLET: Score, RemainingPoints & EarnedPoints

## Fichiers auditées
1. **GameEngine.ts** → `01_GameEngine.md`
2. **scoreCalculator.ts** → `02_scoreCalculator.md`
3. **MatchService.ts** → `03_MatchService.md`
4. **LocalMatchStorage.ts** → `04_LocalMatchStorage.md`

---

## 🚨 PROBLÈME RACINE IDENTIFIÉ

### Le Bug Principal: "Pips" vs "Points" Confusion

La nomenclature du projet est **CONFUSE**:

```
RawGame.p0_score = ???
  ✅ Au départ (GameEngine): PIPS RESTANTS (12)
  ❌ Plus tard (getGamesForMatch): POINTS GAGNÉS (34)
  ❓ Utilisé comme: PIPS par calcIndividualScores()
```

**Impact:**
- calcIndividualScores() reçoit des POINTS au lieu de PIPS
- Calcule un total incorrecte
- Les scores s'effondrent à 0

---

## 📊 TABLEAU DES REDONDANCES

### Triple Calcul des Scores

```
Étape 1: MatchService
  earnedPoints = calcIndividualScores([rawGame])

Étape 2: LocalMatchStorage.saveGame()
  Stocke earnedPoints dans p0_score, p1_score

Étape 3: LocalMatchStorage.getGamesForMatch()
  Retourne le même earnedPoints (mal nommé)

Étape 4: LocalMatchStorage.getMatchTotals()
  earnedPoints = calcIndividualScores(games)
  → RECALCUL DU MÊME TRUC!

Étape 5: MatchService.isSetFinished()
  earnedPoints = calcIndividualScores(games)
  → RECALCUL ENCORE!
```

**Résultat:** On calcule le même chose 3-4 fois!

---

## ⚠️ PROBLÈMES CRITIQUES

### P1: RawGame.p*_score mal nommé
- **Signification change** selon le contexte
- Parfois = pips restants (GameEngine)
- Parfois = points gagnés (LocalMatchStorage)
- Cause calcul faux dans scoreCalculator

### P2: Deux systèmes de calcul de score
- GameEngine → Score.calculateAllScores()
- MatchService → calcIndividualScores()
- **Sont-elles identiques?** ❓

### P3: Colonnes non utilisées
- `p*_remainingpoints` stockées mais jamais lues
- À la place, on utilise `p*_score` qui sont les points
- **Pure gâchis de stockage**

### P4: Pas de validation
- earnedPoints = {1: 34} (correct)
- Mais getLastGame() retourne p0:0, p1:34, p2:0, p3:0 (correct)
- Cependant les logs observés montraient TOUS les points à 0
- **Indique que earnedPoints ÉTAIT mal calculé au moment du save**

### P5: getMatchTotals() ne se finit pas
- Recalcule les totaux à partir de games
- Mais games contient les POINTS, pas les PIPS
- **Donc le calcul est faux!**

---

## 🎯 SOLUTION PROPOSÉE

### Architecture cible (simple):

```
GameEngine
  ├─ getRemainingPips() → rawScores { p0: 12, p1: 2, ... } (PIPS)
  └─ emit GAME_ENDED

MatchService
  ├─ Construire RawGame avec PIPS
  └─ storage.saveGame(rawGame)  ← NE PAS passer earnedPoints

LocalMatchStorage
  ├─ saveGame(rawGame)
  │   └─ INSERT games (p0_pips: 12, p1_pips: 2, ...)
  │
  └─ Quand on a besoin des scores:
      ├─ getGamesForMatch() → RawGame[] (PIPS)
      ├─ calcIndividualScores(games) → { 1: 34 } (POINTS)
      └─ Retourner les POINTS pour affichage
```

**Avantages:**
- ✅ Une seule source de vérité (PIPS)
- ✅ Scores toujours calculés à la demande
- ✅ Pas de redondance
- ✅ Plus facile à déboguer

---

## 📝 ACTIONS À FAIRE

### Phase 1: Renommage (Clarité)
```typescript
// Avant
RawGame {
  p0_score: number;  // ❓ c'est quoi?
}

// Après
RawGame {
  p0_pips_remaining: number;  // ✅ clair!
}
```

### Phase 2: Supprimer redondance (Sauvegarde)
```typescript
// Avant
saveGame(gameId, rawGame, earnedPoints)
  INSERT (p0_score=0, p1_score=34, ...)

// Après
saveGame(gameId, rawGame)
  INSERT (p0_pips=12, p1_pips=2, ...)
```

### Phase 3: Refactoriser getGamesForMatch()
```typescript
// Avant
return games.map(g => ({ p0_score: g.p0_score, ... }))

// Après
return games.map(g => ({ p0_pips_remaining: g.p0_pips, ... }))
```

### Phase 4: Consolider calcIndividualScores()
- Supprimer toutes les autres sources de calcul
- Seule source: `scoreCalculator.calcIndividualScores()`
- Calculée à la demande, jamais stockée

---

## 🔍 GUIDE DE LECTURE DES RAPPORTS

1. **Commencer par `02_scoreCalculator.md`**
   - Comprendre la logique de calcul
   - Voir où RawGame est mal nommé

2. **Puis `01_GameEngine.ts`**
   - Voir où rawScores sont générés
   - Comprendre la première source de données

3. **Puis `03_MatchService.md`**
   - Voir comment earnedPoints sont calculés
   - Identifier le PREMIER problème

4. **Enfin `04_LocalMatchStorage.md`**
   - Voir comment les données sont stockées
   - Identifier les colonnes non utilisées
   - Voir comment getGamesForMatch() inverse les données

---

## 📚 RÉSUMÉ POUR CLEANUP

### Ce qui fonctionne bien:
- ✅ GameEngine.getRemainingPips()
- ✅ scoreCalculator.calcIndividualScores() (logique correcte)
- ✅ saveGame() (stockage)

### Ce qui est cassé:
- ❌ RawGame.p*_score nomenclature
- ❌ earnedPoints mal calculés au save
- ❌ getGamesForMatch() retourne les mauvaises données
- ❌ Triple calcul redondant

### Ce à supprimer:
- ❌ p*_remainingpoints (colonnes non utilisées)
- ❌ p*_score comme points (stocker seulement PIPS)
- ❌ earnedPoints parameter dans saveGame()
- ❌ updateMatchScoreTotals() (or refactoriser)

