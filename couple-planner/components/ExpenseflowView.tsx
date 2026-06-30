import { format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PlanCategoryTheme, PlansUI } from '@/constants/plansTheme';
import { Theme } from '@/constants/Theme';
import { useApp } from '@/context/AppContext';
import { AddExpenseInput, Expense, ExpensePaidBy, ExpenseSplitType } from '@/types';
import {
  balancePerspectiveFromMyView,
  computeExpenseBalance,
  expenseOwedFromMyView,
  formatMoney,
  netBalance,
  netFromMyView,
  owedAmountForExpense,
  splitTypeLabel,
} from '@/utils/expenseBalance';
import { partitionExpenses, SETTLED_HISTORY_DAYS, settledAtDate } from '@/utils/expenseHistory';
import { firstName, participantLabel } from '@/utils/participant';

interface ExpenseflowViewProps {
  theme: PlanCategoryTheme;
  mySlot: 1 | 2 | null;
  addExpense: (input: AddExpenseInput) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  settleExpense: (id: string, settled: boolean) => void;
}

function paidByFromChoice(choice: 'me' | 'partner', mySlot: 1 | 2 | null): ExpensePaidBy {
  const slot = mySlot ?? 1;
  if (choice === 'me') return slot === 1 ? 'partner1' : 'partner2';
  return slot === 1 ? 'partner2' : 'partner1';
}

function paidByToChoice(paidBy: ExpensePaidBy, mySlot: 1 | 2 | null): 'me' | 'partner' {
  const slot = mySlot ?? 1;
  if (slot === 1) return paidBy === 'partner1' ? 'me' : 'partner';
  return paidBy === 'partner2' ? 'me' : 'partner';
}

function perspectiveColors(perspective: 'owe' | 'credit' | 'neutral') {
  if (perspective === 'owe') {
    return {
      backgroundColor: PlansUI.oweLight,
      borderColor: PlansUI.owe,
      textColor: PlansUI.oweDark,
    };
  }
  if (perspective === 'credit') {
    return {
      backgroundColor: PlansUI.creditLight,
      borderColor: PlansUI.credit,
      textColor: PlansUI.creditDark,
    };
  }
  return null;
}

