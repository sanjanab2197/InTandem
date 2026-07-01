import { ReactNode } from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

import { PlanCategory } from '@/types';

interface PlanCategoryIconProps {
  category: PlanCategory;
  color: string;
  size?: number;
}

function IconFrame({ size, children }: { size: number; children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

function ChecklistIcon({ color, size }: { color: string; size: number }) {
  return (
    <IconFrame size={size}>
      <Rect x="5" y="3" width="14" height="18" rx="2.5" stroke={color} strokeWidth="1.75" />
      <Path d="M9 8.5h6M9 12h6M9 15.5h4" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <Polyline
        points="8,8 9.2,9.2 11.5,7"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconFrame>
  );
}

function DateIdeasIcon({ color, size }: { color: string; size: number }) {
  return (
    <IconFrame size={size}>
      <Path
        d="M12 20.5c3.2-2.8 5.5-5.4 5.5-8.4C17.5 8.46 15.04 6 12 6S6.5 8.46 6.5 12.1c0 3 2.3 5.6 5.5 8.4Z"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </IconFrame>
  );
}

function TravelIcon({ color, size }: { color: string; size: number }) {
  return (
    <IconFrame size={size}>
      <Path
        d="M3.5 11.5 20 5.5 16 20l-3.5-6.5L8 16l-4.5-4.5Z"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </IconFrame>
  );
}

function EnrichmentIcon({ color, size }: { color: string; size: number }) {
  return (
    <IconFrame size={size}>
      <Path
        d="M9.5 18h5M10 18V9.8a2 2 0 0 1 4 0V18"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <Path
        d="M8.5 10.5c-2.2-.6-3.5-2-3.5-3.8C5 4.8 7.2 3 12 3s7 1.8 7 3.7c0 1.8-1.3 3.2-3.5 3.8"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </IconFrame>
  );
}

function RemindersIcon({ color, size }: { color: string; size: number }) {
  return (
    <IconFrame size={size}>
      <Path
        d="M12 4.5c-2.8 0-5 2.2-5 5v3.2l-1.5 2.8h13L17 12.7V9.5c0-2.8-2.2-5-5-5Z"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <Path d="M10 18.5a2 2 0 0 0 4 0" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </IconFrame>
  );
}

function ExpenseflowIcon({ color, size }: { color: string; size: number }) {
  return (
    <IconFrame size={size}>
      <Circle cx="8" cy="12" r="4.25" stroke={color} strokeWidth="1.75" />
      <Circle cx="16" cy="12" r="4.25" stroke={color} strokeWidth="1.75" />
      <Line x1="12.2" y1="10.2" x2="11.8" y2="13.8" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </IconFrame>
  );
}

const ICONS: Record<
  PlanCategory,
  React.ComponentType<{ color: string; size: number }>
> = {
  weekly_checklist: ChecklistIcon,
  date_ideas: DateIdeasIcon,
  travel_ideas: TravelIcon,
  enrichment_ideas: EnrichmentIcon,
  reminders: RemindersIcon,
  expenseflow: ExpenseflowIcon,
};

export default function PlanCategoryIcon({ category, color, size = 22 }: PlanCategoryIconProps) {
  const Icon = ICONS[category];
  return <Icon color={color} size={size} />;
}
