import { parseISO, subDays } from 'date-fns';

import { Expense } from '@/types';

export const SETTLED_HISTORY_DAYS = 30;

export function settledAtDate(expense: Expense): Date {
  const raw = expense.settledAt ?? expense.createdAt;
  return parseISO(raw);
}

export function isSettledWithinHistory(expense: Expense, now = new Date()): boolean {
  if (!expense.settled) return false;
  const cutoff = subDays(now, SETTLED_HISTORY_DAYS);
  return settledAtDate(expense) >= cutoff;
}

/** Remove settled expenses older than 30 days. */
export function pruneOldSettledExpenses(expenses: Expense[], now = new Date()): Expense[] {
  return expenses.filter((e) => !e.settled || isSettledWithinHistory(e, now));
}

export function partitionExpenses(expenses: Expense[], now = new Date()) {
  const open = expenses.filter((e) => !e.settled);
  const history = expenses
    .filter((e) => e.settled && isSettledWithinHistory(e, now))
    .sort((a, b) => settledAtDate(b).getTime() - settledAtDate(a).getTime());
  return { open, history };
}
