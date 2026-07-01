import {
  endOfMonth,
  format,
  getDaysInMonth,
  startOfMonth,
} from 'date-fns';

import { EventCategoryConfig } from '@/types';
import { CalendarEvent } from '@/types';
import { getEventEndDate } from '@/utils/calendarEvents';

export interface SubcategoryStats {
  sessions: number;
  days: number;
  minutes: number;
  hours: number;
}

export interface CategoryMonthlyStats {
  uniqueDays: number;
  weeklyGoalDays: number;
  monthlyGoalDays: number;
  percentage: number;
  hasGoal: boolean;
  totalMinutes: number;
  totalHours: number;
  subcategories: Record<string, SubcategoryStats>;
}

export function getMonthlyGoalDays(weeklyDays: number, month: Date): number {
  if (weeklyDays <= 0) return 0;
  return Math.round((getDaysInMonth(month) / 7) * weeklyDays);
}

export function computeGoalPercentage(achievedDays: number, goalDays: number): number {
  if (goalDays <= 0) return 0;
  return Math.min(100, Math.round((achievedDays / goalDays) * 100));
}

export function filterEventsForMonth(events: CalendarEvent[], month: Date): CalendarEvent[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');
  return events.filter((e) => {
    const eventEnd = e.endDate && e.endDate >= e.date ? e.endDate : e.date;
    return eventEnd >= startStr && e.date <= endStr;
  });
}

export function computeCategoryStats(
  events: CalendarEvent[],
  category: EventCategoryConfig,
  weeklyGoalDays: number,
  month: Date
): CategoryMonthlyStats {
  const weeklyGoal = Math.max(0, weeklyGoalDays ?? 0);
  const monthlyGoalDays = getMonthlyGoalDays(weeklyGoal, month);
  const categoryEvents = events.filter((e) => e.category === category.key);
  const uniqueDaySet = new Set<string>();
  categoryEvents.forEach((e) => {
    uniqueDaySet.add(e.date);
    const end = getEventEndDate(e);
    if (end > e.date) uniqueDaySet.add(end);
  });
  const uniqueDays = uniqueDaySet.size;
  const hasGoal = monthlyGoalDays > 0;
  const percentage = computeGoalPercentage(uniqueDays, monthlyGoalDays);

  const totalMinutes = categoryEvents.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

  const subcategories: Record<string, SubcategoryStats> = {};
  category.subcategories.forEach(({ key }) => {
    const subEvents = categoryEvents.filter((e) => e.subcategory === key);
    const minutes = subEvents.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);
    subcategories[key] = {
      sessions: subEvents.length,
      days: new Set(subEvents.map((e) => e.date)).size,
      minutes,
      hours: Math.round((minutes / 60) * 10) / 10,
    };
  });

  categoryEvents.forEach((event) => {
    if (subcategories[event.subcategory]) return;
    const minutes = event.durationMinutes ?? 0;
    subcategories[event.subcategory] = {
      sessions: 1,
      days: 1,
      minutes,
      hours: Math.round((minutes / 60) * 10) / 10,
    };
  });

  return {
    uniqueDays,
    weeklyGoalDays: weeklyGoal,
    monthlyGoalDays,
    percentage,
    hasGoal,
    totalMinutes,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    subcategories,
  };
}

export function formatHours(hours: number): string {
  if (hours === 0) return '0 hrs';
  return hours === 1 ? '1 hr' : `${hours} hrs`;
}
