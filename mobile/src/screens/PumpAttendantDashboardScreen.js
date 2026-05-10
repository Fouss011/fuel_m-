import { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import {
  api,
  getStoredSession,
  serveFuelRequest,
  clearSession
} from '../api/client'

const INPUT_PROPS = {
  placeholderTextColor: '#64748B',
  selectionColor: '#B45309',
  cursorColor: '#B45309'
}

export default function PumpAttendantDashboardScreen({ navigation }) {
  const [session, setSession] = useState(null)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [servingId, setServingId] = useState(null)

  const [search, setSearch] = useState('')
  const [servedLitersById, setServedLitersById] = useState({})
  const [amountById, setAmountById] = useState({})

  useFocusEffect(
    useCallback(() => {
      loadDashboard()
    }, [])
  )

  async function loadDashboard() {
    try {
      setLoading(true)

      const storedSession = await getStoredSession()
      setSession(storedSession)

      const stationId = storedSession?.stationId || storedSession?.station_id

      if (!stationId) {
        Alert.alert(
          'Session station invalide',
          'Reconnecte-toi avec le code de ta station.'
        )
        navigation.reset({
          index: 0,
          routes: [{ name: 'StationAccess' }]
        })
        return
      }

      const response = await api.get(`/station/${stationId}/pending-requests`)
      const data = response?.data?.data || response?.data || []

      setRequests(Array.isArray(data) ? data : data.requests || [])
    } catch (error) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message ||
          error?.message ||
          'Impossible de charger les demandes de la station.'
      )
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase()

    if (!q) return requests

    return requests.filter((item) => {
      const structureName =
        item.structure_name ||
        item.structure?.name ||
        item.company_name ||
        ''

      const structureCode =
        item.structure_code ||
        item.structure?.structure_code ||
        ''

      const driverName =
        item.driver_name ||
        item.driver?.name ||
        ''

      const truckNumber =
        item.truck_number ||
        item.driver?.truck_number ||
        ''

      return (
        structureName.toLowerCase().includes(q) ||
        structureCode.toLowerCase().includes(q) ||
        driverName.toLowerCase().includes(q) ||
        truckNumber.toLowerCase().includes(q)
      )
    })
  }, [requests, search])

  const todayStats = useMemo(() => {
    const count = requests.length

    const liters = requests.reduce((sum, item) => {
      return sum + Number(item.approved_liters || item.requested_liters || 0)
    }, 0)

    return {
      count,
      liters
    }
  }, [requests])

  function updateServedLiters(id, value) {
    setServedLitersById((prev) => ({
      ...prev,
      [id]: value
    }))
  }

  function updateAmount(id, value) {
    setAmountById((prev) => ({
      ...prev,
      [id]: value
    }))
  }

  async function handleServe(item) {
    const approvedLiters = Number(item.approved_liters || item.requested_liters || 0)
    const servedLitersRaw = servedLitersById[item.id]
    const amountRaw = amountById[item.id]

    const servedLiters = Number(String(servedLitersRaw || '').replace(',', '.'))
    const amount = Number(String(amountRaw || '').replace(',', '.'))

    if (!servedLiters || servedLiters <= 0) {
      Alert.alert('Quantité invalide', 'Entre la quantité réellement servie.')
      return
    }

    if (approvedLiters && servedLiters > approvedLiters) {
      Alert.alert(
        'Quantité trop élevée',
        `Tu ne peux pas servir plus que ${approvedLiters} L validés par le chef.`
      )
      return
    }

    if (!amount || amount <= 0) {
      Alert.alert('Montant invalide', 'Entre le montant réel de la transaction.')
      return
    }

    try {
      setServingId(item.id)

      await serveFuelRequest(item.id, {
        served_liters: servedLiters,
        amount,
        station_id: session?.stationId || session?.station_id,
        pump_attendant_id: session?.userId || session?.user_id
      })

      Alert.alert('Carburant servi', 'La transaction a été validée avec succès.')

      setServedLitersById((prev) => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })

      setAmountById((prev) => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })

      await loadDashboard()
    } catch (error) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message ||
          error?.message ||
          'Impossible de valider le service carburant.'
      )
    } finally {
      setServingId(null)
    }
  }

  async function handleLogout() {
    await clearSession()
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }]
    })
  }

  function renderRequest({ item }) {
    const structureName =
      item.structure_name ||
      item.structure?.name ||
      item.company_name ||
      'Structure non renseignée'

    const structureCode =
      item.structure_code ||
      item.structure?.structure_code ||
      '---'

    const driverName =
      item.driver_name ||
      item.driver?.name ||
      'Chauffeur non renseigné'

    const truckNumber =
      item.truck_number ||
      item.driver?.truck_number ||
      '---'

    const approvedLiters = item.approved_liters || item.requested_liters || 0

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.structureName}>{structureName}</Text>
            <Text style={styles.structureCode}>Code : {structureCode}</Text>
          </View>

          <View style={styles.statusPill}>
            <Text style={styles.statusText}>À servir</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Chauffeur : {driverName}</Text>
          <Text style={styles.infoText}>Camion : {truckNumber}</Text>
          <Text style={styles.infoText}>Carburant : {item.fuel_type || 'Non renseigné'}</Text>
          <Text style={styles.infoStrong}>Quantité validée : {approvedLiters} L</Text>
        </View>

        <Text style={styles.label}>Quantité réellement servie</Text>
        <TextInput
          {...INPUT_PROPS}
          value={servedLitersById[item.id] || ''}
          onChangeText={(value) => updateServedLiters(item.id, value)}
          placeholder="Ex : 40"
          keyboardType="numeric"
          style={styles.input}
        />

        <Text style={styles.label}>Montant réel</Text>
        <TextInput
          {...INPUT_PROPS}
          value={amountById[item.id] || ''}
          onChangeText={(value) => updateAmount(item.id, value)}
          placeholder="Ex : 32000"
          keyboardType="numeric"
          style={styles.input}
        />

        <TouchableOpacity
          style={[styles.serveButton, servingId === item.id && styles.disabledButton]}
          onPress={() => handleServe(item)}
          disabled={servingId === item.id}
        >
          {servingId === item.id ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.serveButtonText}>Valider le service</Text>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  function renderHeader() {
    return (
      <View>
        <View style={styles.hero}>
          <View>
            <Text style={styles.badge}>Espace pompiste</Text>
            <Text style={styles.title}>{session?.stationName || 'Ma station'}</Text>
            <Text style={styles.subtitle}>
              Connecté : {session?.name || 'Pompiste'}
            </Text>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{todayStats.count}</Text>
            <Text style={styles.statLabel}>À servir</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{todayStats.liters}</Text>
            <Text style={styles.statLabel}>Litres validés</Text>
          </View>
        </View>

        <View style={styles.searchCard}>
          <Text style={styles.sectionTitle}>Rechercher une demande</Text>
          <TextInput
            {...INPUT_PROPS}
            value={search}
            onChangeText={setSearch}
            placeholder="Structure, code, chauffeur ou camion"
            style={styles.input}
          />
        </View>

        <Text style={styles.listTitle}>Demandes en attente station</Text>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={filteredRequests}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderRequest}
      ListHeaderComponent={renderHeader}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadDashboard} />
      }
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Aucune demande à servir</Text>
          <Text style={styles.emptyText}>
            Les demandes validées par les chefs pour cette station apparaîtront ici.
          </Text>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  hero: {
    backgroundColor: '#061A2F',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16
  },
  badge: {
    color: '#FDE68A',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8
  },
  title: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900'
  },
  subtitle: {
    color: '#CBD5E1',
    marginTop: 8,
    fontWeight: '700'
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 16
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '900'
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1EAF3'
  },
  statValue: {
    color: '#B45309',
    fontSize: 24,
    fontWeight: '900'
  },
  statLabel: {
    color: '#64748B',
    marginTop: 4,
    fontWeight: '800'
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E1EAF3'
  },
  sectionTitle: {
    color: '#071C33',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12
  },
  listTitle: {
    color: '#071C33',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E1EAF3'
  },
  requestTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12
  },
  structureName: {
    color: '#071C33',
    fontSize: 18,
    fontWeight: '900'
  },
  structureCode: {
    color: '#64748B',
    fontWeight: '800',
    marginTop: 4
  },
  statusPill: {
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  statusText: {
    color: '#92400E',
    fontWeight: '900',
    fontSize: 12
  },
  infoBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  infoText: {
    color: '#475569',
    fontWeight: '700',
    marginBottom: 5
  },
  infoStrong: {
    color: '#92400E',
    fontWeight: '900',
    marginTop: 4
  },
  label: {
    color: '#071C33',
    fontWeight: '900',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#071C33',
    fontWeight: '800',
    marginBottom: 12
  },
  serveButton: {
    backgroundColor: '#B45309',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center'
  },
  disabledButton: {
    opacity: 0.65
  },
  serveButtonText: {
    color: '#FFFFFF',
    fontWeight: '900'
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1EAF3'
  },
  emptyTitle: {
    color: '#071C33',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '700'
  }
})