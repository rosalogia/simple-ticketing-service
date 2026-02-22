import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {queueApi} from '../api/client';
import type {DiscordServerInfo} from '../types';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {colors, spacing, fontSize, fontWeight, borderRadius} from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateQueue'>;

type TabType = 'manual' | 'discord';

export default function CreateQueueScreen({navigation}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('manual');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [servers, setServers] = useState<DiscordServerInfo[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);

  useEffect(() => {
    if (activeTab === 'discord') {
      setLoadingServers(true);
      queueApi
        .getDiscordServers()
        .then(setServers)
        .catch(() => {})
        .finally(() => setLoadingServers(false));
    }
  }, [activeTab]);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    setSubmitting(true);
    try {
      await queueApi.createQueue({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportDiscord = async (guildId: string) => {
    setSubmitting(true);
    try {
      await queueApi.createFromDiscord(guildId);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Tab selector */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'manual' && styles.tabActive]}
          onPress={() => setActiveTab('manual')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'manual' && styles.tabTextActive,
            ]}>
            Manual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discord' && styles.tabActive]}
          onPress={() => setActiveTab('discord')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'discord' && styles.tabTextActive,
            ]}>
            From Discord
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'manual' ? (
        <View style={styles.form}>
          <Text style={styles.label}>Queue Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Engineering Support"
            placeholderTextColor={colors.stone400}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="What is this queue for?"
            placeholderTextColor={colors.stone400}
            multiline
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && {opacity: 0.6}]}
            onPress={handleCreate}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>Create Queue</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          {loadingServers ? (
            <ActivityIndicator
              size="large"
              color={colors.accent}
              style={{marginTop: 40}}
            />
          ) : servers.length === 0 ? (
            <View style={styles.emptyServers}>
              <Text style={styles.emptyText}>
                No Discord servers found. Make sure you're logged in via Discord
                and the bot is in your server.
              </Text>
            </View>
          ) : (
            <FlatList
              data={servers}
              scrollEnabled={false}
              keyExtractor={s => s.guild_id}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.serverCard}
                  onPress={() => handleImportDiscord(item.guild_id)}
                  disabled={submitting}>
                  <View style={styles.serverInfo}>
                    <Text style={styles.serverName}>{item.name}</Text>
                    {item.member_count && (
                      <Text style={styles.serverMeta}>
                        {item.member_count} members
                      </Text>
                    )}
                  </View>
                  {item.bot_present && (
                    <View style={styles.botBadge}>
                      <Text style={styles.botBadgeText}>Bot Active</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.stone100,
    borderRadius: borderRadius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.white,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.inkMuted,
  },
  tabTextActive: {
    color: colors.ink,
  },
  form: {
    padding: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  submitText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  emptyServers: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.inkMuted,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  serverCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.stone200,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
  },
  serverMeta: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
  },
  botBadge: {
    backgroundColor: colors.statusDoneBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  botBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.statusDone,
  },
});
