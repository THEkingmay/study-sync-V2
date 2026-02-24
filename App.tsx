import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useFonts, Prompt_400Regular, Prompt_600SemiBold } from '@expo-google-fonts/prompt';

import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebaseConfig';

export type RootStackParamsLists = {
  auth: undefined;
  dashboard: undefined;
  timetable: undefined;
  planner: undefined;
  profile: undefined;
};

import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TimetableScreen from './src/screens/TimetableScreen';
import PlannerScreen from './src/screens/PlannerScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import THEME from './theme';
import { ActivityIndicator, View ,Text} from 'react-native';

const Tab = createBottomTabNavigator<RootStackParamsLists>();

export default function App() {
  let [fontsLoaded] = useFonts({
    REGULAR: Prompt_400Regular,
    BOLD: Prompt_600SemiBold,
  });

  const [, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (isInitializing) setIsInitializing(false);
    });

    return unsubscribe;
  }, [isInitializing]);

  if (!fontsLoaded || isInitializing) {
    return (
      <View style={{flex: 1,
    backgroundColor: THEME.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',}}>
        <ActivityIndicator size="large" color={THEME.PRIMARY} />
        <Text style={{marginTop: 20,
    fontSize: 16,
    color: THEME.TEXT_SUB,}}>กำลังเตรียมความพร้อม...</Text>
      </View>
    );
  }

  if (!auth.currentUser) {
    return <AuthScreen />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'dashboard') {
              iconName = focused ? 'grid' : 'grid-outline';
            } else if (route.name === 'timetable') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'planner') {
              iconName = focused ? 'document-text' : 'document-text-outline';
            } else if (route.name === 'profile') {
              iconName = focused ? 'person' : 'person-outline';
            } else {
              iconName = 'ellipse';
            }

            return <Ionicons name={iconName} size={size + 4} color={color} />;
          },

          tabBarActiveTintColor: THEME.PRIMARY,
          tabBarInactiveTintColor: THEME.SECONDARY,

          tabBarStyle: {
            position: 'absolute',
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 35,
            borderTopRightRadius: 35,
            borderTopWidth: 0,
            elevation: 20,
            borderWidth: 0.5,
            shadowColor: THEME.PRIMARY,
            shadowOpacity: 0.12,
            shadowOffset: { width: 0, height: -5 },
            shadowRadius: 15,
            height: 100,
            paddingBottom: 15,
            paddingTop: 10,
          },

          tabBarLabelStyle: {
            fontFamily: 'BOLD',
            fontSize: 12,
            marginTop: 1,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen name='dashboard' component={DashboardScreen} options={{ tabBarLabel: 'หน้าหลัก' }} />
        <Tab.Screen name='timetable' component={TimetableScreen} options={{ tabBarLabel: 'ตารางเรียน' }} />
        <Tab.Screen name='planner' component={PlannerScreen} options={{ tabBarLabel: 'แพลนเนอร์' }} />
        <Tab.Screen name='profile' component={ProfileScreen} options={{ tabBarLabel: 'โปรไฟล์' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}