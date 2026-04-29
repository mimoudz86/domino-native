import { useEffect, useState } from 'react';

interface UsePlayerFlashProps {
  enabled?: boolean;
  cycleDuration?: number; // ms per player
}

/**
 * Hook pour faire flasher les zones de joueurs en boucle
 * Cycle: Alice (0) → Bob (1) → Charlie (2) → Diana (3) → repeat
 *
 * Retourne:
 * - isFlashing: true si ce joueur doit flasher maintenant
 * - flashOpacity: opacité animée (0.5 to 1)
 * - borderColor: couleur de bordure quand flashe
 */
export function usePlayerFlash(
  playerId: number,
  { enabled = true, cycleDuration = 3000 }: UsePlayerFlashProps = {}
) {
  const [currentFlashingPlayerId, setCurrentFlashingPlayerId] = useState(0);
  const [flashPhase, setFlashPhase] = useState(0); // 0-1 pour l'animation

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      // Changer le joueur qui flashe chaque 3 secondes
      setCurrentFlashingPlayerId((prev) => (prev + 1) % 4);

      // Réinitialiser la phase de flash
      setFlashPhase(0);
    }, cycleDuration);

    return () => clearInterval(interval);
  }, [enabled, cycleDuration]);

  // Animation de flash: 0.5 → 1 → 0.5 (pulsation)
  useEffect(() => {
    if (!enabled || currentFlashingPlayerId !== playerId) return;

    const animationDuration = 300; // ms
    const steps = 10;
    let step = 0;

    const animInterval = setInterval(() => {
      step = (step + 1) % (steps * 2);
      const phase = step < steps
        ? step / steps           // 0 → 1
        : (steps * 2 - step) / steps; // 1 → 0
      setFlashPhase(phase);
    }, animationDuration / steps);

    return () => clearInterval(animInterval);
  }, [enabled, currentFlashingPlayerId, playerId]);

  const isFlashing = enabled && currentFlashingPlayerId === playerId;

  // Opacité: 0.5 (sombre) → 1 (brillant) → 0.5
  const flashOpacity = isFlashing ? 0.5 + flashPhase * 0.5 : 1;

  // Couleur de bordure: blanc vif quand flashe (meilleur contraste)
  const borderColor = isFlashing ? '#ffffff' : undefined;
  const borderOpacity = isFlashing ? flashOpacity : 1;

  return {
    isFlashing,
    flashOpacity,
    borderColor,
    borderOpacity,
  };
}
