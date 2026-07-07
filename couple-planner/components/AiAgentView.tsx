import { format, addMonths } from 'date-fns';
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

import CalendarDatePicker from '@/components/CalendarDatePicker';
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
  DIETARY_OPTIONS,
  generateTravelItinerary,
  itineraryToPlanInputs,
  TRAVEL_RADIUS_OPTIONS,
  TravelBudgetLevel,
  TravelItineraryResult,
  TravelRadius,
  DietaryPreference,
} from '@/utils/geminiTravelItinerary';

interface AiAgentViewProps {
  theme: PlanCategoryTheme;
  onAddToTravel: (inputs: AddPlanItemInput[]) => void;
  onOpenTravel?: () => void;
  onSaved?: () => Promise<void>;
  onPlanReady?: (itemCount: number) => void;
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

export default function AiAgentView({ theme, onAddToTravel, onOpenTravel, onSaved, onPlanReady }: AiAgentViewProps) {
  const { accent, accentDark, accentLight, accentMuted } = theme;

  const [destination, setDestination] = useState('');
  const [tripName, setTripName] = useState('');
  const [dayKey, setDayKey] = useState<string>('3');
  const [customDays, setCustomDays] = useState('6');
  const [daysOpen, setDaysOpen] = useState(false);
  const [budgetLevel, setBudgetLevel] = useState<TravelBudgetLevel>('mid');
  const [travelRadius, setTravelRadius] = useState<TravelRadius>('regional');
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>('none');
  const [startDate, setStartDate] = useState(() => addMonths(new Date(), 1));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [foodPreferences, setFoodPreferences] = useState('');
  const [nightlifePreferences, setNightlifePreferences] = useState('');
  const [generalPreferences, setGeneralPreferences] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TravelItineraryResult | null>(null);
  const [remaining, setRemaining] = useState(getAiAgentDailyLimit('travel'));
  const [saved, setSaved] = useState(false);
  const [formCollapsed, setFormCollapsed] = useState(false);

  const resolvedTripName = tripName.trim() || destination.trim();
  const itemCount = useMemo(() => {
    if (!result) return 0;
    return itineraryToPlanInputs(result, resolvedTripName).length;
  }, [result, resolvedTripName]);

  const configured = isGeminiConfigured();
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

  const persistItinerary = async (itinerary: TravelItineraryResult, tripLabel: string) => {
    const rows = itineraryToPlanInputs(itinerary, tripLabel);
    if (rows.length === 0) return;
    onAddToTravel(
      rows.map((row) => ({
        text: row.text,
        subcategory: row.subcategory,
        tripName: tripLabel,
        tags: ['ai-generated'],
      }))
    );
    setSaved(true);
    try {
      await onSaved?.();
    } catch {
      Alert.alert(
        'Saved on this device',
        'Could not sync to the cloud right now. Your trip is saved locally and will retry syncing automatically.'
      );
    }
  };

  const showPlan = (itinerary: TravelItineraryResult) => {
    setResult(itinerary);
    setFormCollapsed(true);
    const count = itineraryToPlanInputs(itinerary, resolvedTripName).length;
    onPlanReady?.(count);
  };

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
        startDate: format(startDate, 'yyyy-MM-dd'),
        travelRadius,
        dietaryPreference,
        budgetLevel,
        foodPreferences: foodPreferences.trim() || undefined,
        nightlifePreferences: nightlifePreferences.trim() || undefined,
        generalPreferences: generalPreferences.trim() || undefined,
      });
      showPlan(itinerary);
      const count = itineraryToPlanInputs(itinerary, resolvedTripName).length;
      Alert.alert(
        'Trip plan ready',
        count > 0
          ? `Added ${count} items to Travel Ideas under “${resolvedTripName}”.`
          : `Plan created for “${resolvedTripName}”. Open Travel Ideas to view.`,
        onOpenTravel
          ? [
              { text: 'View here', style: 'cancel' },
              { text: 'Open Travel Ideas', onPress: onOpenTravel },
            ]
          : [{ text: 'OK' }]
      );
      void persistItinerary(itinerary, resolvedTripName);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Could not generate', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToTravel = async () => {
    if (!result || !resolvedTripName) return;
    if (saved) {
      try {
        await onSaved?.();
      } catch {
        Alert.alert('Sync pending', 'Could not reach the cloud. Will retry automatically.');
      }
      if (onOpenTravel) onOpenTravel();
      return;
    }
    await persistItinerary(result, resolvedTripName);
    Alert.alert(
      'Saved to Travel Ideas',
      `Added items under “${resolvedTripName}”.`,
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
          Top-rated dining, day trips beyond downtown, weather, where to stay, and logistics — saved
          automatically to Travel Ideas.
        </Text>
        <Text style={styles.quota}>
          {remaining}/{getAiAgentDailyLimit('travel')} generations left today
        </Text>
      </View>

      {result ? (
        <View style={[styles.preview, styles.previewFirst, { borderColor: accentLight }]}>
          <View style={styles.previewBanner}>
            <Text style={[styles.previewBannerText, { color: accentDark }]}>
              {saved ? '✓ Saved to Travel Ideas' : 'Saving…'} · {itemCount} items
            </Text>
          </View>
          <Text style={[styles.previewTitle, { color: accentDark }]}>{resolvedTripName}</Text>
          <Text style={styles.previewSummary}>{result.summary}</Text>

          <PreviewBlock title="Weather" items={result.weather} accent={accentDark} />
          <PreviewBlock title="Itinerary" items={result.places} accent={accentDark} />
          <PreviewBlock title="Day trips" items={result.dayTrips} accent={accentDark} />
          <PreviewBlock title="Restaurants" items={result.restaurants} accent={accentDark} />
          <PreviewBlock title="Bars" items={result.bars} accent={accentDark} />
          <PreviewBlock title="Where to stay" items={result.stays} accent={accentDark} />
          <PreviewBlock title="What to wear & pack" items={result.packing} accent={accentDark} />
          <PreviewBlock title="Logistics" items={result.logistics} accent={accentDark} />
          <PreviewBlock title="Budget" items={result.budget} accent={accentDark} />
          <PreviewBlock title="Local tips" items={result.tips} accent={accentDark} />

          {!hasPreviewContent(result) ? (
            <Text style={styles.previewEmpty}>
              The plan loaded but sections were empty — try generating again.
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              { backgroundColor: accentDark },
              pressed && styles.secondaryBtnPressed,
            ]}
            onPress={handleSaveToTravel}>
            <Text style={styles.secondaryBtnText}>Open Travel Ideas</Text>
          </Pressable>
        </View>
      ) : null}

      {!configured ? (
        <View style={[styles.notice, { borderColor: accentLight }]}>
          <Text style={styles.noticeText}>
            Add <Text style={styles.noticeCode}>EXPO_PUBLIC_GEMINI_API_KEY</Text> to .env and
            restart the app.
          </Text>
        </View>
      ) : null}

      {formCollapsed && result ? (
        <Pressable style={styles.expandFormBtn} onPress={() => setFormCollapsed(false)}>
          <Text style={[styles.expandFormText, { color: accentDark }]}>Edit trip details</Text>
        </Pressable>
      ) : null}

      {!formCollapsed || !result ? (
      <View style={[styles.card, PlansUI.cardShadow]}>
        <Field label="Destination">
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
            placeholder="San Francisco, CA"
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

        <Field label="Start date (for weather)">
          <Pressable
            style={[styles.select, { borderColor: Theme.border }]}
            onPress={() => setDatePickerOpen(true)}>
            <Text style={styles.selectText}>{format(startDate, 'EEE, MMM d, yyyy')}</Text>
            <Text style={[styles.chevron, { color: accent }]}>▾</Text>
          </Pressable>
        </Field>

        <Field label="How far will you go?">
          <Text style={styles.fieldHint}>
            Include Napa from SF, Multnomah Falls from Portland, etc.
          </Text>
          <View style={styles.chipRow}>
            {TRAVEL_RADIUS_OPTIONS.map((opt) => {
              const selected = travelRadius === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.chip,
                    selected && { backgroundColor: accentMuted, borderColor: accent },
                  ]}
                  onPress={() => setTravelRadius(opt.key)}>
                  <Text style={[styles.chipText, selected && { color: accentDark, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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

        <Field label="Dietary needs">
          <Text style={styles.fieldHint}>
            Top-rated spots with great options — not just dedicated diet restaurants.
          </Text>
          <View style={styles.chipRow}>
            {DIETARY_OPTIONS.map((opt) => {
              const selected = dietaryPreference === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.chip,
                    selected && { backgroundColor: accentMuted, borderColor: accent },
                  ]}
                  onPress={() => setDietaryPreference(opt.key)}>
                  <Text style={[styles.chipText, selected && { color: accentDark, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="Food & restaurants (extra)">
          <TextInput
            style={[styles.input, styles.multiline]}
            value={foodPreferences}
            onChangeText={setFoodPreferences}
            placeholder="Indian food, omakase, farmers markets, avoid chains…"
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

      <Modal visible={datePickerOpen} transparent animationType="fade" onRequestClose={() => setDatePickerOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setDatePickerOpen(false)}>
          <Pressable style={[styles.datePickerCard, PlansUI.cardShadow]} onPress={() => {}}>
            <Text style={styles.menuTitle}>Trip start date</Text>
            <CalendarDatePicker
              value={startDate}
              minimumDate={new Date()}
              onChange={setStartDate}
              onSelect={() => setDatePickerOpen(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function hasPreviewContent(result: TravelItineraryResult): boolean {
  return (
    result.places.length +
      result.restaurants.length +
      result.dayTrips.length +
      result.stays.length +
      result.packing.length +
      result.logistics.length >
    0
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
  fieldHint: {
    fontSize: 12,
    color: Theme.textSecondary,
    lineHeight: 17,
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
    marginBottom: 16,
  },
  previewFirst: {
    borderWidth: 2,
  },
  previewBanner: {
    backgroundColor: Theme.background,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  previewBannerText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  previewEmpty: {
    fontSize: 13,
    color: Theme.textSecondary,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  expandFormBtn: { alignSelf: 'center', marginBottom: 12, paddingVertical: 8 },
  expandFormText: { fontSize: 14, fontWeight: '600' },
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
  datePickerCard: {
    backgroundColor: Theme.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.border,
  },
});
