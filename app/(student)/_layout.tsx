import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useThemeStore } from '../../store/themeStore';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ACTIVE_COLOR   = '#1565C0';
const ACTIVE_DARK    = '#42A5F5';
const INACTIVE_COLOR = '#9E9E9E';

const TAB_ICONS: Record<string, { focused: IconName; unfocused: IconName; label: string }> = {
  dashboard:   { focused: 'home',           unfocused: 'home-outline',           label: 'Home'    },
  hostels:     { focused: 'home-city',      unfocused: 'home-city-outline',      label: 'Hostels' },
  reservation: { focused: 'calendar-check', unfocused: 'calendar-check-outline', label: 'Reserve' },
  payment:     { focused: 'credit-card',    unfocused: 'credit-card-outline',    label: 'Payment' },
  profile:     { focused: 'account-circle', unfocused: 'account-circle-outline', label: 'Profile' },
};

function WhatsAppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets      = useSafeAreaInsets();
  const isDark      = useThemeStore((s) => s.isDark);
  const activeColor = isDark ? ACTIVE_DARK : ACTIVE_COLOR;
  const tabBg       = isDark ? '#1E1E2D' : '#ffffff';
  const tabBorder   = isDark ? '#2C2C3E' : '#E0E0E0';

  return (
    <View style={[
      styles.tabBar,
      { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: tabBg, borderTopColor: tabBorder },
    ]}>
      {state.routes.map((route) => {
        const tab = TAB_ICONS[route.name];
        if (!tab) return null;

        const isFocused = state.routes[state.index].name === route.name;
        const { options } = descriptors[route.key];

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.tabItem}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            android_ripple={{ color: isDark ? 'rgba(66,165,245,0.1)' : 'rgba(21,101,192,0.08)', borderless: true, radius: 32 }}
          >
            <MaterialCommunityIcons
              name={isFocused ? tab.focused : tab.unfocused}
              size={28}
              color={isFocused ? activeColor : INACTIVE_COLOR}
            />
            <Text style={[styles.label, isFocused && { color: activeColor, fontWeight: '700' }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function StudentLayout() {
  const isDark          = useThemeStore((s) => s.isDark);
  const headerBg        = isDark ? '#1E1E2D' : '#ffffff';
  const headerTextColor = isDark ? '#E0E0E0' : '#1a1a2e';

  return (
    <Tabs
      tabBar={(props) => <WhatsAppTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: headerBg, elevation: 0, shadowOpacity: 0 },
        headerTintColor: headerTextColor,
        headerTitleStyle: { fontWeight: 'bold', fontSize: 18, color: headerTextColor },
      }}
    >
      <Tabs.Screen name="dashboard"   options={{ title: 'Home',    headerShown: false }} />
      <Tabs.Screen name="hostels"     options={{ title: 'Hostels' }} />
      <Tabs.Screen name="reservation" options={{ title: 'Reserve' }} />
      <Tabs.Screen name="payment"     options={{ title: 'Payment' }} />
      <Tabs.Screen name="profile"     options={{ title: 'Profile' }} />
      <Tabs.Screen name="notifications" options={{ href: null, title: 'Notifications' }} />
      <Tabs.Screen name="rooms/[id]"  options={{ href: null, title: 'Room', headerShown: true }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: INACTIVE_COLOR,
  },
});
