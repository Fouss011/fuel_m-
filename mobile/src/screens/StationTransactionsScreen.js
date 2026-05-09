import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import {
  clearSession,
  getStationSummary,
  getStationTransactions,
  getStoredSession
} from '../api/client'

function formatAmount(value) {
  const amount = Number(value || 0)
  return `${amount.toLocaleString('fr-FR')} F CFA`
}

function formatLiters(value) {
  const liters = Number(value || 0)
  return `${liters.toLocaleString('fr-FR')} L`
}

function formatDateTime(value) {
  if (!value) return 'Date inconnue'

  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Date inconnue'
  }
}

function getPumpName(item) {
  return (
    item?.pump_attendant?.name ||
    item?.pump_attendant_name ||
    item?.served_by ||
    'Pompiste non renseigné'
  )
}

export default function StationTransactionsScreen({ navigation }) {
  const [session, setSession] = useState(null)
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(
    useCallback(() => {
      loadSessionAndData()
    }, [])
  )

  async function loadSessionAndData() {
    try {
      setLoading(true)

      const storedSession = await getStoredSession()

      if (!storedSession?.token || storedSession?.role !== 'station_manager') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'StationLogin' }]
        })
        return
      }

      setSession(storedSession)

      const [summaryData, transactionsData] = await Promise.all([
        getStationSummary(),
        getStationTransactions()
      ])

      setSummary(summaryData?.data || summaryData || null)
      setTransactions(transactionsData?.data || transactionsData || [])
    } catch (error) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message ||
          'Impossible de charger les transactions station.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true)

      const [summaryData, transactionsData] = await Promise.all([
        getStationSummary(),
        getStationTransactions()
      ])

      setSummary(summaryData?.data || summaryData || null)
      setTransactions(transactionsData?.data || transactionsData || [])
    } catch (error) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message ||
          'Impossible d’actualiser les transactions.'
      )
    } finally {
      setRefreshing(false)
    }
  }

  async function handleLogout() {
    await clearSession()

    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }]
    })
  }

  const computedSummary = useMemo(() => {
    const totalLiters =
      summary?.total_liters ??
      transactions.reduce((acc, item) => acc + Number(item.served_liters || 0), 0)

    const totalAmount =
      summary?.total_amount ??
      transactions.reduce((acc, item) => acc + Number(item.amount || 0), 0)

    const count = summary?.transactions ?? transactions.length

    return {
      totalLiters,
      totalAmount,
      count,
      gasoilLiters: summary?.gasoil_liters || 0,
      essenceLiters: summary?.essence_liters || 0
    }
  }, [summary, transactions])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Chargement du suivi station...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroBadge}>Responsable station</Text>
            <Text style={styles.heroTitle}>
              {session?.stationName || 'Suivi station'}
            </Text>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Quitter</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.heroText}>
          Récapitulatif des chauffeurs servis, sociétés, litres distribués et montants.
        </Text>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Transactions</Text>
          <Text style={styles.summaryValue}>{computedSummary.count}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Litres servis</Text>
          <Text style={styles.summaryValue}>
            {formatLiters(computedSummary.totalLiters)}
          </Text>
        </View>

        <View style={[styles.summaryCard, styles.fullSummaryCard]}>
          <Text style={styles.summaryLabel}>Montant total</Text>
          <Text style={styles.summaryAmount}>
            {formatAmount(computedSummary.totalAmount)}
          </Text>
        </View>
      </View>

      <View style={styles.fuelBreakdown}>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Gasoil</Text>
          <Text style={styles.breakdownValue}>
            {formatLiters(computedSummary.gasoilLiters)}
          </Text>
        </View>

        <View style={styles.breakdownDivider} />

        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Essence</Text>
          <Text style={styles.breakdownValue}>
            {formatLiters(computedSummary.essenceLiters)}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mouvements carburant</Text>
        <Text style={styles.sectionCount}>{transactions.length}</Text>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>⛽</Text>
          <Text style={styles.emptyTitle}>Aucune transaction servie</Text>
          <Text style={styles.emptyText}>
            Les approvisionnements validés apparaîtront ici dès qu’un pompiste les servira.
          </Text>
        </View>
      ) : (
        <View style={styles.transactionsList}>
          {transactions.map((item) => (
            <View key={item.id} style={styles.transactionCard}>
              <View style={styles.transactionTop}>
                <View>
                  <Text style={styles.driverName}>
                    {item.driver_name || 'Chauffeur non renseigné'}
                  </Text>
                  <Text style={styles.companyName}>
                    {item.structure_name || 'Société non renseignée'}
                  </Text>
                </View>

                <View style={styles.amountBadge}>
                  <Text style={styles.amountBadgeText}>
                    {formatAmount(item.amount)}
                  </Text>
                </View>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Camion</Text>
                  <Text style={styles.infoValue}>
                    {item.truck_number || 'Non renseigné'}
                  </Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Carburant</Text>
                  <Text style={styles.infoValue}>
                    {item.fuel_type || 'Non renseigné'}
                  </Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Litres servis</Text>
                  <Text style={styles.infoValue}>
                    {formatLiters(item.served_liters)}
                  </Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Pompiste</Text>
                  <Text style={styles.infoValue}>{getPumpName(item)}</Text>
                </View>
              </View>

              <View style={styles.transactionFooter}>
                <Text style={styles.dateText}>
                  Servi le {formatDateTime(item.served_at)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF4FA'
  },
  content: {
    padding: 18,
    paddingBottom: 34
  },
  center: {
    flex: 1,
    backgroundColor: '#EEF4FA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#536273'
  },
  hero: {
    backgroundColor: '#061A2F',
    borderRadius: 30,
    padding: 22,
    marginBottom: 18,
    shadowColor: '#061A2F',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 14
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(124,58,237,0.35)',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900'
  },
  heroText: {
    color: '#D7E4F2',
    fontSize: 14.5,
    lineHeight: 21
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 9
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1EAF3'
  },
  fullSummaryCard: {
    minWidth: '100%'
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  summaryValue: {
    fontSize: 22,
    color: '#071C33',
    fontWeight: '900'
  },
  summaryAmount: {
    fontSize: 26,
    color: '#7C3AED',
    fontWeight: '900'
  },
  fuelBreakdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1EAF3',
    marginBottom: 22
  },
  breakdownItem: {
    flex: 1
  },
  breakdownLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6
  },
  breakdownValue: {
    color: '#071C33',
    fontSize: 18,
    fontWeight: '900'
  },
  breakdownDivider: {
    width: 1,
    height: 42,
    backgroundColor: '#E1EAF3',
    marginHorizontal: 14
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#071C33'
  },
  sectionCount: {
    backgroundColor: '#EDE9FE',
    color: '#7C3AED',
    fontWeight: '900',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999
  },
  transactionsList: {
    gap: 14
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1EAF3',
    shadowColor: '#071C33',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  transactionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14
  },
  driverName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#071C33',
    marginBottom: 4
  },
  companyName: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '700'
  },
  amountBadge: {
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start'
  },
  amountBadgeText: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '900'
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  infoBox: {
    width: '47%',
    backgroundColor: '#F6F9FC',
    borderRadius: 16,
    padding: 12
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '900',
    marginBottom: 5,
    textTransform: 'uppercase'
  },
  infoValue: {
    color: '#071C33',
    fontSize: 13.5,
    fontWeight: '800'
  },
  transactionFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E1EAF3',
    marginTop: 14,
    paddingTop: 12
  },
  dateText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700'
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1EAF3'
  },
  emptyIcon: {
    fontSize: 38,
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#071C33',
    marginBottom: 8,
    textAlign: 'center'
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  }
})