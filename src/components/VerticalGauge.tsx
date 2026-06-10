import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

interface VerticalGaugeProps {
  value?: number;   // 0 → 100
  width?: number;
  height?: number;
  radius?: number;
  bgColor?: string;
}

export default function VerticalGauge({
  value = 70,
  width = 40,
  height = 200,
  radius = 20,
  bgColor = '#DDD',
}: VerticalGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const fillHeight = (clamped / 100) * height;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="gauge" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0%" stopColor="#ff0000" />
          <Stop offset="25%" stopColor="#ff8800" />
          <Stop offset="50%" stopColor="#ffd500" />
          <Stop offset="75%" stopColor="#7ed957" />
          <Stop offset="100%" stopColor="#32cd32" />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width={width} height={height} rx={radius} fill={bgColor} />
      <Rect
        x="0"
        y={height - fillHeight}
        width={width}
        height={fillHeight}
        rx={radius}
        fill="url(#gauge)"
      />
    </Svg>
  );
}
