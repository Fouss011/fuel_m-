import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native'

const API_URL = 'https://backend-withered-sky-4709.fly.dev'

function formatNumber(value) {
  const number = Number(value || 0)

  return new Intl.NumberFormat('fr-FR').format(number)
}

function StatCard({ label, value, sub }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  )
}

export default function SuperAdminDashboardScreen({ route, navigation }) {
  const token = route?.params?.token
  const admin = route?.params?.admin

  const [summary, setSummary] = useState(null)
  const [stations, setStations] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchWithAuth = useCallback(
    async (path) => {
      const res = await fetch(`${API_URL}${path}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Erreur serveur')
      }

      return data.data
    },
    [token]
  )

  const loadData = useCallback(async () => {
    if (!token) {
      Alert.alert('Session manquante', 'Reconnecte-toi au compte super admin.')
      navigation.replace('SuperAdminLogin')
      return
    }

    try {
      const [summaryData, stationsData, transactionsData] = await Promise.all([
        fetchWithAuth('/api/admin/summary'),
        fetchWithAuth('/api/admin/stations'),
        fetchWithAuth('/api/admin/transactions')
      ])

      setSummary(summaryData)
      setStations(stationsData || [])
      setTransactions(transactionsData || [])
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de charger les données.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [fetchWithAuth, navigation, token])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function onRefresh() {
    setRefreshing(true)
    await loadData()
  }

  function logout() {
    navigation.replace('Home')
  }

  if (loading) {
    return (
      <View style={styles.loadingPage}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Chargement du pilotage global...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.hero}>
        <View>
          <Text style={styles.eyebrow}>SUPER ADMIN</Text>
          <Text style={styles.title}>Pilotage global</Text>
          <Text style={styles.subtitle}>
            {admin?.name || 'Super Admin'} · visibilité complète sur la plateforme
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Quitter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <StatCard
          label="Structures"
          value={formatNumber(summary?.structures_count)}
        />
        <StatCard
          label="Stations"
          value={formatNumber(summary?.stations_count)}
        />
        <StatCard
          label="Chauffeurs"
          value={formatNumber(summary?.drivers_count)}
        />
        <StatCard
          label="Pompistes"
          value={formatNumber(summary?.pump_attendants_count)}
        />
        <StatCard
          label="Transactions"
          value={formatNumber(summary?.fuel_requests_count)}
        />
        <StatCard
          label="En attente"
          value={formatNumber(summary?.pending_requests_count)}
        />
      </View>

      <View style={styles.bigCard}>
        <Text style={styles.sectionTitle}>Carburant servi</Text>
        <Text style={styles.bigNumber}>
          {formatNumber(summary?.total_served_liters)} L
        </Text>
        <Text style={styles.bigSub}>
          Montant total : {formatNumber(summary?.total_amount)} F CFA
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Stations</Text>
        <Text style={styles.sectionCount}>{stations.length}</Text>
      </View>

      {stations.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Aucune station</Text>
          <Text style={styles.emptyText}>
            Les stations créées apparaîtront ici.
          </Text>
        </View>
      ) : (
        stations.map((station) => (
          <View key={station.id} style={styles.listCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{station.name}</Text>
              <Text style={styles.listMeta}>
                Code : {station.station_code || '-'}
              </Text>
              <Text style={styles.listMeta}>
                Responsable : {station.manager_name || '-'}
              </Text>
            </View>

            <View
              style={[
                styles.statusPill,
                station.is_active ? styles.statusActive : styles.statusInactive
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  station.is_active ? styles.statusTextActive : styles.statusTextInactive
                ]}
              >
                {station.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        ))
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dernières transactions</Text>
        <Text style={styles.sectionCount}>{transactions.length}</Text>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Aucune transaction</Text>
          <Text style={styles.emptyText}>
            Les demandes et services carburant apparaîtront ici.
          </Text>
        </View>
      ) : (
        transactions.slice(0, 20).map((tx) => (
          <View key={tx.id} style={styles.transactionCard}>
            <View>
              <Text style={styles.listTitle}>
                {tx.driver?.name || tx.driver_name || 'Chauffeur'}
              </Text>
              <Text style={styles.listMeta}>
                Station : {tx.station?.name || tx.station_name || '-'}
              </Text>
              <Text style={styles.listMeta}>
                Statut : {tx.status || '-'}
              </Text>
            </View>

            <View style={styles.txRight}>
              <Text style={styles.txLiters}>
                {formatNumber(tx.served_liters || tx.approved_liters || tx.requested_liters)} L
              </Text>
              <Text style={styles.txAmount}>
                {formatNumber(tx.amount)} F
              </Text>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#07172B'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  loadingPage: {
    flex: 1,
    backgroundColor: '#07172B',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#FFFFFF',
    fontWeight: '700'
  },
  hero: {
    backgroundColor: '#0B2748',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  eyebrow: {
    color: '#93C5FD',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1.2
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 4
  },
  subtitle: {
    color: '#C9D8EA',
    fontSize: 13,
    marginTop: 6,
    maxWidth: 230
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999
  },
  logoutText: {
    color: '#0B2748',
    fontWeight: '900',
    fontSize: 12
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 10
  },
  statValue: {
    color: '#081B33',
    fontSize: 26,
    fontWeight: '900'
  },
  statLabel: {
    color: '#617085',
    fontWeight: '800',
    marginTop: 4
  },
  statSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4
  },
  bigCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 20,
    marginTop: 6,
    marginBottom: 22
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900'
  },
  bigNumber: {
    color: '#081B33',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 8
  },
  bigSub: {
    color: '#617085',
    fontWeight: '800',
    marginTop: 4
  },
  sectionHeader: {
    marginTop: 6,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sectionCount: {
    color: '#FFFFFF',
    fontWeight: '900',
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  listTitle: {
    color: '#081B33',
    fontSize: 16,
    fontWeight: '900'
  },
  listMeta: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 3
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  statusActive: {
    backgroundColor: '#DCFCE7'
  },
  statusInactive: {
    backgroundColor: '#FEE2E2'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900'
  },
  statusTextActive: {
    color: '#166534'
  },
  statusTextInactive: {
    color: '#991B1B'
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14
  },
  emptyTitle: {
    color: '#081B33',
    fontWeight: '900',
    fontSize: 16
  },
  emptyText: {
    color: '#64748B',
    marginTop: 4
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  txRight: {
    alignItems: 'flex-end'
  },
  txLiters: {
    color: '#0B3B75',
    fontWeight: '900',
    fontSize: 16
  },
  txAmount: {
    color: '#64748B',
    fontWeight: '800',
    fontSize: 12,
    marginTop: 4
  }
})