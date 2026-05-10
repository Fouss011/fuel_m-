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
import { api, getStoredSession } from '../api/client'

export default function ConfirmFuelScreen({ route, navigation }) {
  const { requestId } = route.params

  const [request, setRequest] = useState(null)
  const [session, setSession] = useState(null)
  const [servedLiters, setServedLiters] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadRequest()
  }, [requestId])

  async function loadRequest() {
    try {
      setLoading(true)

      const storedSession = await getStoredSession()
      setSession(storedSession)

      const response = await api.getFuelRequestById(requestId)
      const data = response?.data?.data || response?.data || null

      setRequest(data)
      setServedLiters(String(data?.approved_liters || data?.requested_liters || ''))
      setAmount(data?.amount ? String(data.amount) : '')
    } catch (error) {
      console.log('Erreur chargement confirmation:', error?.data || error?.message || error)

      Alert.alert(
        'Erreur',
        error?.message || 'Impossible de charger la demande.'
      )
    } finally {
      setLoading(false)
    }
  }

  function validatePumpSession() {
    if (!session?.token || !session?.userId || session?.role !== 'pump_attendant') {
      Alert.alert(
        'Session manquante',
        'Aucune session pompiste active. Reconnecte-toi avant de confirmer.'
      )
      return false
    }

    return true
  }

  function validateStructureMatch() {
    if (!request) return false

    if (session?.structureId && request?.structure_id) {
      if (Number(session.structureId) !== Number(request.structure_id)) {
        Alert.alert(
          'Structure invalide',
          'Tu ne peux confirmer que les demandes de ta structure.'
        )
        return false
      }
    } else if (session?.structureName && request?.structure_name) {
      if (String(session.structureName).trim() !== String(request.structure_name).trim()) {
        Alert.alert(
          'Structure invalide',
          'Tu ne peux confirmer que les demandes de ta structure.'
        )
        return false
      }
    }

    return true
  }

  async function handleConfirm() {
    if (submitting) return

    if (!validatePumpSession()) return
    if (!validateStructureMatch()) return

    const cleanServedLiters = servedLiters.trim()
    const cleanAmount = amount.trim()

    if (!cleanServedLiters) {
      Alert.alert(
        'Champ obligatoire',
        'Indique les litres réellement servis avant de valider.'
      )
      return
    }

    if (!cleanAmount) {
      Alert.alert(
        'Montant manquant',
        'Important : tu dois mettre la somme avant de valider.'
      )
      return
    }

    const maxAllowed = Number(request?.approved_liters || request?.requested_liters || 0)
    const servedValue = Number(cleanServedLiters)
    const amountValue = Number(cleanAmount)

    if (Number.isNaN(servedValue) || servedValue <= 0) {
      Alert.alert(
        'Valeur invalide',
        'Entre une quantité servie valide, supérieure à 0.'
      )
      return
    }

    if (Number.isNaN(amountValue) || amountValue <= 0) {
      Alert.alert(
        'Montant invalide',
        'Le montant est obligatoire et doit être un nombre valide supérieur à 0.'
      )
      return
    }

    if (servedValue > maxAllowed) {
      Alert.alert(
        'Quantité trop élevée',
        `Vous ne pouvez pas mettre un chiffre supérieur à celui validé par le chef. Maximum autorisé : ${maxAllowed} L.`
      )
      return
    }

    if (request?.status !== 'approved') {
      Alert.alert(
        'Action impossible',
        'Seules les demandes validées par le chef peuvent être confirmées par le pompiste.'
      )
      return
    }

    try {
      setSubmitting(true)

      const response = await api.serveFuelRequest(requestId, {
        pump_attendant_id: Number(session.userId),
        served_liters: servedValue,
        amount: amountValue
      })

      Alert.alert(
        'Livraison confirmée',
        response?.message || 'La livraison a bien été confirmée avec succès.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      )
    } catch (error) {
      console.log('Erreur confirmation service:', error?.data || error?.message || error)

      if (error?.status === 400) {
        Alert.alert(
          'Confirmation impossible',
          error?.message ||
            'Tous les champs obligatoires doivent être remplis avant validation.'
        )
        return
      }

      if (error?.status === 401) {
        Alert.alert(
          'Session invalide',
          'Votre session pompiste a expiré. Reconnectez-vous pour continuer.'
        )
        return
      }

      if (error?.status === 403) {
        Alert.alert(
          'Action non autorisée',
          error?.message || 'Tu n’as pas les droits nécessaires pour confirmer cette livraison.'
        )
        return
      }

      Alert.alert(
        'Erreur',
        error?.message || 'Impossible de confirmer la livraison.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#081B33" />
        <Text style={styles.loadingText}>Chargement de la demande...</Text>
      </View>
    )
  }

  if (!request) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>Demande introuvable</Text>
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
          <Text style={styles.infoLabel}>Structure</Text>
          <Text style={styles.infoValue}>{request.structure_name || '—'}</Text>
        </View>

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

        <Text style={styles.formHint}>
          Tous les champs saisis ici sont impératifs avant validation finale.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Contrôle visible</Text>
          <Text style={styles.infoText}>
            Vous ne pouvez pas mettre un chiffre supérieur à celui validé par le chef.
          </Text>
        </View>

        <Text style={styles.label}>Litres réellement servis</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={servedLiters}
          onChangeText={setServedLiters}
          placeholder="Ex : 100"
          placeholderTextColor="#94A3B8"
          editable={!submitting}
        />

        <Text style={styles.label}>Montant total</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="Ex : 69020"
          placeholderTextColor="#94A3B8"
          value={amount}
          onChangeText={setAmount}
          editable={!submitting}
        />

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={submitting}
          activeOpacity={0.9}
        >
          {submitting ? (
            <View style={styles.buttonInline}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.buttonTextLoading}>Confirmation en cours...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Confirmer la livraison</Text>
          )}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 24
  },
  loadingText: {
    marginTop: 12,
    color: '#475569',
    fontSize: 15,
    textAlign: 'center'
  },
  notFoundText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700'
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
    marginBottom: 8
  },
  formHint: {
    color: '#64748B',
    lineHeight: 20,
    fontSize: 13,
    marginBottom: 14
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1D4ED8',
    marginBottom: 6
  },
  infoText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#1E3A8A'
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
  buttonDisabled: {
    opacity: 0.7
  },
  buttonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16
  },
  buttonTextLoading: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10
  }
})