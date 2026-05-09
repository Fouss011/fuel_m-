import { createNativeStackNavigator } from '@react-navigation/native-stack'

import HomeScreen from '../screens/HomeScreen'
import PinAccessScreen from '../screens/PinAccessScreen'
import DriverDashboardScreen from '../screens/DriverDashboardScreen'
import ChiefDashboardScreen from '../screens/ChiefDashboardScreen'
import PumpAttendantDashboardScreen from '../screens/PumpAttendantDashboardScreen'
import StationLoginScreen from '../screens/StationLoginScreen'
import StationTransactionsScreen from '../screens/StationTransactionsScreen'

const Stack = createNativeStackNavigator()

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#081B33'
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 20
        },
        headerBackTitleVisible: false,
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        contentStyle: {
          backgroundColor: '#F3F7FB'
        },
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Gestion carburant' }}
      />

      <Stack.Screen
        name="PinAccess"
        component={PinAccessScreen}
        options={{ title: 'Accès sécurisé' }}
      />

      <Stack.Screen
        name="ChiefDashboard"
        component={ChiefDashboardScreen}
        options={{ title: 'Espace chef' }}
      />

      <Stack.Screen
        name="DriverDashboard"
        component={DriverDashboardScreen}
        options={{ title: 'Espace chauffeur' }}
      />

      <Stack.Screen
        name="PumpAttendantDashboard"
        component={PumpAttendantDashboardScreen}
        options={{ title: 'Espace pompiste' }}
      />

      <Stack.Screen
        name="StationLogin"
        component={StationLoginScreen}
        options={{ title: 'Accès station' }}
      />

      <Stack.Screen
        name="StationTransactions"
        component={StationTransactionsScreen}
        options={{ title: 'Transactions station' }}
      />
    </Stack.Navigator>
  )
}