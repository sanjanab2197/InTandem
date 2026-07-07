import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
  generateMealFromGroceries,
  mealResultToPlanInputs,
  MealFromGroceriesResult,
} from '@/utils/geminiMealFromGroceries';

interface AiMealViewProps {
  theme: PlanCategoryTheme;
  groceries: string[];
  onAddToMeals: (inputs: AddPlanItemInput[]) => void;
  onOpenChecklist?: () => void;
  onSaved?: () => Promise<void>;
}

export default function AiMealView({
  theme,
  groceries,
  onAddToMeals,
  onOpenChecklist,
  onSaved,
}: AiMealViewProps) {
  const { accent, accentDark, accentLight, accentMuted } = theme;

  const [preferences, setPreferences] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MealFromGroceriesResult | null>(null);
  const [remaining, setRemaining] = useState(getAiAgentDailyLimit('meal'));
  const [saved, setSaved] = useState(false);

  const configured = isGeminiConfigured();
  const dailyLimit = getAiAgentDailyLimit('meal');
  const hasGroceries = groceries.length >= 2;

  const groceryPreview = useMemo(() => groceries.slice(0, 12), [groceries]);

  useEffect(() => {
    getAiAgentRemainingToday('meal').then(setRemaining);
  }, []);

  const handleGenerate = async () => {
    if (!configured) {
      Alert.alert(
        'API key needed',
        'Add EXPO_PUBLIC_GEMINI_API_KEY to your .env file. Get a free key at Google AI Studio.'
      );
      return;
    }

    if (!hasGroceries) {
      Alert.alert(
        'Add groceries first',
        'Put at least 2 items on your Groceries checklist, then come back for a meal idea.'
      );
      return;
    }

    const usage = await consumeAiAgentRequest('meal');
    if (!usage.ok) {
      Alert.alert(
        'Daily limit reached',
        `You can generate up to ${dailyLimit} meal ideas per day on the free tier. Try again tomorrow.`
      );
      setRemaining(0);
      return;
    }
    setRemaining(usage.remaining);

    setLoading(true);
    setSaved(false);
    try {
      const meal = await generateMealFromGroceries(groceries, preferences.trim() || undefined);
      setResult(meal);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Could not generate', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToMeals = async () => {
    if (!result) return;
    onAddToMeals(mealResultToPlanInputs(result));
    setSaved(true);
    try {
      await onSaved?.();
    } catch {
      Alert.alert(
        'Saved on this device',
        'Could not sync to the cloud right now. Will retry automatically.'
      );
    }
    Alert.alert(
      'Saved to Meals',
      `Added “${result.mealName}” to your Meals checklist.`,
      onOpenChecklist
        ? [
            { text: 'Stay here', style: 'cancel' },
            { text: 'Open Checklist', onPress: onOpenChecklist },
          ]
        : [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.hero, { backgroundColor: accentMuted, borderColor: accentLight }]}>
        <Text style={styles.heroEmoji}>🥘</Text>
        <Text style={[styles.heroTitle, { color: accentDark }]}>Meal from your groceries</Text>
        <Text style={styles.heroBody}>
          Reads your Groceries checklist and suggests a couple-friendly recipe you can cook with
          what you already have — then saves it to Meals.
        </Text>
        <Text style={styles.quota}>
          {remaining} of {dailyLimit} free suggestions left today
        </Text>
      </View>

      <View style={[styles.groceryCard, { borderColor: accentLight }]}>
        <Text style={[styles.groceryTitle, { color: accentDark }]}>From your Groceries list</Text>
        {!hasGroceries ? (
          <Text style={styles.groceryEmpty}>
            Add items to the Groceries tab in Checklist first (at least 2).
          </Text>
        ) : (
          <View style={styles.chipWrap}>
            {groceryPreview.map((item) => (
              <View key={item} style={[styles.groceryChip, { backgroundColor: accentLight }]}>
                <Text style={[styles.groceryChipText, { color: accentDark }]} numberOfLines={1}>
                  {item}
                </Text>
              </View>
            ))}
            {groceries.length > groceryPreview.length ? (
              <Text style={styles.groceryMore}>+{groceries.length - groceryPreview.length} more</Text>
            ) : null}
          </View>
        )}
      </View>

      {!configured ? (
        <View style={[styles.notice, { borderColor: accentLight }]}>
          <Text style={styles.noticeTitle}>Setup required</Text>
          <Text style={styles.noticeBody}>
            Add <Text style={styles.noticeCode}>EXPO_PUBLIC_GEMINI_API_KEY</Text> to your .env and
            restart the app.
          </Text>
        </View>
      ) : null}

      <View style={[styles.formCard, PlansUI.cardShadow, { borderColor: accentLight }]}>
        <Text style={styles.fieldLabel}>Preferences (optional)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={preferences}
          onChangeText={setPreferences}
          placeholder="Vegetarian, 30 min max, spicy, date-night vibe…"
          placeholderTextColor={Theme.textSecondary}
          multiline
        />

        <Pressable
          style={({ pressed }) => [
            styles.generateBtn,
            { backgroundColor: accent },
            (loading || !hasGroceries) && styles.generateBtnDisabled,
            pressed && !loading && hasGroceries && styles.generateBtnPressed,
          ]}
          disabled={loading || !hasGroceries}
          onPress={handleGenerate}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateBtnText}>Suggest a meal</Text>
          )}
        </Pressable>
      </View>

      {result ? (
        <View style={[styles.previewCard, { borderColor: accentLight }]}>
          <Text style={[styles.previewTitle, { color: accentDark }]}>{result.mealName}</Text>
          <Text style={styles.previewMeta}>
            {result.timeMinutes} min · serves {result.servings}
          </Text>
          <Text style={styles.previewSummary}>{result.summary}</Text>

          {result.ingredientsUsed.length > 0 ? (
            <View style={styles.previewSection}>
              <Text style={[styles.sectionLabel, { color: accentDark }]}>Uses from your list</Text>
              <Text style={styles.sectionBody}>{result.ingredientsUsed.join(' · ')}</Text>
            </View>
          ) : null}

          {result.missingOptional.length > 0 ? (
            <View style={styles.previewSection}>
              <Text style={styles.sectionLabel}>Nice to have</Text>
              <Text style={styles.sectionBody}>{result.missingOptional.join(' · ')}</Text>
            </View>
          ) : null}

          <View style={styles.previewSection}>
            <Text style={[styles.sectionLabel, { color: accentDark }]}>Steps</Text>
            {result.steps.map((step, i) => (
              <Text key={i} style={styles.step}>
                {i + 1}. {step}
              </Text>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: saved ? Theme.textSecondary : accentDark },
              pressed && styles.saveBtnPressed,
            ]}
            onPress={handleSaveToMeals}>
            <Text style={styles.saveBtnText}>
              {saved ? 'Saved to Meals ✓' : 'Add to Meals checklist'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 4 },
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 32, marginBottom: 8 },
  heroTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  heroBody: {
    fontSize: 14,
    color: Theme.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 10,
  },
  quota: { fontSize: 12, fontWeight: '600', color: Theme.textSecondary },
  groceryCard: {
    backgroundColor: Theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  groceryTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  groceryEmpty: { fontSize: 14, color: Theme.textSecondary, lineHeight: 20 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  groceryChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  groceryChipText: { fontSize: 13, fontWeight: '600' },
  groceryMore: { fontSize: 12, color: Theme.textSecondary },
  notice: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    backgroundColor: Theme.surface,
  },
  noticeTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  noticeBody: { fontSize: 13, color: Theme.textSecondary, lineHeight: 19 },
  noticeCode: { fontFamily: 'Menlo', fontSize: 12, color: Theme.primaryDark },
  formCard: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
    marginBottom: 14,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  generateBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  generateBtnDisabled: { opacity: 0.55 },
  generateBtnPressed: { opacity: 0.88 },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  previewCard: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  previewTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  previewMeta: { fontSize: 13, color: Theme.textSecondary, marginBottom: 8 },
  previewSummary: { fontSize: 14, color: Theme.text, lineHeight: 20, marginBottom: 14 },
  previewSection: { marginBottom: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4, color: Theme.textSecondary },
  sectionBody: { fontSize: 13, color: Theme.text, lineHeight: 19 },
  step: { fontSize: 13, color: Theme.text, lineHeight: 20, marginBottom: 4 },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnPressed: { opacity: 0.88 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
