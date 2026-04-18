import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../api/client'

const DRIVER_NAME_KEY = 'fuel_app_driver_name'
const DRIVER_HISTORY_KEY = 'fuel_app_driver_history'
const DRIVER_STRUCTURE_NAME_KEY = 'fuel_app_structure_name'

const TABS = [
  { key: 'new', label: 'Nouvelle' },
  { key: 'pending', label: 'En attente' },
  { key: 'approved', label: 'Validées' },
  { key: 'served', label: 'Servies' },
  { key: 'rejected', label: 'Refusées' }
]

export default function DriverDashboardScreen({ navigation }) {
  const [requests, setRequests] = useState([])
  const [localName, setLocalName] = useState('')
  const [structureName, setStructureName] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('new')

  useEffect(() => {
    loadLocalData()
  }, [])

  async function loadLocalData() {
    try {
      const savedName = await AsyncStorage.getItem(DRIVER_NAME_KEY)
      const savedStructure = await AsyncStorage.getItem(DRIVER_STRUCTURE_NAME_KEY)

      if (savedName) setLocalName(savedName)
      if (savedStructure) setStructureName(savedStructure)
    } catch (error) {
      console.log('Erreur lecture données locales chauffeur:', error.message)
    }
  }

  async function loadRequests() {
    try {
      setLoading(true)

      const savedName = await AsyncStorage.getItem(DRIVER_NAME_KEY)
      const savedStructure = await AsyncStorage.getItem(DRIVER_STRUCTURE_NAME_KEY)

      const currentName = savedName || localName
      const currentStructure = savedStructure || structureName

      if (!currentName) {
        const localHistoryRaw = await AsyncStorage.getItem(DRIVER_HISTORY_KEY)
        const localHistory = localHistoryRaw ? JSON.parse(localHistoryRaw) : []
        setRequests(localHistory)
        return
      }

      setLocalName(currentName)
      setStructureName(currentStructure || '')

      const params = new URLSearchParams()
      params.append('driver_name', currentName)

      if (currentStructure) {
        params.append('structure_name', currentStructure)
      }

      const response = await api.get(`/fuel-requests?${params.toString()}`)
      setRequests(response.data.data || [])
    } catch (error) {
      console.log('Erreur chargement demandes chauffeur:', error?.response?.data || error.message)

      try {
        const localHistoryRaw = await AsyncStorage.getItem(DRIVER_HISTORY_KEY)
        const localHistory = localHistoryRaw ? JSON.parse(localHistoryRaw) : []
        setRequests(localHistory)
      } catch {
        setRequests([])
      }
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadRequests()
    }, [localName, structureName])
  )

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

  const counts = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      served: requests.filter((r) => r.status === 'served').length,
      rejected: requests.filter((r) => r.status === 'rejected').length
    }
  }, [requests])

  const filteredRequests = useMemo(() => {
    if (activeTab === 'new') return []
    return requests.filter((item) => item.status === activeTab)
  }, [requests, activeTab])

  function getTabCount(tabKey) {
    if (tabKey === 'new') return null
    return counts[tabKey] || 0
  }

  function renderHeader() {
    return (
      <>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>CHAUFFEUR</Text>
            </View>

            <View style={styles.heroMiniCard}>
              <Text style={styles.heroMiniValue}>{requests.length}</Text>
              <Text style={styles.heroMiniLabel}>Total</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Espace chauffeur</Text>
          <Text style={styles.heroText}>
            {localName ? `Nom enregistré : ${localName}` : 'Aucun nom enregistré pour le moment'}
          </Text>

          <View style={styles.structureBox}>
            <Text style={styles.structureLabel}>Structure</Text>
            <Text style={styles.structureValue}>
              {structureName || 'Non renseignée pour le moment'}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          style={styles.tabsScroll}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key
            const count = getTabCount(tab.key)

            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.9}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                </Text>

                {count !== null ? (
                  <View style={[styles.tabCount, active && styles.tabCountActive]}>
                    <Text
                      style={[
                        styles.tabCountText,
                        active && styles.tabCountTextActive
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {activeTab === 'new' ? (
          <View style={styles.newRequestCard}>
            <Text style={styles.newRequestTitle}>Créer une nouvelle demande</Text>
            <Text style={styles.newRequestText}>
              Lance une nouvelle demande de carburant pour ton camion dans ton espace de travail.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('NewFuelRequest')}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>+ Nouvelle demande</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>
              {TABS.find((t) => t.key === activeTab)?.label}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {filteredRequests.length} élément{filteredRequests.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </>
    )
  }

  function renderEmpty() {
    if (activeTab === 'new') return <View />

    const titles = {
      pending: 'Aucune demande en attente',
      approved: 'Aucune demande validée',
      served: 'Aucune demande servie',
      rejected: 'Aucune demande refusée'
    }

    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyTitle}>{titles[activeTab] || 'Aucune demande'}</Text>
        <Text style={styles.emptyText}>
          Les éléments de cette catégorie apparaîtront ici.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={activeTab === 'new' ? [] : filteredRequests}
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
                    {item.driver_name || item.driver?.name || 'N/A'}
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

              <View style={styles.cardBottomMeta}>
                <Text style={styles.structureMetaLabel}>Structure</Text>
                <Text style={styles.structureMetaValue}>
                  {item.structure_name || '—'}
                </Text>
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
        ListEmptyComponent={renderEmpty}
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
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  roleBadgeText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  heroMiniCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 88
  },
  heroMiniValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A'
  },
  heroMiniLabel: {
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
    lineHeight: 22,
    marginBottom: 14
  },
  structureBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  structureLabel: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 4
  },
  structureValue: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800'
  },
  tabsScroll: {
    marginBottom: 16
  },
  tabsRow: {
    paddingRight: 8
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
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
  tabCount: {
    marginLeft: 8,
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6
  },
  tabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.18)'
  },
  tabCountText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 11
  },
  tabCountTextActive: {
    color: '#FFFFFF'
  },
  newRequestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  newRequestTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6
  },
  newRequestText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18
  },
  primaryButton: {
    backgroundColor: '#081B33',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 17
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
    marginTop: 8,
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
  cardBottomMeta: {
    marginTop: 2,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  structureMetaLabel: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 4
  },
  structureMetaValue: {
    color: '#0F172A',
    fontSize: 14,
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