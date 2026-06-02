import React, { useEffect } from 'react';
import { StyleSheet, StatusBar } from 'react-native';
import { MobileGameBoard } from '../components/Board/MobileGameBoard';
import { useAllPlayers } from '../store/gameSelectors';

interface GameScreenProps {
  onBackToHome?: () => void;
}

export function GameScreen({ onBackToHome }: GameScreenProps) {
  const players = useAllPlayers();

  useEffect(() => {
    StatusBar.setHidden(true, 'slide');
    return () => StatusBar.setHidden(false, 'slide');
  }, []);

  if (players.length < 4) {
    return null;
  }

  return <MobileGameBoard thisPlayerId={0} onBackToHome={onBackToHome} />;
}

const styles = StyleSheet.create({});
