import { useEffect, useState } from 'react'
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
import { api } from '../api/client'

const INPUT_PROPS = {
  placeholderTextColor: '#64748B',
  selectionColor: '#0F766E',
  cursorColor: '#0F766E'
}

export default function StationAdminScreen({ navigation }) {
  const [loading, setLoading] = useState(true)
  const [savingStation, setSavingStation] = useState(false)
  const [savingPumpId, setSavingPumpId] = useState(null)

  const [stations, setStations] = useState([])
  const [selectedStation, setSelectedStation] = useState(null)
  const [pumpAttendants, setPumpAttendants] = useState([])

  const [stationForm, setStationForm] = useState({
    name: '',
    station_code: '',
    city: '',
    manager_name: '',
    manager_phone: ''
  })

  const [pumpForm, setPumpForm] = useState({
    name: '',
    phone: '',
    pin_code: ''
  })

  useEffect(() => {
    loadStations()
  }, [])

  async function loadStations() {
    try {
      setLoading(true)
      const response = await api.get('/station')
      setStations(response?.data?.data || [])
    } catch (error) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message || 'Impossible de charger les stations.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadPumpAttendants(station) {
    try {
      setSelectedStation(station)
      setPumpAttendants([])

      const response = await api.get(`/station/${station.id}/pump-attendants`)
      const data = response?.data?.data

      setPumpAttendants(data?.pump_attendants || [])
    } catch (error) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message || 'Impossible de charger les pompistes.'
      )
    }
  }

  async function createStation() {
    const name = stationForm.name.trim()
    const stationCode = stationForm.station_code.trim().toUpperCase()

    if (!name || !stationCode) {
      Alert.alert('Champs requis', 'Le nom et le code station sont obligatoires.')
      return
    }

    try {
      setSavingStation(true)

      const response = await api.post('/station', {
        name,
        station_code: stationCode,
        city: stationForm.city.trim(),
        manager_name: stationForm.manager_name.trim(),
        manager_phone: stationForm.manager_phone.trim()
      })

      const created = response?.data?.data

      setStationForm({
        name: '',
        station_code: '',
        city: '',
        manager_name: '',
        manager_phone: ''
      })

      await loadStations()

      if (created?.id) {
        setSelectedStation(created)
      }

      Alert.alert('Station créée', 'La station a été ajoutée avec succès.')
    } catch (error) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message || 'Impossible de créer la station.'
      )
    } finally {
      setSavingStation(false)
    }
  }

  async function createPumpAttendant() {
    if (!selectedStation?.id) {
      Alert.alert('Station requise', 'Choisis d’abord une station.')
      return
    }

    const name = pumpForm.name.trim()
    const pinCode = pumpForm.pin_code.trim()

    if (!name || !pinCode) {
      Alert.alert('Champs requis', 'Le nom du pompiste et le PIN sont obligatoires.')
      return
    }

    if (pinCode.length < 4) {
      Alert.alert('PIN trop court', 'Utilise au moins 4 chiffres pour le PIN.')
      return
    }

    try {
      setSavingPumpId(selectedStation.id)

      await api.post(`/station/${selectedStation.id}/pump-attendants`, {
        name,
        phone: pumpForm.phone.trim(),
        pin_code: pinCode
      })

      setPumpForm({
        name: '',
        phone: '',
        pin_code: ''
      })

      await loadPumpAttendants(selectedStation)

      Alert.alert('Pompiste créé', 'Le pompiste a été ajouté à cette station.')
    } catch (error) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message || 'Impossible de créer le pompiste.'
      )
    } finally {
      setSavingPumpId(null)
    }
  }

  function updateStationField(key, value) {
    setStationForm((prev) => ({ ...prev, [key]: value }))
  }

  function updatePumpField(key, value) {
    setPumpForm((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F766E" />
        <Text style={styles.loadingText}>Chargement administration...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.badge}>Admin stations</Text>
        <Text style={styles.title}>Créer les stations et leurs pompistes</Text>
        <Text style={styles.subtitle}>
          Les chefs choisiront ensuite ces stations comme partenaires.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Nouvelle station</Text>

        <Text style={styles.label}>Nom station</Text>
        <TextInput
          {...INPUT_PROPS}
          value={stationForm.name}
          onChangeText={(v) => updateStationField('name', v)}
          placeholder="Ex : Total Adidogomé"
          style={styles.input}
        />

        <Text style={styles.label}>Code station</Text>
        <TextInput
          {...INPUT_PROPS}
          value={stationForm.station_code}
          onChangeText={(v) => updateStationField('station_code', v)}
          placeholder="Ex : TOTAL-ADIDO"
          autoCapitalize="characters"
          style={styles.input}
        />

        <Text style={styles.label}>Ville</Text>
        <TextInput
          {...INPUT_PROPS}
          value={stationForm.city}
          onChangeText={(v) => updateStationField('city', v)}
          placeholder="Ex : Lomé"
          style={styles.input}
        />

        <Text style={styles.label}>Responsable</Text>
        <TextInput
          {...INPUT_PROPS}
          value={stationForm.manager_name}
          onChangeText={(v) => updateStationField('manager_name', v)}
          placeholder="Nom du responsable"
          style={styles.input}
        />

        <Text style={styles.label}>Téléphone responsable</Text>
        <TextInput
          {...INPUT_PROPS}
          value={stationForm.manager_phone}
          onChangeText={(v) => updateStationField('manager_phone', v)}
          placeholder="Téléphone"
          keyboardType="phone-pad"
          style={styles.input}
        />

        <TouchableOpacity
          style={[styles.primaryButton, savingStation && styles.disabledButton]}
          onPress={createStation}
          disabled={savingStation}
        >
          {savingStation ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Créer la station</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Stations existantes</Text>

          <TouchableOpacity onPress={loadStations}>
            <Text style={styles.refreshText}>Actualiser</Text>
          </TouchableOpacity>
        </View>

        {!stations.length ? (
          <Text style={styles.emptyText}>Aucune station créée.</Text>
        ) : null}

        {stations.map((station) => {
          const active = selectedStation?.id === station.id

          return (
            <TouchableOpacity
              key={station.id}
              style={[styles.stationCard, active && styles.stationCardActive]}
              onPress={() => loadPumpAttendants(station)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.stationName, active && styles.stationNameActive]}>
                  {station.name}
                </Text>
                <Text style={[styles.stationMeta, active && styles.stationMetaActive]}>
                  Code : {station.station_code}
                </Text>
                <Text style={[styles.stationMeta, active && styles.stationMetaActive]}>
                  Ville : {station.city || 'Non renseignée'}
                </Text>
              </View>

              <Text style={[styles.selectText, active && styles.selectTextActive]}>
                {active ? 'Sélectionnée' : 'Gérer'}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {selectedStation ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Pompistes — {selectedStation.name}
          </Text>

          {pumpAttendants.length ? (
            pumpAttendants.map((pump) => (
              <View key={pump.id} style={styles.pumpLine}>
                <View>
                  <Text style={styles.pumpName}>{pump.name}</Text>
                  <Text style={styles.pumpPhone}>
                    {pump.phone || 'Téléphone non renseigné'}
                  </Text>
                </View>

                <Text style={styles.activeBadge}>Actif</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              Aucun pompiste enregistré pour cette station.
            </Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.subTitle}>Ajouter un pompiste</Text>

          <Text style={styles.label}>Nom pompiste</Text>
          <TextInput
            {...INPUT_PROPS}
            value={pumpForm.name}
            onChangeText={(v) => updatePumpField('name', v)}
            placeholder="Nom du pompiste"
            style={styles.input}
          />

          <Text style={styles.label}>Téléphone</Text>
          <TextInput
            {...INPUT_PROPS}
            value={pumpForm.phone}
            onChangeText={(v) => updatePumpField('phone', v)}
            placeholder="Téléphone"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <Text style={styles.label}>PIN</Text>
          <TextInput
            {...INPUT_PROPS}
            value={pumpForm.pin_code}
            onChangeText={(v) => updatePumpField('pin_code', v)}
            placeholder="Code PIN"
            keyboardType="number-pad"
            secureTextEntry
            style={styles.input}
          />

          <TouchableOpacity
            style={[
              styles.primaryButton,
              savingPumpId === selectedStation.id && styles.disabledButton
            ]}
            onPress={createPumpAttendant}
            disabled={savingPumpId === selectedStation.id}
          >
            {savingPumpId === selectedStation.id ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Créer le pompiste</Text>
            )}
          </TouchableOpacity>
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
  center: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 12,
    color: '#475569',
    fontWeight: '800'
  },
  header: {
    backgroundColor: '#081B33',
    borderRadius: 28,
    padding: 24,
    marginBottom: 16
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
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30
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
  sectionTitle: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 14
  },
  subTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 12
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
    alignItems: 'center',
    marginTop: 4
  },
  disabledButton: {
    opacity: 0.65
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900'
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  refreshText: {
    color: '#0F766E',
    fontWeight: '900'
  },
  emptyText: {
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 20
  },
  stationCard: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  stationCardActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E'
  },
  stationName: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900'
  },
  stationNameActive: {
    color: '#FFFFFF'
  },
  stationMeta: {
    color: '#64748B',
    fontWeight: '700',
    marginTop: 3
  },
  stationMetaActive: {
    color: '#CCFBF1'
  },
  selectText: {
    color: '#0F766E',
    fontWeight: '900'
  },
  selectTextActive: {
    color: '#FFFFFF'
  },
  pumpLine: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    padding: 13,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  pumpName: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 15
  },
  pumpPhone: {
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2
  },
  activeBadge: {
    color: '#0F766E',
    fontWeight: '900'
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 18
  }
})