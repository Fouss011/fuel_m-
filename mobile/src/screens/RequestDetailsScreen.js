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
import { api, getStoredSession } from '../api/client'

export default function RequestDetailsScreen({ route, navigation }) {
  const { requestId } = route.params

  const [request, setRequest] = useState(null)
  const [session, setSession] = useState(null)
  const [approvedLiters, setApprovedLiters] = useState('')
  const [loading, setLoading] = useState(true)
  const [submittingAction, setSubmittingAction] = useState(null)

  async function loadRequest() {
    try {
      setLoading(true)

      const storedSession = await getStoredSession()
      setSession(storedSession)

      const response = await api.getFuelRequestById(requestId)
      const data = response?.data?.data || response?.data || null

      setRequest(data)
      setApprovedLiters(String(data?.approved_liters || data?.requested_liters || ''))
    } catch (error) {
      console.log('Erreur détail demande:', error?.data || error?.message || error)
      Alert.alert(
        'Erreur',
        error?.message || 'Impossible de charger la demande.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequest()
  }, [requestId])

  function validateChiefSession() {
    if (!session?.token || !session?.userId || session?.role !== 'chief') {
      Alert.alert(
        'Session invalide',
        'Aucune session chef valide n’est active. Reconnecte-toi avant de continuer.'
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
          'Tu ne peux pas traiter une demande qui appartient à une autre structure.'
        )
        return false
      }
    } else if (session?.structureName && request?.structure_name) {
      if (String(session.structureName).trim() !== String(request.structure_name).trim()) {
        Alert.alert(
          'Structure invalide',
          'Tu ne peux pas traiter une demande qui appartient à une autre structure.'
        )
        return false
      }
    }

    return true
  }

  async function handleApprove() {
    if (submittingAction) return

    if (!validateChiefSession()) return
    if (!validateStructureMatch()) return

    const cleanApprovedLiters = approvedLiters.trim()

    if (!cleanApprovedLiters) {
      Alert.alert(
        'Champ obligatoire',
        'Tous les champs obligatoires doivent être remplis avant validation.'
      )
      return
    }

    const liters = Number(cleanApprovedLiters)
    const requestedValue = Number(request?.requested_liters || 0)

    if (Number.isNaN(liters)) {
      Alert.alert(
        'Quantité invalide',
        'La quantité autorisée doit être un nombre valide.'
      )
      return
    }

    if (liters <= 0) {
      Alert.alert(
        'Quantité invalide',
        'La quantité autorisée doit être supérieure à 0.'
      )
      return
    }

    if (requestedValue > 0 && liters > requestedValue) {
      Alert.alert(
        'Quantité trop élevée',
        `Vous ne pouvez pas mettre un chiffre supérieur à celui demandé par le chauffeur. Maximum autorisé : ${requestedValue} L.`
      )
      return
    }

    if (request?.status !== 'pending') {
      Alert.alert(
        'Action impossible',
        'Cette demande n’est plus en attente. Recharge la page pour voir son statut actuel.'
      )
      return
    }

    try {
      setSubmittingAction('approve')

      const response = await api.approveFuelRequest(requestId, {
        chief_id: Number(session.userId),
        approved_liters: liters
      })

      Alert.alert(
        'Demande validée',
        response?.message ||
          `La demande a bien été validée avec ${liters} L. Le pompiste peut maintenant confirmer la livraison.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      )
    } catch (error) {
      console.log('Erreur validation:', error?.data || error?.message || error)

      if (error?.status === 400) {
        Alert.alert(
          'Validation impossible',
          error?.message ||
            'Tous les champs obligatoires doivent être remplis avant validation.'
        )
        return
      }

      if (error?.status === 401) {
        Alert.alert(
          'Session invalide',
          'Votre session chef a expiré. Reconnectez-vous pour continuer.'
        )
        return
      }

      if (error?.status === 403) {
        Alert.alert(
          'Action non autorisée',
          error?.message || 'Tu n’as pas les droits nécessaires pour valider cette demande.'
        )
        return
      }

      Alert.alert(
        'Erreur',
        error?.message || 'Impossible de valider la demande.'
      )
    } finally {
      setSubmittingAction(null)
    }
  }

  async function handleReject() {
    if (submittingAction) return

    if (!validateChiefSession()) return
    if (!validateStructureMatch()) return

    if (request?.status !== 'pending') {
      Alert.alert(
        'Action impossible',
        'Cette demande n’est plus en attente. Recharge la page pour voir son statut actuel.'
      )
      return
    }

    try {
      setSubmittingAction('reject')

      const response = await api.rejectFuelRequest(requestId, {
        chief_id: Number(session.userId)
      })

      Alert.alert(
        'Demande refusée',
        response?.message ||
          'La demande a bien été refusée. Le chauffeur devra créer une nouvelle demande si besoin.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      )
    } catch (error) {
      console.log('Erreur refus:', error?.data || error?.message || error)

      if (error?.status === 400) {
        Alert.alert(
          'Refus impossible',
          error?.message || 'Impossible de refuser la demande dans son état actuel.'
        )
        return
      }

      if (error?.status === 401) {
        Alert.alert(
          'Session invalide',
          'Votre session chef a expiré. Reconnectez-vous pour continuer.'
        )
        return
      }

      if (error?.status === 403) {
        Alert.alert(
          'Action non autorisée',
          error?.message || 'Tu n’as pas les droits nécessaires pour refuser cette demande.'
        )
        return
      }

      Alert.alert(
        'Erreur',
        error?.message || 'Impossible de refuser la demande.'
      )
    } finally {
      setSubmittingAction(null)
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
        <Text style={styles.loadingText}>Chargement de la demande...</Text>
      </View>
    )
  }

  if (!request) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Demande introuvable</Text>
        <Text style={styles.emptyText}>
          Cette demande n’a pas pu être chargée ou n’existe plus.
        </Text>
      </View>
    )
  }

  const isPending = request.status === 'pending'
  const status = renderStatus(request.status)

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
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
          Détail complet de la demande et décision du chef.
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

          <Text style={styles.formHint}>
            La demande ne peut être validée que par le chef connecté à la même structure.
          </Text>

          <Text style={styles.label}>Quantité autorisée</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={approvedLiters}
            onChangeText={setApprovedLiters}
            placeholder="Entrer la quantité validée"
            placeholderTextColor="#94A3B8"
            editable={!submittingAction}
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Règle de contrôle</Text>
            <Text style={styles.infoText}>
              Vous ne pouvez pas mettre un chiffre supérieur à celui demandé par le chauffeur.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.approveButton,
              submittingAction && styles.buttonDisabled
            ]}
            onPress={handleApprove}
            disabled={!!submittingAction}
            activeOpacity={0.9}
          >
            {submittingAction === 'approve' ? (
              <View style={styles.buttonInline}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.actionButtonTextLoading}>Validation en cours...</Text>
              </View>
            ) : (
              <Text style={styles.actionButtonText}>Valider la demande</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.rejectButton,
              submittingAction && styles.buttonDisabled
            ]}
            onPress={handleReject}
            disabled={!!submittingAction}
            activeOpacity={0.9}
          >
            {submittingAction === 'reject' ? (
              <View style={styles.buttonInline}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.actionButtonTextLoading}>Refus en cours...</Text>
              </View>
            ) : (
              <Text style={styles.actionButtonText}>Refuser la demande</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.infoStateCard}>
          <Text style={styles.infoStateTitle}>Action déjà traitée</Text>
          <Text style={styles.infoStateText}>
            Cette demande n’est plus en attente. Aucune nouvelle validation n’est possible sur cet écran.
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F7FB',
    paddingHorizontal: 24
  },
  loadingText: {
    marginTop: 12,
    color: '#475569',
    fontSize: 15,
    textAlign: 'center'
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900'
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6
  },
  subtitle: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
    flex: 1
  },
  infoValue: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    textAlign: 'right'
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8
  },
  formHint: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14
  },
  label: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 8
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 15,
    color: '#0F172A',
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
  actionButton: {
    borderRadius: 18,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 16
  },
  approveButton: {
    backgroundColor: '#047857'
  },
  rejectButton: {
    backgroundColor: '#B91C1C'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900'
  },
  buttonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionButtonTextLoading: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10
  },
  infoStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  infoStateTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8
  },
  infoStateText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21
  }
})