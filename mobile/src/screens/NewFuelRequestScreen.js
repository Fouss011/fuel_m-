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

const DRIVER_NAME_KEY = 'fuel_app_driver_name'
const DRIVER_HISTORY_KEY = 'fuel_app_driver_history'
const DRIVER_STRUCTURE_NAME_KEY = 'fuel_app_structure_name'

const FUEL_OPTIONS = [
  { label: 'Gasoil', value: 'gasoil' },
  { label: 'Essence', value: 'essence' }
]

export default function NewFuelRequestScreen({ navigation }) {
  const [driverName, setDriverName] = useState('')
  const [truckNumber, setTruckNumber] = useState('')
  const [structureName, setStructureName] = useState('')
  const [fuelType, setFuelType] = useState('gasoil')
  const [liters, setLiters] = useState('')

  useEffect(() => {
    loadSavedData()
  }, [])

  async function loadSavedData() {
    try {
      const savedName = await AsyncStorage.getItem(DRIVER_NAME_KEY)
      const savedStructure = await AsyncStorage.getItem(DRIVER_STRUCTURE_NAME_KEY)

      if (savedName) {
        setDriverName(savedName)
      }

      if (savedStructure) {
        setStructureName(savedStructure)
      }
    } catch (error) {
      console.log('Erreur lecture données locales chauffeur:', error.message)
    }
  }

  async function saveLocalHistory(entry) {
    try {
      const current = await AsyncStorage.getItem(DRIVER_HISTORY_KEY)
      const parsed = current ? JSON.parse(current) : []
      const next = [entry, ...parsed].slice(0, 50)
      await AsyncStorage.setItem(DRIVER_HISTORY_KEY, JSON.stringify(next))
    } catch (error) {
      console.log('Erreur sauvegarde historique local:', error.message)
    }
  }

  async function handleSubmit() {
    if (!driverName || !truckNumber || !fuelType || !liters) {
      Alert.alert('Erreur', 'Les champs chauffeur, camion, carburant et litres sont obligatoires')
      return
    }

    const litersNumber = Number(liters)

    if (Number.isNaN(litersNumber) || litersNumber <= 0) {
      Alert.alert('Erreur', 'Le nombre de litres doit être supérieur à 0')
      return
    }

    try {
      const cleanName = driverName.trim()
      const cleanTruck = truckNumber.trim().toUpperCase()
      const cleanStructure = structureName.trim()

      await AsyncStorage.setItem(DRIVER_NAME_KEY, cleanName)

      if (cleanStructure) {
        await AsyncStorage.setItem(DRIVER_STRUCTURE_NAME_KEY, cleanStructure)
      }

      const payload = {
        driver_name: cleanName,
        truck_number: cleanTruck,
        fuel_type: fuelType,
        requested_liters: litersNumber
      }

      if (cleanStructure) {
        payload.structure_name = cleanStructure
      }

      const response = await api.post('/fuel-requests', payload)

      await saveLocalHistory({
        id: response?.data?.data?.id || Date.now(),
        driver_name: cleanName,
        truck_number: cleanTruck,
        fuel_type: fuelType,
        requested_liters: litersNumber,
        structure_name: cleanStructure || null,
        created_at: new Date().toISOString(),
        status: 'pending'
      })

      Alert.alert('Succès', 'Demande envoyée')
      navigation.goBack()
    } catch (error) {
      console.log('Erreur création demande:', error?.response?.data || error.message)
      Alert.alert('Erreur', 'Impossible de créer la demande')
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>NOUVELLE OPÉRATION</Text>
        </View>

        <Text style={styles.heroTitle}>Créer une demande de carburant</Text>
        <Text style={styles.heroText}>
          Renseigne les informations du chauffeur, du camion et la quantité demandée.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Nom du chauffeur</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : Kossi"
          placeholderTextColor="#94A3B8"
          value={driverName}
          onChangeText={setDriverName}
        />

        <Text style={styles.label}>Structure</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : Transport Kossi SARL"
          placeholderTextColor="#94A3B8"
          value={structureName}
          onChangeText={setStructureName}
        />

        <Text style={styles.helperText}>
          Champ conseillé dès maintenant pour préparer la séparation par structure.
        </Text>

        <Text style={styles.label}>Camion</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : TG-1234-AB"
          placeholderTextColor="#94A3B8"
          value={truckNumber}
          onChangeText={setTruckNumber}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Type de carburant</Text>
        <View style={styles.optionRow}>
          {FUEL_OPTIONS.map((option) => {
            const active = fuelType === option.value

            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.optionCard, active && styles.optionCardActive]}
                onPress={() => setFuelType(option.value)}
                activeOpacity={0.9}
              >
                <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                  {option.label}
                </Text>
                <Text style={[styles.optionHint, active && styles.optionHintActive]}>
                  Sélectionner
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={styles.label}>Nombre de litres</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="100"
          placeholderTextColor="#94A3B8"
          value={liters}
          onChangeText={setLiters}
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit} activeOpacity={0.9}>
          <Text style={styles.buttonText}>Envoyer la demande</Text>
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
    paddingBottom: 30
  },
  heroCard: {
    backgroundColor: '#081B33',
    borderRadius: 26,
    padding: 20,
    marginBottom: 16
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12
  },
  badgeText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  heroTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8
  },
  heroText: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 21
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  label: {
    marginBottom: 8,
    fontWeight: '800',
    fontSize: 14,
    color: '#0F172A'
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    color: '#0F172A'
  },
  helperText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 18
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18
  },
  optionCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  optionCardActive: {
    backgroundColor: '#081B33',
    borderColor: '#081B33'
  },
  optionTitle: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 15,
    marginBottom: 4
  },
  optionTitleActive: {
    color: '#FFFFFF'
  },
  optionHint: {
    color: '#64748B',
    fontSize: 12
  },
  optionHintActive: {
    color: '#CBD5E1'
  },
  button: {
    backgroundColor: '#081B33',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 6
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16
  }
})