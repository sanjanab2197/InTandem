export function formatAuthError(message: string): string {
  let text = message;

  if (text.trimStart().startsWith('{')) {
    try {
      const parsed = JSON.parse(text) as { msg?: string; message?: string; error_description?: string };
      text = parsed.msg ?? parsed.message ?? parsed.error_description ?? text;
    } catch {
      // use raw message
    }
  }

  const lower = text.toLowerCase();

  if (lower.includes('rate limit') || lower.includes('429')) {
    return (
      'Email rate limit reached. Supabase only sends a few auth emails per hour on the free tier. ' +
      'Wait about an hour, or in Supabase go to Authentication → Providers → Email and turn off ' +
      '"Confirm email" while testing. Then sign up again — you will be signed in immediately.'
    );
  }

  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'This email is already registered. Try signing in instead.';
  }

  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password. If you just signed up, confirm your email first or ask your project admin to disable email confirmation.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email first, then sign in. Check your inbox (and spam folder).';
  }

  if (lower.includes('password should be at least') || lower.includes('weak password')) {
    return 'Choose a stronger password — at least 6 characters.';
  }

  if (lower.includes('same password') || lower.includes('should be different')) {
    return 'Pick a new password that is different from your old one.';
  }

  if (
    lower.includes('invalid recovery') ||
    lower.includes('expired') ||
    lower.includes('otp_expired')
  ) {
    return 'This reset link expired. Request a new one from the login screen.';
  }

  return text;
}
