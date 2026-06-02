import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput
} from 'react-native'

import {
  adminCreateStructure,
  adminCreateStation
} from '../api/client'

const API_URL = 'https://backend-withered-sky-4709.fly.dev'

const INPUT_PROPS = {
  placeholderTextColor: '#64748B',
  selectionColor: '#0B3B75',
  cursorColor: '#0B3B75'
}

function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0))
}

function StatCard({ label, value, active, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.statCard, active && styles.statCardActive]}
      onPress={onPress}
    >
      <Text style={[styles.statValue, active && styles.statValueActive]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, active && styles.statLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

export default function SuperAdminDashboardScreen({ route, navigation }) {
  const token = route?.params?.token
  const admin = route?.params?.admin

  const [activeSection, setActiveSection] = useState('stations')

  const [summary, setSummary] = useState(null)
  const [stations, setStations] = useState([])
  const [structures, setStructures] = useState([])
  const [users, setUsers] = useState([])
  const [transactions, setTransactions] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [creatingStructure, setCreatingStructure] = useState(false)
  const [creatingStation, setCreatingStation] = useState(false)

  const [structureForm, setStructureForm] = useState({
    name: '',
    owner_name: '',
    owner_phone: '',
    owner_email: '',
    owner_password: '',
    structure_code: ''
  })

  const [stationForm, setStationForm] = useState({
    name: '',
    station_code: '',
    location: '',
    manager_name: '',
    manager_phone: '',
    email: '',
    pin_code: ''
  })

  const fetchWithAuth = useCallback(
    async (path) => {
      const res = await fetch(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
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
      Alert.alert('Session manquante', 'Reconnecte-toi.')
      navigation.replace('SuperAdminLogin')
      return
    }

    try {
      const [
        summaryData,
        stationsData,
        structuresData,
        usersData,
        transactionsData
      ] = await Promise.all([
        fetchWithAuth('/api/admin/summary'),
        fetchWithAuth('/api/admin/stations'),
        fetchWithAuth('/api/admin/structures'),
        fetchWithAuth('/api/admin/users'),
        fetchWithAuth('/api/admin/transactions')
      ])

      setSummary(summaryData)
      setStations(stationsData || [])
      setStructures(structuresData || [])
      setUsers(usersData || [])
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

  async function handleCreateStructure() {
    if (!structureForm.name.trim()) return Alert.alert('Champ requis', 'Nom structure requis.')
    if (!structureForm.owner_name.trim()) return Alert.alert('Champ requis', 'Nom chef requis.')
    if (!structureForm.owner_phone.trim()) return Alert.alert('Champ requis', 'Téléphone chef requis.')
    if (!structureForm.structure_code.trim()) return Alert.alert('Champ requis', 'Code structure requis.')
    if (!structureForm.owner_password.trim()) return Alert.alert('Champ requis', 'Mot de passe requis.')

    try {
      setCreatingStructure(true)

      await adminCreateStructure({
        name: structureForm.name.trim(),
        owner_name: structureForm.owner_name.trim(),
        owner_phone: structureForm.owner_phone.trim(),
        owner_email: structureForm.owner_email.trim().toLowerCase(),
        owner_password: structureForm.owner_password.trim(),
        structure_code: structureForm.structure_code.trim().toUpperCase()
      })

      Alert.alert('Succès', 'Structure et chef créés.')

      setStructureForm({
        name: '',
        owner_name: '',
        owner_phone: '',
        owner_email: '',
        owner_password: '',
        structure_code: ''
      })

      await loadData()
    } catch (error) {
      Alert.alert('Erreur', error?.response?.data?.message || error.message)
    } finally {
      setCreatingStructure(false)
    }
  }

  async function handleCreateStation() {
    if (!stationForm.name.trim()) return Alert.alert('Champ requis', 'Nom station requis.')
    if (!stationForm.station_code.trim()) return Alert.alert('Champ requis', 'Code station requis.')
    if (!stationForm.pin_code.trim()) return Alert.alert('Champ requis', 'PIN station requis.')

    try {
      setCreatingStation(true)

      await adminCreateStation({
        name: stationForm.name.trim(),
        station_code: stationForm.station_code.trim().toUpperCase(),
        location: stationForm.location.trim(),
        manager_name: stationForm.manager_name.trim(),
        manager_phone: stationForm.manager_phone.trim(),
        email: stationForm.email.trim().toLowerCase(),
        pin_code: stationForm.pin_code.trim()
      })

      Alert.alert('Succès', 'Station créée.')

      setStationForm({
        name: '',
        station_code: '',
        location: '',
        manager_name: '',
        manager_phone: '',
        email: '',
        pin_code: ''
      })

      await loadData()
    } catch (error) {
      Alert.alert('Erreur', error?.response?.data?.message || error.message)
    } finally {
      setCreatingStation(false)
    }
  }

  async function handleToggleStation(station) {
    try {
      const nextStatus = !station.is_active

      const res = await fetch(`${API_URL}/api/admin/station/${station.id}/active`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: nextStatus })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Impossible de modifier la station.')
      }

      Alert.alert('Succès', nextStatus ? 'Station réactivée.' : 'Station désactivée.')
      await loadData()
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de modifier la station.')
    }
  }

  function logout() {
    navigation.replace('Home')
  }

  const drivers = users.filter((u) => u.role === 'driver')
  const pumps = users.filter((u) => u.role === 'pump_attendant')
  const chiefs = users.filter((u) => u.role === 'chief')

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
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
  keyboardShouldPersistTaps="handled"
>
      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>SUPER ADMIN</Text>
          <Text style={styles.title}>Pilotage global</Text>
          <Text style={styles.subtitle}>
            {admin?.name || 'Super Admin'} · contrôle complet de la plateforme
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
          active={activeSection === 'structures'}
          onPress={() => setActiveSection('structures')}
        />
        <StatCard
          label="Stations"
          value={formatNumber(summary?.stations_count)}
          active={activeSection === 'stations'}
          onPress={() => setActiveSection('stations')}
        />
        <StatCard
          label="Chauffeurs"
          value={formatNumber(summary?.drivers_count)}
          active={activeSection === 'drivers'}
          onPress={() => setActiveSection('drivers')}
        />
        <StatCard
          label="Pompistes"
          value={formatNumber(summary?.pump_attendants_count)}
          active={activeSection === 'pumps'}
          onPress={() => setActiveSection('pumps')}
        />
        <StatCard
          label="Transactions"
          value={formatNumber(summary?.fuel_requests_count)}
          active={activeSection === 'transactions'}
          onPress={() => setActiveSection('transactions')}
        />
        <StatCard
          label="En attente"
          value={formatNumber(summary?.pending_requests_count)}
          active={activeSection === 'pending'}
          onPress={() => setActiveSection('pending')}
        />
      </View>

      <View style={styles.bigCard}>
        <Text style={styles.darkSectionTitle}>Carburant servi</Text>
        <Text style={styles.bigNumber}>{formatNumber(summary?.total_served_liters)} L</Text>
        <Text style={styles.bigSub}>
          Montant total : {formatNumber(summary?.total_amount)} F CFA
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Créer une structure / chef</Text>

        <TextInput {...INPUT_PROPS} style={styles.input} placeholder="Nom structure" value={structureForm.name} onChangeText={(v) => setStructureForm((p) => ({ ...p, name: v }))} />
        <TextInput {...INPUT_PROPS} style={styles.input} placeholder="Nom du chef" value={structureForm.owner_name} onChangeText={(v) => setStructureForm((p) => ({ ...p, owner_name: v }))} />
        <TextInput {...INPUT_PROPS} style={styles.input} placeholder="Téléphone chef" keyboardType="phone-pad" value={structureForm.owner_phone} onChangeText={(v) => setStructureForm((p) => ({ ...p, owner_phone: v }))} />
        <TextInput {...INPUT_PROPS} style={styles.input} placeholder="Email chef" keyboardType="email-address" autoCapitalize="none" value={structureForm.owner_email} onChangeText={(v) => setStructureForm((p) => ({ ...p, owner_email: v }))} />
        <TextInput {...INPUT_PROPS} style={styles.input} placeholder="Code structure" autoCapitalize="characters" value={structureForm.structure_code} onChangeText={(v) => setStructureForm((p) => ({ ...p, structure_code: v.toUpperCase() }))} />
        <TextInput {...INPUT_PROPS} style={styles.input} placeholder="Mot de passe chef" secureTextEntry value={structureForm.owner_password} onChangeText={(v) => setStructureForm((p) => ({ ...p, owner_password: v }))} />

        <TouchableOpacity style={[styles.createButton, creatingStructure && styles.disabledButton]} onPress={handleCreateStructure} disabled={creatingStructure}>
          {creatingStructure ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.createButtonText}>Créer structure</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Créer une station</Text>

        <TextInput {...INPUT_PROPS} style={styles.input} placeholder="Nom station" value={stationForm.name} onChangeText={(v) => setStationForm((p) => ({ ...p, name: v }))} />
        <TextInput {...INPUT_PROPS} style={styles.input} placeholder="Code station" autoCapitalize="characters" value={stationForm.station_code} onChangeText={(v) => setStationForm((p) => ({ ...p, station_code: v.toUpperCase() }))} />
        <TextInput {...INPUT_PROPS} style={styles.input} placeholder="Ville / localisation" value={stationForm.location} onChangeText={(v) => setStationForm((p) => ({ ...p, location: v }))} />
        <TextInput {...INPUT_PROPS} style={styles.input} placeholder="Responsable station" value={stationForm.manager_name} onChangeText={(v) => setStationForm((p) => ({ ...p, manager_name: v }))} />
        <TextInput {...INPUT_PROPS} style={styles.input} placeholder="Téléphone responsable" keyboardType="phone-pad" value={stationForm.manager_phone} onChangeText={(v) => setStationForm((p) => ({ ...p, manager_phone: v }))} />
        <TextInput {...INPUT_PROPS} style={styles.input} placeholder="Email responsable" keyboardType="email-address" autoCapitalize="none" value={stationForm.email} onChangeText={(v) => setStationForm((p) => ({ ...p, email: v }))} />
        <TextInput {...INPUT_PROPS} style={styles.input} placeholder="Mot de passe / PIN station" secureTextEntry value={stationForm.pin_code} onChangeText={(v) => setStationForm((p) => ({ ...p, pin_code: v }))} />

        <TouchableOpacity style={[styles.createButton, creatingStation && styles.disabledButton]} onPress={handleCreateStation} disabled={creatingStation}>
          {creatingStation ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.createButtonText}>Créer station</Text>}
        </TouchableOpacity>
      </View>

      {activeSection === 'structures' && (
        <>
          <SectionHeader title="Structures / chefs" count={structures.length} />
          {structures.map((structure) => {
            const chief = chiefs.find((u) => Number(u.structure_id) === Number(structure.id))
            return (
              <View key={structure.id} style={styles.listCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{structure.name}</Text>
                  <Text style={styles.listMeta}>Code : {structure.structure_code || '-'}</Text>
                  <Text style={styles.listMeta}>Chef : {chief?.name || structure.owner_name || '-'}</Text>
                  <Text style={styles.listMeta}>Téléphone : {chief?.phone || structure.owner_phone || '-'}</Text>
                </View>
              </View>
            )
          })}
        </>
      )}

      {activeSection === 'stations' && (
        <>
          <SectionHeader title="Stations" count={stations.length} />
          {stations.map((station) => (
            <View key={station.id} style={styles.listCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{station.name}</Text>
                <Text style={styles.listMeta}>Code : {station.station_code || '-'}</Text>
                <Text style={styles.listMeta}>Responsable : {station.manager_name || '-'}</Text>
              </View>

              <View>
                <View style={[styles.statusPill, station.is_active ? styles.statusActive : styles.statusInactive]}>
                  <Text style={[styles.statusText, station.is_active ? styles.statusTextActive : styles.statusTextInactive]}>
                    {station.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.smallDangerButton, !station.is_active && styles.smallSuccessButton]}
                  onPress={() => handleToggleStation(station)}
                >
                  <Text style={styles.smallButtonText}>
                    {station.is_active ? 'Désactiver' : 'Réactiver'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {activeSection === 'drivers' && (
        <>
          <SectionHeader title="Chauffeurs" count={drivers.length} />
          {drivers.map((driver) => (
            <View key={driver.id} style={styles.listCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{driver.name}</Text>
                <Text style={styles.listMeta}>Téléphone : {driver.phone || '-'}</Text>
                <Text style={styles.listMeta}>Structure : {driver.structure?.name || '-'}</Text>
                <Text style={styles.listMeta}>Camion : {driver.truck_number || '-'}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {activeSection === 'pumps' && (
        <>
          <SectionHeader title="Pompistes" count={pumps.length} />
          {pumps.map((pump) => (
            <View key={pump.id} style={styles.listCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{pump.name}</Text>
                <Text style={styles.listMeta}>Téléphone : {pump.phone || '-'}</Text>
                <Text style={styles.listMeta}>Station : {pump.station?.name || '-'}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {(activeSection === 'transactions' || activeSection === 'pending') && (
        <>
          <SectionHeader
            title={activeSection === 'pending' ? 'Transactions en attente' : 'Dernières transactions'}
            count={
              activeSection === 'pending'
                ? transactions.filter((tx) => tx.status === 'pending').length
                : transactions.length
            }
          />

          {(activeSection === 'pending'
            ? transactions.filter((tx) => tx.status === 'pending')
            : transactions
          ).slice(0, 50).map((tx) => (
            <View key={tx.id} style={styles.transactionCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>
                  {tx.driver?.name || tx.driver_name || 'Chauffeur'}
                </Text>
                <Text style={styles.listMeta}>Station : {tx.station?.name || tx.station_name || '-'}</Text>
                <Text style={styles.listMeta}>Statut : {tx.status || '-'}</Text>
              </View>

              <View style={styles.txRight}>
                <Text style={styles.txLiters}>
                  {formatNumber(tx.served_liters || tx.approved_liters || tx.requested_liters)} L
                </Text>
                <Text style={styles.txAmount}>{formatNumber(tx.amount)} F</Text>
              </View>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

function SectionHeader({ title, count }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#07172B' },
  content: {
    padding: 16,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center'
  },
  loadingPage: {
    flex: 1,
    backgroundColor: '#07172B',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: { marginTop: 12, color: '#FFFFFF', fontWeight: '700' },
  hero: {
    backgroundColor: '#0B2748',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12
  },
  eyebrow: { color: '#93C5FD', fontWeight: '900', fontSize: 12, letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#C9D8EA', fontSize: 13, marginTop: 6 },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999
  },
  logoutText: { color: '#0B2748', fontWeight: '900', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 10
  },
  statCardActive: { backgroundColor: '#DCEBFF' },
  statValue: { color: '#081B33', fontSize: 26, fontWeight: '900' },
  statValueActive: { color: '#0B3B75' },
  statLabel: { color: '#617085', fontWeight: '800', marginTop: 4 },
  statLabelActive: { color: '#0B3B75' },
  bigCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 20,
    marginTop: 6,
    marginBottom: 16
  },
  darkSectionTitle: { color: '#081B33', fontSize: 20, fontWeight: '900' },
  sectionTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  bigNumber: { color: '#081B33', fontSize: 36, fontWeight: '900', marginTop: 8 },
  bigSub: { color: '#617085', fontWeight: '800', marginTop: 4 },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16
  },
  formTitle: { color: '#081B33', fontSize: 18, fontWeight: '900', marginBottom: 14 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#D7E0EA',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    color: '#081B33',
    fontWeight: '700'
  },
  createButton: {
    backgroundColor: '#0B3B75',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center'
  },
  disabledButton: { opacity: 0.65 },
  createButtonText: { color: '#FFFFFF', fontWeight: '900' },
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
  listTitle: { color: '#081B33', fontSize: 16, fontWeight: '900' },
  listMeta: { color: '#64748B', fontSize: 13, marginTop: 3 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusInactive: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '900' },
  statusTextActive: { color: '#166534' },
  statusTextInactive: { color: '#991B1B' },
  smallDangerButton: {
    marginTop: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999
  },
  smallSuccessButton: { backgroundColor: '#DCFCE7' },
  smallButtonText: {
    color: '#081B33',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center'
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
  txRight: { alignItems: 'flex-end' },
  txLiters: { color: '#0B3B75', fontWeight: '900', fontSize: 16 },
  txAmount: { color: '#64748B', fontWeight: '800', fontSize: 12, marginTop: 4 }
})