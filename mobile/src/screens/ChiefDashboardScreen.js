import { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { api, getStoredSession, clearSession } from '../api/client'

const STATUSES = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'approved', label: 'Validées' },
  { key: 'served', label: 'Servies' },
  { key: 'rejected', label: 'Refusées' }
]

function getStatusConfig(status) {
  switch (status) {
    case 'pending':
      return {
        label: 'En attente',
        backgroundColor: '#FEF3C7',
        color: '#B45309'
      }
    case 'approved':
      return {
        label: 'Validée',
        backgroundColor: '#DCFCE7',
        color: '#166534'
      }
    case 'served':
      return {
        label: 'Servie',
        backgroundColor: '#DBEAFE',
        color: '#1D4ED8'
      }
    case 'rejected':
      return {
        label: 'Refusée',
        backgroundColor: '#FEE2E2',
        color: '#B91C1C'
      }
    default:
      return {
        label: status || 'Inconnu',
        backgroundColor: '#E2E8F0',
        color: '#475569'
      }
  }
}

export default function ChiefDashboardScreen({ navigation }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeStatus, setActiveStatus] = useState('all')
  const [driverFilter, setDriverFilter] = useState('')
  const [truckFilter, setTruckFilter] = useState('')
  const [session, setSession] = useState(null)

  useFocusEffect(
    useCallback(() => {
      loadRequests()
    }, [])
  )

  async function loadRequests(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const storedSession = await getStoredSession()
      setSession(storedSession)

      if (!storedSession?.token || storedSession?.role !== 'chief') {
        await clearSession()
        navigation.replace('PinAccess', { role: 'chief' })
        return
      }

      const response = await api.getFuelRequests({
        structure_id: storedSession.structureId
      })

      const list = response?.data?.data || response?.data || []

      const filtered = list.filter((item) => {
        if (!storedSession.structureId) return true
        return Number(item.structure_id) === Number(storedSession.structureId)
      })

      filtered.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime()
        const dateB = new Date(b.created_at || 0).getTime()
        return dateB - dateA
      })

      setRequests(filtered)
    } catch (error) {
      console.log('Erreur chef dashboard:', error)

      if (error?.status === 401) {
        await clearSession()
        navigation.replace('PinAccess', { role: 'chief' })
        return
      }

      alert(
        error?.message ||
          'Impossible de charger les demandes de votre structure.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      const matchesStatus =
        activeStatus === 'all' ? true : item.status === activeStatus

      const matchesDriver = driverFilter.trim()
        ? String(item.driver_name || '')
            .toLowerCase()
            .includes(driverFilter.trim().toLowerCase())
        : true

      const matchesTruck = truckFilter.trim()
        ? String(item.truck_number || '')
            .toLowerCase()
            .includes(truckFilter.trim().toLowerCase())
        : true

      return matchesStatus && matchesDriver && matchesTruck
    })
  }, [requests, activeStatus, driverFilter, truckFilter])

  const counts = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      served: requests.filter((r) => r.status === 'served').length,
      rejected: requests.filter((r) => r.status === 'rejected').length
    }
  }, [requests])

  function openRequest(item) {
    if (item.status === 'pending') {
      navigation.navigate('RequestDetails', {
        requestId: item.id
      })
      return
    }

    alert(
      item.status === 'approved'
        ? 'Cette demande a déjà été validée et attend la confirmation du pompiste.'
        : item.status === 'served'
        ? 'Cette demande a déjà été servie.'
        : 'Cette demande a été refusée.'
    )
  }

  function renderItem({ item }) {
    const status = getStatusConfig(item.status)

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.92}
        onPress={() => openRequest(item)}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.truck}>{item.truck_number}</Text>
            <Text style={styles.driver}>
              {item.driver_name || 'Chauffeur non renseigné'}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: status.backgroundColor }
            ]}
          >
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Carburant</Text>
            <Text style={styles.infoValue}>{item.fuel_type}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Demandé</Text>
            <Text style={styles.infoValue}>
              {item.requested_liters} L
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Validé</Text>
            <Text style={styles.infoValue}>
              {item.approved_liters ? `${item.approved_liters} L` : '—'}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Montant</Text>
            <Text style={styles.infoValue}>
              {item.amount ? `${item.amount} FCFA` : 'Non saisi'}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          {item.status === 'pending' ? (
            <Text style={styles.pendingText}>
              Appuie pour valider ou refuser cette demande.
            </Text>
          ) : item.status === 'approved' ? (
            <Text style={styles.approvedText}>
              Demande validée. En attente de confirmation par le pompiste.
            </Text>
          ) : item.status === 'served' ? (
            <Text style={styles.servedText}>
              Livraison confirmée avec succès.
            </Text>
          ) : (
            <Text style={styles.rejectedText}>
              Cette demande a été refusée.
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#081B33" />
        <Text style={styles.loaderText}>
          Chargement des demandes de votre structure...
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRequests(true)}
          />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <Text style={styles.badge}>CHEF</Text>
              <Text style={styles.title}>
                {session?.structureName || 'Votre structure'}
              </Text>
              <Text style={styles.subtitle}>
                Valide, refuse et suis les demandes de carburant de ton équipe.
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{counts.pending}</Text>
                <Text style={styles.statLabel}>En attente</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statValue}>{counts.approved}</Text>
                <Text style={styles.statLabel}>Validées</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statValue}>{counts.served}</Text>
                <Text style={styles.statLabel}>Servies</Text>
              </View>
            </View>

            <View style={styles.filterCard}>
              <Text style={styles.filterTitle}>Filtres</Text>

              <View style={styles.statusRow}>
                {STATUSES.map((status) => {
                  const active = activeStatus === status.key

                  return (
                    <TouchableOpacity
                      key={status.key}
                      style={[
                        styles.statusButton,
                        active && styles.statusButtonActive
                      ]}
                      onPress={() => setActiveStatus(status.key)}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          active && styles.statusButtonTextActive
                        ]}
                      >
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Filtrer par chauffeur"
                placeholderTextColor="#94A3B8"
                value={driverFilter}
                onChangeText={setDriverFilter}
              />

              <TextInput
                style={styles.input}
                placeholder="Filtrer par camion"
                placeholderTextColor="#94A3B8"
                value={truckFilter}
                onChangeText={setTruckFilter}
              />
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucune demande trouvée</Text>
            <Text style={styles.emptyText}>
              Aucune demande ne correspond aux filtres actuels.
            </Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F7FB'
  },
  content: {
    padding: 16,
    paddingBottom: 30
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F7FB',
    paddingHorizontal: 24
  },
  loaderText: {
    marginTop: 12,
    color: '#475569',
    textAlign: 'center'
  },
  hero: {
    backgroundColor: '#081B33',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 12
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900'
  },
  subtitle: {
    color: '#CBD5E1',
    marginTop: 8,
    lineHeight: 20
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A'
  },
  statLabel: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700'
  },
  filterCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14
  },
  statusButton: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999
  },
  statusButtonActive: {
    backgroundColor: '#081B33'
  },
  statusButtonText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 12
  },
  statusButtonTextActive: {
    color: '#fff'
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#0F172A',
    marginBottom: 10
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  truck: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A'
  },
  driver: {
    marginTop: 4,
    color: '#64748B',
    fontWeight: '700'
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  infoBox: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 4
  },
  infoValue: {
    color: '#0F172A',
    fontWeight: '800'
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 14,
    paddingTop: 12
  },
  pendingText: {
    color: '#B45309',
    fontWeight: '800'
  },
  approvedText: {
    color: '#166534',
    fontWeight: '800'
  },
  servedText: {
    color: '#1D4ED8',
    fontWeight: '800'
  },
  rejectedText: {
    color: '#B91C1C',
    fontWeight: '800'
  },
  empty: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8
  },
  emptyText: {
    color: '#64748B',
    lineHeight: 20
  }
})