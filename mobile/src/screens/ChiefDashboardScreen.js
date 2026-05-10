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
  api,
  rejectFuelRequest,
  fetchFuelRequests,
  fetchStructureUsers,
  createDriverUser,
  updateUser,
  deactivateUser,
  updateStructure,
  getStoredSession,
  clearSession
} from '../api/client'

const INPUT_PROPS = {
  placeholderTextColor: '#64748B',
  selectionColor: '#0F766E',
  cursorColor: '#0F766E'
}

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
  const [activeTab, setActiveTab] = useState('requests')

  const [session, setSession] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [partnerStations, setPartnerStations] = useState([])
  const [selectedStationByRequest, setSelectedStationByRequest] = useState({})

  const [creatingDriver, setCreatingDriver] = useState(false)
  const [savingStructure, setSavingStructure] = useState(false)

  const [structureName, setStructureName] = useState('')
  const [structureCode, setStructureCode] = useState('')

  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  const [driverTruck, setDriverTruck] = useState('')
  const [driverPin, setDriverPin] = useState('')

  const [editingUserId, setEditingUserId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [editingPhone, setEditingPhone] = useState('')
  const [editingTruck, setEditingTruck] = useState('')
  const [editingPin, setEditingPin] = useState('')

  useFocusEffect(
    useCallback(() => {
      loadAll()
    }, [activeStatus])
  )

  async function loadAll() {
    try {
      setLoading(true)

      const storedSession = await getStoredSession()
      setSession(storedSession || null)

      const status = activeStatus === 'all' ? undefined : activeStatus
      const structureId = storedSession?.structureId || storedSession?.structure_id

      const [requestsRes, driversRes, partnersRes] = await Promise.all([
        fetchFuelRequests(status),
        structureId
          ? fetchStructureUsers(structureId, 'driver')
          : Promise.resolve({ data: { users: [] } }),
        structureId
          ? api.get(`/structures/${structureId}/partner-stations`)
          : Promise.resolve({ data: { data: [] } })
      ])

      setRequests(requestsRes?.data || [])
      setDrivers(driversRes?.data?.users || [])
      setPartnerStations(partnersRes?.data?.data || [])

      setStructureName(storedSession?.structureName || '')
      setStructureCode(storedSession?.structureCode || '')
    } catch (error) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message ||
          error?.message ||
          'Impossible de charger le tableau de bord du chef.'
      )
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
      Alert.alert(
        'Erreur',
        error?.response?.data?.message ||
          error?.message ||
          'Impossible d’actualiser les demandes.'
      )
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
    const stationId = selectedStationByRequest[item.id]

    if (!stationId) {
      Alert.alert(
        'Station obligatoire',
        'Choisis d’abord la station partenaire qui va servir cette demande.'
      )
      return
    }

    try {
      setLoading(true)

      await api.patch(`/fuel-requests/${item.id}/approve`, {
        approved_liters: item.requested_liters,
        station_id: stationId
      })

      Alert.alert('Succès', 'Demande validée et envoyée à la station.')
      setSelectedStationByRequest((prev) => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })
      await loadAll()
    } catch (error) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message ||
          error?.message ||
          'Impossible de valider la demande.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleReject(item) {
    try {
      setLoading(true)
      await rejectFuelRequest(item.id)
      Alert.alert('Succès', 'Demande refusée.')
      await loadAll()
    } catch (error) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message ||
          error?.message ||
          'Impossible de refuser la demande.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateDriver() {
    const structureId = session?.structureId || session?.structure_id

    if (!structureId) {
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

    if (!driverPin.trim()) {
      Alert.alert('Champ manquant', 'Entre le code PIN du chauffeur.')
      return
    }

    try {
      setCreatingDriver(true)

      await createDriverUser({
        structure_id: structureId,
        name: driverName.trim(),
        phone: driverPhone.trim() || null,
        truck_number: driverTruck.trim().toUpperCase(),
        pin_code: driverPin.trim()
      })

      Alert.alert('Succès', 'Chauffeur créé avec succès.')
      setDriverName('')
      setDriverPhone('')
      setDriverTruck('')
      setDriverPin('')
      await loadAll()
    } catch (error) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message ||
          error?.message ||
          'Impossible de créer le chauffeur.'
      )
    } finally {
      setCreatingDriver(false)
    }
  }

  async function handleSaveStructure() {
    const structureId = session?.structureId || session?.structure_id

    if (!structureId) {
      Alert.alert('Erreur', 'Structure introuvable.')
      return
    }

    if (!structureName.trim()) {
      Alert.alert('Champ manquant', 'Entre le nom de la structure.')
      return
    }

    if (!structureCode.trim()) {
      Alert.alert('Champ manquant', 'Entre le code structure.')
      return
    }

    try {
      setSavingStructure(true)

      const response = await updateStructure(structureId, {
        name: structureName.trim(),
        structure_code: structureCode.trim().toUpperCase()
      })

      const updated = response?.data

      const nextSession = {
        ...session,
        structureName: updated?.name || structureName.trim(),
        structureCode: updated?.structure_code || structureCode.trim().toUpperCase()
      }

      setSession(nextSession)
      setStructureName(nextSession.structureName)
      setStructureCode(nextSession.structureCode)

      Alert.alert('Succès', 'Structure mise à jour.')
    } catch (error) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message ||
          error?.message ||
          'Impossible de mettre à jour la structure.'
      )
    } finally {
      setSavingStructure(false)
    }
  }

  function startEditUser(user) {
    setEditingUserId(user.id)
    setEditingName(user.name || '')
    setEditingPhone(user.phone || '')
    setEditingTruck(user.truck_number || '')
    setEditingPin('')
  }

  function cancelEditUser() {
    setEditingUserId(null)
    setEditingName('')
    setEditingPhone('')
    setEditingTruck('')
    setEditingPin('')
  }

  async function handleSaveUser(user) {
    try {
      const payload = {
        name: editingName.trim(),
        phone: editingPhone.trim() || null,
        truck_number: editingTruck.trim().toUpperCase()
      }

      if (editingPin.trim()) {
        payload.pin_code = editingPin.trim()
      }

      await updateUser(user.id, payload)
      Alert.alert('Succès', 'Chauffeur mis à jour.')
      cancelEditUser()
      await loadAll()
    } catch (error) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message ||
          error?.message ||
          'Impossible de modifier ce chauffeur.'
      )
    }
  }

  async function handleDeleteUser(user) {
    try {
      await deactivateUser(user.id)
      Alert.alert('Succès', 'Chauffeur supprimé de la structure.')
      if (editingUserId === user.id) cancelEditUser()
      await loadAll()
    } catch (error) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message ||
          error?.message ||
          'Impossible de supprimer ce chauffeur.'
      )
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

  function renderStatusChip(item) {
    const isActive = activeStatus === item.key

    return (
      <TouchableOpacity
        key={item.key}
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={() => setActiveStatus(item.key)}
      >
        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    )
  }

  function renderStationChoice(request) {
    if (request.status !== 'pending') {
      const stationName =
        request.station_name ||
        request.station?.name ||
        request.station_code ||
        null

      return stationName ? (
        <Text style={styles.stationInfo}>Station : {stationName}</Text>
      ) : null
    }

    if (!partnerStations.length) {
      return (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Aucune station partenaire. Ajoute d’abord une station partenaire avant de valider.
          </Text>
        </View>
      )
    }

    return (
      <View style={styles.stationChoiceBox}>
        <Text style={styles.stationChoiceTitle}>Choisir la station à servir</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {partnerStations.map((station) => {
            const stationId = station.id || station.station_id
            const selected = selectedStationByRequest[request.id] === stationId

            return (
              <TouchableOpacity
                key={String(stationId)}
                style={[styles.stationChip, selected && styles.stationChipActive]}
                onPress={() =>
                  setSelectedStationByRequest((prev) => ({
                    ...prev,
                    [request.id]: stationId
                  }))
                }
              >
                <Text
                  style={[
                    styles.stationChipText,
                    selected && styles.stationChipTextActive
                  ]}
                >
                  {station.name || station.station_name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>
    )
  }

  function renderRequestItem({ item }) {
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={{ flex: 1 }}>
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

        {renderStationChoice(item)}

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

  function renderRequestsHeader() {
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Demandes carburant</Text>

        <TouchableOpacity
          style={styles.partnerButton}
          onPress={() => navigation.navigate('PartnerStations')}
        >
          <Text style={styles.partnerButtonText}>Gérer les stations partenaires</Text>
        </TouchableOpacity>

        <TextInput
          {...INPUT_PROPS}
          style={styles.input}
          placeholder="Filtrer par chauffeur"
          value={driverFilter}
          onChangeText={setDriverFilter}
        />

        <TextInput
          {...INPUT_PROPS}
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
    )
  }

  function renderUserCard(user) {
    const isEditing = editingUserId === user.id

    return (
      <View key={`driver-${user.id}`} style={styles.userCard}>
        {isEditing ? (
          <>
            <TextInput
              {...INPUT_PROPS}
              style={styles.input}
              placeholder="Nom"
              value={editingName}
              onChangeText={setEditingName}
            />

            <TextInput
              {...INPUT_PROPS}
              style={styles.input}
              placeholder="Téléphone"
              value={editingPhone}
              onChangeText={setEditingPhone}
              keyboardType="phone-pad"
            />

            <TextInput
              {...INPUT_PROPS}
              style={styles.input}
              placeholder="Numéro du camion"
              value={editingTruck}
              onChangeText={setEditingTruck}
              autoCapitalize="characters"
            />

            <TextInput
              {...INPUT_PROPS}
              style={styles.input}
              placeholder="Nouveau code PIN optionnel"
              value={editingPin}
              onChangeText={setEditingPin}
              keyboardType="numeric"
              secureTextEntry
            />

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={cancelEditUser}
              >
                <Text style={styles.actionButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleSaveUser(user)}
              >
                <Text style={styles.actionButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.userName}>{user.name}</Text>
            {!!user.phone && <Text style={styles.userMeta}>Tél : {user.phone}</Text>}
            <Text style={styles.userMeta}>
              {user.truck_number ? `Camion ${user.truck_number}` : 'Sans camion'}
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => startEditUser(user)}
              >
                <Text style={styles.actionButtonText}>Modifier</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteUser(user)}
              >
                <Text style={styles.actionButtonText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    )
  }

  function renderAdminBlock() {
    return (
      <View>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Paramètres structure</Text>

          <TextInput
            {...INPUT_PROPS}
            style={styles.input}
            placeholder="Nom de la structure"
            value={structureName}
            onChangeText={setStructureName}
          />

          <TextInput
            {...INPUT_PROPS}
            style={styles.input}
            placeholder="Code structure"
            value={structureCode}
            onChangeText={(value) => setStructureCode(value.toUpperCase())}
            autoCapitalize="characters"
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSaveStructure}
            disabled={savingStructure}
          >
            {savingStructure ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Mettre à jour la structure</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Stations partenaires</Text>

          <Text style={styles.helpText}>
            Le chef ne crée plus les pompistes. Il choisit les stations avec lesquelles sa société travaille.
          </Text>

          <TouchableOpacity
            style={styles.partnerButton}
            onPress={() => navigation.navigate('PartnerStations')}
          >
            <Text style={styles.partnerButtonText}>Ouvrir les stations partenaires</Text>
          </TouchableOpacity>

          {session?.role === 'admin' || session?.role === 'super_admin' ? (
            <TouchableOpacity
              style={styles.adminStationButton}
              onPress={() => navigation.navigate('StationAdmin')}
            >
              <Text style={styles.partnerButtonText}>Admin : créer stations / pompistes</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Créer un chauffeur</Text>

          <TextInput
            {...INPUT_PROPS}
            style={styles.input}
            placeholder="Nom du chauffeur"
            value={driverName}
            onChangeText={setDriverName}
          />

          <TextInput
            {...INPUT_PROPS}
            style={styles.input}
            placeholder="Téléphone du chauffeur"
            value={driverPhone}
            onChangeText={setDriverPhone}
            keyboardType="phone-pad"
          />

          <TextInput
            {...INPUT_PROPS}
            style={styles.input}
            placeholder="Numéro du camion"
            value={driverTruck}
            onChangeText={setDriverTruck}
            autoCapitalize="characters"
          />

          <TextInput
            {...INPUT_PROPS}
            style={styles.input}
            placeholder="Code PIN chauffeur"
            value={driverPin}
            onChangeText={setDriverPin}
            keyboardType="numeric"
            secureTextEntry
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
          <Text style={styles.sectionTitle}>Chauffeurs ({drivers.length})</Text>
          {drivers.length ? (
            drivers.map(renderUserCard)
          ) : (
            <Text style={styles.emptyText}>Aucun chauffeur créé pour le moment.</Text>
          )}
        </View>
      </View>
    )
  }

  function renderTopHeader() {
    return (
      <View style={styles.topHeaderWrap}>
        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroTitle}>
              {session?.structureName || 'Espace chef'}
            </Text>
            <Text style={styles.heroSubtitle}>
              Gère ta structure, tes chauffeurs, tes stations partenaires et les demandes carburant.
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
            Donne ce code aux chauffeurs. Les pompistes utilisent maintenant le code de leur station.
          </Text>
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'requests' && styles.tabButtonActive]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'requests' && styles.tabButtonTextActive]}>
              Demandes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'admin' && styles.tabButtonActive]}
            onPress={() => setActiveTab('admin')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'admin' && styles.tabButtonTextActive]}>
              Administratif
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'requests' ? renderRequestsHeader() : renderAdminBlock()}
      </View>
    )
  }

  return (
    <FlatList
      data={activeTab === 'requests' ? filteredRequests : []}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderRequestItem}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshRequests} />}
      ListHeaderComponent={renderTopHeader()}
      ListEmptyComponent={
        activeTab === 'requests' ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Aucune demande trouvée</Text>
            <Text style={styles.emptyText}>
              Les demandes des chauffeurs de ta structure apparaîtront ici.
            </Text>
          </View>
        ) : null
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
    backgroundColor: 'transparent'
  },
  listContent: {
    padding: 16,
    paddingBottom: 40
  },
  topHeaderWrap: {
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
  tabsRow: {
    flexDirection: 'row',
    marginBottom: 16
  },
  tabButton: {
    flex: 1,
    backgroundColor: '#EEF3F8',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  tabButtonActive: {
    backgroundColor: '#081B33'
  },
  tabButtonText: {
    color: '#516173',
    fontWeight: '800',
    fontSize: 14
  },
  tabButtonTextActive: {
    color: '#FFFFFF'
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
  partnerButton: {
    backgroundColor: '#0F766E',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  adminStationButton: {
    backgroundColor: '#081B33',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  partnerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900'
  },
  helpText: {
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: 12
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
  stationInfo: {
    color: '#0F766E',
    fontWeight: '900',
    marginBottom: 12
  },
  stationChoiceBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12
  },
  stationChoiceTitle: {
    color: '#064E3B',
    fontWeight: '900',
    marginBottom: 10
  },
  stationChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8
  },
  stationChipActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E'
  },
  stationChipText: {
    color: '#0F172A',
    fontWeight: '900'
  },
  stationChipTextActive: {
    color: '#FFFFFF'
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12
  },
  warningText: {
    color: '#92400E',
    fontWeight: '800',
    lineHeight: 20
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
  editButton: {
    backgroundColor: '#2563EB',
    marginRight: 8
  },
  deleteButton: {
    backgroundColor: '#B91C1C',
    marginLeft: 8
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  userCard: {
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