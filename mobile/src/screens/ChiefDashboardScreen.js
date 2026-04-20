import { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import {
  approveFuelRequest,
  rejectFuelRequest,
  fetchFuelRequests,
  fetchStructureUsers,
  createDriverUser,
  createPumpAttendantUser,
  getStoredSession,
  clearSession
} from '../api/client'

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

  const [session, setSession] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [pumpAttendants, setPumpAttendants] = useState([])

  const [creatingDriver, setCreatingDriver] = useState(false)
  const [creatingPump, setCreatingPump] = useState(false)

  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  const [driverTruck, setDriverTruck] = useState('')

  const [pumpName, setPumpName] = useState('')
  const [pumpPhone, setPumpPhone] = useState('')
  const [pumpPin, setPumpPin] = useState('')

  useFocusEffect(
    useCallback(() => {
      loadAll()
    }, [])
  )

  async function loadAll() {
    try {
      setLoading(true)

      const storedSession = await getStoredSession()
      setSession(storedSession || null)

      const status = activeStatus === 'all' ? undefined : activeStatus

      const [requestsRes, driversRes, pumpsRes] = await Promise.all([
        fetchFuelRequests(status),
        storedSession?.structureId
          ? fetchStructureUsers(storedSession.structureId, 'driver')
          : Promise.resolve({ data: { users: [] } }),
        storedSession?.structureId
          ? fetchStructureUsers(storedSession.structureId, 'pump_attendant')
          : Promise.resolve({ data: { users: [] } })
      ])

      setRequests(requestsRes?.data || [])
      setDrivers(driversRes?.data?.users || [])
      setPumpAttendants(pumpsRes?.data?.users || [])
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Impossible de charger le tableau de bord du chef.'
      Alert.alert('Erreur', message)
    } finally {
      setLoading(false)
    }
  }

  async function refreshRequests() {
    try {
      setLoading(true)
      const status = activeStatus === 'all' ? undefined : activeStatus
      const response = await fetchFuelRequests(status)
      setRequests(response?.data || [])
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Impossible d’actualiser les demandes.'
      Alert.alert('Erreur', message)
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      const matchesDriver = driverFilter.trim()
        ? (item.driver_name || '')
            .toLowerCase()
            .includes(driverFilter.trim().toLowerCase())
        : true

      const matchesTruck = truckFilter.trim()
        ? (item.truck_number || '')
            .toLowerCase()
            .includes(truckFilter.trim().toLowerCase())
        : true

      return matchesDriver && matchesTruck
    })
  }, [requests, driverFilter, truckFilter])

  async function handleApprove(item) {
    Alert.alert(
      'Valider la demande',
      `Valider ${item.requested_liters} L pour ${item.driver_name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider',
          onPress: async () => {
            try {
              await approveFuelRequest(item.id, item.requested_liters)
              Alert.alert('Succès', 'Demande validée avec succès.')
              await loadAll()
            } catch (error) {
              const message =
                error?.response?.data?.message ||
                error?.message ||
                'Impossible de valider la demande.'
              Alert.alert('Erreur', message)
            }
          }
        }
      ]
    )
  }

  async function handleReject(item) {
    Alert.alert(
      'Refuser la demande',
      `Refuser la demande de ${item.driver_name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectFuelRequest(item.id)
              Alert.alert('Succès', 'Demande refusée.')
              await loadAll()
            } catch (error) {
              const message =
                error?.response?.data?.message ||
                error?.message ||
                'Impossible de refuser la demande.'
              Alert.alert('Erreur', message)
            }
          }
        }
      ]
    )
  }

  async function handleCreateDriver() {
    if (!session?.structureId) {
      Alert.alert('Erreur', 'Structure chef introuvable.')
      return
    }

    if (!driverName.trim()) {
      Alert.alert('Champ manquant', 'Entre le nom du chauffeur.')
      return
    }

    if (!driverTruck.trim()) {
      Alert.alert('Champ manquant', 'Entre le numéro du camion.')
      return
    }

    try {
      setCreatingDriver(true)

      await createDriverUser({
        structure_id: session.structureId,
        name: driverName.trim(),
        phone: driverPhone.trim() || null,
        truck_number: driverTruck.trim().toUpperCase()
      })

      Alert.alert('Succès', 'Chauffeur créé avec succès.')
      setDriverName('')
      setDriverPhone('')
      setDriverTruck('')
      await loadAll()
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Impossible de créer le chauffeur.'
      Alert.alert('Erreur', message)
    } finally {
      setCreatingDriver(false)
    }
  }

  async function handleCreatePump() {
    if (!session?.structureId) {
      Alert.alert('Erreur', 'Structure chef introuvable.')
      return
    }

    if (!pumpName.trim()) {
      Alert.alert('Champ manquant', 'Entre le nom du pompiste.')
      return
    }

    if (!pumpPin.trim()) {
      Alert.alert('Champ manquant', 'Entre le code PIN du pompiste.')
      return
    }

    try {
      setCreatingPump(true)

      await createPumpAttendantUser({
        structure_id: session.structureId,
        name: pumpName.trim(),
        phone: pumpPhone.trim() || null,
        pin_code: pumpPin.trim()
      })

      Alert.alert('Succès', 'Pompiste créé avec succès.')
      setPumpName('')
      setPumpPhone('')
      setPumpPin('')
      await loadAll()
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Impossible de créer le pompiste.'
      Alert.alert('Erreur', message)
    } finally {
      setCreatingPump(false)
    }
  }

  async function handleLogout() {
    Alert.alert(
      'Déconnexion',
      'Veux-tu vraiment quitter la session chef ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
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
        }
      ]
    )
  }

  function renderStatusChip(item) {
    const isActive = activeStatus === item.key

    return (
      <TouchableOpacity
        key={item.key}
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={async () => {
          setActiveStatus(item.key)
          try {
            setLoading(true)
            const status = item.key === 'all' ? undefined : item.key
            const response = await fetchFuelRequests(status)
            setRequests(response?.data || [])
          } catch (error) {
            const message =
              error?.response?.data?.message ||
              error?.message ||
              'Impossible de filtrer les demandes.'
            Alert.alert('Erreur', message)
          } finally {
            setLoading(false)
          }
        }}
      >
        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    )
  }

  function renderRequestItem({ item }) {
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View>
            <Text style={styles.requestDriver}>{item.driver_name}</Text>
            <Text style={styles.requestTruck}>{item.truck_number}</Text>
          </View>

          <View style={[styles.statusBadge, statusStyle(item.status)]}>
            <Text style={styles.statusBadgeText}>{statusLabel(item.status)}</Text>
          </View>
        </View>

        <View style={styles.requestGrid}>
          <Text style={styles.requestMeta}>Carburant : {item.fuel_type}</Text>
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
        </View>

        {item.status === 'pending' ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(item)}
            >
              <Text style={styles.actionButtonText}>Refuser</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(item)}
            >
              <Text style={styles.actionButtonText}>Valider</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    )
  }

  return (
    <FlatList
      data={filteredRequests}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderRequestItem}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refreshRequests} />
      }
      ListHeaderComponent={
        <ScrollView
          horizontal={false}
          contentContainerStyle={styles.headerContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View>
              <Text style={styles.heroTitle}>
                {session?.structureName || 'Espace chef'}
              </Text>
              <Text style={styles.heroSubtitle}>
                Gère ta structure, tes chauffeurs, tes pompistes et les demandes de carburant.
              </Text>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Déconnexion</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Code structure</Text>
            <Text style={styles.codeValue}>{session?.structureCode || '---'}</Text>
            <Text style={styles.codeHint}>
              Donne ce code aux chauffeurs et pompistes pour entrer dans ta structure.
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Créer un chauffeur</Text>

            <TextInput
              style={styles.input}
              placeholder="Nom du chauffeur"
              value={driverName}
              onChangeText={setDriverName}
            />

            <TextInput
              style={styles.input}
              placeholder="Téléphone du chauffeur"
              value={driverPhone}
              onChangeText={setDriverPhone}
              keyboardType="phone-pad"
            />

            <TextInput
              style={styles.input}
              placeholder="Numéro du camion"
              value={driverTruck}
              onChangeText={setDriverTruck}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreateDriver}
              disabled={creatingDriver}
            >
              {creatingDriver ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Ajouter le chauffeur</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Créer un pompiste</Text>

            <TextInput
              style={styles.input}
              placeholder="Nom du pompiste"
              value={pumpName}
              onChangeText={setPumpName}
            />

            <TextInput
              style={styles.input}
              placeholder="Téléphone du pompiste"
              value={pumpPhone}
              onChangeText={setPumpPhone}
              keyboardType="phone-pad"
            />

            <TextInput
              style={styles.input}
              placeholder="Code PIN pompiste"
              value={pumpPin}
              onChangeText={setPumpPin}
              keyboardType="numeric"
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreatePump}
              disabled={creatingPump}
            >
              {creatingPump ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Ajouter le pompiste</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Équipe</Text>

            <Text style={styles.groupTitle}>Chauffeurs ({drivers.length})</Text>
            {drivers.length ? (
              drivers.map((item) => (
                <View key={`driver-${item.id}`} style={styles.userRow}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userMeta}>
                    {item.truck_number ? `Camion ${item.truck_number}` : 'Sans camion'}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Aucun chauffeur créé pour le moment.</Text>
            )}

            <Text style={[styles.groupTitle, { marginTop: 16 }]}>
              Pompistes ({pumpAttendants.length})
            </Text>
            {pumpAttendants.length ? (
              pumpAttendants.map((item) => (
                <View key={`pump-${item.id}`} style={styles.userRow}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userMeta}>
                    {item.phone ? item.phone : 'Sans téléphone'}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Aucun pompiste créé pour le moment.</Text>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Demandes carburant</Text>

            <TextInput
              style={styles.input}
              placeholder="Filtrer par chauffeur"
              value={driverFilter}
              onChangeText={setDriverFilter}
            />

            <TextInput
              style={styles.input}
              placeholder="Filtrer par camion"
              value={truckFilter}
              onChangeText={setTruckFilter}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersRow}
            >
              {STATUSES.map(renderStatusChip)}
            </ScrollView>
          </View>
        </ScrollView>
      }
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Aucune demande trouvée</Text>
          <Text style={styles.emptyText}>
            Les demandes des chauffeurs de ta structure apparaîtront ici.
          </Text>
        </View>
      }
      contentContainerStyle={styles.listContent}
      style={styles.container}
    />
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
    backgroundColor: '#081B33',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8
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
  codeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  codeValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F766E',
    marginBottom: 8
  },
  codeHint: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5F6E7D'
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
    marginBottom: 12
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
    backgroundColor: '#0F766E',
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
  userRow: {
    borderWidth: 1,
    borderColor: '#E5ECF3',
    backgroundColor: '#FAFCFE',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#081B33'
  },
  userMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B'
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10
  },
  filtersRow: {
    paddingTop: 4,
    paddingBottom: 4
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#EEF3F8',
    marginRight: 10
  },
  filterChipActive: {
    backgroundColor: '#081B33'
  },
  filterChipText: {
    color: '#516173',
    fontWeight: '700'
  },
  filterChipTextActive: {
    color: '#FFFFFF'
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
  requestDriver: {
    fontSize: 17,
    fontWeight: '900',
    color: '#081B33'
  },
  requestTruck: {
    marginTop: 4,
    fontSize: 13,
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
  requestGrid: {
    marginBottom: 12
  },
  requestMeta: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 5
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rejectButton: {
    backgroundColor: '#DC2626',
    marginRight: 8
  },
  approveButton: {
    backgroundColor: '#0F766E',
    marginLeft: 8
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '800'
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