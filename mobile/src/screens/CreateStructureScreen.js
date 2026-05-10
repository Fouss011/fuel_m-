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
import { setStoredSession } from '../api/client'

const PIN_REGEX = /^\d{4,8}$/

export default function CreateStructureScreen({ navigation }) {
  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [pinChief, setPinChief] = useState('1234')
  const [loading, setLoading] = useState(false)

  async function handleCreateStructure() {
    const cleanName = name.trim()
    const cleanOwnerName = ownerName.trim()
    const cleanOwnerPhone = ownerPhone.trim()
    const cleanPinChief = pinChief.trim()

    if (!cleanName) {
      Alert.alert('Nom requis', 'Le nom de la structure est obligatoire.')
      return
    }

    if (!cleanOwnerName) {
      Alert.alert('Responsable requis', 'Le nom du responsable est obligatoire.')
      return
    }

    if (!cleanOwnerPhone) {
      Alert.alert('Téléphone requis', 'Le téléphone du responsable est obligatoire.')
      return
    }

    if (!cleanPinChief) {
      Alert.alert('PIN chef requis', 'Le code PIN chef est obligatoire.')
      return
    }

    if (!PIN_REGEX.test(cleanPinChief)) {
      Alert.alert(
        'PIN chef invalide',
        'Le code PIN chef doit contenir entre 4 et 8 chiffres.'
      )
      return
    }

    try {
      setLoading(true)

      const { api } = await import('../api/client')

      const structurePayload = {
        name: cleanName,
        owner_name: cleanOwnerName,
        owner_phone: cleanOwnerPhone,
        pin_chief: cleanPinChief
      }

      const structureResponse = await api.post('/structures', structurePayload)
      const createdStructure = structureResponse?.data?.data
      const createdChief = createdStructure?.chief_user || null

      if (!createdStructure?.id) {
        throw new Error('Structure créée mais identifiant introuvable')
      }

      await setStoredSession({
        userId: createdChief?.id || null,
        userName: createdChief?.name || cleanOwnerName,
        role: 'chief',
        structureId: createdStructure.id,
        structureName: createdStructure.name,
        structureCode: createdStructure.structure_code || null,
        token: structureResponse?.data?.token || ''
      })

      Alert.alert(
        'Succès',
        'Structure créée et chef automatiquement rattaché.'
      )

      navigation.replace('ChiefDashboard')
    } catch (error) {
      console.log('Erreur création structure:', error?.response?.data || error.message)

      Alert.alert(
        'Erreur',
        error?.response?.data?.message || 'Impossible de créer la structure.'
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
          Le chef crée l’espace de travail de son entreprise. Les pompistes seront gérés côté station, pas côté société.
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
          maxLength={8}
          secureTextEntry
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
    backgroundColor: 'transparent'
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
  infoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
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
    alignItems: 'center',
    marginTop: 4
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16
  }
})