import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { api, getStoredSession, clearSession } from '../api/client'

const STATUS_FILTERS = [
  { key: 'approved', label: 'À servir' },
  { key: 'served', label: 'Servies' },
  { key: 'all', label: 'Toutes' }
]

function getStatusMeta(status) {
  switch (status) {
    case 'approved':
      return {
        label: 'Validée',
        bg: '#DCFCE7',
        color: '#166534'
      }
    case 'served':
      return {
        label: 'Servie',
        bg: '#DBEAFE',
        color: '#1D4ED8'
      }
    case 'pending':
      return {
        label: 'En attente',
        bg: '#FFEDD5',
        color: '#C2410C'
      }
    case 'rejected':
      return {
        label: 'Refusée',
        bg: '#FEE2E2',
        color: '#B91C1C'
      }
    default:
      return {
        label: status || 'Inconnu',
        bg: '#E2E8F0',
        color: '#475569'
      }
  }
}

export default function PumpAttendantDashboardScreen({ navigation }) {
  const [requests, setRequests] = useState([])
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState('approved')
  const [driverFilter, setDriverFilter] = useState('')
  const [truckFilter, setTruckFilter] = useState('')

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleLogoutPress} style={styles.headerLogoutButton} activeOpacity={0.85}>
          <Text style={styles.headerLogoutText}>Déconnexion</Text>
        </TouchableOpacity>
      )
    })
  }, [navigation, session])

  useFocusEffect(
    useCallback(() => {
      loadRequests()
    }, [])
  )

  async function handleLogout() {
    await clearSession()
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }]
    })
  }

  function handleLogoutPress() {
    Alert.alert(
      'Déconnexion',
      'Veux-tu vraiment fermer la session pompiste sur cet appareil ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: () => {
            handleLogout().catch(() => {
              Alert.alert('Erreur', 'Impossible de fermer la session pour le moment.')
            })
          }
        }
      ]
    )
  }

  async function loadRequests(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const storedSession = await getStoredSession()
      setSession(storedSession)

      if (!storedSession?.token || storedSession?.role !== 'pump_attendant') {
        await clearSession()
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }]
        })
        return
      }

      const params = {}

      if (storedSession.structureId) {
        params.structure_id = storedSession.structureId
      }

      const response = await api.getFuelRequests(params)
      const rawList = response?.data?.data || response?.data || []

      const filteredByStructure = rawList.filter((item) => {
        if (storedSession?.structureId && item?.structure_id) {
          return Number(item.structure_id) === Number(storedSession.structureId)
        }

        if (storedSession?.structureName && item?.structure_name) {
          return (
            String(item.structure_name).trim() ===
            String(storedSession.structureName).trim()
          )
        }

        return true
      })

      filteredByStructure.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime()
        const dateB = new Date(b.created_at || 0).getTime()
        return dateB - dateA
      })

      setRequests(filteredByStructure)
    } catch (error) {
      console.log('Erreur chargement demandes pompiste:', error?.data || error?.message || error)

      if (error?.status === 401) {
        await clearSession()
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }]
        })
        return
      }

      Alert.alert(
        'Erreur',
        error?.message || 'Impossible de charger les demandes.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const visibleRequests = useMemo(() => {
    return requests.filter((item) => {
      const matchesStatus =
        activeFilter === 'all' ? true : item.status === activeFilter

      const matchesDriver = driverFilter.trim()
        ? String(item.driver_name || item.driver?.name || '')
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
  }, [requests, activeFilter, driverFilter, truckFilter])

  const approvedCount = useMemo(
    () => requests.filter((item) => item.status === 'approved').length,
    [requests]
  )

  const servedCount = useMemo(
    () => requests.filter((item) => item.status === 'served').length,
    [requests]
  )

  function renderRequest({ item }) {
    const status = getStatusMeta(item.status)
    const canConfirm = item.status === 'approved'

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.92}
        onPress={() => {
          if (canConfirm) {
            navigation.navigate('ConfirmFuel', { requestId: item.id })
          }
        }}
      >
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.truckNumber}>{item.truck_number}</Text>
            <Text style={styles.driverName}>
              {item.driver_name || item.driver?.name || 'Chauffeur non renseigné'}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Carburant</Text>
            <Text style={styles.infoValue}>{item.fuel_type || '—'}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Validé</Text>
            <Text style={styles.infoValue}>
              {item.approved_liters || item.requested_liters || 0} L
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Structure</Text>
            <Text style={styles.infoValue}>{item.structure_name || '—'}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Montant</Text>
            <Text style={styles.infoValue}>
              {item.amount ? `${item.amount} FCFA` : 'Non saisi'}
            </Text>
          </View>
        </View>

        {canConfirm ? (
          <View style={styles.actionRow}>
            <Text style={styles.actionText}>
              Demande validée. Appuie pour confirmer la livraison.
            </Text>
            <Text style={styles.actionArrow}>›</Text>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Text style={styles.actionTextMuted}>
              Cette demande est déjà traitée.
            </Text>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#081B33" />
        <Text style={styles.loadingText}>Chargement de l’espace pompiste...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleRequests}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRequest}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRequests(true)}
          />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.heroCard}>
              <Text style={styles.badge}>POMPISTE</Text>
              <Text style={styles.title}>
                {session?.structureName || 'Demandes à servir'}
              </Text>
              <Text style={styles.subtitle}>
                Retrouve les demandes validées, confirme la livraison et garde une vue claire sur ce qui a déjà été servi.
              </Text>
            </View>

            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiValue}>{approvedCount}</Text>
                <Text style={styles.kpiLabel}>À servir</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiValue}>{servedCount}</Text>
                <Text style={styles.kpiLabel}>Servies</Text>
              </View>
            </View>

            <View style={styles.filtersCard}>
              <Text style={styles.sectionTitle}>Filtres</Text>

              <View style={styles.filterTabs}>
                {STATUS_FILTERS.map((filter) => {
                  const active = activeFilter === filter.key

                  return (
                    <TouchableOpacity
                      key={filter.key}
                      style={[styles.filterTab, active && styles.filterTabActive]}
                      onPress={() => setActiveFilter(filter.key)}
                      activeOpacity={0.9}
                    >
                      <Text
                        style={[
                          styles.filterTabText,
                          active && styles.filterTabTextActive
                        ]}
                      >
                        {filter.label}
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
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Liste des demandes</Text>
              <Text style={styles.listCount}>{visibleRequests.length} résultat(s)</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucune demande à afficher</Text>
            <Text style={styles.emptyText}>
              Aucune demande ne correspond aux filtres en cours ou aucune demande n’a encore été validée pour cette structure.
            </Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  headerLogoutButton: {
    paddingHorizontal: 6,
    paddingVertical: 4
  },
  headerLogoutText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
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
  heroCard: {
    backgroundColor: '#081B33',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: '900',
    fontSize: 12,
    marginBottom: 14
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 21
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6
  },
  kpiLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700'
  },
  filtersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12
  },
  filterTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#E2E8F0'
  },
  filterTabActive: {
    backgroundColor: '#081B33'
  },
  filterTabText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 13
  },
  filterTabTextActive: {
    color: '#FFFFFF'
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#0F172A',
    marginBottom: 12
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12
  },
  listCount: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12
  },
  truckNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4
  },
  driverName: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700'
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  statusText: {
    fontWeight: '900',
    fontSize: 12
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12
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
    fontSize: 14,
    fontWeight: '800'
  },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  actionText: {
    color: '#166534',
    fontWeight: '800',
    flex: 1,
    paddingRight: 10
  },
  actionTextMuted: {
    color: '#64748B',
    fontWeight: '700'
  },
  actionArrow: {
    color: '#166534',
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '700'
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8
  },
  emptyText: {
    color: '#64748B',
    lineHeight: 21
  }
})