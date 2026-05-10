import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native'
import { stationLogin, setStoredSession } from '../api/client'

export default function StationLoginScreen({ navigation }) {
  const [stationCode, setStationCode] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    const cleanStationCode = stationCode.trim().toUpperCase()
    const cleanPin = pinCode.trim()

    if (!cleanStationCode) {
      Alert.alert('Code station requis', 'Entre le code de la station.')
      return
    }

    if (!cleanPin) {
      Alert.alert('PIN requis', 'Entre le code PIN du responsable station.')
      return
    }

    try {
      setLoading(true)

      const data = await stationLogin({
        station_code: cleanStationCode,
        pin_code: cleanPin
      })

      await setStoredSession({
        token: data.token,
        role: 'station_manager',
        stationId: data.station?.id,
        stationName: data.station?.name,
        stationCode: data.station?.station_code
      })

      navigation.reset({
        index: 0,
        routes: [{ name: 'StationTransactions' }]
      })
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        'Impossible de connecter le responsable station.'

      Alert.alert('Connexion refusée', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🏪</Text>
        </View>

        <Text style={styles.badge}>Suivi station</Text>
        <Text style={styles.title}>Responsable station</Text>
        <Text style={styles.subtitle}>
          Accède au récapitulatif des chauffeurs servis, des litres distribués et des montants.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Code station</Text>
        <TextInput
          value={stationCode}
          onChangeText={setStationCode}
          placeholder="Ex : STATION01"
          autoCapitalize="characters"
          style={styles.input}
          editable={!loading}
        />

        <Text style={styles.label}>Code PIN</Text>
        <TextInput
          value={pinCode}
          onChangeText={setPinCode}
          placeholder="PIN responsable"
          secureTextEntry
          keyboardType="number-pad"
          style={styles.input}
          editable={!loading}
        />

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Accéder au suivi station</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          Cet espace permet uniquement de consulter les transactions carburant servies.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  content: {
    padding: 18,
    paddingBottom: 34
  },
  hero: {
    backgroundColor: '#061A2F',
    borderRadius: 30,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#061A2F',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  icon: {
    fontSize: 32
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(124,58,237,0.35)',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14
  },
  title: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
    marginBottom: 10
  },
  subtitle: {
    color: '#D7E4F2',
    fontSize: 15,
    lineHeight: 22
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E1EAF3',
    shadowColor: '#071C33',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3
  },
  label: {
    fontSize: 14,
    fontWeight: '900',
    color: '#071C33',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#F6F9FC',
    borderWidth: 1,
    borderColor: '#DDE7F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#071C33',
    marginBottom: 16
  },
  button: {
    backgroundColor: '#7C3AED',
    borderRadius: 17,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900'
  },
  note: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
    textAlign: 'center'
  }
})