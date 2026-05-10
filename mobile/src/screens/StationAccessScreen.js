import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native'
import { api, setStoredSession } from '../api/client'

const INPUT_PROPS = {
  placeholderTextColor: '#64748B',
  selectionColor: '#0F766E',
  cursorColor: '#0F766E'
}

export default function StationAccessScreen({ navigation }) {
  const [stationCode, setStationCode] = useState('')
  const [station, setStation] = useState(null)
  const [pumpAttendants, setPumpAttendants] = useState([])
  const [selectedPump, setSelectedPump] = useState(null)
  const [pinCode, setPinCode] = useState('')
  const [loadingStation, setLoadingStation] = useState(false)
  const [loadingLogin, setLoadingLogin] = useState(false)

  async function handleFindStation() {
    const cleanCode = stationCode.trim().toUpperCase()

    if (!cleanCode) {
      Alert.alert('Code station requis', 'Entre le code de la station.')
      return
    }

    try {
      setLoadingStation(true)
      setStation(null)
      setPumpAttendants([])
      setSelectedPump(null)
      setPinCode('')

      const stationResponse = await api.get(`/station/public/${cleanCode}`)
      const foundStation = stationResponse?.data?.data

      if (!foundStation?.id) {
        Alert.alert('Station introuvable', 'Aucune station active ne correspond à ce code.')
        return
      }

      const pumpsResponse = await api.get(`/station/${foundStation.id}/pump-attendants`)
      const data = pumpsResponse?.data?.data

      setStation(data?.station || foundStation)
      setPumpAttendants(data?.pump_attendants || [])

      if (!data?.pump_attendants?.length) {
        Alert.alert(
          'Aucun pompiste',
          'Cette station existe, mais aucun pompiste actif n’est encore enregistré.'
        )
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        'Impossible de retrouver la station.'

      Alert.alert('Erreur', message)
    } finally {
      setLoadingStation(false)
    }
  }

  async function handlePumpLogin() {
    if (!station?.id) {
      Alert.alert('Station requise', 'Recherche d’abord la station.')
      return
    }

    if (!selectedPump?.id) {
      Alert.alert('Pompiste requis', 'Choisis ton nom dans la liste.')
      return
    }

    const cleanPin = pinCode.trim()

    if (!cleanPin) {
      Alert.alert('PIN requis', 'Entre ton code PIN pompiste.')
      return
    }

    try {
      setLoadingLogin(true)

      const response = await api.post('/auth/pump-access', {
        station_id: station.id,
        pump_attendant_id: selectedPump.id,
        pin_code: cleanPin
      })

      const data = response?.data?.data || response?.data

      await setStoredSession({
        token: data.token,
        role: 'pump_attendant',
        userId: data.user?.id || selectedPump.id,
        name: data.user?.name || selectedPump.name,
        phone: data.user?.phone || selectedPump.phone,
        stationId: station.id,
        stationName: station.name,
        stationCode: station.station_code
      })

      navigation.reset({
        index: 0,
        routes: [{ name: 'PumpAttendantDashboard' }]
      })
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        'PIN incorrect ou accès pompiste refusé.'

      Alert.alert('Connexion refusée', message)
    } finally {
      setLoadingLogin(false)
    }
  }

  function renderPump({ item }) {
    const active = selectedPump?.id === item.id

    return (
      <TouchableOpacity
        style={[styles.pumpCard, active && styles.pumpCardActive]}
        onPress={() => {
          setSelectedPump(item)
          setPinCode('')
        }}
      >
        <View>
          <Text style={[styles.pumpName, active && styles.pumpNameActive]}>
            {item.name}
          </Text>
          <Text style={styles.pumpPhone}>
            {item.phone || 'Téléphone non renseigné'}
          </Text>
        </View>

        <Text style={[styles.selectBadge, active && styles.selectBadgeActive]}>
          {active ? 'Choisi' : 'Choisir'}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <Text style={styles.emoji}>⛽</Text>
        <Text style={styles.badge}>Accès pompiste</Text>
        <Text style={styles.title}>Entre le code de ta station</Text>
        <Text style={styles.subtitle}>
          Retrouve ta station, choisis ton nom, puis connecte-toi avec ton PIN.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Code station</Text>
        <TextInput
          {...INPUT_PROPS}
          value={stationCode}
          onChangeText={setStationCode}
          placeholder="Ex : TOTAL-ADIDO"
          autoCapitalize="characters"
          style={styles.input}
        />

        <TouchableOpacity
          style={[styles.primaryButton, loadingStation && styles.disabledButton]}
          onPress={handleFindStation}
          disabled={loadingStation}
        >
          {loadingStation ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Rechercher la station</Text>
          )}
        </TouchableOpacity>
      </View>

      {station ? (
        <View style={styles.stationBox}>
          <Text style={styles.stationTitle}>{station.name}</Text>
          <Text style={styles.stationMeta}>
            Code : {station.station_code}
          </Text>
          <Text style={styles.stationMeta}>
            Ville : {station.city || 'Non renseignée'}
          </Text>
          <Text style={styles.stationMeta}>
            Responsable : {station.manager_name || 'Non renseigné'}
          </Text>
        </View>
      ) : null}

      {pumpAttendants.length ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Choisis ton profil pompiste</Text>

          <FlatList
            data={pumpAttendants}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderPump}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />

          {selectedPump ? (
            <View style={styles.pinBox}>
              <Text style={styles.label}>PIN de {selectedPump.name}</Text>
              <TextInput
                {...INPUT_PROPS}
                value={pinCode}
                onChangeText={setPinCode}
                placeholder="Code PIN"
                secureTextEntry
                keyboardType="number-pad"
                style={styles.input}
              />

              <TouchableOpacity
                style={[styles.primaryButton, loadingLogin && styles.disabledButton]}
                onPress={handlePumpLogin}
                disabled={loadingLogin}
              >
                {loadingLogin ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Entrer dans la station</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6FF'
  },
  content: {
    padding: 20,
    paddingBottom: 40
  },
  hero: {
    backgroundColor: '#081B33',
    borderRadius: 28,
    padding: 24,
    marginBottom: 18
  },
  emoji: {
    fontSize: 42,
    marginBottom: 10
  },
  badge: {
    color: '#99F6E4',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900'
  },
  subtitle: {
    color: '#CBD5E1',
    marginTop: 10,
    lineHeight: 21,
    fontWeight: '600'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DCE8F5'
  },
  label: {
    color: '#0F172A',
    fontWeight: '900',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#0F172A',
    fontWeight: '800',
    marginBottom: 12
  },
  primaryButton: {
    backgroundColor: '#0F766E',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center'
  },
  disabledButton: {
    opacity: 0.65
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900'
  },
  stationBox: {
    backgroundColor: '#ECFDF5',
    borderColor: '#99F6E4',
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginBottom: 16
  },
  stationTitle: {
    color: '#064E3B',
    fontSize: 20,
    fontWeight: '900'
  },
  stationMeta: {
    color: '#0F766E',
    fontWeight: '700',
    marginTop: 4
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14
  },
  pumpCard: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pumpCardActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E'
  },
  pumpName: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 16
  },
  pumpNameActive: {
    color: '#FFFFFF'
  },
  pumpPhone: {
    color: '#64748B',
    marginTop: 3,
    fontWeight: '700'
  },
  selectBadge: {
    color: '#0F766E',
    fontWeight: '900'
  },
  selectBadgeActive: {
    color: '#FFFFFF'
  },
  pinBox: {
    marginTop: 18
  }
})