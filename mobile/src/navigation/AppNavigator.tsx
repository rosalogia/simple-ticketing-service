import React from 'react';
import {ActivityIndicator, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useAuth} from '../auth/AuthContext';
import {colors, fontSize, fontWeight} from '../theme';

import LoginScreen from '../screens/LoginScreen';
import QueueListScreen from '../screens/QueueListScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TicketDetailScreen from '../screens/TicketDetailScreen';
import CreateTicketScreen from '../screens/CreateTicketScreen';
import QueueSettingsScreen from '../screens/QueueSettingsScreen';
import CreateQueueScreen from '../screens/CreateQueueScreen';

// ── Type definitions ──────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  QueueList: undefined;
  MainTabs: {queueId: number; screen?: string};
};

export type HomeStackParamList = {
  Dashboard: {queueId: number};
  TicketDetail: {ticketId: number};
  CreateTicket: {queueId: number};
};

export type SettingsStackParamList = {
  QueueSettings: {queueId: number};
  CreateQueue: undefined;
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
        options={{title: 'Tickets'}}
      >
        {() => <HomeStackNavigator queueId={queueId} />}
      </Tab.Screen>
      <Tab.Screen
        name="SettingsTab"
        options={{title: 'Settings'}}
      >
        {() => <SettingsStackNavigator queueId={queueId} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────

export default function AppNavigator() {
  const {isLoading, isAuthenticated} = useAuth();

  if (isLoading) {
    return (
      <View
        style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.paper}}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
