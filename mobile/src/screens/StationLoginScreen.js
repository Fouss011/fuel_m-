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

import {
  stationLogin,
  createStation,
  setStoredSession
} from '../api/client'

const INPUT_PROPS = {
  placeholderTextColor: '#64748B',
  selectionColor: '#7C3AED',
  cursorColor: '#7C3AED'
}

export default function StationLoginScreen({ navigation }) {
  const [mode, setMode] = useState('login')

  const [loading, setLoading] = useState(false)

  // LOGIN
  const [stationCode, setStationCode] = useState('')
  const [pinCode, setPinCode] = useState('')

  // CREATE
  const [stationName, setStationName] = useState('')
  const [createStationCode, setCreateStationCode] = useState('')
  const [location, setLocation] = useState('')
  const [managerName, setManagerName] = useState('')
  const [managerPhone, setManagerPhone] = useState('')
  const [createPinCode, setCreatePinCode] = useState('')

  async function handleLogin() {
    if (!stationCode.trim()) {
      Alert.alert('Champ manquant', 'Entre le code station.')
      return
    }

    if (!pinCode.trim()) {
      Alert.alert('Champ manquant', 'Entre le PIN responsable station.')
      return
    }

    try {
      setLoading(true)

      const response = await stationLogin({
        station_code: stationCode.trim().toUpperCase(),
        pin_code: pinCode.trim()
      })

      const data = response?.data || response

      if (!data?.token) {
        Alert.alert('Erreur', 'Session station invalide.')
        return
      }

      await setStoredSession({
        token: data.token,
        role: 'station_manager',
        stationId: data.station?.id,
        stationName: data.station?.name,
        stationCode: data.station?.station_code
      })

      navigation.reset({
        index: 0,
        routes: [{ name: 'StationManagerDashboard' }]
      })
    } catch (error) {
      Alert.alert(
        'Connexion refusée',
        error?.response?.data?.message ||
          error?.message ||
          'Impossible de connecter la station.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateStation() {
    if (!stationName.trim()) {
      Alert.alert('Champ manquant', 'Entre le nom de la station.')
      return
    }

    if (!createStationCode.trim()) {
      Alert.alert('Champ manquant', 'Entre un code station.')
      return
    }

    if (!managerName.trim()) {
      Alert.alert('Champ manquant', 'Entre le nom du responsable.')
      return
    }

    if (!createPinCode.trim()) {
      Alert.alert('Champ manquant', 'Entre le PIN responsable.')
      return
    }

    try {
      setLoading(true)

      await createStation({
        name: stationName.trim(),
        station_code: createStationCode.trim().toUpperCase(),
        location: location.trim(),
        manager_name: managerName.trim(),
        manager_phone: managerPhone.trim(),
        pin_code: createPinCode.trim()
      })

      Alert.alert(
        'Station créée',
        'La station a été créée avec succès. Tu peux maintenant te connecter.'
      )

      setMode('login')

      setStationCode(createStationCode.trim().toUpperCase())
      setPinCode(createPinCode.trim())

      setStationName('')
      setCreateStationCode('')
      setLocation('')
      setManagerName('')
      setManagerPhone('')
      setCreatePinCode('')
    } catch (error) {
      Alert.alert(
        'Erreur création',
        error?.response?.data?.message ||
          error?.message ||
          'Impossible de créer la station.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.heroBadge}>Gestion station</Text>

        <Text style={styles.heroTitle}>
          {mode === 'login'
            ? 'Connexion responsable station'
            : 'Créer une station'}
        </Text>

        <Text style={styles.heroSubtitle}>
          {mode === 'login'
            ? 'Connecte-toi avec le code et le PIN de la station.'
            : 'Créer la station avant d’ajouter les pompistes.'}
        </Text>
      </View>

      <View style={styles.switchRow}>
        <TouchableOpacity
          style={[
            styles.switchButton,
            mode === 'login' && styles.switchButtonActive
          ]}
          onPress={() => setMode('login')}
        >
          <Text
            style={[
              styles.switchText,
              mode === 'login' && styles.switchTextActive
            ]}
          >
            Connexion
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.switchButton,
            mode === 'create' && styles.switchButtonActive
          ]}
          onPress={() => setMode('create')}
        >
          <Text
            style={[
              styles.switchText,
              mode === 'create' && styles.switchTextActive
            ]}
          >
            Créer station
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'login' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Connexion station</Text>

          <TextInput
            {...INPUT_PROPS}
            value={stationCode}
            onChangeText={(value) =>
              setStationCode(value.toUpperCase())
            }
            placeholder="Code station"
            autoCapitalize="characters"
            style={styles.input}
          />

          <TextInput
            {...INPUT_PROPS}
            value={pinCode}
            onChangeText={setPinCode}
            placeholder="PIN responsable station"
            keyboardType="numeric"
            secureTextEntry
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Ouvrir la station
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nouvelle station</Text>

          <TextInput
            {...INPUT_PROPS}
            value={stationName}
            onChangeText={setStationName}
            placeholder="Nom station"
            style={styles.input}
          />

          <TextInput
            {...INPUT_PROPS}
            value={createStationCode}
            onChangeText={(value) =>
              setCreateStationCode(value.toUpperCase())
            }
            placeholder="Code station"
            autoCapitalize="characters"
            style={styles.input}
          />

          <TextInput
            {...INPUT_PROPS}
            value={location}
            onChangeText={setLocation}
            placeholder="Ville / localisation"
            style={styles.input}
          />

          <TextInput
            {...INPUT_PROPS}
            value={managerName}
            onChangeText={setManagerName}
            placeholder="Nom responsable station"
            style={styles.input}
          />

          <TextInput
            {...INPUT_PROPS}
            value={managerPhone}
            onChangeText={setManagerPhone}
            placeholder="Téléphone responsable"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <TextInput
            {...INPUT_PROPS}
            value={createPinCode}
            onChangeText={setCreatePinCode}
            placeholder="PIN responsable station"
            keyboardType="numeric"
            secureTextEntry
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCreateStation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Créer la station
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF2FF'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  hero: {
    backgroundColor: '#4C1D95',
    borderRadius: 26,
    padding: 22,
    marginBottom: 16
  },
  heroBadge: {
    color: '#DDD6FE',
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 10
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900'
  },
  heroSubtitle: {
    color: '#E9D5FF',
    marginTop: 10,
    lineHeight: 22,
    fontWeight: '700'
  },
  switchRow: {
    flexDirection: 'row',
    marginBottom: 16
  },
  switchButton: {
    flex: 1,
    backgroundColor: '#E9E7FF',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4
  },
  switchButtonActive: {
    backgroundColor: '#4C1D95'
  },
  switchText: {
    color: '#4C1D95',
    fontWeight: '900'
  },
  switchTextActive: {
    color: '#FFFFFF'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 16
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    color: '#111827',
    fontWeight: '700'
  },
  primaryButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15
  }
})