import { format, parseISO } from 'date-fns';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CalendarDatePicker from '@/components/CalendarDatePicker';
import DrillDownScreenHeader, { drillDownHeaderStyles } from '@/components/DrillDownScreenHeader';
import { ClockIcon, LinesIcon, PersonIcon, SubcategoryIcon, TagIcon } from '@/components/EventFormIcons';
import OptionDropdown from '@/components/OptionDropdown';
import TimeScrollPicker from '@/components/TimeScrollPicker';
import { PlansUI } from '@/constants/plansTheme';
import { Theme } from '@/constants/Theme';
import { Fonts } from '@/constants/Typography';
import { CalendarEvent, EventCategoryConfig, Participant } from '@/types';
import {
  buildCalendarEventFromScheduler,
} from '@/utils/calendarEventRecord';
import { isMultiDayEvent } from '@/utils/calendarEvents';
import { getParticipantTheme, participantOptionColors } from '@/utils/participant';
import {
  DEFAULT_EVENT_DURATION_MIN,
  formatMinutesLabel,
  getEventEndMinutes,
  minutesToTimeString,
  parseTimeToMinutes,
  snapMinutes,
  TIME_STEP_MINUTES,
} from '@/utils/dayTimeline';

const FORM_ICON_SIZE = 28;

const FORM_FIELD_ACCENTS = {
  schedule: { icon: '#3A62AD', ring: '#5282CC' },
  category: { icon: '#564A98', soft: '#8770C6' },
  subcategory: { icon: '#A06E28', nested: '#C0883A' },
  description: { icon: '#3A7058' },
} as const;

interface EventSchedulerSheetProps {
  visible: boolean;
  date: string;
  editing: CalendarEvent | null;
  initialStartMinutes: number;
  initialAllDay: boolean;
  defaultParticipant: Participant;
  eventCategories: EventCategoryConfig[];
  partner1Label: string;
  partner2Label: string;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id'> & { id?: string }) => void;
  onDelete: (id: string) => void;
}

function minutesToDate(minutes: number): Date {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60) % 24, minutes % 60, 0, 0);
  return d;
}

function dateToMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function EventCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={[styles.eventCard, PlansUI.cardShadow]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function CheckOption({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable style={styles.checkOption} onPress={onToggle}>
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
        {checked ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <Text style={[styles.checkLabel, checked && styles.checkLabelOn]}>{label}</Text>
    </Pressable>
  );
}

function formatPickerDate(value: string) {
  return format(parseISO(value), 'MMM d, yyyy');
}

function PickerPopup({
  visible,
  title,
  onClose,
  onDone,
  children,
  compact = false,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onDone: () => void;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.popupOverlay, compact && styles.popupOverlayCompact]}
        onPress={onClose}>
        <Pressable
          style={[
            styles.popupMenu,
            compact && styles.popupMenuCompact,
            PlansUI.cardShadow,
          ]}
          onPress={() => {}}>
          <Text style={[styles.popupTitle, compact && styles.popupTitleCompact]}>{title}</Text>
          {children}
          <View style={[styles.popupFooter, compact && styles.popupFooterCompact]}>
            <Pressable
              style={[styles.dateDoneBtn, compact && styles.timeDoneBtn]}
              onPress={onDone}
              hitSlop={8}>
              <Text style={[styles.dateDoneText, compact && styles.timeDoneText]}>Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FormIconRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.formIconRow}>
      <View style={styles.formIconColumn}>{icon}</View>
      <View style={styles.formIconContent}>{children}</View>
    </View>
  );
}

