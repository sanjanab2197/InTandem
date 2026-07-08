import { endOfMonth, parseISO, startOfMonth } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from '@/constants/cycleTracking';
import { useApp } from '@/context/AppContext';
import { useCouple } from '@/context/CoupleContext';
import { CycleOwner } from '@/types';
import {
  buildCycleCalendarMarkers,
  computeCyclePredictions,
  cycleHeadline,
  cycleLengthLabel,
  formatPredictionDate,
} from '@/utils/cyclePredictions';
import { cycleOwnerFromSlot } from '@/utils/cycleTracking';
import { partnerTabLabel } from '@/utils/participant';

export function useCycleCalendarView(selectedDate?: string) {
  const { couple } = useCouple();
  const { cycleData, getCycleProfile, canViewCycleProfile, updateCycleSettings } = useApp();
  const [viewOwner, setViewOwner] = useState<CycleOwner>(() => cycleOwnerFromSlot(couple?.mySlot));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cycleLenDraft, setCycleLenDraft] = useState('');
  const [periodLenDraft, setPeriodLenDraft] = useState('');
  const [visibleMonth, setVisibleMonth] = useState(() =>
    selectedDate ? parseISO(selectedDate) : new Date()
  );

  const myOwner = cycleOwnerFromSlot(couple?.mySlot);
  const myProfile = getCycleProfile(myOwner);
  const p1Name = partnerTabLabel(couple?.partner1Name ?? 'Partner 1');
  const p2Name = partnerTabLabel(couple?.partner2Name ?? 'Partner 2');

  useEffect(() => {
    setViewOwner(cycleOwnerFromSlot(couple?.mySlot));
  }, [couple?.mySlot]);

  useEffect(() => {
    if (selectedDate) setVisibleMonth(parseISO(selectedDate));
  }, [selectedDate]);

  const owners = useMemo(
    () => [
      { key: 'partner1' as CycleOwner, label: p1Name },
      { key: 'partner2' as CycleOwner, label: p2Name },
    ],
    [p1Name, p2Name]
  );

  const visibleOwners = owners.filter((o) => canViewCycleProfile(o.key, couple?.mySlot));
  const activeOwner = visibleOwners.some((o) => o.key === viewOwner) ? viewOwner : myOwner;
  const profile = useMemo(
    () => getCycleProfile(activeOwner),
    [getCycleProfile, activeOwner, cycleData]
  );
  const predictions = useMemo(() => computeCyclePredictions(profile), [profile]);
  const headline = useMemo(() => cycleHeadline(predictions), [predictions]);
  const fertileWindow = useMemo(() => {
    if (!predictions.fertileStart || !predictions.fertileEnd) return '—';
    return `${formatPredictionDate(predictions.fertileStart)}–${formatPredictionDate(predictions.fertileEnd)}`;
  }, [predictions.fertileStart, predictions.fertileEnd]);
  const isOwnProfile = activeOwner === myOwner;
  const sharing = myProfile.settings.shareWithPartner;

  const cycleMarkers = useMemo(
    () => buildCycleCalendarMarkers(profile, startOfMonth(visibleMonth), endOfMonth(visibleMonth)),
    [profile, visibleMonth]
  );

  const toggleShare = (next: boolean) => {
    updateCycleSettings(myOwner, { shareWithPartner: next });
  };

  const openSettings = () => {
    setCycleLenDraft(String(profile.settings.averageCycleLength || DEFAULT_CYCLE_LENGTH));
    setPeriodLenDraft(String(profile.settings.averagePeriodLength || DEFAULT_PERIOD_LENGTH));
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    const cycleLen = Number.parseInt(cycleLenDraft, 10);
    const periodLen = Number.parseInt(periodLenDraft, 10);
    updateCycleSettings(activeOwner, {
      averageCycleLength: Number.isFinite(cycleLen)
        ? Math.min(Math.max(cycleLen, 21), 45)
        : DEFAULT_CYCLE_LENGTH,
      averagePeriodLength: Number.isFinite(periodLen)
        ? Math.min(Math.max(periodLen, 2), 10)
        : DEFAULT_PERIOD_LENGTH,
    });
    setSettingsOpen(false);
  };

  return {
    visibleMonth,
    setVisibleMonth,
    cycleMarkers,
    activeOwner,
    myOwner,
    isOwnProfile,
    sharing,
    toggleShare,
    visibleOwners,
    viewOwner,
    setViewOwner,
    headline,
    predictions,
    cycleLengthLabel: cycleLengthLabel(predictions),
    nextPeriod: formatPredictionDate(predictions.nextPeriodStart),
    fertileWindow,
    ovulation: formatPredictionDate(predictions.ovulationDate),
    settingsOpen,
    setSettingsOpen,
    cycleLenDraft,
    setCycleLenDraft,
    periodLenDraft,
    setPeriodLenDraft,
    openSettings,
    saveSettings,
    profile,
  };
}
