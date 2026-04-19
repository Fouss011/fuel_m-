import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api, getStoredSession } from '../api/client'

const STORAGE_KEYS = {
  driverName: 'fuel_app_driver_name',
  driverId: 'fuel_app_user_id',
  structureId: 'fuel_app_structure_id',
  structureName: 'fuel_app_structure_name'
}

const FUEL_OPTIONS = [
  { label: 'Gasoil', value: 'gasoil' },
  { label: 'Essence', value: 'essence' }
]

export default function NewFuelRequestScreen({ navigation }) {
  const [driverId, setDriverId] = useState(null)
  const [driverName, setDriverName] = useState('')
  const [truckNumber, setTruckNumber] = useState('')
  const [structures, setStructures] = useState([])
  const [selectedStructureId, setSelectedStructureId] = useState(null)
  const [fuelType, setFuelType] = useState('gasoil')
  const [liters, setLiters] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const selectedStructure = useMemo(() => {
    return structures.find((item) => String(item.id) === String(selectedStructureId)) || null
  }, [structures, selectedStructureId])

  useEffect(() => {
    loadSavedData()
  }, [])

  async function loadSavedData() {
    try {
      setLoading(true)

      const storedSession = await getStoredSession()

      const [
        savedDriverName,
        savedDriverId,
        savedStructureId
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.driverName),
        AsyncStorage.getItem(STORAGE_KEYS.driverId),
        AsyncStorage.getItem(STORAGE_KEYS.structureId)
      ])

      const structuresResponse = await api.get('/structures')
      const fetchedStructures = structuresResponse?.data?.data || []

      setStructures(fetchedStructures)

      const finalDriverName = storedSession?.userName || savedDriverName || ''
      const finalDriverId = storedSession?.userId || savedDriverId || null
      const finalStructureId = storedSession?.structureId || savedStructureId || null

      if (finalDriverName) setDriverName(String(finalDriverName))
      if (finalDriverId) setDriverId(finalDriverId)

      if (finalStructureId) {
        const found = fetchedStructures.find(
          (item) => String(item.id) === String(finalStructureId)
        )
        if (found) {
          setSelectedStructureId(found.id)
        } else if (fetchedStructures.length > 0) {
          setSelectedStructureId(fetchedStructures[0].id)
        }
      } else if (fetchedStructures.length > 0) {
        setSelectedStructureId(fetchedStructures[0].id)
      }

      console.log('Structures chargées chauffeur:', fetchedStructures)
      console.log('Session chauffeur:', {
        finalDriverName,
        finalDriverId,
        finalStructureId
      })
    } catch (error) {
      console.log('Erreur chargement infos chauffeur :', error?.response?.data || error.message)
      Alert.alert('Erreur', 'Impossible de charger les données chauffeur.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectStructure(structure) {
    setSelectedStructureId(structure.id)
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.structureId, String(structure.id))
      await AsyncStorage.setItem(STORAGE_KEYS.structureName, structure.name)
    } catch (error) {
      console.log('Erreur sauvegarde structure locale :', error.message)
    }
  }

  async function handleSubmit() {
    if (submitting) return

    const cleanDriver = driverName.trim()
    const cleanTruck = truckNumber.trim().toUpperCase()
    const litersNumber = Number(liters)

    if (!cleanDriver) {
      Alert.alert('Champ manquant', 'Le nom du chauffeur est obligatoire.')
      return
    }

    if (!selectedStructure) {
      Alert.alert('Structure obligatoire', 'Sélectionne une structure avant d’envoyer la demande.')
      return
    }

    if (!cleanTruck) {
      Alert.alert('Champ manquant', 'Le numéro du camion est obligatoire.')
      return
    }

    if (!fuelType) {
      Alert.alert('Champ manquant', 'Choisis un type de carburant.')
      return
    }

    if (!liters.trim()) {
      Alert.alert('Champ manquant', 'Le nombre de litres demandé est obligatoire.')
      return
    }

    if (Number.isNaN(litersNumber) || litersNumber <= 0) {
      Alert.alert('Quantité invalide', 'Le nombre de litres doit être supérieur à 0.')
      return
    }

    try {
      setSubmitting(true)

      const payload = {
        driver_name: cleanDriver,
        truck_number: cleanTruck,
        fuel_type: fuelType,
        requested_liters: litersNumber,
        structure_id: Number(selectedStructure.id),
        structure_name: selectedStructure.name
      }

      if (driverId) {
        payload.driver_id = Number(driverId)
      }

      console.log('Payload envoyé à /fuel-requests :', payload)

      const response = await api.post('/fuel-requests', payload)

      console.log('Réponse création demande :', response?.data)

      await AsyncStorage.setItem(STORAGE_KEYS.driverName, cleanDriver)
      if (driverId) {
        await AsyncStorage.setItem(STORAGE_KEYS.driverId, String(driverId))
      }
      await AsyncStorage.setItem(STORAGE_KEYS.structureId, String(selectedStructure.id))
      await AsyncStorage.setItem(STORAGE_KEYS.structureName, selectedStructure.name)

      Alert.alert(
        'Demande envoyée',
        'Votre demande est envoyée. Elle est maintenant en attente de confirmation du chef.'
      )

      setTruckNumber('')
      setLiters('')
      setFuelType('gasoil')
    } catch (error) {
      console.log('Erreur création demande détaillée :', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      })

      Alert.alert(
        'Échec de l’envoi',
        error?.response?.data?.message ||
          error?.message ||
          'Impossible de créer la demande.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#081B33" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.badge}>CHAUFFEUR</Text>
        <Text style={styles.heroTitle}>Nouvelle demande carburant</Text>
        <Text style={styles.heroSubtitle}>
          Sélectionne la structure, puis renseigne le camion et la quantité.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Chauffeur</Text>
        <TextInput
          value={driverName}
          onChangeText={setDriverName}
          placeholder="Nom du chauffeur"
          style={styles.input}
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.label}>Structure</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsScroll}
        >
          {structures.map((item) => {
            const active = String(item.id) === String(selectedStructureId)

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => handleSelectStructure(item)}
                activeOpacity={0.9}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <Text style={styles.helper}>
          La structure choisie sera réutilisée automatiquement la prochaine fois.
        </Text>

        <Text style={styles.label}>Camion</Text>
        <TextInput
          value={truckNumber}
          onChangeText={setTruckNumber}
          placeholder="Ex : TG-2458-AB"
          autoCapitalize="characters"
          style={styles.input}
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.label}>Type de carburant</Text>
        <View style={styles.optionRow}>
          {FUEL_OPTIONS.map((option) => {
            const selected = fuelType === option.value
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.optionButton, selected && styles.optionButtonActive]}
                onPress={() => setFuelType(option.value)}
                activeOpacity={0.9}
              >
                <Text style={[styles.optionText, selected && styles.optionTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={styles.label}>Nombre de litres</Text>
        <TextInput
          value={liters}
          onChangeText={setLiters}
          placeholder="Ex : 120"
          keyboardType="numeric"
          style={styles.input}
          placeholderTextColor="#94A3B8"
        />

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.9}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? 'Envoi en cours...' : 'Envoyer la demande'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F7FB'
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F7FB'
  },
  content: {
    padding: 20,
    paddingBottom: 40
  },
  heroCard: {
    backgroundColor: '#081B33',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: '900',
    fontSize: 12,
    marginBottom: 14
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8
  },
  heroSubtitle: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 21
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  label: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 4
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 15,
    color: '#0F172A',
    marginBottom: 12
  },
  chipsScroll: {
    marginBottom: 12
  },
  chipsRow: {
    paddingRight: 8
  },
  chip: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 8
  },
  chipActive: {
    backgroundColor: '#081B33'
  },
  chipText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13
  },
  chipTextActive: {
    color: '#FFFFFF'
  },
  helper: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 12,
    marginTop: -2
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center'
  },
  optionButtonActive: {
    backgroundColor: '#081B33',
    borderColor: '#081B33'
  },
  optionText: {
    color: '#0F172A',
    fontWeight: '800'
  },
  optionTextActive: {
    color: '#FFFFFF'
  },
  button: {
    backgroundColor: '#081B33',
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 10
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16
  }
})