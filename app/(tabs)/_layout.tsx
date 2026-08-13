import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useT } from '../../src/lib/i18n'

export default function TabsLayout() {
  const { t } = useT()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#f5f5f4' },
        tabBarActiveTintColor: '#d97706',
        tabBarInactiveTintColor: '#a8a29e',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.today'),
          tabBarIcon: ({ color, size }) => <Ionicons name="today-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="forest"
        options={{
          title: t('tab.forest'),
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="den"
        options={{
          title: t('tab.den'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('tab.progress'),
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
        }}
      />
      {/* Calendar is merged into the Progress tab; keep the route reachable but hidden from the tab bar */}
      <Tabs.Screen name="calendar" options={{ href: null }} />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tab.settings'),
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
