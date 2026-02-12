import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../auth/AuthContext';
import {api} from '../api/client';
import type {User} from '../types';
import {colors, spacing, fontSize, fontWeight, borderRadius} from '../theme';

export default function LoginScreen() {
  const {login, devLogin, devMode} = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (devMode) {
      api.getUsers().then(setUsers).catch(() => {});
    }
  }, [devMode]);

  const handleDiscordLogin = async () => {
    setLoading(true);
    try {
      await login();
    } catch {
      setLoading(false);
    }
  };

  const handleDevLogin = async (userId: number) => {
    setLoading(true);
    try {
      await devLogin(userId);
    } catch {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>STS</Text>
        <Text style={styles.subtitle}>Support Ticket System</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : devMode ? (
          <View style={styles.devSection}>
            <Text style={styles.devLabel}>Dev Mode - Select User</Text>
            <FlatList
              data={users}
              keyExtractor={u => String(u.id)}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.userRow}
                  onPress={() => handleDevLogin(item.id)}>
                  <Text style={styles.userName}>{item.display_name}</Text>
                  <Text style={styles.userSub}>@{item.username}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No users found</Text>
              }
            />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.discordButton}
            onPress={handleDiscordLogin}>
            <Text style={styles.discordButtonText}>Sign in with Discord</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  logo: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.inkMuted,
    marginBottom: spacing.xxxl,
  },
  discordButton: {
    backgroundColor: colors.discord,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    width: '100%',
    alignItems: 'center',
  },
  discordButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  devSection: {
    width: '100%',
    flex: 1,
    maxHeight: 400,
  },
  devLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.inkMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  userRow: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
  },
  userSub: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.inkMuted,
    marginTop: spacing.xl,
  },
});
