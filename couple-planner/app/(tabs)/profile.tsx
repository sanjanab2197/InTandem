import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import ScreenHeader from '@/components/ScreenHeader';
import { Theme } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';
import { useCouple } from '@/context/CoupleContext';
import { sendInviteViaEmail } from '@/utils/coupleApi';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { couple, loading: coupleLoading, error: coupleError, refresh, joinWithCode, removePartner, saveDisplayName, saveCoupleDetails } =
    useCouple();

  const [editing, setEditing] = useState(false);
  const [myName, setMyName] = useState('');
  const [anniversary, setAnniversary] = useState('');
  const [bio, setBio] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const partner1Name = couple?.partner1Name ?? 'Partner 1';
  const partner2Name = couple?.partner2Name ?? 'Partner 2';
  const connected = couple?.connected ?? false;
  const hasCoupleLink = connected || Boolean(couple?.coupleId);
  const myDisplayName = couple?.myDisplayName ?? 'You';
  const myCode = couple?.myConnectionCode ?? '';

  const startEdit = () => {
    setMyName(myDisplayName);
    setAnniversary(couple?.anniversary ?? '');
    setBio(couple?.bio ?? '');
    setEditing(true);
  };

  const handleSave = async () => {
    if (!myName.trim()) {
      Alert.alert('Missing name', 'Please enter your name.');
      return;
    }
    setBusy(true);
    try {
      await saveDisplayName(myName.trim());
      if (couple?.coupleId) {
        await saveCoupleDetails(anniversary.trim() || undefined, bio.trim() || undefined);
      }
      setEditing(false);
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const shareMyCode = async () => {
    if (!myCode) return;
    await Share.share({
      message: `Join me on InTandem! My connection code is ${myCode}. Sign up, open Profile, and enter this code to connect.`,
    });
  };

  const handleEmailInvite = async () => {
    if (!myCode) {
      Alert.alert('Code not ready', 'Pull down to refresh, or try again in a moment.');
      return;
    }
    if (!partnerEmail.trim()) {
      Alert.alert('Enter email', "Enter your partner's email address.");
      return;
    }
    setBusy(true);
    try {
      await sendInviteViaEmail(partnerEmail.trim(), myCode, myDisplayName);
    } catch (e) {
      Alert.alert('Could not open email', e instanceof Error ? e.message : 'Try sharing your code instead.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (joinCode.replace(/\D/g, '').length !== 8) {
      Alert.alert('Enter code', "Enter your partner's 8-digit code.");
      return;
    }
    setBusy(true);
    try {
      await joinWithCode(joinCode);
      setJoinCode('');
      Alert.alert('Connected!', 'You are now linked with your partner.');
    } catch (e) {
      Alert.alert('Could not connect', e instanceof Error ? e.message : 'Check the code and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemovePartner = () => {
    setRemoveError(null);
    setShowRemoveConfirm(true);
  };

  const confirmRemovePartner = async () => {
    setBusy(true);
    setRemoveError(null);
    try {
      await removePartner();
      setShowRemoveConfirm(false);
    } catch (e) {
      setRemoveError(
        e instanceof Error
          ? e.message
          : 'Run supabase/disconnect_partner.sql in SQL Editor, then try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Profile"
          hint="Manage your account and partner connection"
          style={styles.header}
        />

        {user?.email && (
          <View style={styles.accountCard}>
            <Text style={styles.accountLabel}>Signed in as</Text>
            <Text style={styles.accountEmail}>{user.email}</Text>
            <Pressable style={styles.signOutBtn} onPress={signOut}>
              <Text style={styles.signOutBtnText}>Sign Out</Text>
            </Pressable>
          </View>
        )}

        {coupleError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Setup needed</Text>
            <Text style={styles.errorText}>{coupleError}</Text>
            <Text style={styles.errorSteps}>
              1. Open supabase.com → your project{'\n'}
              2. SQL Editor → New query{'\n'}
              3. Paste contents of supabase/fix_rls_recursion.sql{'\n'}
              4. Click Run, then tap Retry below
            </Text>
            <Pressable style={styles.retryBtn} onPress={refresh}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {coupleLoading ? (
          <ActivityIndicator color={Theme.primary} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <View style={styles.myCodeCard}>
              <Text style={styles.myCodeLabel}>Your connection code</Text>
              {myCode ? (
                <Text style={styles.myCodeValue}>{myCode}</Text>
              ) : (
                <Text style={styles.myCodeMissing}>Generating…</Text>
              )}
              <Text style={styles.myCodeHint}>
                Give this code to your partner. They enter it in Profile to connect with you.
              </Text>
              {myCode ? (
                <Pressable style={styles.secondaryBtn} onPress={shareMyCode}>
                  <Text style={styles.secondaryBtnText}>Share code</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.avatarSection}>
              <View style={styles.avatarRow}>
                <View style={[styles.avatar, styles.avatarPrimary]}>
                  <Text style={styles.avatarText}>{partner1Name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.heart}>♥</Text>
                <View style={[styles.avatar, styles.avatarSecondary]}>
                  <Text style={styles.avatarText}>
                    {(connected ? partner2Name : '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.coupleName}>
                {partner1Name} & {connected ? partner2Name : 'waiting for partner…'}
              </Text>
              {connected && couple?.partnerEmail && (
                <Text style={styles.partnerEmail}>Partner: {couple.partnerEmail}</Text>
              )}
              {couple?.anniversary && (
                <Text style={styles.anniversary}>InTandem since {couple.anniversary}</Text>
              )}
              {couple?.bio && <Text style={styles.bio}>{couple.bio}</Text>}
            </View>

            {!hasCoupleLink && (
              <View style={styles.connectCard}>
                <Text style={styles.connectTitle}>Connect with a code</Text>
                <Text style={styles.connectHint}>
                  Enter your partner&apos;s 8-digit code below. No account yet? They sign up first,
                  then enter your code here.
                </Text>

                <Text style={styles.formLabel}>Partner&apos;s code</Text>
                <TextInput
                  style={styles.input}
                  value={joinCode}
                  onChangeText={(t) => setJoinCode(t.replace(/\D/g, '').slice(0, 8))}
                  placeholder="12345678"
                  placeholderTextColor={Theme.textSecondary}
                  keyboardType="number-pad"
                  maxLength={8}
                />
                <Pressable
                  style={[styles.primaryBtn, busy && styles.btnDisabled]}
                  onPress={handleJoin}
                  disabled={busy}>
                  <Text style={styles.primaryBtnText}>Connect</Text>
                </Pressable>

                <View style={styles.divider} />

                <Text style={styles.connectTitle}>Or send invite by email</Text>
                <Text style={styles.connectHint}>
                  Opens your email app with your code pre-filled — InTandem does not send emails
                  from the server.
                </Text>
                <Text style={styles.formLabel}>Partner&apos;s email</Text>
                <TextInput
                  style={styles.input}
                  value={partnerEmail}
                  onChangeText={setPartnerEmail}
                  placeholder="partner@email.com"
                  placeholderTextColor={Theme.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Pressable
                  style={[styles.outlineBtn, busy && styles.btnDisabled]}
                  onPress={handleEmailInvite}
                  disabled={busy}>
                  <Text style={styles.outlineBtnText}>Send invite email</Text>
                </Pressable>
              </View>
            )}

            {hasCoupleLink && (
              <>
                <View style={styles.connectedBadge}>
                  <Text style={styles.connectedText}>Connected</Text>
                </View>
                <Pressable
                  style={[styles.removePartnerBtn, busy && styles.btnDisabled]}
                  onPress={handleRemovePartner}
                  disabled={busy}>
                  <Text style={styles.removePartnerBtnText}>Remove partner</Text>
                </Pressable>
                {removeError && <Text style={styles.removeError}>{removeError}</Text>}
              </>
            )}

            {editing ? (
              <View style={styles.form}>
                <Text style={styles.formLabel}>Your name</Text>
                <TextInput
                  style={styles.input}
                  value={myName}
                  onChangeText={setMyName}
                  placeholder="Your name"
                  placeholderTextColor={Theme.textSecondary}
                />
                {couple?.coupleId && (
                  <>
                    <Text style={styles.formLabel}>Anniversary / Start Date</Text>
                    <TextInput
                      style={styles.input}
                      value={anniversary}
                      onChangeText={setAnniversary}
                      placeholder="e.g. June 15, 2024"
                      placeholderTextColor={Theme.textSecondary}
                    />
                    <Text style={styles.formLabel}>Bio</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={bio}
                      onChangeText={setBio}
                      placeholder="A short note about your relationship..."
                      placeholderTextColor={Theme.textSecondary}
                      multiline
                    />
                  </>
                )}
                <View style={styles.formActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setEditing(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.saveBtn} onPress={handleSave} disabled={busy}>
                    <Text style={styles.saveBtnText}>{busy ? 'Saving…' : 'Save'}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.editBtn} onPress={startEdit}>
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </Pressable>
            )}
          </>
        )}

        <View style={styles.about}>
          <Text style={styles.aboutTitle}>About InTandem</Text>
          <Text style={styles.aboutText}>
            Every account gets a unique 8-digit code. Share it with your partner to connect — no
            server email required.
          </Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      <Modal
        visible={showRemoveConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemoveConfirm(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowRemoveConfirm(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Remove partner?</Text>
            <Text style={styles.modalMessage}>
              This unlinks you both. Your connection code stays the same — you can connect again
              later with a new code.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setShowRemoveConfirm(false)}
                disabled={busy}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirm, busy && styles.btnDisabled]}
                onPress={confirmRemovePartner}
                disabled={busy}>
                <Text style={styles.modalConfirmText}>{busy ? 'Removing…' : 'Remove'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  accountCard: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  accountLabel: { fontSize: 12, fontWeight: '600', color: Theme.textSecondary, marginBottom: 4 },
  accountEmail: { fontSize: 16, fontWeight: '700', color: Theme.text, marginBottom: 12 },
  signOutBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  signOutBtnText: { fontSize: 14, fontWeight: '600', color: Theme.textSecondary },
  errorCard: {
    backgroundColor: '#FDEDEC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F5B7B1',
  },
  errorTitle: { fontSize: 15, fontWeight: '700', color: '#922B21', marginBottom: 6 },
  errorText: { fontSize: 13, color: '#922B21', lineHeight: 18, marginBottom: 10 },
  errorSteps: { fontSize: 12, color: '#922B21', lineHeight: 18, marginBottom: 12 },
  retryBtn: { alignSelf: 'flex-start' },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: Theme.primary },
  myCodeCard: {
    backgroundColor: Theme.primaryLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.border,
  },
  myCodeLabel: { fontSize: 12, fontWeight: '700', color: Theme.primaryDark, textTransform: 'uppercase', letterSpacing: 1 },
  myCodeValue: { fontSize: 36, fontWeight: '800', color: Theme.primary, letterSpacing: 6, marginTop: 8 },
  myCodeMissing: { fontSize: 18, fontWeight: '600', color: Theme.textSecondary, marginTop: 8 },
  myCodeHint: {
    fontSize: 13,
    color: Theme.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C94A72',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarPrimary: { backgroundColor: Theme.love.rose },
  avatarSecondary: { backgroundColor: Theme.love.blush },
  avatarText: { fontSize: 26, fontWeight: '700', color: '#fff' },
  heart: { fontSize: 28, color: Theme.love.heart, fontWeight: '700' },
  coupleName: { fontSize: 22, fontWeight: '700', color: Theme.text, marginTop: 16, textAlign: 'center' },
  partnerEmail: { fontSize: 13, color: Theme.textSecondary, marginTop: 6 },
  anniversary: { fontSize: 14, color: Theme.love.roseDark, marginTop: 4, fontWeight: '600' },
  bio: {
    fontSize: 14,
    color: Theme.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  connectCard: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  connectTitle: { fontSize: 17, fontWeight: '700', color: Theme.text, marginBottom: 6 },
  connectHint: { fontSize: 14, color: Theme.textSecondary, lineHeight: 20, marginBottom: 12 },
  divider: { height: 1, backgroundColor: Theme.border, marginVertical: 20 },
  connectedBadge: {
    alignSelf: 'center',
    backgroundColor: Theme.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  connectedText: { color: Theme.primaryDark, fontWeight: '700', fontSize: 14 },
  removePartnerBtn: {
    alignSelf: 'center',
    marginBottom: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8B4B4',
  },
  removePartnerBtnText: { color: '#C0392B', fontSize: 14, fontWeight: '600' },
  removeError: {
    textAlign: 'center',
    color: '#C0392B',
    fontSize: 13,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Theme.surface,
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Theme.text, marginBottom: 10 },
  modalMessage: { fontSize: 14, color: Theme.textSecondary, lineHeight: 20, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.border,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: Theme.textSecondary },
  modalConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#C0392B',
    alignItems: 'center',
  },
  modalConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  editBtn: {
    backgroundColor: Theme.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 28,
  },
  editBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  form: { marginBottom: 28 },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.textSecondary,
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Theme.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Theme.text,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.border,
  },
  cancelBtnText: { color: Theme.textSecondary, fontSize: 16, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    backgroundColor: Theme.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: Theme.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { marginTop: 14, paddingVertical: 8, paddingHorizontal: 14 },
  secondaryBtnText: { color: Theme.primary, fontWeight: '700', fontSize: 15 },
  outlineBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.primary,
    marginTop: 8,
  },
  outlineBtnText: { color: Theme.primary, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  about: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    padding: 20,
  },
  aboutTitle: { fontSize: 16, fontWeight: '700', color: Theme.text, marginBottom: 8 },
  aboutText: { fontSize: 14, color: Theme.textSecondary, lineHeight: 20 },
  version: { fontSize: 12, color: Theme.textSecondary, marginTop: 12 },
});