function ScheduleRow({
  isAllDay,
  isMultiDay,
  startDate,
  endDate,
  startMinutes,
  endMinutes,
  onStartDateChange,
  onEndDateChange,
  onStartMinutesChange,
  onEndMinutesChange,
}: {
  isAllDay: boolean;
  isMultiDay: boolean;
  startDate: string;
  endDate: string;
  startMinutes: number;
  endMinutes: number;
  onStartDateChange: (dateStr: string) => void;
  onEndDateChange: (dateStr: string) => void;
  onStartMinutesChange: (m: number) => void;
  onEndMinutesChange: (m: number) => void;
}) {
  const [dateOpen, setDateOpen] = useState<'single' | 'start' | 'end' | null>(null);
  const [timeOpen, setTimeOpen] = useState<'start' | 'end' | null>(null);
  const [draftDate, setDraftDate] = useState(() => new Date());
  const minEnd = startMinutes + TIME_STEP_MINUTES;

  const activeDateValue =
    dateOpen === 'start' ? startDate : dateOpen === 'end' ? endDate : startDate;

  const openTimePicker = (which: 'start' | 'end') => {
    setDraftDate(minutesToDate(which === 'start' ? startMinutes : endMinutes));
    setTimeOpen(which);
  };

  const applyTime = () => {
    const next = dateToMinutes(draftDate);
    if (timeOpen === 'start') {
      onStartMinutesChange(next);
    } else if (timeOpen === 'end') {
      onEndMinutesChange(Math.max(next, minEnd));
    }
    setTimeOpen(null);
  };

  return (
    <>
      <View style={styles.lineRowWrap}>
        <FormIconRow
          icon={
            <ClockIcon
              size={FORM_ICON_SIZE}
              color={FORM_FIELD_ACCENTS.schedule.icon}
              secondaryColor={FORM_FIELD_ACCENTS.schedule.ring}
              bold
            />
          }>
          <View style={styles.scheduleRow}>
            <View style={styles.schedulePart}>
              {isMultiDay ? (
                <>
                  <Pressable onPress={() => setDateOpen('start')} hitSlop={8}>
                    <Text style={styles.fieldValue}>{formatPickerDate(startDate)}</Text>
                  </Pressable>
                  <Text style={styles.rangeSep}>–</Text>
                  <Pressable onPress={() => setDateOpen('end')} hitSlop={8}>
                    <Text style={styles.fieldValue}>{formatPickerDate(endDate)}</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable onPress={() => setDateOpen('single')} hitSlop={8}>
                  <Text style={styles.fieldValue}>{formatPickerDate(startDate)}</Text>
                </Pressable>
              )}
            </View>

            {!isAllDay && !isMultiDay ? (
              <View style={styles.schedulePart}>
                <Pressable onPress={() => openTimePicker('start')} hitSlop={8}>
                  <Text style={styles.fieldValue}>{formatMinutesLabel(startMinutes)}</Text>
                </Pressable>
                <Text style={styles.rangeSep}>–</Text>
                <Pressable onPress={() => openTimePicker('end')} hitSlop={8}>
                  <Text style={styles.fieldValue}>{formatMinutesLabel(endMinutes)}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </FormIconRow>
      </View>

      <PickerPopup
        visible={dateOpen !== null}
        title={dateOpen === 'single' ? 'Pick date' : `Pick ${dateOpen} date`}
        onClose={() => setDateOpen(null)}
        onDone={() => setDateOpen(null)}>
        <CalendarDatePicker
          value={parseISO(activeDateValue)}
          minimumDate={dateOpen === 'end' ? parseISO(startDate) : undefined}
          onChange={(d) => {
            const next = format(d, 'yyyy-MM-dd');
            if (dateOpen === 'single' || dateOpen === 'start') onStartDateChange(next);
            else onEndDateChange(next);
          }}
        />
      </PickerPopup>

      <PickerPopup
        visible={timeOpen !== null}
        title={`Pick ${timeOpen} time`}
        onClose={() => setTimeOpen(null)}
        onDone={applyTime}
        compact>
        <TimeScrollPicker value={draftDate} onChange={setDraftDate} compact />
      </PickerPopup>
    </>
  );
}

export default function EventSchedulerSheet({
  visible,
  date,
  editing,
  initialStartMinutes,
  initialAllDay,
  defaultParticipant,
  eventCategories,
  partner1Label,
  partner2Label,
  onClose,
  onSave,
  onDelete,
}: EventSchedulerSheetProps) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [startMinutes, setStartMinutes] = useState(9 * 60);
  const [endMinutes, setEndMinutes] = useState(10 * 60);
  const [participant, setParticipant] = useState<Participant>('together');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const selectedCategory = category ? eventCategories.find((c) => c.key === category) : undefined;
  const subcategories = selectedCategory?.subcategories ?? [];

  const participantOptions = useMemo(
    () => [
      { key: 'together', label: 'Together' },
      { key: 'partner1', label: partner1Label },
      { key: 'partner2', label: partner2Label },
    ],
    [partner1Label, partner2Label]
  );

  const categoryOptions = useMemo(
    () => [{ key: '', label: 'None' }, ...eventCategories.map((c) => ({ key: c.key, label: c.label }))],
    [eventCategories]
  );

  const subcategoryOptions = useMemo(
    () => subcategories.map((s) => ({ key: s.key, label: s.label })),
    [subcategories]
  );

  const whoTheme = useMemo(() => getParticipantTheme(participant), [participant]);
  const participantColors = useMemo(() => participantOptionColors(), []);

  useEffect(() => {
    if (!visible) {
      setDeleteConfirmOpen(false);
      return;
    }
    if (editing) {
      const parsed = parseTimeToMinutes(editing.time);
      const multi = isMultiDayEvent(editing);
      const allDay = !multi && parsed === null;
      setTitle(editing.title);
      setIsMultiDay(multi);
      setIsAllDay(allDay);
      setStartDate(editing.date);
      setEndDate(multi ? (editing.endDate ?? editing.date) : editing.date);
      const start = parsed ?? snapMinutes(initialStartMinutes);
      setStartMinutes(start);
      setEndMinutes(allDay ? start + DEFAULT_EVENT_DURATION_MIN : getEventEndMinutes(editing));
      setParticipant(editing.participant ?? 'together');
      setCategory(editing.category ?? '');
      setSubcategory(editing.subcategory ?? '');
      setDescription(editing.notes ?? '');
    } else {
      setTitle('');
      setIsMultiDay(false);
      setIsAllDay(initialAllDay);
      setStartDate(date);
      setEndDate(date);
      const start = snapMinutes(initialStartMinutes);
      setStartMinutes(start);
      setEndMinutes(start + DEFAULT_EVENT_DURATION_MIN);
      setParticipant(defaultParticipant);
      setCategory('');
      setSubcategory('');
      setDescription('');
    }
  }, [visible, editing, date, initialStartMinutes, initialAllDay, defaultParticipant]);

  const toggleAllDay = () => {
    const next = !isAllDay;
    setIsAllDay(next);
    if (next) setIsMultiDay(false);
    if (!next && endMinutes <= startMinutes) {
      setEndMinutes(startMinutes + DEFAULT_EVENT_DURATION_MIN);
    }
  };

  const toggleMultiDay = () => {
    const next = !isMultiDay;
    setIsMultiDay(next);
    if (next) setIsAllDay(false);
    if (!next) setEndDate(startDate);
  };

  const handleStartDate = (next: string) => {
    setStartDate(next);
    if (!isMultiDay) setEndDate(next);
    if (isMultiDay && endDate < next) setEndDate(next);
  };

  const handleStartMinutes = (next: number) => {
    setStartMinutes(next);
    if (endMinutes <= next) {
      setEndMinutes(Math.min(next + DEFAULT_EVENT_DURATION_MIN, 24 * 60 - TIME_STEP_MINUTES));
    }
  };

  const pickCategory = (key: string) => {
    if (!key) {
      setCategory('');
      setSubcategory('');
      return;
    }
    const cat = eventCategories.find((c) => c.key === key);
    setCategory(key);
    setSubcategory(cat?.subcategories[0]?.key ?? '');
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Add a title', 'Give your event a name.');
      return;
    }
    if (isMultiDay && endDate < startDate) {
      Alert.alert('Check dates', 'End date must be on or after start date.');
      return;
    }
    if (!isAllDay && !isMultiDay && endMinutes <= startMinutes) {
      Alert.alert('Check times', 'End time must be after start time.');
      return;
    }

    onSave(
      buildCalendarEventFromScheduler({
        id: editing?.id,
        title,
        startDate,
        endDate,
        isMultiDay,
        isAllDay,
        startMinutes,
        endMinutes,
        participant,
        description,
        category,
        subcategory,
        fallbackSubcategory: subcategories[0]?.key,
      })
    );
    onClose();
  };

  const handleDelete = () => {
    if (!editing) return;
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!editing) return;
    onDelete(editing.id);
    setDeleteConfirmOpen(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <DrillDownScreenHeader
        insetTop={insets.top}
        onBack={onClose}
        backSymbol="✕"
        trailing={
          <Pressable
            onPress={handleSave}
            hitSlop={8}
            style={({ pressed }) => [drillDownHeaderStyles.saveBtn, pressed && styles.btnPressed]}>
            <Text style={drillDownHeaderStyles.saveText}>Save</Text>
          </Pressable>
        }>
        <Text style={drillDownHeaderStyles.eventTitle} numberOfLines={1}>
          {editing ? 'Edit event' : 'New event'}
        </Text>
      </DrillDownScreenHeader>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
          <EventCard title="Event">
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Add title"
              placeholderTextColor={Theme.textSecondary}
              selectionColor={Theme.primary}
              returnKeyType="done"
              multiline={false}
              numberOfLines={1}
              autoFocus
            />

            <View style={styles.lineRowWrap}>
              <View style={styles.checkRow}>
                <CheckOption label="All-day" checked={isAllDay} onToggle={toggleAllDay} />
                <CheckOption label="Multi-day" checked={isMultiDay} onToggle={toggleMultiDay} />
              </View>
            </View>

            <ScheduleRow
              isAllDay={isAllDay}
              isMultiDay={isMultiDay}
              startDate={startDate}
              endDate={endDate}
              startMinutes={startMinutes}
              endMinutes={endMinutes}
              onStartDateChange={handleStartDate}
              onEndDateChange={setEndDate}
              onStartMinutesChange={handleStartMinutes}
              onEndMinutesChange={setEndMinutes}
            />

            <View style={styles.lineRowWrap}>
              <FormIconRow
                icon={<PersonIcon size={FORM_ICON_SIZE} color={whoTheme.color} bold />}>
                <OptionDropdown
                  label="Who"
                  options={participantOptions}
                  selected={participant}
                  onSelect={(key) => setParticipant(key as Participant)}
                  hideLabel
                  inset
                  inline
                  optionColors={participantColors}
                  fontFamily={Fonts.form}
                  fontFamilyMedium={Fonts.formMedium}
                  fontFamilySemiBold={Fonts.formSemiBold}
                />
              </FormIconRow>
            </View>

            {eventCategories.length > 0 ? (
              <>
                <View style={styles.lineRowWrap}>
                  <FormIconRow
                    icon={
                      <TagIcon
                        size={FORM_ICON_SIZE}
                        color={FORM_FIELD_ACCENTS.category.icon}
                        secondaryColor={FORM_FIELD_ACCENTS.category.soft}
                        bold
                      />
                    }>
                    <OptionDropdown
                      label="Category"
                      options={categoryOptions}
                      selected={category}
                      onSelect={pickCategory}
                      placeholder="None"
                      hideLabel
                      caption="Category"
                      inset
                      inline
                      fontFamily={Fonts.form}
                      fontFamilyMedium={Fonts.formMedium}
                      fontFamilySemiBold={Fonts.formSemiBold}
                    />
                  </FormIconRow>
                </View>

                {category && subcategoryOptions.length > 0 ? (
                  <View style={styles.lineRowWrap}>
                    <FormIconRow
                      icon={
                        <SubcategoryIcon
                          size={FORM_ICON_SIZE}
                          color={FORM_FIELD_ACCENTS.subcategory.icon}
                          secondaryColor={FORM_FIELD_ACCENTS.subcategory.nested}
                          bold
                        />
                      }>
                      <OptionDropdown
                        label="Subcategory"
                        options={subcategoryOptions}
                        selected={subcategory}
                        onSelect={setSubcategory}
                        placeholder="Choose subcategory"
                        hideLabel
                        caption="Subcategory"
                        inset
                        inline
                        fontFamily={Fonts.form}
                        fontFamilyMedium={Fonts.formMedium}
                        fontFamilySemiBold={Fonts.formSemiBold}
                      />
                    </FormIconRow>
                  </View>
                ) : null}
              </>
            ) : null}

            <View style={styles.lineRowWrap}>
              <FormIconRow
                icon={
                  <LinesIcon size={FORM_ICON_SIZE} color={FORM_FIELD_ACCENTS.description.icon} bold />
                }>
                <TextInput
                  style={styles.descriptionInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Description (optional)"
                  placeholderTextColor={Theme.textSecondary}
                  selectionColor={Theme.primary}
                  multiline
                />
              </FormIconRow>
            </View>
          </EventCard>

          {editing ? (
            <Pressable
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
              onPress={handleDelete}>
              <Text style={styles.deleteText}>Delete event</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {deleteConfirmOpen ? (
          <View style={styles.confirmLayer}>
            <Pressable style={styles.confirmOverlay} onPress={() => setDeleteConfirmOpen(false)}>
              <Pressable style={styles.confirmPopup} onPress={() => {}}>
                <Text style={styles.confirmTitle}>Delete event?</Text>
                <Text style={styles.confirmMessage}>
                  Remove "{editing?.title}"? This can't be undone.
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable style={styles.confirmCancel} onPress={() => setDeleteConfirmOpen(false)}>
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.confirmDelete} onPress={confirmDelete}>
                    <Text style={styles.confirmDeleteText}>Delete</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </View>
        ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  btnPressed: { opacity: 0.7 },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 48,
  },
  eventCard: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.primaryLight,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: Fonts.formBold,
    color: Theme.primaryDark,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  titleInput: {
    fontSize: 20,
    fontFamily: Fonts.formMedium,
    color: Theme.text,
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#DCD6EA',
  },
  descriptionInput: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.form,
    color: Theme.text,
    paddingVertical: 0,
    paddingHorizontal: 0,
    paddingBottom: 10,
    minHeight: 22,
    borderBottomWidth: 1.5,
    borderBottomColor: '#DCD6EA',
    textAlignVertical: 'top',
  },
  formIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  formIconColumn: {
    width: FORM_ICON_SIZE + 4,
    minHeight: FORM_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  formIconContent: {
    flex: 1,
    minWidth: 0,
    minHeight: FORM_ICON_SIZE,
    justifyContent: 'center',
  },
  fieldValue: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.formMedium,
    color: Theme.text,
  },
  lineRowWrap: {
    paddingVertical: 14,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 20,
  },
  schedulePart: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  rangeSep: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.form,
    color: Theme.textSecondary,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 18,
  },
  checkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#C8BED8',
    backgroundColor: Theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: {
    backgroundColor: Theme.primaryDark,
    borderColor: Theme.primaryDark,
  },
  checkMark: {
    fontSize: 11,
    fontFamily: Fonts.formBold,
    color: Theme.surface,
    lineHeight: 12,
  },
  checkLabel: {
    fontSize: 15,
    fontFamily: Fonts.form,
    color: Theme.textSecondary,
  },
  checkLabelOn: {
    color: Theme.text,
    fontFamily: Fonts.formMedium,
  },
  dateDoneBtn: {
    marginTop: 12,
    backgroundColor: Theme.primaryDark,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  dateDoneText: { color: '#fff', fontFamily: Fonts.formBold, fontSize: 15 },
  popupFooter: {
    marginTop: 4,
  },
  popupFooterCompact: {
    marginTop: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  timeDoneBtn: {
    marginTop: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: 'flex-end',
  },
  timeDoneText: {
    color: Theme.primaryDark,
    fontFamily: Fonts.formBold,
    fontSize: 16,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(107, 84, 184, 0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  popupOverlayCompact: {
    padding: 36,
  },
  popupMenu: {
    backgroundColor: Theme.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.primaryLight,
  },
  popupMenuCompact: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 260,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
  },
  popupTitle: {
    fontSize: 16,
    fontFamily: Fonts.formBold,
    color: Theme.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  popupTitleCompact: {
    fontSize: 14,
    fontFamily: Fonts.formSemiBold,
    marginBottom: 4,
    textAlign: 'left',
    color: Theme.primaryDark,
  },
  deleteBtn: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: PlansUI.deleteLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5D6D6',
  },
  deleteBtnPressed: { opacity: 0.75 },
  deleteText: { fontSize: 15, fontFamily: Fonts.formSemiBold, color: PlansUI.delete },
  confirmLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(107, 84, 184, 0.35)',
    justifyContent: 'center',
    padding: 28,
  },
  confirmPopup: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: Theme.primaryLight,
  },
  confirmTitle: {
    fontSize: 18,
    fontFamily: Fonts.formBold,
    color: Theme.text,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 15,
    fontFamily: Fonts.form,
    color: Theme.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmActions: { flexDirection: 'row', gap: 12 },
  confirmCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Theme.primaryLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.accent,
  },
  confirmCancelText: { fontSize: 15, fontFamily: Fonts.formSemiBold, color: Theme.primaryDark },
  confirmDelete: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: PlansUI.delete,
    alignItems: 'center',
  },
  confirmDeleteText: { fontSize: 15, fontFamily: Fonts.formBold, color: '#fff' },
});
