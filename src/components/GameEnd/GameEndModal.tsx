import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';

type GameEndState = {
  winner: { id: number; name: string };
  teamV: {
    teamName: string;
    players: Array<{ id: number; name: string; score: number }>;
    totalScore: number;
  };
  teamH: {
    teamName: string;
    players: Array<{ id: number; name: string; score: number }>;
    totalScore: number;
  };
  winningTeam: 'V' | 'H';
  winningType: 'EMPTY_HAND' | 'BLOCKED_GAME';
  pointsEarned: number;
  setScore: {
    teamVPoints: number;
    teamHPoints: number;
  };
  matchProgress: {
    team1SetsWon: number;
    team2SetsWon: number;
    currentSetIndex: number;
    matchFinished: boolean;
  };
};

export type GameMode = 'team' | 'solo';

interface GameEndModalProps {
  visible: boolean;
  gameEndState?: GameEndState | null;
  thisPlayerId?: number | null;
  mode?: GameMode;
  onContinue: () => void;
  onLeave: () => void;
  // Backwards compatibility
  winnerName?: string;
}

function getTeamViewData(gameEndState: any, thisPlayerId: number | null) {
  const defaultViewData = {
    clientTeam: 'V' as 'V' | 'H',
    myTeam: { teamName: 'Team Unknown', players: [{id: 0, name: ''}, {id: 1, name: ''}], totalScore: 0 },
    theirTeam: { teamName: 'Team Unknown', players: [{id: 2, name: ''}, {id: 3, name: ''}], totalScore: 0 },
    myGameScore: 0,
    theirGameScore: 0,
    mySetScore: 0,
    theirSetScore: 0,
    myMatchScore: 0,
    theirMatchScore: 0,
    didClientTeamWin: false,
    winner: { id: -1, name: 'Unknown' }
  };

  if (!gameEndState) return defaultViewData;
  if (!gameEndState.teamV || !gameEndState.teamH) {
    console.warn('[TeamViewData] Missing teamV or teamH - using defaults');
    return defaultViewData;
  }

  const { teamV, teamH, winningTeam, winner, setScore, matchProgress } = gameEndState;

  let clientTeam: 'V' | 'H' = 'V';

  if (thisPlayerId !== null && thisPlayerId !== undefined) {
    const isInTeamV = teamV.players.some((p: any) => p.id === thisPlayerId);
    const isInTeamH = teamH.players.some((p: any) => p.id === thisPlayerId);

    if (isInTeamV) {
      clientTeam = 'V';
    } else if (isInTeamH) {
      clientTeam = 'H';
    }
  }

  const myTeam = clientTeam === 'V' ? teamV : teamH;
  const theirTeam = clientTeam === 'V' ? teamH : teamV;

  const myGameScore = myTeam.totalScore;
  const theirGameScore = theirTeam.totalScore;

  const mySetScore = clientTeam === 'V' ? setScore.teamVPoints : setScore.teamHPoints;
  const theirSetScore = clientTeam === 'V' ? setScore.teamHPoints : setScore.teamVPoints;

  const myMatchScore = clientTeam === 'V' ? matchProgress.team1SetsWon : matchProgress.team2SetsWon;
  const theirMatchScore = clientTeam === 'V' ? matchProgress.team2SetsWon : matchProgress.team1SetsWon;

  const didClientTeamWin = winningTeam === clientTeam;

  return {
    clientTeam,
    myTeam,
    theirTeam,
    myGameScore,
    theirGameScore,
    mySetScore,
    theirSetScore,
    myMatchScore,
    theirMatchScore,
    didClientTeamWin,
    winner
  };
}

function getSoloViewData(gameEndState: any) {
  const defaultViewData = {
    players: [
      { id: 0, name: '', gameScore: 0, setScore: 0, matchScore: 0 },
      { id: 1, name: '', gameScore: 0, setScore: 0, matchScore: 0 },
      { id: 2, name: '', gameScore: 0, setScore: 0, matchScore: 0 },
      { id: 3, name: '', gameScore: 0, setScore: 0, matchScore: 0 }
    ],
    winner: { id: -1, name: 'Unknown' }
  };

  if (!gameEndState) return defaultViewData;

  const winner = gameEndState.winner || { id: -1, name: 'Unknown' };

  // Handle two possible payloads:
  // 1. Simple payload: { winner, scores: [{ playerId, playerName, score }] }
  // 2. Full GameEndState: { winner, teamV, teamH, setScore, matchProgress }

  let players: any[] = [];

  if (gameEndState.scores && Array.isArray(gameEndState.scores)) {
    // Simple payload from GameEngine
    players = gameEndState.scores.map((s: any) => ({
      id: s.playerId,
      name: s.playerName,
      gameScore: s.score,
      setScore: 0,
      matchScore: 0
    }));
  } else if (gameEndState.teamV && gameEndState.teamH) {
    // Full GameEndState structure
    const allPlayers = [
      ...gameEndState.teamV.players,
      ...gameEndState.teamH.players
    ];

    players = allPlayers.map(p => ({
      id: p.id,
      name: p.name,
      gameScore: p.score,
      setScore: gameEndState.setScore?.teamVPoints ?? 0,
      matchScore: gameEndState.matchProgress?.team1SetsWon ?? 0
    })).sort((a, b) => a.id - b.id);
  }

  return {
    players: players.length > 0 ? players : defaultViewData.players,
    winner
  };
}

