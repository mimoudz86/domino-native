import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, Polygon } from 'react-native-svg';
import type { Domino } from '../shared/Domino';

interface DominoViewProps {
  domino: Domino;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  vertical?: boolean;
}

const SIZES = {
  small: { width: 64, height: 32, containerWidth: 64, containerHeight: 32 },
  medium: { width: 72, height: 36, containerWidth: 72, containerHeight: 36 },
  large: { width: 80, height: 40, containerWidth: 80, containerHeight: 40 },
};

// Vertical sizes (swapped)
const VERTICAL_SIZES = {
  small: { width: 32, height: 64, containerWidth: 32, containerHeight: 64 },
  medium: { width: 36, height: 72, containerWidth: 36, containerHeight: 72 },
  large: { width: 40, height: 80, containerWidth: 40, containerHeight: 80 },
};

const pipPositions = {
  0: [] as [number, number][],
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.2], [0.25, 0.5], [0.25, 0.8], [0.75, 0.2], [0.75, 0.5], [0.75, 0.8]],
} as const;

function DominoDivider({
  width,
  height,
  dividerLength,
  dividerThickness,
  lineColor,
  isHorizontal,
}: {
  width: number;
  height: number;
  dividerLength: number;
  dividerThickness: number;
  lineColor: string;
  isHorizontal: boolean;
}) {
  const L = Math.min(0.95, Math.max(0.60, dividerLength));

  if (isHorizontal) {
    const H = height * L;
    const Y = (height - H) / 2;
    const X1 = width / 2 - dividerThickness / 2;
    const X2 = X1 + dividerThickness;
    const points = `${X1},${Y} ${X2},${Y} ${X2},${Y + H} ${X1},${Y + H}`;
    return (
      <Polygon points={points} fill={lineColor} />
    );
  } else {
    const W = width * L;
    const X = (width - W) / 2;
    const Y1 = height / 2 - dividerThickness / 2;
    const Y2 = Y1 + dividerThickness;
    const points = `${X},${Y1} ${X + W},${Y1} ${X + W},${Y2} ${X},${Y2}`;
    return (
      <Polygon points={points} fill={lineColor} />
    );
  }
}

function DominoSide({
  value,
  size,
  pipThickness,
  lineColor,
  offsetX = 0,
  offsetY = 0,
}: {
  value: number;
  size: number;
  pipThickness: number;
  lineColor: string;
  offsetX?: number;
  offsetY?: number;
}) {
  const radius = size * 0.08 * pipThickness;
  const positions = pipPositions[value as keyof typeof pipPositions];

  return (
    <>
      {positions.map((pos, i) => {
        const [x, y] = pos;
        return (
          <Circle
            key={`pip-${offsetX}-${offsetY}-${i}`}
            cx={x * size + offsetX}
            cy={y * size + offsetY}
            r={radius}
            fill={lineColor}
          />
        );
      })}
    </>
  );
}

export function DominoView({
  domino,
  onPress,
  size = 'medium',
  disabled = false,
  vertical = false,
}: DominoViewProps) {
  const sizeConfig = vertical ? VERTICAL_SIZES[size] : SIZES[size];
  const config = sizeConfig;
  const { width: svgWidth, height: svgHeight } = config;
  const isHorizontal = svgWidth > svgHeight;
  const componentSize = Math.min(svgWidth, svgHeight);

  const lineColor = '#6b5a47';
  const pipThickness = 1.05;
  const dividerLength = 0.8;
  const dividerThickness = 6;

  const touchableComponent = (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={styles.container}
      activeOpacity={0.7}
    >
      <Svg width={config.containerWidth} height={config.containerHeight}>
        {/* Domino shadow layer (bois marron) */}
        <Rect
          x={1}
          y={1}
          width={svgWidth}
          height={svgHeight}
          rx={componentSize * 0.15}
          fill="#c8b89a"
        />

        {/* Domino background (ivoire chaud) */}
        <Rect
          x={0}
          y={0}
          width={svgWidth}
          height={svgHeight}
          rx={componentSize * 0.15}
          fill="#FFF8E8"
        />

        {/* Domino border (bois foncé) */}
        <Rect
          x={0.5}
          y={0.5}
          width={svgWidth - 1}
          height={svgHeight - 1}
          rx={componentSize * 0.14}
          fill="none"
          stroke="#8B7355"
          strokeWidth={1.5}
        />

        {/* Center divider line */}
        <DominoDivider
          width={svgWidth}
          height={svgHeight}
          dividerLength={dividerLength}
          dividerThickness={dividerThickness}
          lineColor={lineColor}
          isHorizontal={isHorizontal}
        />

        {/* Left/Top side pips */}
        <DominoSide
          value={domino.left}
          size={componentSize}
          pipThickness={pipThickness}
          lineColor={lineColor}
          offsetX={isHorizontal ? 0 : 0}
          offsetY={isHorizontal ? 0 : 0}
        />

        {/* Right/Bottom side pips */}
        <DominoSide
          value={domino.right}
          size={componentSize}
          pipThickness={pipThickness}
          lineColor={lineColor}
          offsetX={isHorizontal ? componentSize : 0}
          offsetY={isHorizontal ? 0 : componentSize}
        />
      </Svg>
    </TouchableOpacity>
  );

  return touchableComponent;
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
});