export default function ExpenseflowView({
  theme,
  mySlot,
  addExpense,
  updateExpense,
  deleteExpense,
  settleExpense,
}: ExpenseflowViewProps) {
  const { profile, expenses } = useApp();

  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [notes, setNotes] = useState('');
  const [paidByChoice, setPaidByChoice] = useState<'me' | 'partner'>('me');
  const [splitType, setSplitType] = useState<ExpenseSplitType>('split');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const p1Name = firstName(profile.partner1Name);
  const p2Name = firstName(profile.partner2Name);
  const partnerName = mySlot === 2 ? p1Name : mySlot === 1 ? p2Name : p2Name;

  const { accent, accentDark, accentLight, accentMuted } = theme;

  const { open: unsettled, history: settledHistory } = useMemo(
    () => partitionExpenses(expenses),
    [expenses]
  );
  const balance = useMemo(() => computeExpenseBalance(expenses), [expenses]);
  const net = netBalance(balance);

  const splitOptions: { key: ExpenseSplitType; label: string }[] = [
    { key: 'split', label: 'Split 50/50' },
    { key: 'partner1_owes', label: `${p1Name} owes full` },
    { key: 'partner2_owes', label: `${p2Name} owes full` },
  ];

  const resetForm = () => {
    setDescription('');
    setAmountText('');
    setNotes('');
    setPaidByChoice('me');
    setSplitType('split');
    setEditing(null);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setDescription(expense.description);
    setAmountText(String(expense.amount));
    setNotes(expense.notes ?? '');
    setPaidByChoice(paidByToChoice(expense.paidBy, mySlot));
    setSplitType(expense.splitType);
  };

  const handleSave = () => {
    const trimmed = description.trim();
    const amount = parseFloat(amountText.replace(/[^0-9.]/g, ''));
    if (!trimmed) {
      Alert.alert('Missing description', 'What was this expense for?');
      return;
    }
    if (!amount || amount <= 0 || Number.isNaN(amount)) {
      Alert.alert('Invalid amount', 'Enter a valid dollar amount.');
      return;
    }

    const payload: AddExpenseInput = {
      description: trimmed,
      amount: Math.round(amount * 100) / 100,
      paidBy: paidByFromChoice(paidByChoice, mySlot),
      splitType,
      notes: notes.trim() || undefined,
    };

    if (editing) {
      updateExpense({
        ...editing,
        ...payload,
      });
    } else {
      addExpense(payload);
    }
    resetForm();
  };

  const renderBalanceSummary = () => {
    if (unsettled.length === 0) return null;

    const fromMyView = netFromMyView(net, mySlot);
    const perspective = balancePerspectiveFromMyView(net, mySlot);
    const colors = perspectiveColors(perspective);

    let summaryText: string;
    if (perspective === 'neutral') {
      summaryText = 'All settled up — you’re even!';
    } else if (perspective === 'credit') {
      summaryText = `${partnerName} owes you ${formatMoney(fromMyView)}`;
    } else {
      summaryText = `You owe ${partnerName} ${formatMoney(Math.abs(fromMyView))}`;
    }

    return (
      <View
        style={[
          styles.balanceCard,
          {
            backgroundColor: colors?.backgroundColor ?? accentMuted,
            borderColor: colors?.borderColor ?? accentLight,
          },
        ]}>
        <Text style={[styles.balanceLabel, { color: colors?.textColor ?? accentDark }]}>Balance</Text>
        <Text style={[styles.balanceAmount, { color: colors?.textColor ?? accentDark }]}>
          {summaryText}
        </Text>
        {unsettled.length > 0 && (
          <Text style={styles.balanceHint}>
            {unsettled.length} open expense{unsettled.length === 1 ? '' : 's'} · settle up via Zelle or Venmo
          </Text>
        )}
      </View>
    );
  };

  const renderOwedLine = (expense: Expense) => {
    const owed = owedAmountForExpense(expense);
    const slot = mySlot ?? 1;
    const oweColor = PlansUI.oweDark;
    const creditColor = PlansUI.creditDark;

    if (owed.partner2OwesPartner1 > 0) {
      const amount = formatMoney(owed.partner2OwesPartner1);
      const iAmCreditor = slot === 1;
      const iAmDebtor = slot === 2;
      return (
        <Text style={styles.cardOwed}>
          <Text style={{ color: iAmDebtor ? oweColor : Theme.text }}>{p2Name}</Text>
          <Text style={{ color: Theme.textSecondary }}> owes </Text>
          <Text style={{ color: iAmCreditor ? creditColor : Theme.text }}>{p1Name}</Text>
          <Text style={{ color: iAmDebtor ? oweColor : iAmCreditor ? creditColor : Theme.text }}>
            {' '}
            {amount}
          </Text>
        </Text>
      );
    }

    if (owed.partner1OwesPartner2 > 0) {
      const amount = formatMoney(owed.partner1OwesPartner2);
      const iAmCreditor = slot === 2;
      const iAmDebtor = slot === 1;
      return (
        <Text style={styles.cardOwed}>
          <Text style={{ color: iAmDebtor ? oweColor : Theme.text }}>{p1Name}</Text>
          <Text style={{ color: Theme.textSecondary }}> owes </Text>
          <Text style={{ color: iAmCreditor ? creditColor : Theme.text }}>{p2Name}</Text>
          <Text style={{ color: iAmDebtor ? oweColor : iAmCreditor ? creditColor : Theme.text }}>
            {' '}
            {amount}
          </Text>
        </Text>
      );
    }

    return null;
  };

  const renderExpense = (expense: Expense, inHistory = false) => {
    const perspective = expenseOwedFromMyView(expense, mySlot);
    const cardTint = perspectiveColors(perspective);

    return (
      <View
        key={expense.id}
        style={[
          styles.card,
          PlansUI.cardShadow,
          {
            borderColor: cardTint?.borderColor ?? accentLight,
            backgroundColor: cardTint?.backgroundColor ?? Theme.surface,
          },
          expense.settled && styles.cardSettled,
        ]}>
        <View style={styles.cardTop}>
          <View style={styles.cardBody}>
            <Text style={[styles.cardTitle, expense.settled && styles.cardTitleSettled]}>
              {expense.description}
            </Text>
            <Text style={[styles.cardAmount, { color: accentDark }]}>{formatMoney(expense.amount)}</Text>
            <Text style={styles.cardMeta}>
              Paid by {participantLabel(expense.paidBy, profile)} ·{' '}
              {splitTypeLabel(expense.splitType, profile.partner1Name, profile.partner2Name)}
            </Text>
            {!expense.settled && renderOwedLine(expense)}
            {expense.settled && <Text style={styles.settledBadge}>Paid / settled</Text>}
            {expense.notes ? <Text style={styles.cardNotes}>{expense.notes}</Text> : null}
            <Text style={styles.cardDate}>
              {inHistory
                ? `Settled ${format(settledAtDate(expense), 'MMM d, yyyy')}`
                : format(parseISO(expense.createdAt), 'MMM d, yyyy')}
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          {!inHistory && (
            <Pressable onPress={() => settleExpense(expense.id, true)}>
              <Text style={[styles.settleLink, { color: accent }]}>Mark settled</Text>
            </Pressable>
          )}
          {!inHistory && (
            <Pressable onPress={() => openEdit(expense)}>
              <Text style={[styles.editLink, { color: accent }]}>Edit</Text>
            </Pressable>
          )}
          {inHistory && (
            <Pressable onPress={() => settleExpense(expense.id, false)}>
              <Text style={[styles.settleLink, { color: accent }]}>Reopen</Text>
            </Pressable>
          )}
          <Pressable onPress={() => setDeleteTarget(expense)}>
            <Text style={styles.deleteLink}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderBalanceSummary()}

      {unsettled.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Open</Text>
          {unsettled.map((e) => renderExpense(e))}
        </>
      )}

      {settledHistory.length > 0 && (
        <View style={styles.historySection}>
          <Pressable style={styles.historyToggle} onPress={() => setHistoryOpen(!historyOpen)}>
            <Text style={styles.historyToggleText}>
              History · last {SETTLED_HISTORY_DAYS} days ({settledHistory.length})
            </Text>
            <Text style={[styles.historyChevron, { color: accent }]}>{historyOpen ? '▴' : '▾'}</Text>
          </Pressable>
          {historyOpen && settledHistory.map((e) => renderExpense(e, true))}
        </View>
      )}

      {unsettled.length === 0 && settledHistory.length === 0 && (
        <View style={[styles.empty, { backgroundColor: accentMuted, borderColor: accentLight }]}>
          <Text style={styles.emptyEmoji}>{theme.icon}</Text>
          <Text style={[styles.emptyText, { color: accentDark }]}>No expenses yet</Text>
          <Text style={styles.emptySubtext}>Track who paid and split costs like Splitwise</Text>
        </View>
      )}

      <View style={[styles.addCard, { borderColor: accentLight, backgroundColor: accentMuted }]}>
        <Text style={[styles.addTitle, { color: accentDark }]}>
          {editing ? 'Edit expense' : 'Add expense'}
        </Text>

        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="What was it for? (e.g. Dinner, Groceries)"
          placeholderTextColor={Theme.textSecondary}
        />

        <TextInput
          style={styles.input}
          value={amountText}
          onChangeText={setAmountText}
          placeholder="Amount ($)"
          placeholderTextColor={Theme.textSecondary}
          keyboardType="decimal-pad"
        />

        <Text style={styles.fieldLabel}>Who paid?</Text>
        <View style={styles.chipRow}>
          {(
            [
              { key: 'me' as const, label: 'Me' },
              { key: 'partner' as const, label: partnerName },
            ] as const
          ).map(({ key, label }) => (
            <Pressable
              key={key}
              style={[
                styles.chip,
                paidByChoice === key && { backgroundColor: accentLight, borderColor: accent },
              ]}
              onPress={() => setPaidByChoice(key)}>
              <Text
                style={[
                  styles.chipText,
                  paidByChoice === key && { color: accent, fontWeight: '700' },
                ]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Split</Text>
        <View style={styles.chipRow}>
          {splitOptions.map(({ key, label }) => (
            <Pressable
              key={key}
              style={[
                styles.chip,
                splitType === key && { backgroundColor: accentLight, borderColor: accent },
              ]}
              onPress={() => setSplitType(key)}>
              <Text
                style={[
                  styles.chipText,
                  splitType === key && { color: accent, fontWeight: '700' },
                ]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional — e.g. Zelle sent)"
          placeholderTextColor={Theme.textSecondary}
        />

        <View style={styles.formActions}>
          {editing && (
            <Pressable style={styles.cancelBtn} onPress={resetForm}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          )}
          <Pressable style={[styles.saveBtn, { backgroundColor: accent }]} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{editing ? 'Update' : 'Add expense'}</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}>
        <Pressable style={styles.overlay} onPress={() => setDeleteTarget(null)}>
          <Pressable style={styles.popup} onPress={() => {}}>
            <Text style={styles.popupTitle}>Delete expense?</Text>
            <Text style={styles.popupMessage}>
              Remove "{deleteTarget?.description}" ({formatMoney(deleteTarget?.amount ?? 0)})?
            </Text>
            <View style={styles.popupActions}>
              <Pressable style={styles.popupCancel} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.popupCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.popupConfirm, { backgroundColor: PlansUI.delete }]}
                onPress={() => {
                  if (deleteTarget) deleteExpense(deleteTarget.id);
                  setDeleteTarget(null);
                }}>
                <Text style={styles.popupConfirmText}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  balanceCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  balanceLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceAmount: { fontSize: 20, fontWeight: '800', marginTop: 6 },
  balanceHint: { fontSize: 12, color: Theme.textSecondary, marginTop: 6, lineHeight: 18 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Theme.textSecondary, marginBottom: 8 },
  historySection: { marginTop: 16, marginBottom: 8 },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.border,
    marginBottom: 8,
  },
  historyToggleText: { fontSize: 14, fontWeight: '600', color: Theme.textSecondary },
  historyChevron: { fontSize: 12, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 17, fontWeight: '700' },
  emptySubtext: { fontSize: 14, color: Theme.textSecondary, marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: Theme.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  cardSettled: { opacity: 0.75 },
  cardTop: { flexDirection: 'row' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Theme.text },
  cardTitleSettled: { textDecorationLine: 'line-through', color: Theme.textSecondary },
  cardAmount: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  cardMeta: { fontSize: 12, color: Theme.textSecondary, marginTop: 6, lineHeight: 18 },
  cardOwed: { fontSize: 13, fontWeight: '700', marginTop: 6, lineHeight: 18 },
  settledBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.textSecondary,
    marginTop: 6,
  },
  cardNotes: { fontSize: 13, color: Theme.textSecondary, marginTop: 6, fontStyle: 'italic' },
  cardDate: { fontSize: 11, color: Theme.textSecondary, marginTop: 6 },
  cardActions: { flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' },
  settleLink: { fontSize: 13, fontWeight: '700' },
  editLink: { fontSize: 13, fontWeight: '600' },
  deleteLink: { fontSize: 13, fontWeight: '600', color: PlansUI.delete },
  addCard: {
    marginTop: 20,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
  },
  addTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  input: {
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Theme.text,
    borderWidth: 1,
    borderColor: Theme.border,
    marginBottom: 10,
  },
  notesInput: { marginTop: 4 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Theme.background,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  saveBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  cancelBtnText: { color: Theme.textSecondary, fontWeight: '600' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  popup: {
    backgroundColor: Theme.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  popupTitle: { fontSize: 18, fontWeight: '700', color: Theme.text, marginBottom: 8 },
  popupMessage: { fontSize: 15, color: Theme.textSecondary, lineHeight: 22, marginBottom: 24 },
  popupActions: { flexDirection: 'row', gap: 12 },
  popupCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.border,
  },
  popupCancelText: { fontSize: 15, fontWeight: '600', color: Theme.textSecondary },
  popupConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  popupConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
