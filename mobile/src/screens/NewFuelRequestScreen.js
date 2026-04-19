// mobile/src/screens/NewFuelRequestScreen.js

import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../api/client'

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
  const [structureId, setStructureId] = useState(null)
  const [structureName, setStructureName] = useState('')
  const [fuelType, setFuelType] = useState('gasoil')
  const [liters, setLiters] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSavedData()
  }, [])

  async function loadSavedData() {
    try {
      const [
        savedDriverName,
        savedDriverId,
        savedStructureId,
        savedStructureName
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.driverName),
        AsyncStorage.getItem(STORAGE_KEYS.driverId),
        AsyncStorage.getItem(STORAGE_KEYS.structureId),
        AsyncStorage.getItem(STORAGE_KEYS.structureName)
      ])

      if (savedDriverName) setDriverName(savedDriverName)
      if (savedDriverId) setDriverId(savedDriverId)
      if (savedStructureId) setStructureId(savedStructureId)
      if (savedStructureName) setStructureName(savedStructureName)
    } catch (error) {
      console.log('Erreur chargement infos chauffeur :', error.message)
    }
  }

  async function handleSubmit() {
    if (loading) return

    const cleanDriver = driverName.trim()
    const cleanTruck = truckNumber.trim().toUpperCase()
    const cleanStructureName = structureName.trim()
    const litersNumber = Number(liters)

    if (!cleanDriver) {
      Alert.alert('Champ manquant', 'Le nom du chauffeur est obligatoire.')
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

    if (!liters) {
      Alert.alert('Champ manquant', 'Le nombre de litres demandé est obligatoire.')
      return
    }

    if (Number.isNaN(litersNumber) || litersNumber <= 0) {
      Alert.alert(
        'Quantité invalide',
        'Le nombre de litres doit être supérieur à 0.'
      )
      return
    }

    // structure désormais obligatoire dans tout le parcours
    if (!structureId && !cleanStructureName) {
      Alert.alert(
        'Structure obligatoire',
        'Tu dois être rattaché à une structure avant de créer une demande.'
      )
      return
    }

    try {
      setLoading(true)

      await AsyncStorage.setItem(STORAGE_KEYS.driverName, cleanDriver)

      const payload = {
        driver_name: cleanDriver,
        truck_number: cleanTruck,
        fuel_type: fuelType,
        requested_liters: litersNumber
      }

      // plus d’ID codé en dur : on récupère la vraie structure du chauffeur connecté
      if (driverId) {
        payload.driver_id = Number(driverId)
      }

      if (structureId) {
        payload.structure_id = Number(structureId)
      }

      if (cleanStructureName) {
        payload.structure_name = cleanStructureName
      }

      const response = await api.post('/fuel-requests', payload)

      Alert.alert(
        'Demande envoyée',
        'La demande de carburant a été créée et liée à ta structure.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack()
            }
          }
        ]
      )

      console.log('Demande créée :', response.data)
    } catch (error) {
      console.log(
        'Erreur création demande :',
        error?.response?.data || error.message
      )

      const backendMessage =
        error?.response?.data?.message ||
        'Impossible de créer la demande. Vérifie les informations et réessaie.'

      Alert.alert('Erreur', backendMessage)
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
      <View style={styles.heroCard}>
        <Text style={styles.badge}>CHAUFFEUR</Text>

        <Text style={styles.heroTitle}>Nouvelle demande carburant</Text>

        <Text style={styles.heroSubtitle}>
          Toutes les demandes sont maintenant automatiquement liées à ta structure.
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
        <TextInput
          value={structureName}
          editable={false}
          style={[styles.input, styles.disabledInput]}
          placeholder="Aucune structure"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.helper}>
          La structure est obligatoire et provient du compte connecté.
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
                style={[
                  styles.optionButton,
                  selected && styles.optionButtonActive
                ]}
                onPress={() => setFuelType(option.value)}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextActive
                  ]}
                >
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
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.9}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Envoi en cours...' : 'Envoyer la demande'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
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
  disabledInput: {
    backgroundColor: '#EEF2F7',
    color: '#475569'
  },
  helper: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 12,
    marginTop: -4
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