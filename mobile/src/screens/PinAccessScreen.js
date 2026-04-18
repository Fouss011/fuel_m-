import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native'

const PINS = {
  chief: '1234',
  pump: '5678'
}

export default function PinAccessScreen({ route, navigation }) {
  const { role } = route.params
  const [pin, setPin] = useState('')

  const isChief = role === 'chief'
  const title = isChief ? 'Accès chef' : 'Accès pompiste'
  const subtitle = isChief
    ? 'Entre le code sécurisé pour accéder à l’espace de pilotage.'
    : 'Entre le code sécurisé pour accéder à l’espace de confirmation.'
  const expectedPin = isChief ? PINS.chief : PINS.pump
  const targetScreen = isChief ? 'ChiefDashboard' : 'PumpAttendantDashboard'
  const badgeLabel = isChief ? 'CHEF' : 'POMPISTE'
  const badgeStyle = isChief ? styles.badgeChief : styles.badgePump
  const badgeTextStyle = isChief ? styles.badgeChiefText : styles.badgePumpText

  function handleValidate() {
    if (pin.trim() !== expectedPin) {
      Alert.alert('Code incorrect', 'Le code PIN est incorrect')
      return
    }

    navigation.replace(targetScreen)
  }

  return (
    <View style={styles.container}>
      <View style={styles.topCard}>
        <View style={[styles.badgeBase, badgeStyle]}>
          <Text style={badgeTextStyle}>{badgeLabel}</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Code PIN</Text>

        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          placeholder="Entrer le code"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          secureTextEntry
          maxLength={4}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Accès protégé</Text>
          <Text style={styles.infoText}>
            Cette zone est réservée au personnel autorisé. Dans la prochaine version,
            l’accès sera également rattaché à une structure spécifique.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleValidate}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>Accéder à l’espace</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#F3F7FB'
  },
  topCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  badgeBase: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12
  },
  badgeChief: {
    backgroundColor: '#DCFCE7'
  },
  badgeChiefText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  badgePump: {
    backgroundColor: '#FEF3C7'
  },
  badgePumpText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8
  },
  subtitle: {
    color: '#475569',
    lineHeight: 21
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  label: {
    marginBottom: 8,
    fontWeight: '800',
    color: '#0F172A'
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    color: '#0F172A'
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  infoTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 6
  },
  infoText: {
    color: '#64748B',
    lineHeight: 20,
    fontSize: 13
  },
  button: {
    backgroundColor: '#081B33',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center'
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16
  }
})