/**
 * Standalone regression tests for cycle merge / share toggle persistence.
 * Run: node scripts/test-cycle-merge.mjs
 */

const DEFAULT_SETTINGS = {
  averageCycleLength: 28,
  averagePeriodLength: 5,
  shareWithPartner: false,
};

function defaultProfile() {
  return { settings: { ...DEFAULT_SETTINGS }, logs: [] };
}

function normalizeProfile(stored) {
  if (!stored) return defaultProfile();
  return {
    settings: { ...DEFAULT_SETTINGS, ...stored.settings },
    logs: Array.isArray(stored.logs) ? stored.logs : [],
    updatedAt: stored.updatedAt,
  };
}

function normalizeCycleData(raw) {
  return {
    partner1: normalizeProfile(raw?.partner1),
    partner2: normalizeProfile(raw?.partner2),
  };
}

function patchCycleSettings(data, owner, patch) {
  const base = normalizeCycleData(data);
  const profile = base[owner];
  return {
    ...base,
    [owner]: {
      ...profile,
      settings: { ...profile.settings, ...patch },
      updatedAt: new Date().toISOString(),
    },
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Bug regression: normalize must not reset shareWithPartner on every read
let data = patchCycleSettings(undefined, 'partner1', { shareWithPartner: true });
assert(
  normalizeCycleData(data).partner1.settings.shareWithPartner === true,
  'shareWithPartner should stay true after normalize'
);

data = normalizeCycleData(data);
data = normalizeCycleData(data);
assert(
  data.partner1.settings.shareWithPartner === true,
  'shareWithPartner should stay true after repeated normalize'
);

// Patch should persist share flag
data = patchCycleSettings(data, 'partner1', { shareWithPartner: false });
assert(data.partner1.settings.shareWithPartner === false, 'patch should turn share off');

data = patchCycleSettings(data, 'partner1', { shareWithPartner: true });
assert(data.partner1.settings.shareWithPartner === true, 'patch should turn share on');

// Other settings preserved
data = patchCycleSettings(data, 'partner1', { averageCycleLength: 30 });
assert(data.partner1.settings.averageCycleLength === 30, 'cycle length patch');
assert(data.partner1.settings.shareWithPartner === true, 'share preserved when patching cycle length');

console.log('All cycle merge tests passed.');
