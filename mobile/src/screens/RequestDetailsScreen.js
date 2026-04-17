import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView
} from 'react-native'
import { api } from '../api/client'

const CHIEF_ID = 2

export default function RequestDetailsScreen({ route, navigation }) {
  const { requestId } = route.params
  const [request, setRequest] = useState(null)
  const [approvedLiters, setApprovedLiters] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function loadRequest() {
    try {
      setLoading(true)
      const response = await api.get(`/fuel-requests/${requestId}`)
      const data = response.data.data
      setRequest(data)
      setApprovedLiters(String(data.approved_liters || data.requested_liters || ''))
    } catch (error) {
      console.log('Erreur détail demande:', error?.response?.data || error.message)
      Alert.alert('Erreur', 'Impossible de charger la demande')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequest()
  }, [requestId])

  async function handleApprove() {
    if (!approvedLiters) {
      Alert.alert('Erreur', 'La quantité autorisée est obligatoire')
      return
    }

    try {
      setSubmitting(true)
      await api.patch(`/fuel-requests/${requestId}/approve`, {
        chief_id: CHIEF_ID,
        approved_liters: Number(approvedLiters)
      })

      Alert.alert('Succès', 'Demande validée')
      navigation.goBack()
    } catch (error) {
      console.log('Erreur validation:', error?.response?.data || error.message)
      Alert.alert('Erreur', 'Impossible de valider la demande')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReject() {
    try {
      setSubmitting(true)
      await api.patch(`/fuel-requests/${requestId}/reject`, {
        chief_id: CHIEF_ID
      })

      Alert.alert('Succès', 'Demande refusée')
      navigation.goBack()
    } catch (error) {
      console.log('Erreur refus:', error?.response?.data || error.message)
      Alert.alert('Erreur', 'Impossible de refuser la demande')
    } finally {
      setSubmitting(false)
    }
  }

  function renderStatus(status) {
    switch (status) {
      case 'pending':
        return { label: 'En attente', color: '#C2410C', bg: '#FFEDD5' }
      case 'approved':
        return { label: 'Validée', color: '#047857', bg: '#D1FAE5' }
      case 'rejected':
        return { label: 'Refusée', color: '#B91C1C', bg: '#FEE2E2' }
      case 'served':
        return { label: 'Servie', color: '#1D4ED8', bg: '#DBEAFE' }
      default:
        return { label: status || 'Inconnu', color: '#475569', bg: '#E2E8F0' }
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

  const isPending = request.status === 'pending'
  const status = renderStatus(request.status)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{request.truck_number}</Text>
        <Text style={styles.subtitle}>
          Détail complet de la demande et décision de validation.
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
          <Text style={styles.infoLabel}>Demandé</Text>
          <Text style={styles.infoValue}>{request.requested_liters} L</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Statut</Text>
          <Text style={styles.infoValue}>{status.label}</Text>
        </View>

        {request.approved_liters ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Validé</Text>
            <Text style={styles.infoValue}>{request.approved_liters} L</Text>
          </View>
        ) : null}

        {request.served_liters ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Servi</Text>
            <Text style={styles.infoValue}>{request.served_liters} L</Text>
          </View>
        ) : null}

        {request.amount ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Montant</Text>
            <Text style={styles.infoValue}>{request.amount} FCFA</Text>
          </View>
        ) : null}
      </View>

      {isPending ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Décision du chef</Text>

          <Text style={styles.label}>Quantité autorisée</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={approvedLiters}
            onChangeText={setApprovedLiters}
            placeholder="Entrer la quantité validée"
            placeholderTextColor="#94A3B8"
          />

          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={handleApprove}
            disabled={submitting}
            activeOpacity={0.9}
          >
            <Text style={styles.actionButtonText}>Valider la demande</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
            disabled={submitting}
            activeOpacity={0.9}
          >
            <Text style={styles.actionButtonText}>Refuser la demande</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  heroTop: {
    marginBottom: 12
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900'
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6
  },
  subtitle: {
    color: '#475569',
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    color: '#0F172A'
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12
  },
  approveButton: {
    backgroundColor: '#059669'
  },
  rejectButton: {
    backgroundColor: '#DC2626'
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16
  }
})