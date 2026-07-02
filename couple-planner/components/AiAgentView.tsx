import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { isGeminiConfigured } from '@/constants/geminiConfig';
import { PlanCategoryTheme, PlansUI } from '@/constants/plansTheme';
import { Theme } from '@/constants/Theme';
import { AddPlanItemInput } from '@/types';
import {
  consumeAiAgentRequest,
  getAiAgentDailyLimit,
  getAiAgentRemainingToday,
} from '@/utils/aiAgentUsage';
import {
  generateTravelItinerary,
  itineraryToPlanInputs,
  TravelBudgetLevel,
  TravelItineraryResult,
} from '@/utils/geminiTravelItinerary';

interface AiAgentViewProps {
  theme: PlanCategoryTheme;
  onAddToTravel: (inputs: AddPlanItemInput[]) => void;
  onOpenTravel?: () => void;
}

const DAY_PRESETS = [
  { key: '2', label: '2 days' },
  { key: '3', label: '3 days' },
  { key: '4', label: '4 days' },
  { key: '5', label: '5 days' },
  { key: '7', label: '1 week' },
  { key: '10', label: '10 days' },
  { key: '14', label: '2 weeks' },
  { key: 'custom', label: 'Custom…' },
] as const;

const BUDGET_OPTIONS: { key: TravelBudgetLevel; label: string }[] = [
  { key: 'budget', label: 'Budget' },
  { key: 'mid', label: 'Mid-range' },
  { key: 'splurge', label: 'Splurge' },
];

function resolveDays(dayKey: string, customDays: string): number | null {
  if (dayKey === 'custom') {
    const n = Number.parseInt(customDays.trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 21) return null;
    return n;
  }
  const n = Number.parseInt(dayKey, 10);
  return Number.isFinite(n) ? n : null;
}

