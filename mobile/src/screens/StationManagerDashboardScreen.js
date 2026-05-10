import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native'
import { api, getStoredSession } from '../api/client'

export default function StationManagerDashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true)
  const [station, setStation] = useState(null)
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      setLoading(true)

      const session = await getStoredSession()
      const stationId = session?.stationId || session?.station_id

      if (!stationId) {
        Alert.alert('Session invalide', 'Station introuvable dans la session.')
        return
      }

      const response = await api.get(`/station/${stationId}/transactions`)
      const data = response?.data?.data || {}

      setStation(data.station || null)
      setTransactions(data.transactions || [])
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        'Impossible de charger le tableau de bord station.'

      Alert.alert('Erreur', message)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const totalTransactions = transactions.length

    const totalLiters = transactions.reduce((sum, item) => {
      return sum + Number(item.served_liters || item.quantity_liters || 0)
    }, 0)

    const totalAmount = transactions.reduce((sum, item) => {
      return sum + Number(item.final_amount || item.total_amount || item.amount || 0)
    }, 0)

    const uniqueStructures = new Set(
      transactions
        .map((item) => item.structure_id || item.structure?.id || item.structure_name)
        .filter(Boolean)
    ).size

    const uniqueDrivers = new Set(
      transactions
        .map((item) => item.driver_id || item.driver?.id || item.driver_name)
        .filter(Boolean)
    ).size

    return {
      totalTransactions,
      totalLiters,
      totalAmount,
      uniqueStructures,
      uniqueDrivers
    }
  }, [transactions])

  function formatMoney(value) {
    return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`
  }

  function formatLiters(value) {
    return `${Number(value || 0).toLocaleString('fr-FR')} L`
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F766E" />
        <Text style={styles.loadingText}>Chargement station...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.badge}>Responsable station</Text>
        <Text style={styles.title}>{station?.name || 'Ma station'}</Text>
        <Text style={styles.subtitle}>
          Suivi des transactions carburant réalisées dans cette station.
        </Text>

        <TouchableOpacity style={styles.refreshButton} onPress={loadDashboard}>
          <Text style={styles.refreshText}>Actualiser</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Transactions" value={stats.totalTransactions} />
        <StatCard label="Litres servis" value={formatLiters(stats.totalLiters)} />
        <StatCard label="Montant total" value={formatMoney(stats.totalAmount)} />
        <StatCard label="Structures" value={stats.uniqueStructures} />
        <StatCard label="Chauffeurs" value={stats.uniqueDrivers} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dernières transactions</Text>

        {!transactions.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucune transaction</Text>
            <Text style={styles.emptyText}>
              Les demandes servies dans cette station apparaîtront ici.
            </Text>
          </View>
        ) : null}

        {transactions.map((item) => (
          <TransactionCard key={String(item.id)} item={item} />
        ))}
      </View>
    </ScrollView>
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

function TransactionCard({ item }) {
  const structureName =
    item.structure_name ||
    item.structure?.name ||
    item.company_name ||
    'Structure non renseignée'

  const driverName =
    item.driver_name ||
    item.driver?.name ||
    item.chauffeur_name ||
    'Chauffeur non renseigné'

  const liters = item.served_liters || item.quantity_liters || 0
  const amount = item.final_amount || item.total_amount || item.amount || 0
  const status = item.status || 'completed'

  return (
    <View style={styles.transactionCard}>
      <View style={styles.transactionTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.transactionTitle}>{structureName}</Text>
          <Text style={styles.transactionSub}>{driverName}</Text>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      <View style={styles.transactionLine}>
        <Text style={styles.transactionMeta}>Litres</Text>
        <Text style={styles.transactionValue}>
          {Number(liters || 0).toLocaleString('fr-FR')} L
        </Text>
      </View>

      <View style={styles.transactionLine}>
        <Text style={styles.transactionMeta}>Montant</Text>
        <Text style={styles.transactionValue}>
          {Number(amount || 0).toLocaleString('fr-FR')} FCFA
        </Text>
      </View>

      {item.created_at ? (
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleString('fr-FR')}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6FF'
  },
  content: {
    padding: 20,
    paddingBottom: 40
  },
  center: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 12,
    color: '#475569',
    fontWeight: '800'
  },
  header: {
    backgroundColor: '#081B33',
    borderRadius: 28,
    padding: 24,
    marginBottom: 16
  },
  badge: {
    color: '#99F6E4',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900'
  },
  subtitle: {
    color: '#CBD5E1',
    marginTop: 10,
    lineHeight: 21,
    fontWeight: '600'
  },
  refreshButton: {
    backgroundColor: '#0F766E',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16
  },
  refreshText: {
    color: '#FFFFFF',
    fontWeight: '900'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18
  },
  statCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DCE8F5'
  },
  statValue: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900'
  },
  statLabel: {
    color: '#64748B',
    marginTop: 4,
    fontWeight: '800'
  },
  section: {
    marginTop: 4
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DCE8F5'
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900'
  },
  emptyText: {
    color: '#64748B',
    marginTop: 6,
    fontWeight: '700',
    lineHeight: 20
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DCE8F5'
  },
  transactionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12
  },
  transactionTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900'
  },
  transactionSub: {
    color: '#64748B',
    marginTop: 3,
    fontWeight: '700'
  },
  statusPill: {
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  statusText: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  transactionLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6
  },
  transactionMeta: {
    color: '#64748B',
    fontWeight: '700'
  },
  transactionValue: {
    color: '#0F172A',
    fontWeight: '900'
  },
  dateText: {
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: 12,
    fontSize: 12
  }
})