function TeamModeView({ gameEndState, thisPlayerId, onContinue, onLeave }: any) {
  const viewData = getTeamViewData(gameEndState, thisPlayerId);
  const myTeamNames = `${viewData.myTeam.players[0].name} & ${viewData.myTeam.players[1].name}`;
  const theirTeamNames = `${viewData.theirTeam.players[0].name} & ${viewData.theirTeam.players[1].name}`;

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.title}>
          🏆 {viewData.didClientTeamWin ? 'NOUS GAGNONS!' : 'EUX GAGNENT!'}
        </Text>
        <Text style={styles.winner}>
          🎯 {viewData.winner.name} wins!
        </Text>
      </View>

      <Text style={styles.vsText}>
        {myTeamNames} VS {theirTeamNames}
      </Text>

      <View style={styles.scoreTable}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableCell, styles.tableLabelCell]}>Type</Text>
          <Text style={[styles.tableCell, styles.tableHeaderCell]}>NOUS</Text>
          <Text style={[styles.tableCell, styles.tableHeaderCell]}>EUX</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableLabelCell]}>Game</Text>
          <Text style={[styles.tableCell, styles.tableValueCell]}>
            {viewData.myGameScore}
          </Text>
          <Text style={[styles.tableCell, styles.tableValueCell]}>
            {viewData.theirGameScore}
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableLabelCell]}>Set</Text>
          <Text style={[styles.tableCell, styles.tableValueCell, styles.setScore]}>
            {viewData.mySetScore}
          </Text>
          <Text style={[styles.tableCell, styles.tableValueCell, styles.setScore]}>
            {viewData.theirSetScore}
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableLabelCell]}>Match</Text>
          <Text style={[styles.tableCell, styles.tableValueCell, styles.matchScore]}>
            {viewData.myMatchScore}
          </Text>
          <Text style={[styles.tableCell, styles.tableValueCell, styles.matchScore]}>
            {viewData.theirMatchScore}
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={onContinue}>
          <Text style={styles.buttonText}>▶️ Continuer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onLeave}>
          <Text style={styles.secondaryButtonText}>🏠 Quitter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SoloModeView({ gameEndState, onContinue, onLeave }: any) {
  const viewData = getSoloViewData(gameEndState);

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.title}>🏆 FIN DU JEU</Text>
        <Text style={styles.winner}>🎯 {viewData.winner.name} gagne!</Text>
      </View>

      <View style={styles.scoreTable}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableCell, { flex: 1.2 }, styles.tableLabelCell]}>
            Joueur
          </Text>
          <Text style={[styles.tableCell, styles.tableHeaderCell]}>Game</Text>
          <Text style={[styles.tableCell, styles.tableHeaderCell]}>Set</Text>
          <Text style={[styles.tableCell, styles.tableHeaderCell]}>Match</Text>
        </View>

        {viewData.players.map((player: any) => (
          <View key={player.id} style={styles.tableRow}>
            <Text
              style={[
                styles.tableCell,
                { flex: 1.2 },
                styles.tableLabelCell,
                player.id === viewData.winner.id && styles.winnerRow
              ]}
            >
              {player.name}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.tableValueCell,
                player.id === viewData.winner.id && styles.winnerScore
              ]}
            >
              {player.gameScore}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.tableValueCell,
                styles.setScore,
                player.id === viewData.winner.id && styles.winnerScore
              ]}
            >
              {player.setScore}
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.tableValueCell,
                styles.matchScore,
                player.id === viewData.winner.id && styles.winnerScore
              ]}
            >
              {player.matchScore}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={onContinue}>
          <Text style={styles.buttonText}>▶️ Continuer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onLeave}>
          <Text style={styles.secondaryButtonText}>🏠 Quitter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function GameEndModal({
  visible,
  gameEndState = null,
  thisPlayerId = null,
  mode = 'solo',
  onContinue,
  onLeave,
  winnerName = 'Unknown'
}: GameEndModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {mode === 'team' ? (
            <TeamModeView
              gameEndState={gameEndState}
              thisPlayerId={thisPlayerId}
              onContinue={onContinue}
              onLeave={onLeave}
            />
          ) : (
            <SoloModeView
              gameEndState={gameEndState}
              onContinue={onContinue}
              onLeave={onLeave}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  container: {
    backgroundColor: '#FAEBD7',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#D4AF37',
    width: '90%',
    maxWidth: 400,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3D2817',
    marginBottom: 8,
  },
  winner: {
    fontSize: 18,
    color: '#D4AF37',
    fontWeight: '600',
  },
  vsText: {
    fontSize: 12,
    color: '#3D2817',
    textAlign: 'center',
    marginBottom: 16,
  },
  scoreTable: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B6F47',
    marginBottom: 20,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#D4AF37',
    borderBottomWidth: 1,
    borderBottomColor: '#8B6F47',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#8B6F47',
  },
  tableCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableLabelCell: {
    fontWeight: '500',
    color: '#3D2817',
    fontSize: 12,
  },
  tableHeaderCell: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#3D2817',
    fontSize: 12,
  },
  tableValueCell: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
    color: '#3D2817',
  },
  setScore: {
    color: '#D4AF37',
  },
  matchScore: {
    color: '#8B6F47',
  },
  winnerRow: {
    backgroundColor: '#FFF8DC',
    fontWeight: 'bold',
  },
  winnerScore: {
    backgroundColor: '#FFF8DC',
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    backgroundColor: '#D4AF37',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#8B6F47',
  },
  buttonText: {
    color: '#3D2817',
    fontSize: 14,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#FAEBD7',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
