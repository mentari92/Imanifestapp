import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { colors } from '../constants/theme';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export default function AuthScreen() {
  const { login, register, startOAuthLogin, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const upgradeUrl =
    (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_QURAN_UPGRADE_URL) ||
    'https://quran.foundation';

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);

      if (mode === 'login') {
        if (!email.trim() || !password.trim()) {
          Alert.alert('Please fill in all fields');
          return;
        }
        await login(email.trim(), password.trim());

      } else if (mode === 'register') {
        if (!email.trim() || !password.trim() || !name.trim()) {
          Alert.alert('Please fill in all fields');
          return;
        }
        await register(email.trim(), password.trim(), name.trim());

      } else if (mode === 'forgot') {
        if (!email.trim()) {
          Alert.alert('Please enter your email');
          return;
        }
        const res = await api.post('/auth/forgot-password', { email: email.trim() });
        const data = res.data as { message: string; resetToken?: string };
        if (data.resetToken) {
          setResetToken(data.resetToken);
          Alert.alert(
            'Reset Token',
            `Your reset token:\n\n${data.resetToken}\n\nCopy this and use it on the next screen.`,
          );
        } else {
          Alert.alert('Email Sent', data.message);
        }
        setMode('reset');

      } else if (mode === 'reset') {
        if (!resetToken.trim() || !newPassword.trim()) {
          Alert.alert('Please fill in all fields');
          return;
        }
        const res = await api.post('/auth/reset-password', {
          token: resetToken.trim(),
          newPassword: newPassword.trim(),
        });
        const data = res.data as { message: string };
        Alert.alert('Success', data.message);
        setMode('login');
        setResetToken('');
        setNewPassword('');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || error.message || 'Something went wrong',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthPress = async () => {
    try {
      await startOAuthLogin();
    } catch (error: any) {
      Alert.alert('OAuth Login Unavailable', error?.message || 'OAuth login could not be started.');
    }
  };

  const handleUpgradePress = async () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const opened = window.open(upgradeUrl, '_blank', 'noopener,noreferrer');
        if (!opened) window.location.assign(upgradeUrl);
        return;
      }

      const canOpen = await Linking.canOpenURL(upgradeUrl);
      if (!canOpen) {
        Alert.alert('Unable to open link', upgradeUrl);
        return;
      }
      await Linking.openURL(upgradeUrl);
    } catch (error: any) {
      Alert.alert('Unable to open upgrade link', error?.message || upgradeUrl);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Brand */}
        <View style={styles.brandSection}>
          <Text style={styles.logo}>☪️</Text>
          <Text style={styles.appName}>Imanifest</Text>
          <Text style={styles.tagline}>Your Islamic Spiritual Companion</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Title */}
          <Text style={styles.formTitle}>
            {mode === 'login' && 'Sign In'}
            {mode === 'register' && 'Create Account'}
            {mode === 'forgot' && 'Forgot Password'}
            {mode === 'reset' && 'Reset Password'}
          </Text>

          {/* Register: Name */}
          {mode === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          {/* Login / Register / Forgot: Email */}
          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          )}

          {/* Login / Register: Password */}
          {(mode === 'login' || mode === 'register') && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          )}

          {/* Reset: Token */}
          {mode === 'reset' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reset Token</Text>
              <TextInput
                style={styles.input}
                placeholder="Paste your reset token here"
                placeholderTextColor={colors.textSecondary}
                value={resetToken}
                onChangeText={setResetToken}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {/* Reset: New Password */}
          {mode === 'reset' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textSecondary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, (loading || submitting) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading || submitting}
          >
            <Text style={styles.buttonText}>
              {loading || submitting
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign In'
                  : mode === 'register'
                    ? 'Create Account'
                    : mode === 'forgot'
                      ? 'Send Reset Token'
                      : 'Reset Password'}
            </Text>
          </TouchableOpacity>

          {(mode === 'login' || mode === 'register') && (
            <TouchableOpacity
              style={styles.oauthButton}
              onPress={() => void handleOAuthPress()}
              disabled={loading || submitting}
            >
              <Text style={styles.oauthButtonText}>Continue with Quran.com (OAuth)</Text>
            </TouchableOpacity>
          )}

          {(mode === 'login' || mode === 'register') && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => void handleUpgradePress()}
              disabled={loading || submitting}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          )}

          {(mode === 'login' || mode === 'register') && (
            <Text style={styles.oauthHint}>
              We only request access needed for Quran user features (goals, streaks, reflections).
            </Text>
          )}

          {(mode === 'login' || mode === 'register') && (
            <Text style={styles.upgradeHint}>
              Premium upgrade is handled externally and will open in your browser.
            </Text>
          )}

          {/* Forgot password link (on login screen) */}
          {mode === 'login' && (
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => setMode('forgot')}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {/* Switch between login / register */}
          {(mode === 'login' || mode === 'register') && (
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              <Text style={styles.switchText}>
                {mode === 'login'
                  ? "Don't have an account? Sign Up"
                  : 'Already have an account? Sign In'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Back to login link (on forgot/reset screen) */}
          {(mode === 'forgot' || mode === 'reset') && (
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setMode('login')}
            >
              <Text style={styles.switchText}>Back to Sign In</Text>
            </TouchableOpacity>
          )}

          {(mode === 'login' || mode === 'register') && (
            <View style={styles.legalContainer}>
              <Text style={styles.legalText}>By continuing, you agree to our </Text>
              <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
                <Text style={styles.legalLink}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.legalText}> and </Text>
              <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.legalText}>.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  brandSection: {
    alignItems: 'center' as const,
    marginBottom: 28,
    width: '100%' as const,
    maxWidth: 420,
  },
  logo: {
    fontSize: 64,
    marginBottom: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.primary,
    fontFamily: 'Inter-Bold',
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
    fontFamily: 'Inter-Regular',
  },
  form: {
    width: '100%' as const,
    maxWidth: 420,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 20,
    fontFamily: 'Inter-Bold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 6,
    fontFamily: 'Inter-SemiBold',
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  oauthButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    marginTop: 10,
  },
  oauthButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
    fontFamily: 'Inter-SemiBold',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
    fontFamily: 'Inter-SemiBold',
  },
  oauthHint: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
  },
  upgradeHint: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: 'Inter-SemiBold',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center' as const,
  },
  switchText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Inter-Regular',
  },
  forgotButton: {
    marginTop: 10,
    alignItems: 'center' as const,
  },
  forgotText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'Inter-Regular',
  },
  legalContainer: {
    marginTop: 14,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'center' as const,
  },
  legalText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: 'Inter-Regular',
  },
  legalLink: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.primary,
    textDecorationLine: 'underline' as const,
    fontFamily: 'Inter-SemiBold',
  },
};