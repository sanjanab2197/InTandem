import { Expense, ExpenseSplitType } from '@/types';

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2).replace(/\.00$/, '')}`;
}

export interface ExpenseBalance {
  /** How much partner1 owes partner2 */
  partner1OwesPartner2: number;
  /** How much partner2 owes partner1 */
  partner2OwesPartner1: number;
}

export function computeExpenseBalance(expenses: Expense[]): ExpenseBalance {
  let partner1OwesPartner2 = 0;
  let partner2OwesPartner1 = 0;

  for (const expense of expenses) {
    if (expense.settled) continue;

    if (expense.splitType === 'split') {
      const share = expense.amount / 2;
      if (expense.paidBy === 'partner1') {
        partner2OwesPartner1 += share;
      } else {
        partner1OwesPartner2 += share;
      }
      continue;
    }

    if (expense.splitType === 'partner1_owes') {
      partner1OwesPartner2 += expense.amount;
      continue;
    }

    partner2OwesPartner1 += expense.amount;
  }

  return { partner1OwesPartner2, partner2OwesPartner1 };
}

export function netBalance(balance: ExpenseBalance): number {
  return balance.partner2OwesPartner1 - balance.partner1OwesPartner2;
}

export function splitTypeLabel(
  splitType: ExpenseSplitType,
  partner1Name: string,
  partner2Name: string
): string {
  const p1 = partner1Name.trim().split(/\s+/)[0] || partner1Name;
  const p2 = partner2Name.trim().split(/\s+/)[0] || partner2Name;
  if (splitType === 'split') return 'Split 50/50';
  if (splitType === 'partner1_owes') return `${p1} owes full amount`;
  return `${p2} owes full amount`;
}

export function owedAmountForExpense(expense: Expense): {
  partner1OwesPartner2: number;
  partner2OwesPartner1: number;
} {
  if (expense.settled) {
    return { partner1OwesPartner2: 0, partner2OwesPartner1: 0 };
  }

  if (expense.splitType === 'split') {
    const share = expense.amount / 2;
    if (expense.paidBy === 'partner1') {
      return { partner1OwesPartner2: 0, partner2OwesPartner1: share };
    }
    return { partner1OwesPartner2: share, partner2OwesPartner1: 0 };
  }

  if (expense.splitType === 'partner1_owes') {
    return { partner1OwesPartner2: expense.amount, partner2OwesPartner1: 0 };
  }

  return { partner1OwesPartner2: 0, partner2OwesPartner1: expense.amount };
}

export type ExpenseOwedPerspective = 'owe' | 'credit' | 'neutral';

export function netFromMyView(net: number, mySlot: 1 | 2 | null): number {
  return mySlot === 2 ? -net : net;
}

export function balancePerspectiveFromMyView(
  net: number,
  mySlot: 1 | 2 | null
): ExpenseOwedPerspective {
  const fromMyView = netFromMyView(net, mySlot);
  if (Math.abs(fromMyView) < 0.01) return 'neutral';
  return fromMyView > 0 ? 'credit' : 'owe';
}

export function expenseOwedFromMyView(
  expense: Expense,
  mySlot: 1 | 2 | null
): ExpenseOwedPerspective {
  if (expense.settled) return 'neutral';

  const owed = owedAmountForExpense(expense);
  const slot = mySlot ?? 1;
  const iOwe = slot === 1 ? owed.partner1OwesPartner2 : owed.partner2OwesPartner1;
  const owedToMe = slot === 1 ? owed.partner2OwesPartner1 : owed.partner1OwesPartner2;

  if (iOwe > 0.001) return 'owe';
  if (owedToMe > 0.001) return 'credit';
  return 'neutral';
}
