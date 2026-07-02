import Svg, { Circle, Path } from 'react-native-svg';

import { Theme } from '@/constants/Theme';

const BOLD_STROKE = 2.4;

interface IconProps {
  size?: number;
  color?: string;
  secondaryColor?: string;
  bold?: boolean;
}

function strokeWidth(bold?: boolean) {
  return bold ? BOLD_STROKE : 1.8;
}

export function ClockIcon({
  size = 20,
  color = Theme.textSecondary,
  secondaryColor,
  bold = false,
}: IconProps) {
  const sw = strokeWidth(bold);
  const ring = secondaryColor ?? color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.25" stroke={ring} strokeWidth={sw} />
      <Path
        d="M12 8v4.5l3 1.5"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PersonIcon({
  size = 20,
  color = Theme.textSecondary,
  bold = false,
}: IconProps) {
  const sw = strokeWidth(bold);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="3.35" stroke={color} strokeWidth={sw} />
      <Path
        d="M6 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function TagIcon({
  size = 20,
  color = Theme.textSecondary,
  secondaryColor,
  bold = false,
}: IconProps) {
  const sw = strokeWidth(bold);
  const dot = secondaryColor ?? color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5V6.8a1.8 1.8 0 011.8-1.8H12l7 7-6.2 6.2a1.8 1.8 0 01-2.5 0L5 12.5z"
        stroke={color}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <Circle cx="9.5" cy="9.5" r={bold ? 1.35 : 1.1} fill={dot} />
    </Svg>
  );
}

export function SubcategoryIcon({
  size = 20,
  color = Theme.textSecondary,
  secondaryColor,
  bold = false,
}: IconProps) {
  const sw = strokeWidth(bold);
  const nested = secondaryColor ?? color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 10.5V7.2a1.4 1.4 0 011.4-1.4H9.8l4.2 4.2-3.7 3.7a1.4 1.4 0 01-1.9 0L5 10.5z"
        stroke={color}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <Circle cx="8.3" cy="8.3" r={bold ? 1.1 : 0.9} fill={color} />
      <Path
        d="M12.5 17.2V14a1.3 1.3 0 011.3-1.3h1.6l4 4-3.3 3.3a1.3 1.3 0 01-1.7 0l-1.9-1.9z"
        stroke={nested}
        strokeWidth={bold ? sw - 0.2 : 1.7}
        strokeLinejoin="round"
      />
      <Circle cx="14.8" cy="14.2" r={bold ? 1 : 0.8} fill={nested} />
    </Svg>
  );
}

export function LinesIcon({
  size = 20,
  color = Theme.textSecondary,
  bold = false,
}: IconProps) {
  const sw = strokeWidth(bold);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 7h14" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M5 12h10" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M5 17h14" stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
}
