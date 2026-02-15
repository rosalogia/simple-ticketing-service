import React, {useEffect, useRef} from 'react';
import {ActivityIndicator, AppState, View} from 'react-native';
import {NavigationContainer, createNavigationContainerRef} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import messaging from '@react-native-firebase/messaging';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../auth/AuthContext';
import {handleRemoteMessage} from '../notifications/messageHandler';
import {setupNotificationActionHandler} from '../notifications/actionHandler';
import {requestNotificationPermission, registerDeviceToken} from '../notifications/tokenManager';
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

export const navigationRef = createNavigationContainerRef();

// ── Type definitions ──────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  QueueList: undefined;
  MainTabs: {queueId: number; screen?: string};
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

export type SettingsStackParamList = {
  QueueSettings: {queueId: number};
  CreateQueue: undefined;
  PageableHours: {queueId: number};
};

// ── Stacks ────────────────────────────────────────────────────────────

const RootStack = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
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
        name="CreateQueue"
        component={CreateQueueScreen}
        options={{title: 'New Queue'}}
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

  // Setup foreground message handler and notification action handler
  useEffect(() => {
    const unsubscribe = messaging().onMessage(handleRemoteMessage);
    setupNotificationActionHandler();
    return unsubscribe;
  }, []);

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
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{headerShown: false}}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <RootStack.Screen name="QueueList" component={QueueListScreen} />
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
