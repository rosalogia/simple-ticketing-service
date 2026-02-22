import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, AppState, NativeModules, Platform, View} from 'react-native';
import {NavigationContainer, createNavigationContainerRef} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../auth/AuthContext';
import {handleRemoteMessage} from '../notifications/messageHandler';
import {setupForegroundNotificationHandler} from '../notifications/actionHandler';
import {requestNotificationPermission, registerDeviceToken} from '../notifications/tokenManager';
import {getPageSoundSettings} from '../notifications/pageSettings';
import {colors, fontSize, fontWeight} from '../theme';

import LoginScreen from '../screens/LoginScreen';
import QueueListScreen from '../screens/QueueListScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TicketDetailScreen from '../screens/TicketDetailScreen';
import CreateTicketScreen from '../screens/CreateTicketScreen';
import QueueSettingsScreen from '../screens/QueueSettingsScreen';
import CreateQueueScreen from '../screens/CreateQueueScreen';
import PageableHoursScreen from '../screens/PageableHoursScreen';
import PageAlertScreen from '../screens/PageAlertScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

export const navigationRef = createNavigationContainerRef();

// ── Type definitions ──────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  QueueList: undefined;
  CreateQueue: undefined;
  MainTabs: {queueId: number};
  PageAlert: {
    ticketId: number;
    title: string;
    priority: string;
    status: string;
    notificationId?: string;
    pageSoundEnabled?: boolean;
    pageVolume?: number;
  };
};

export type HomeStackParamList = {
  Dashboard: {queueId: number};
  TicketDetail: {ticketId: number};
  CreateTicket: {queueId: number};
};

export type NotificationsStackParamList = {
  Notifications: undefined;
};

export type SettingsStackParamList = {
  QueueSettings: {queueId: number};
  PageableHours: {queueId: number};
};

// ── Stacks ────────────────────────────────────────────────────────────

const RootStack = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const NotificationsStack = createNativeStackNavigator<NotificationsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const Tab = createBottomTabNavigator();

function HomeStackNavigator({queueId}: {queueId: number}) {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.paper},
        headerTintColor: colors.ink,
        headerTitleStyle: {fontWeight: fontWeight.semibold, fontSize: fontSize.lg},
        headerShadowVisible: false,
      }}>
      <HomeStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        initialParams={{queueId}}
        options={{title: 'Tickets'}}
      />
      <HomeStack.Screen
        name="TicketDetail"
        component={TicketDetailScreen}
        options={{title: 'Ticket'}}
      />
      <HomeStack.Screen
        name="CreateTicket"
        component={CreateTicketScreen}
        options={{title: 'New Ticket'}}
      />
    </HomeStack.Navigator>
  );
}

function NotificationsStackNavigator() {
  return (
    <NotificationsStack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.paper},
        headerTintColor: colors.ink,
        headerTitleStyle: {fontWeight: fontWeight.semibold, fontSize: fontSize.lg},
        headerShadowVisible: false,
      }}>
      <NotificationsStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: 'Notifications'}}
      />
    </NotificationsStack.Navigator>
  );
}

function SettingsStackNavigator({queueId}: {queueId: number}) {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.paper},
        headerTintColor: colors.ink,
        headerTitleStyle: {fontWeight: fontWeight.semibold, fontSize: fontSize.lg},
        headerShadowVisible: false,
      }}>
      <SettingsStack.Screen
        name="QueueSettings"
        component={QueueSettingsScreen}
        initialParams={{queueId}}
        options={{title: 'Settings'}}
      />
      <SettingsStack.Screen
        name="PageableHours"
        component={PageableHoursScreen}
        options={{title: 'Paging Settings'}}
      />
    </SettingsStack.Navigator>
  );
}

