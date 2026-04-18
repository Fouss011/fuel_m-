import { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ScrollView
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { api } from '../api/client'

const STATUSES = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'approved', label: 'Validées' },
  { key: 'served', label: 'Servies' },
  { key: 'rejected', label: 'Refusées' }
]

export default function ChiefDashboardScreen({ navigation }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeStatus, setActiveStatus] = useState('all')
  const [driverFilter, setDriverFilter] = useState('')
  const [truckFilter, setTruckFilter] = useState('')

  async function loadRequests() {
    try {
      setLoading(true)

      const params = new URLSearchParams()

      if (activeStatus !== 'all') params.append('status', activeStatus)
      if (driverFilter.trim()) params.append('driver_name', driverFilter.trim())
      if (truckFilter.trim()) params.append('truck_number', truckFilter.trim())

      const queryString = params.toString()
      const url = queryString ? `/fuel-requests?${queryString}` : '/fuel-requests'

      const response = await api.get(url)
      setRequests(response.data.data || [])
    } catch (error) {
      console.log('Erreur chargement chef:', error?.response?.data || error.message)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadRequests()
    }, [activeStatus])
  )

  const stats = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      served: requests.filter((r) => r.status === 'served').length,
      rejected: requests.filter((r) => r.status === 'rejected').length
    }
  }, [requests])

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

  const kpis = [
    { label: 'En attente', value: stats.pending },
    { label: 'Validées', value: stats.approved },
    { label: 'Servies', value: stats.served },
    { label: 'Refusées', value: stats.rejected }
  ]

  function renderHeader() {
    return (
      <>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>CHEF</Text>
            </View>

            <View style={styles.heroTotal}>
              <Text style={styles.heroTotalValue}>{requests.length}</Text>
              <Text style={styles.heroTotalLabel}>Demandes</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Pilotage carburant</Text>
          <Text style={styles.heroText}>
            Supervise les demandes, applique des filtres et suis les opérations en cours.
          </Text>
        </View>

        <View style={styles.structureCard}>
          <View style={styles.structureHeader}>
            <Text style={styles.structureTitle}>Structure</Text>
            <Text style={styles.structureBadge}>À venir</Text>
          </View>

          <Text style={styles.structureText}>
            La prochaine évolution rattachera automatiquement chaque demande à une structure
            pour isoler les données par entreprise.
          </Text>
        </View>

        <View style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Actions structure</Text>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('CreateStructure')}
            activeOpacity={0.9}
          >
            <Text style={styles.quickActionButtonText}>Créer ma structure</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionButton, styles.quickActionButtonSecondary]}
            onPress={() => navigation.navigate('TeamManagement')}
            activeOpacity={0.9}
          >
            <Text
              style={[
                styles.quickActionButtonText,
                styles.quickActionButtonSecondaryText
              ]}
            >
              Gérer mon équipe
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiRow}
          style={styles.kpiScroll}
        >
          {kpis.map((item) => (
            <View key={item.label} style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{item.value}</Text>
              <Text style={styles.kpiLabel}>{item.label}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.filterBox}>
          <Text style={styles.filterTitle}>Recherche ciblée</Text>

          <TextInput
            style={styles.input}
            placeholder="Rechercher par chauffeur"
            placeholderTextColor="#94A3B8"
            value={driverFilter}
            onChangeText={setDriverFilter}
          />

          <TextInput
            style={styles.input}
            placeholder="Rechercher par camion"
            placeholderTextColor="#94A3B8"
            value={truckFilter}
            onChangeText={setTruckFilter}
          />

          <TouchableOpacity
            style={styles.searchButton}
            onPress={loadRequests}
            activeOpacity={0.9}
          >
            <Text style={styles.searchButtonText}>Appliquer les filtres</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
          style={styles.tabsScroll}
        >
          {STATUSES.map((item) => {
            const active = activeStatus === item.key
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveStatus(item.key)}
                activeOpacity={0.9}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Demandes</Text>
          <Text style={styles.sectionSubtitle}>
            Historique et opérations en cours
          </Text>
        </View>
      </>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const status = renderStatus(item.status)

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('RequestDetails', { requestId: item.id })}
              activeOpacity={0.94}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.truck}>{item.truck_number}</Text>
                  <Text style={styles.meta}>
                    Chauffeur : {item.driver_name || item.driver?.name || 'N/A'}
                  </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Carburant</Text>
                  <Text style={styles.infoValue}>{item.fuel_type}</Text>
                </View>

                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Demandé</Text>
                  <Text style={styles.infoValue}>{item.requested_liters} L</Text>
                </View>

                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Validé</Text>
                  <Text style={styles.infoValue}>
                    {item.approved_liters ? `${item.approved_liters} L` : '—'}
                  </Text>
                </View>

                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Servi</Text>
                  <Text style={styles.infoValue}>
                    {item.served_liters ? `${item.served_liters} L` : '—'}
                  </Text>
                </View>
              </View>

              <View style={styles.footerRow}>
                <View>
                  <Text style={styles.amountLabel}>Montant</Text>
                  <Text style={styles.amountValue}>
                    {item.amount ? `${item.amount} FCFA` : '—'}
                  </Text>
                </View>

                <Text style={styles.detailsLink}>Voir détail ›</Text>
              </View>
            </TouchableOpacity>
          )
        }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>Aucune demande trouvée</Text>
            <Text style={styles.emptyText}>
              Essaie un autre filtre ou recharge la liste.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadRequests} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F7FB'
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  roleBadgeText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  heroTotal: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 88
  },
  heroTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A'
  },
  heroTotalLabel: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6
  },
  heroText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22
  },
  structureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  structureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  structureTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A'
  },
  structureBadge: {
    backgroundColor: '#E2E8F0',
    color: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '800'
  },
  structureText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21
  },
  quickActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  quickActionsTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12
  },
  quickActionButton: {
    backgroundColor: '#081B33',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10
  },
  quickActionButtonSecondary: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 0
  },
  quickActionButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15
  },
  quickActionButtonSecondaryText: {
    color: '#0F172A'
  },
  kpiScroll: {
    marginBottom: 14
  },
  kpiRow: {
    paddingRight: 8
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginRight: 10,
    minWidth: 128,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4
  },
  kpiLabel: {
    color: '#475569',
    fontSize: 13
  },
  filterBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  filterTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    color: '#0F172A'
  },
  searchButton: {
    backgroundColor: '#081B33',
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: 'center'
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15
  },
  tabsScroll: {
    marginBottom: 14
  },
  tabs: {
    paddingRight: 8
  },
  tab: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 8
  },
  tabActive: {
    backgroundColor: '#081B33'
  },
  tabText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13
  },
  tabTextActive: {
    color: '#FFFFFF'
  },
  sectionRow: {
    marginBottom: 14
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 14
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  emptyIcon: {
    fontSize: 30,
    marginBottom: 10
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
    lineHeight: 20
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18
  },
  cardHeaderLeft: {
    flex: 1,
    paddingRight: 12
  },
  truck: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A'
  },
  meta: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 15
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
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  infoBlock: {
    width: '48.5%',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 5
  },
  infoValue: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800'
  },
  footerRow: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  amountLabel: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 2
  },
  amountValue: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900'
  },
  detailsLink: {
    color: '#1D4ED8',
    fontWeight: '800',
    fontSize: 13
  }
})