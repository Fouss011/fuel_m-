import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../api/client'

const DRIVER_STRUCTURE_NAME_KEY = 'fuel_app_structure_name'

export default function CreateStructureScreen({ navigation }) {
  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [pinChief, setPinChief] = useState('1234')
  const [pinPump, setPinPump] = useState('5678')
  const [loading, setLoading] = useState(false)

  async function handleCreateStructure() {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom de la structure est obligatoire')
      return
    }

    try {
      setLoading(true)

      const payload = {
        name: name.trim(),
        owner_name: ownerName.trim() || null,
        owner_phone: ownerPhone.trim() || null,
        pin_chief: pinChief.trim() || null,
        pin_pump: pinPump.trim() || null
      }

      const response = await api.post('/structures', payload)
      const createdStructure = response?.data?.data

      if (createdStructure?.name) {
        await AsyncStorage.setItem(DRIVER_STRUCTURE_NAME_KEY, createdStructure.name)
      }

      Alert.alert('Succès', 'Structure créée avec succès')
      navigation.goBack()
    } catch (error) {
      console.log('Erreur création structure:', error?.response?.data || error.message)
      Alert.alert(
        'Erreur',
        error?.response?.data?.message || 'Impossible de créer la structure'
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
      <View style={styles.heroCard}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>STRUCTURE</Text>
        </View>

        <Text style={styles.title}>Créer une structure</Text>
        <Text style={styles.subtitle}>
          Le chef crée l’espace de travail de son entreprise pour isoler les demandes,
          l’équipe et l’historique.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Nom de la structure</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : Transport Kossi SARL"
          placeholderTextColor="#94A3B8"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Nom du responsable</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : Kossi"
          placeholderTextColor="#94A3B8"
          value={ownerName}
          onChangeText={setOwnerName}
        />

        <Text style={styles.label}>Téléphone du responsable</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : 90001111"
          placeholderTextColor="#94A3B8"
          value={ownerPhone}
          onChangeText={setOwnerPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>PIN Chef</Text>
        <TextInput
          style={styles.input}
          placeholder="1234"
          placeholderTextColor="#94A3B8"
          value={pinChief}
          onChangeText={setPinChief}
          keyboardType="numeric"
          maxLength={6}
        />

        <Text style={styles.label}>PIN Pompiste</Text>
        <TextInput
          style={styles.input}
          placeholder="5678"
          placeholderTextColor="#94A3B8"
          value={pinPump}
          onChangeText={setPinPump}
          keyboardType="numeric"
          maxLength={6}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleCreateStructure}
          disabled={loading}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Création en cours...' : 'Créer la structure'}
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
    padding: 16,
    paddingBottom: 28
  },
  heroCard: {
    backgroundColor: '#081B33',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14
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
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6
  },
  subtitle: {
    color: '#CBD5E1',
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
    color: '#0F172A'
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    color: '#0F172A'
  },
  button: {
    backgroundColor: '#081B33',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16
  }
})