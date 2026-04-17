import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native'
import { api } from '../api/client'

const PUMP_ATTENDANT_ID = 3

export default function ConfirmFuelScreen({ route, navigation }) {
  const { requestId } = route.params
  const [request, setRequest] = useState(null)
  const [servedLiters, setServedLiters] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function loadRequest() {
    try {
      setLoading(true)
      const response = await api.get(`/fuel-requests/${requestId}`)
      const data = response.data.data
      setRequest(data)
      setServedLiters(String(data.approved_liters || data.requested_liters || ''))
    } catch (error) {
      console.log('Erreur chargement confirmation:', error?.response?.data || error.message)
      Alert.alert('Erreur', 'Impossible de charger la demande')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequest()
  }, [requestId])

  async function handleConfirm() {
  if (!servedLiters || !amount) {
    Alert.alert('Erreur', 'Tous les champs sont obligatoires')
    return
  }

  const maxAllowed = Number(
    request.approved_liters || request.requested_liters || 0
  )

  const servedValue = Number(servedLiters)
  const amountValue = Number(amount)

  if (Number.isNaN(servedValue) || servedValue <= 0) {
    Alert.alert('Erreur', 'Entre une quantité servie valide')
    return
  }

  if (Number.isNaN(amountValue) || amountValue < 0) {
    Alert.alert('Erreur', 'Entre un montant valide')
    return
  }

  if (servedValue > maxAllowed) {
    Alert.alert(
      'Erreur',
      `La quantité servie ne peut pas dépasser ${maxAllowed} L`
    )
    return
  }

  try {
    setSubmitting(true)
    await api.patch(`/fuel-requests/${requestId}/serve`, {
      pump_attendant_id: PUMP_ATTENDANT_ID,
      served_liters: servedValue,
      amount: amountValue
    })

    Alert.alert('Succès', 'Carburant confirmé')
    navigation.goBack()
  } catch (error) {
    console.log('Erreur confirmation service:', error?.response?.data || error.message)
    Alert.alert(
      'Erreur',
      error?.response?.data?.message || 'Impossible de confirmer la livraison'
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

  if (!request) {
    return (
      <View style={styles.center}>
        <Text>Demande introuvable</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>CONFIRMATION</Text>
        </View>

        <Text style={styles.title}>{request.truck_number}</Text>
        <Text style={styles.subtitle}>
          Finalise le service en enregistrant la quantité réellement servie et le montant total.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Chauffeur</Text>
          <Text style={styles.infoValue}>
            {request.driver_name || request.driver?.name || 'N/A'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Carburant</Text>
          <Text style={styles.infoValue}>{request.fuel_type}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Quantité validée</Text>
          <Text style={styles.infoValue}>
            {request.approved_liters || request.requested_liters} L
          </Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Saisie du service</Text>

        <Text style={styles.label}>Litres réellement servis</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={servedLiters}
          onChangeText={setServedLiters}
          placeholder="Ex : 100"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.label}>Montant total</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="Ex : 69020"
          placeholderTextColor="#94A3B8"
          value={amount}
          onChangeText={setAmount}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleConfirm}
          disabled={submitting}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>Confirmer la livraison</Text>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F7FB'
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 4
  },
  infoValue: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800'
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14
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
    marginBottom: 18,
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