function MainTabNavigator({route}: {route: {params: {queueId: number}}}) {
  const queueId = route.params.queueId;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.stone200,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.medium,
        },
      }}>
      <Tab.Screen
        name="HomeTab"
        options={{
          title: 'Tickets',
          tabBarIcon: ({color, size}) => (
            <Icon name="ticket-outline" size={size} color={color} />
          ),
        }}
      >
        {() => <HomeStackNavigator queueId={queueId} />}
      </Tab.Screen>
      <Tab.Screen
        name="NotificationsTab"
        options={{
          title: 'Notifications',
          tabBarIcon: ({color, size}) => (
            <Icon name="bell-outline" size={size} color={color} />
          ),
        }}
      >
        {() => <NotificationsStackNavigator />}
      </Tab.Screen>
      <Tab.Screen
        name="SettingsTab"
        options={{
          title: 'Settings',
          tabBarIcon: ({color, size}) => (
            <Icon name="cog-outline" size={size} color={color} />
          ),
        }}
      >
        {() => <SettingsStackNavigator queueId={queueId} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────

export default function AppNavigator() {
  const {isLoading, isAuthenticated} = useAuth();
  const [navReady, setNavReady] = useState(false);

  const onNavReady = useCallback(() => {
    setNavReady(true);
  }, []);

  // Setup foreground message handler and foreground notification action handler
  useEffect(() => {
    const unsubscribe = messaging().onMessage(handleRemoteMessage);
    setupForegroundNotificationHandler();
    return unsubscribe;
  }, []);

  // Handle cold-start navigation from notification tap
  useEffect(() => {
    if (!navReady || !isAuthenticated) return;

    (async () => {
      const initial = await notifee.getInitialNotification();
      if (!initial) return;

      const {notification, pressAction} = initial;
      const data = notification.data;
      const actionId = pressAction.id;
      if (!data) return;

      const ticketId = data.ticket_id ? Number(data.ticket_id) : null;
      const isPage = data.type === 'page';

      if (!ticketId) return;

      // Stop siren if still playing
      if (isPage && Platform.OS === 'android' && NativeModules.SirenPlayer) {
        NativeModules.SirenPlayer.stop();
      }

      if (isPage && (actionId === 'default' || !actionId)) {
        // Tapped notification body → open PageAlert
        const pageSettings = await getPageSoundSettings();
        (navigationRef as any).navigate('PageAlert', {
          ticketId,
          title: data.title || 'Unknown',
          priority: data.priority || 'SEV1',
          status: data.status || 'OPEN',
          notificationId: notification.id,
          pageSoundEnabled: pageSettings.soundEnabled,
          pageVolume: pageSettings.volume,
        });
      } else if (actionId === 'view_ticket') {
        // View Ticket action → navigate to ticket detail
        (navigationRef as any).navigate('MainTabs', {
          screen: 'HomeTab',
          params: {
            screen: 'TicketDetail',
            params: {ticketId},
          },
        });
      }
      // 'acknowledge' is handled by the background handler — no navigation needed
    })();
  }, [navReady, isAuthenticated]);

  // Re-check notification permission when app returns to foreground
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    if (!isAuthenticated) return;
    const sub = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/background/) && nextState === 'active') {
        // User may have just enabled notifications in settings
        requestNotificationPermission().then(granted => {
          if (granted) registerDeviceToken();
        });
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View
        style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.paper}}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={onNavReady}>
      <RootStack.Navigator screenOptions={{headerShown: false}}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <RootStack.Screen name="QueueList" component={QueueListScreen} />
            <RootStack.Screen
              name="CreateQueue"
              component={CreateQueueScreen}
              options={{
                headerShown: true,
                title: 'New Queue',
                headerStyle: {backgroundColor: colors.paper},
                headerTintColor: colors.ink,
                headerTitleStyle: {fontWeight: fontWeight.semibold, fontSize: fontSize.lg},
                headerShadowVisible: false,
              }}
            />
            <RootStack.Screen
              name="MainTabs"
              component={MainTabNavigator as any}
            />
            <RootStack.Screen
              name="PageAlert"
              component={PageAlertScreen}
              options={{
                headerShown: false,
                presentation: 'fullScreenModal',
                animation: 'fade',
              }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
