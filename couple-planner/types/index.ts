export type EventCategory = string;

export interface EventSubcategoryConfig {
  key: string;
  label: string;
  color: string;
  builtIn?: boolean;
}

export interface EventCategoryConfig {
  key: string;
  label: string;
  color: string;
  builtIn?: boolean;
  subcategories: EventSubcategoryConfig[];
}

export type PlanCategory =
  | 'weekly_checklist'
  | 'date_ideas'
  | 'travel_ideas'
  | 'enrichment_ideas'
  | 'reminders'
  | 'expenseflow'
  | 'key_dates'
  | 'ai_agent'
  | 'ai_meal';

export type ExpensePaidBy = 'partner1' | 'partner2';

export type ExpenseSplitType = 'split' | 'partner1_owes' | 'partner2_owes';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: ExpensePaidBy;
  splitType: ExpenseSplitType;
  settled: boolean;
  settledAt?: string;
  createdAt: string;
  notes?: string;
}

export interface AddExpenseInput {
  description: string;
  amount: number;
  paidBy: ExpensePaidBy;
  splitType: ExpenseSplitType;
  notes?: string;
}

export type Participant = 'together' | 'partner1' | 'partner2';

export type KeyDateKind = 'birthday' | 'anniversary' | 'first_date' | 'engagement' | 'other';

export interface KeyDate {
  id: string;
  title: string;
  date: string;
  kind: KeyDateKind;
  forWhom: Participant;
  notes?: string;
  giftIdeas?: string;
  createdAt: string;
}

export interface AddKeyDateInput {
  title: string;
  date: string;
  kind: KeyDateKind;
  forWhom: Participant;
  notes?: string;
  giftIdeas?: string;
}

export type StatsView = 'partner1' | 'partner2';

export type CycleOwner = 'partner1' | 'partner2';

export type FlowLevel = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

export type CycleLogKind =
  | 'period'
  | 'sex'
  | 'pill'
  | 'discharge'
  | 'digestion'
  | 'stool'
  | 'mood'
  | 'symptom'
  | 'travel'
  | 'sleep'
  | 'energy'
  | 'skin'
  | 'other';

export interface CycleLogEntry {
  id: string;
  date: string;
  kind: CycleLogKind;
  value: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CycleSettings {
  averageCycleLength: number;
  averagePeriodLength: number;
  lastPeriodStart?: string;
  shareWithPartner: boolean;
}

export interface CycleProfile {
  settings: CycleSettings;
  logs: CycleLogEntry[];
  updatedAt?: string;
}

export interface CycleData {
  partner1: CycleProfile;
  partner2: CycleProfile;
}

export type CycleDayPhase = 'period' | 'predicted_period' | 'fertile' | 'ovulation';

export interface CycleCalendarMarker {
  phase?: CycleDayPhase;
  hasLogs?: boolean;
  flow?: FlowLevel;
  logKinds?: CycleLogKind[];
  logCount?: number;
}

export type DayViewFilterKey = 'partner1' | 'partner2' | 'together';

export type DayViewFilters = Record<DayViewFilterKey, boolean>;

/** @deprecated use DayViewFilters */
export type DayViewFilter = DayViewFilterKey;

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  durationMinutes?: number;
  notes?: string;
  category?: EventCategory;
  subcategory?: string;
  participant?: Participant;
}

export interface PlanItem {
  id: string;
  text: string;
  completed: boolean;
  category: PlanCategory;
  subcategory?: string;
  tags?: string[];
  tripName?: string;
  notes?: string;
}

export interface AddPlanItemInput {
  text: string;
  subcategory?: string;
  tags?: string[];
  tripName?: string;
}

export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface Reminder {
  id: string;
  text: string;
  remindAt: string;
  assignee: Participant;
  completed: boolean;
  repeat?: ReminderRepeat;
  notificationId?: string;
  createdBy?: string;
  updatedAt?: string;
}

export interface AddReminderInput {
  text: string;
  remindAt: string;
  assignee: Participant;
  repeat?: ReminderRepeat;
}

export interface PlanSubcategory {
  key: string;
  label: string;
  builtIn?: boolean;
}

export type PlanSubcategoriesByCategory = Record<PlanCategory, PlanSubcategory[]>;

export interface CoupleProfile {
  partner1Name: string;
  partner2Name: string;
  anniversary?: string;
  bio?: string;
}

export interface CoupleConnection {
  connected: boolean;
  coupleId?: string;
  mySlot?: 1 | 2 | null;
  myDisplayName: string;
  myConnectionCode: string;
  partner1Name: string;
  partner2Name: string;
  partnerEmail?: string | null;
  anniversary?: string | null;
  bio?: string | null;
  pendingInviteEmail?: string | null;
}

export type CategoryGoals = Record<string, number>;

export interface AppData {
  events: CalendarEvent[];
  planItems: PlanItem[];
  reminders: Reminder[];
  expenses: Expense[];
  keyDates: KeyDate[];
  planSubcategories?: PlanSubcategoriesByCategory;
  eventCategories?: EventCategoryConfig[];
  profile: CoupleProfile;
  weeklyGoals: CategoryGoals;
  crossedOffDates?: string[];
  cycleData?: CycleData;
}

/** Syncable app data stored in Supabase (excludes profile + reminders). */
export interface AppStatePayload {
  events: CalendarEvent[];
  planItems: PlanItem[];
  expenses: Expense[];
  keyDates: KeyDate[];
  planSubcategories?: PlanSubcategoriesByCategory;
  eventCategories?: EventCategoryConfig[];
  weeklyGoals: CategoryGoals;
  crossedOffDates?: string[];
  cycleData?: CycleData;
  updatedAt?: string;
}
