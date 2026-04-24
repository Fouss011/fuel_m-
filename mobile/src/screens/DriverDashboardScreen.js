import { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import {
  createFuelRequest,
  fetchFuelRequests,
  getStoredSession,
  clearSession
} from '../api/client'

const INPUT_PROPS = {
  placeholderTextColor: '#64748B',
  selectionColor: '#2563EB',
  cursorColor: '#2563EB'
}

const FUEL_OPTIONS = [
  { key: 'gasoil', label: 'Gasoil' },
  { key: 'essence', label: 'Essence' }
]

export default function DriverDashboardScreen({ navigation }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [requests, setRequests] = useState([])

  const [fuelType, setFuelType] = useState('gasoil')
  const [requestedLiters, setRequestedLiters] = useState('')

  useFocusEffect(
    useCallback(() => {
      loadDriverData()
    }, [])
  )

  async function loadDriverData() {
    try {
      setLoading(true)

      const storedSession = await getStoredSession()

      if (!storedSession?.token || storedSession?.role !== 'driver') {
        Alert.alert('Session expirée', 'Reconnecte-toi comme chauffeur.')
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }]
        })
        return
      }

      setSession(storedSession)

      const response = await fetchFuelRequests()
      setRequests(response?.data || [])
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Impossible de charger l’espace chauffeur.'
      Alert.alert('Erreur', message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateRequest() {
    if (!requestedLiters.trim()) {
      Alert.alert('Champ manquant', 'Entre la quantité demandée.')
      return
    }

    const liters = Number(requestedLiters)

    if (Number.isNaN(liters) || liters <= 0) {
      Alert.alert('Valeur invalide', 'La quantité doit être supérieure à 0.')
      return
    }

    try {
      setSubmitting(true)

      await createFuelRequest({
        fuel_type: fuelType,
        requested_liters: liters
      })

      Alert.alert('Succès', 'Demande envoyée avec succès.')
      setRequestedLiters('')
      await loadDriverData()
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Impossible d’envoyer la demande.'
      Alert.alert('Erreur', message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    try {
      await clearSession()
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }]
      })
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de se déconnecter.')
    }
  }

  const stats = useMemo(() => {
    const total = requests.length
    const pending = requests.filter((item) => item.status === 'pending').length
    const approved = requests.filter((item) => item.status === 'approved').length
    const served = requests.filter((item) => item.status === 'served').length
    const rejected = requests.filter((item) => item.status === 'rejected').length

    return { total, pending, approved, served, rejected }
  }, [requests])

  function renderFuelOption(option) {
    const isActive = fuelType === option.key

    return (
      <TouchableOpacity
        key={option.key}
        style={[styles.optionChip, isActive && styles.optionChipActive]}
        onPress={() => setFuelType(option.key)}
      >
        <Text style={[styles.optionChipText, isActive && styles.optionChipTextActive]}>
          {option.label}
        </Text>
      </TouchableOpacity>
    )
  }

  function renderRequestItem({ item }) {
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View>
            <Text style={styles.requestTitle}>{item.fuel_type}</Text>
            <Text style={styles.requestTruck}>{item.truck_number}</Text>
          </View>

          <View style={[styles.statusBadge, statusStyle(item.status)]}>
            <Text style={styles.statusBadgeText}>{statusLabel(item.status)}</Text>
          </View>
        </View>

        <Text style={styles.requestMeta}>Demandé : {item.requested_liters} L</Text>

        {item.approved_liters ? (
          <Text style={styles.requestMeta}>Validé : {item.approved_liters} L</Text>
        ) : null}

        {item.served_liters ? (
          <Text style={styles.requestMeta}>Servi : {item.served_liters} L</Text>
        ) : null}

        {item.amount ? (
          <Text style={styles.requestMeta}>Montant : {item.amount}</Text>
        ) : null}

        {item.created_at ? (
          <Text style={styles.requestDate}>
            Créé le : {new Date(item.created_at).toLocaleString()}
          </Text>
        ) : null}
      </View>
    )
  }

  return (
    <FlatList
      data={requests}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderRequestItem}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadDriverData} />
      }
      ListHeaderComponent={
        <View style={styles.headerContainer}>
          <View style={styles.heroCard}>
            <View>
              <Text style={styles.heroTitle}>
                {session?.userName || 'Espace chauffeur'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {session?.structureName || 'Structure'} •{' '}
                {session?.truckNumber || 'Camion non renseigné'}
              </Text>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Déconnexion</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <StatCard label="Total" value={stats.total} />
            <StatCard label="En attente" value={stats.pending} />
            <StatCard label="Validées" value={stats.approved} />
            <StatCard label="Servies" value={stats.served} />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Nouvelle demande</Text>
            <Text style={styles.sectionSubtitle}>
              Envoie une demande à ton chef depuis ton espace.
            </Text>

            <View style={styles.optionsRow}>
              {FUEL_OPTIONS.map(renderFuelOption)}
            </View>

            <TextInput
              {...INPUT_PROPS}
              style={styles.input}
              placeholder="Quantité demandée en litres"
              value={requestedLiters}
              onChangeText={setRequestedLiters}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreateRequest}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Envoyer la demande</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Mes demandes</Text>
            <Text style={styles.sectionSubtitle}>
              Tu vois ici uniquement les demandes envoyées depuis ton profil.
            </Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Aucune demande pour le moment</Text>
          <Text style={styles.emptyText}>
            Crée ta première demande de carburant pour qu’elle apparaisse ici.
          </Text>
        </View>
      }
      contentContainerStyle={styles.listContent}
      style={styles.container}
    />
  )
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function statusLabel(status) {
  switch (status) {
    case 'pending':
      return 'En attente'
    case 'approved':
      return 'Validée'
    case 'served':
      return 'Servie'
    case 'rejected':
      return 'Refusée'
    default:
      return status
  }
}

function statusStyle(status) {
  switch (status) {
    case 'pending':
      return { backgroundColor: '#FEF3C7' }
    case 'approved':
      return { backgroundColor: '#DBEAFE' }
    case 'served':
      return { backgroundColor: '#DCFCE7' }
    case 'rejected':
      return { backgroundColor: '#FEE2E2' }
    default:
      return { backgroundColor: '#E5E7EB' }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F7FB'
  },
  listContent: {
    padding: 16,
    paddingBottom: 40
  },
  headerContainer: {
    paddingBottom: 8
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6
  },
  heroSubtitle: {
    color: '#D9E4F1',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14
  },
  logoutButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2563EB',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700'
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#081B33',
    marginBottom: 8
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    marginBottom: 12
  },
  optionsRow: {
    flexDirection: 'row',
    marginBottom: 12
  },
  optionChip: {
    backgroundColor: '#EEF3F8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 10
  },
  optionChipActive: {
    backgroundColor: '#2563EB'
  },
  optionChipText: {
    color: '#516173',
    fontWeight: '700'
  },
  optionChipTextActive: {
    color: '#FFFFFF'
  },
  input: {
    backgroundColor: '#F6F9FC',
    borderWidth: 1,
    borderColor: '#DFE7F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#081B33',
    marginBottom: 12
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  requestTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#081B33',
    textTransform: 'capitalize'
  },
  requestTruck: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B'
  },
  requestMeta: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 5
  },
  requestDate: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B'
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937'
  },
  emptyWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center'
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#081B33',
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21
  }
})