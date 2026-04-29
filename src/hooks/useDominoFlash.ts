import { useEffect, useState } from 'react';

interface DominoFlashState {
  isFlashing: boolean;
  flashOpacity: number;
}

let globalFlashState: DominoFlashState = {
  isFlashing: false,
  flashOpacity: 1,
};

let subscribers: ((state: DominoFlashState) => void)[] = [];

/**
 * Hook pour flasher les dominos du plateau central
 * Utilisé par le Buzz Button
 */
export function useDominoFlash() {
  const [flashState, setFlashState] = useState<DominoFlashState>(globalFlashState);

  useEffect(() => {
    // Subscribe aux changements de flash state
    subscribers.push(setFlashState);
    return () => {
      subscribers = subscribers.filter((sub) => sub !== setFlashState);
    };
  }, []);

  const triggerFlash = () => {
    // Démarrer le flash
    globalFlashState.isFlashing = true;
    broadcastState();

    // Animer le flash
    const animationDuration = 500; // ms
    const steps = 20;
    let step = 0;

    const animInterval = setInterval(() => {
      step = (step + 1) % (steps * 2);
      const phase = step < steps
        ? step / steps           // 0 → 1
        : (steps * 2 - step) / steps; // 1 → 0

      // Opacité: 0.3 (sombre) → 1 (brillant) → 0.3
      globalFlashState.flashOpacity = 0.3 + phase * 0.7;
      broadcastState();

      // Arrêter après une pulsation complète
      if (step === 0 && step > 0) {
        clearInterval(animInterval);
        globalFlashState.isFlashing = false;
        globalFlashState.flashOpacity = 1;
        broadcastState();
      }
    }, animationDuration / steps);

    // Timeout de sécurité
    setTimeout(() => {
      clearInterval(animInterval);
      globalFlashState.isFlashing = false;
      globalFlashState.flashOpacity = 1;
      broadcastState();
    }, animationDuration);
  };

  return {
    isFlashing: flashState.isFlashing,
    flashOpacity: flashState.flashOpacity,
    triggerFlash,
  };
}

/**
 * Broadcast l'état de flash à tous les subscribers
 */
function broadcastState() {
  subscribers.forEach((sub) => sub({ ...globalFlashState }));
}