export default function AiAgentView({ theme, onAddToTravel, onOpenTravel }: AiAgentViewProps) {
  const { accent, accentDark, accentLight, accentMuted } = theme;

  const [destination, setDestination] = useState('');
  const [tripName, setTripName] = useState('');
  const [dayKey, setDayKey] = useState<string>('3');
  const [customDays, setCustomDays] = useState('6');
  const [daysOpen, setDaysOpen] = useState(false);
  const [budgetLevel, setBudgetLevel] = useState<TravelBudgetLevel>('mid');
  const [foodPreferences, setFoodPreferences] = useState('');
  const [nightlifePreferences, setNightlifePreferences] = useState('');
  const [generalPreferences, setGeneralPreferences] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TravelItineraryResult | null>(null);
  const [remaining, setRemaining] = useState(getAiAgentDailyLimit('travel'));
  const [saved, setSaved] = useState(false);

  const configured = isGeminiConfigured();
  const resolvedTripName = tripName.trim() || destination.trim();
  const resolvedDays = resolveDays(dayKey, customDays);
  const dayLabel = useMemo(() => {
    if (dayKey === 'custom') {
      const n = resolvedDays;
      return n ? `${n} days` : 'Custom days';
    }
    return DAY_PRESETS.find((d) => d.key === dayKey)?.label ?? `${dayKey} days`;
  }, [dayKey, resolvedDays]);

  useEffect(() => {
    getAiAgentRemainingToday('travel').then(setRemaining);
  }, []);

  const handleGenerate = async () => {
    if (!configured) {
      Alert.alert(
        'API key needed',
        'Add EXPO_PUBLIC_GEMINI_API_KEY to your .env file. Get a free key at Google AI Studio (aistudio.google.com).'
      );
      return;
    }

    if (!destination.trim()) {
      Alert.alert('Destination needed', 'Where are you headed?');
      return;
    }

    if (resolvedDays === null) {
      Alert.alert('Trip length', 'Choose 1–21 days for your trip.');
      return;
    }

    const usage = await consumeAiAgentRequest('travel');
    if (!usage.ok) {
      Alert.alert(
        'Daily limit reached',
        `You can generate up to ${getAiAgentDailyLimit('travel')} itineraries per day on the free tier. Try again tomorrow.`
      );
      setRemaining(0);
      return;
    }
    setRemaining(usage.remaining);

    setLoading(true);
    setSaved(false);
    try {
      const itinerary = await generateTravelItinerary({
        destination: destination.trim(),
        tripName: resolvedTripName,
        days: resolvedDays,
        budgetLevel,
        foodPreferences: foodPreferences.trim() || undefined,
        nightlifePreferences: nightlifePreferences.trim() || undefined,
        generalPreferences: generalPreferences.trim() || undefined,
      });
      setResult(itinerary);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Could not generate', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToTravel = () => {
    if (!result || !resolvedTripName) return;
    const rows = itineraryToPlanInputs(result, resolvedTripName);
    onAddToTravel(
      rows.map((row) => ({
        text: row.text,
        subcategory: row.subcategory,
        tripName: resolvedTripName,
        tags: ['ai-generated'],
      }))
    );
    setSaved(true);
    Alert.alert(
      'Saved to Travel Ideas',
      `Added ${rows.length} items under “${resolvedTripName}”.`,
      onOpenTravel
        ? [
            { text: 'Stay here', style: 'cancel' },
            { text: 'Open Travel Ideas', onPress: onOpenTravel },
          ]
        : [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: accentDark }]}>Plan a trip</Text>
        <Text style={styles.subtitle}>
          Build a full itinerary — days, dining, bars, packing, and budget — then save it to Travel
          Ideas.
        </Text>
        <Text style={styles.quota}>
          {remaining}/{getAiAgentDailyLimit('travel')} generations left today
        </Text>
      </View>

      {!configured ? (
        <View style={[styles.notice, { borderColor: accentLight }]}>
          <Text style={styles.noticeText}>
            Add <Text style={styles.noticeCode}>EXPO_PUBLIC_GEMINI_API_KEY</Text> to .env and
            restart the app.
          </Text>
        </View>
      ) : null}

      <View style={[styles.card, PlansUI.cardShadow]}>
        <Field label="Destination">
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
            placeholder="Lisbon, Portugal"
            placeholderTextColor={Theme.textSecondary}
          />
        </Field>

        <Field label="Trip name">
          <TextInput
            style={styles.input}
            value={tripName}
            onChangeText={setTripName}
            placeholder={destination.trim() || 'Spring getaway'}
            placeholderTextColor={Theme.textSecondary}
          />
        </Field>

        <Field label="Trip length">
          <Pressable
            style={[styles.select, { borderColor: Theme.border }]}
            onPress={() => setDaysOpen(true)}>
            <Text style={styles.selectText}>{dayLabel}</Text>
            <Text style={[styles.chevron, { color: accent }]}>▾</Text>
          </Pressable>
          {dayKey === 'custom' ? (
            <View style={styles.customDaysRow}>
              <TextInput
                style={[styles.input, styles.customDaysInput]}
                value={customDays}
                onChangeText={setCustomDays}
                placeholder="1–21"
                placeholderTextColor={Theme.textSecondary}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.customDaysSuffix}>days</Text>
            </View>
          ) : null}
        </Field>

        <Field label="Budget">
          <View style={styles.chipRow}>
            {BUDGET_OPTIONS.map((opt) => {
              const selected = budgetLevel === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.chip,
                    selected && { backgroundColor: accentMuted, borderColor: accent },
                  ]}
                  onPress={() => setBudgetLevel(opt.key)}>
                  <Text style={[styles.chipText, selected && { color: accentDark, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="Food & restaurants">
          <TextInput
            style={[styles.input, styles.multiline]}
            value={foodPreferences}
            onChangeText={setFoodPreferences}
            placeholder="Seafood, vegetarian, local markets, romantic dinners…"
            placeholderTextColor={Theme.textSecondary}
            multiline
          />
        </Field>

        <Field label="Bars & nightlife">
          <TextInput
            style={[styles.input, styles.multiline]}
            value={nightlifePreferences}
            onChangeText={setNightlifePreferences}
            placeholder="Rooftop cocktails, wine bars, live music, early nights…"
            placeholderTextColor={Theme.textSecondary}
            multiline
          />
        </Field>

        <Field label="Anything else">
          <TextInput
            style={[styles.input, styles.multiline]}
            value={generalPreferences}
            onChangeText={setGeneralPreferences}
            placeholder="Walkable city, museums, beach days, kid-friendly, accessibility…"
            placeholderTextColor={Theme.textSecondary}
            multiline
          />
        </Field>

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: accent },
            (loading || !destination.trim()) && styles.primaryBtnDisabled,
            pressed && !loading && styles.primaryBtnPressed,
          ]}
          disabled={loading || !destination.trim()}
          onPress={handleGenerate}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Generate plan</Text>
          )}
        </Pressable>
      </View>

      {result ? (
        <View style={[styles.preview, { borderColor: accentLight }]}>
          <Text style={[styles.previewTitle, { color: accentDark }]}>{resolvedTripName}</Text>
          <Text style={styles.previewSummary}>{result.summary}</Text>

          <PreviewBlock title="Itinerary" items={result.places} accent={accentDark} />
          <PreviewBlock title="Restaurants" items={result.restaurants} accent={accentDark} />
          <PreviewBlock title="Bars" items={result.bars} accent={accentDark} />
          <PreviewBlock title="Packing list" items={result.packing} accent={accentDark} />
          <PreviewBlock title="Budget" items={result.budget} accent={accentDark} />
          <PreviewBlock title="Tips" items={result.tips} accent={accentDark} />

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              { backgroundColor: saved ? Theme.textSecondary : accentDark },
              pressed && styles.secondaryBtnPressed,
            ]}
            onPress={handleSaveToTravel}>
            <Text style={styles.secondaryBtnText}>
              {saved ? 'Saved to Travel Ideas ✓' : 'Save to Travel Ideas'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={daysOpen} transparent animationType="fade" onRequestClose={() => setDaysOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setDaysOpen(false)}>
          <Pressable style={[styles.menu, PlansUI.cardShadow]} onPress={() => {}}>
            <Text style={styles.menuTitle}>Trip length</Text>
            <ScrollView style={styles.menuScroll} keyboardShouldPersistTaps="handled">
              {DAY_PRESETS.map((opt) => {
                const selected = dayKey === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    style={[styles.menuItem, selected && { backgroundColor: accentMuted }]}
                    onPress={() => {
                      setDayKey(opt.key);
                      setDaysOpen(false);
                    }}>
                    {selected ? (
                      <View style={[styles.menuBar, { backgroundColor: accent }]} />
                    ) : (
                      <View style={styles.menuBarPlaceholder} />
                    )}
                    <Text
                      style={[
                        styles.menuItemText,
                        selected && { fontWeight: '700', color: accentDark },
                      ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function PreviewBlock({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: string;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.previewBlock}>
      <Text style={[styles.previewBlockTitle, { color: accent }]}>{title}</Text>
      {items.slice(0, 10).map((item, i) => (
        <Text key={`${title}-${i}`} style={styles.previewLine}>
          {item}
        </Text>
      ))}
      {items.length > 10 ? (
        <Text style={styles.previewMore}>+{items.length - 10} more</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 2 },
  header: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, color: Theme.textSecondary, lineHeight: 20 },
  quota: { fontSize: 12, color: Theme.textSecondary, marginTop: 8 },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    backgroundColor: Theme.surface,
  },
  noticeText: { fontSize: 13, color: Theme.textSecondary, lineHeight: 18 },
  noticeCode: { fontFamily: 'Menlo', fontSize: 12, color: Theme.text },
  card: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.border,
    padding: 16,
    marginBottom: 16,
  },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Theme.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Theme.text,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.background,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  selectText: { flex: 1, fontSize: 15, fontWeight: '600', color: Theme.text },
  chevron: { fontSize: 13, fontWeight: '700' },
  customDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  customDaysInput: { width: 72, textAlign: 'center', marginBottom: 0 },
  customDaysSuffix: { fontSize: 15, color: Theme.textSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: Theme.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Theme.background,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnPressed: { opacity: 0.9 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  preview: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  previewTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  previewSummary: {
    fontSize: 14,
    color: Theme.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  previewBlock: { marginBottom: 14 },
  previewBlockTitle: { fontSize: 12, fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 },
  previewLine: { fontSize: 13, color: Theme.text, lineHeight: 19, marginBottom: 4 },
  previewMore: { fontSize: 12, color: Theme.textSecondary },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryBtnPressed: { opacity: 0.9 },
  secondaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 28,
  },
  menu: {
    backgroundColor: Theme.surface,
    borderRadius: 18,
    overflow: 'hidden',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: Theme.border,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 6,
  },
  menuScroll: { maxHeight: 360 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingRight: 18,
    gap: 12,
  },
  menuBar: { width: 3, height: 22, borderRadius: 2 },
  menuBarPlaceholder: { width: 3 },
  menuItemText: { flex: 1, fontSize: 16, color: Theme.text },
});
