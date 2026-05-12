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
  selectionColor: '#0F766E',
  cursorColor: '#0F766E'
}

export default function StationLoginScreen({ navigation }) {
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)

  const [stationCode, setStationCode] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [showLoginPin, setShowLoginPin] = useState(false)

  const [stationName, setStationName] = useState('')
  const [createStationCode, setCreateStationCode] = useState('')
  const [location, setLocation] = useState('')
  const [managerName, setManagerName] = useState('')
  const [managerPhone, setManagerPhone] = useState('')
  const [managerEmail, setManagerEmail] = useState('')
  const [createPinCode, setCreatePinCode] = useState('')
  const [showCreatePin, setShowCreatePin] = useState(false)

  async function handleLogin() {
    if (!stationCode.trim()) {
      Alert.alert('Champ manquant', 'Entre le code station.')
      return
    }

    if (!pinCode.trim()) {
      Alert.alert('Champ manquant', 'Entre le mot de passe responsable station.')
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

    if (!managerEmail.trim()) {
      Alert.alert('Champ manquant', 'Entre l’email du responsable.')
      return
    }

    if (!createPinCode.trim()) {
      Alert.alert('Champ manquant', 'Entre le mot de passe responsable.')
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
        email: managerEmail.trim().toLowerCase(),
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
      setManagerEmail('')
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

  function PasswordInput({ value, onChangeText, placeholder, visible, onToggle }) {
    return (
      <View style={styles.passwordBox}>
        <TextInput
          {...INPUT_PROPS}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={!visible}
          style={styles.passwordInput}
          autoCapitalize="none"
        />

        <TouchableOpacity onPress={onToggle}>
          <Text style={styles.eyeText}>
            {visible ? 'Masquer' : 'Voir'}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
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
            ? 'Connecte-toi avec le code station et le mot de passe responsable.'
            : 'Crée le compte station. Les pompistes seront créés ensuite dans l’administration.'}
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
            onChangeText={(value) => setStationCode(value.toUpperCase())}
            placeholder="Code station"
            autoCapitalize="characters"
            style={styles.input}
          />

          <PasswordInput
            value={pinCode}
            onChangeText={setPinCode}
            placeholder="Mot de passe responsable station"
            visible={showLoginPin}
            onToggle={() => setShowLoginPin(!showLoginPin)}
          />

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() =>
              navigation.navigate('ForgotPassword', {
                type: 'station'
              })
            }
          >
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

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
            onChangeText={(value) => setCreateStationCode(value.toUpperCase())}
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
            value={managerEmail}
            onChangeText={setManagerEmail}
            placeholder="Email responsable station"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <PasswordInput
            value={createPinCode}
            onChangeText={setCreatePinCode}
            placeholder="Mot de passe responsable station"
            visible={showCreatePin}
            onToggle={() => setShowCreatePin(!showCreatePin)}
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
    backgroundColor: '#EEF6FB'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  hero: {
    backgroundColor: '#002B45',
    borderRadius: 26,
    padding: 22,
    marginBottom: 16
  },
  heroBadge: {
    color: '#A7F3D0',
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
    color: '#D6E4F0',
    marginTop: 10,
    lineHeight: 22,
    fontWeight: '700'
  },
  switchRow: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#DDECF6',
    padding: 5,
    borderRadius: 18
  },
  switchButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  switchButtonActive: {
    backgroundColor: '#002B45'
  },
  switchText: {
    color: '#48657A',
    fontWeight: '900'
  },
  switchTextActive: {
    color: '#FFFFFF'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D2E3EF'
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 16
  },
  input: {
    backgroundColor: '#F8FBFD',
    borderWidth: 1,
    borderColor: '#C9DCEB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    color: '#111827',
    fontWeight: '700'
  },
  passwordBox: {
    backgroundColor: '#F8FBFD',
    borderWidth: 1,
    borderColor: '#C9DCEB',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#111827',
    fontWeight: '700'
  },
  eyeText: {
    color: '#0F766E',
    fontWeight: '900'
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 14,
    paddingVertical: 4
  },
  forgotText: {
    color: '#0F766E',
    fontWeight: '900'
  },
  primaryButton: {
    backgroundColor: '#0F766E',
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