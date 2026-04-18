import { createNativeStackNavigator } from '@react-navigation/native-stack'

import HomeScreen from '../screens/HomeScreen'
import DriverDashboardScreen from '../screens/DriverDashboardScreen'
import NewFuelRequestScreen from '../screens/NewFuelRequestScreen'
import ChiefDashboardScreen from '../screens/ChiefDashboardScreen'
import PumpAttendantDashboardScreen from '../screens/PumpAttendantDashboardScreen'
import RequestDetailsScreen from '../screens/RequestDetailsScreen'
import ConfirmFuelScreen from '../screens/ConfirmFuelScreen'
import PinAccessScreen from '../screens/PinAccessScreen'
import CreateStructureScreen from '../screens/CreateStructureScreen'
import TeamManagementScreen from '../screens/TeamManagementScreen'

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
        name="DriverDashboard"
        component={DriverDashboardScreen}
        options={{ title: 'Espace chauffeur' }}
      />

      <Stack.Screen
        name="NewFuelRequest"
        component={NewFuelRequestScreen}
        options={{ title: 'Nouvelle demande' }}
      />

      <Stack.Screen
        name="ChiefDashboard"
        component={ChiefDashboardScreen}
        options={{ title: 'Espace chef' }}
      />

      <Stack.Screen
        name="PumpAttendantDashboard"
        component={PumpAttendantDashboardScreen}
        options={{ title: 'Espace pompiste' }}
      />

      <Stack.Screen
        name="RequestDetails"
        component={RequestDetailsScreen}
        options={{ title: 'Détail demande' }}
      />

      <Stack.Screen
        name="ConfirmFuel"
        component={ConfirmFuelScreen}
        options={{ title: 'Confirmation carburant' }}
      />

      <Stack.Screen
        name="CreateStructure"
        component={CreateStructureScreen}
        options={{ title: 'Créer une structure' }}
      />

      <Stack.Screen
        name="TeamManagement"
        component={TeamManagementScreen}
        options={{ title: 'Gestion équipe' }}
      />
    </Stack.Navigator>
  )
}