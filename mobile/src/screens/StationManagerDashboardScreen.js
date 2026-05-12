import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api, getStoredSession } from '../api/client'

export default function StationManagerDashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('suivi')

  const [station, setStation] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [pumpAttendants, setPumpAttendants] = useState([])

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pinCode, setPinCode] = useState('')

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

      setStation({
        id: stationId,
        name: session?.stationName || session?.station_name || 'Ma station',
        station_code: session?.stationCode || session?.station_code
      })

      const [transactionsResponse, attendantsResponse] = await Promise.all([
        api.get('/station/transactions'),
        api.get('/station/pump-attendants')
      ])

      const transactionData = transactionsResponse?.data?.data || []
      const attendantData =
        attendantsResponse?.data?.data?.pump_attendants ||
        attendantsResponse?.data?.pump_attendants ||
        []

      setTransactions(Array.isArray(transactionData) ? transactionData : [])
      setPumpAttendants(Array.isArray(attendantData) ? attendantData : [])
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        'Impossible de charger le tableau de bord station.'

      Alert.alert('Erreur', message)
    } finally {
      setLoading(false)
    }
  }

  async function createPumpAttendant() {
    try {
      if (!name.trim()) {
        Alert.alert('Nom obligatoire', 'Entre le nom du pompiste.')
        return
      }

      if (!pinCode.trim()) {
        Alert.alert('PIN obligatoire', 'Entre le PIN du pompiste.')
        return
      }

      if (!/^[0-9]{4,8}$/.test(pinCode.trim())) {
        Alert.alert('PIN invalide', 'Le PIN doit contenir entre 4 et 8 chiffres.')
        return
      }

      setSaving(true)

      await api.post('/station/pump-attendants', {
        name: name.trim(),
        phone: phone.trim() || null,
        pin_code: pinCode.trim()
      })

      setName('')
      setPhone('')
      setPinCode('')

      Alert.alert('Succès', 'Pompiste créé avec succès.')
      await loadDashboard()
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        'Impossible de créer le pompiste.'

      Alert.alert('Erreur', message)
    } finally {
      setSaving(false)
    }
  }

  async function logout() {
    try {
      await AsyncStorage.clear()

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }]
      })
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de se déconnecter.')
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
        .map((item) => item.structure_id || item.structure_name)
        .filter(Boolean)
    ).size

    return {
      totalTransactions,
      totalLiters,
      totalAmount,
      uniqueStructures,
      pumpAttendants: pumpAttendants.length
    }
  }, [transactions, pumpAttendants])

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
        <Text style={styles.headerSmall}>RESPONSABLE STATION</Text>
        <Text style={styles.headerTitle}>{station?.name || 'Ma station'}</Text>

        <Text style={styles.headerText}>
          Gestion des pompistes et suivi des transactions de la station.
        </Text>

        <View style={styles.stationCodeBox}>
          <Text style={styles.stationCodeLabel}>CODE STATION</Text>
          <Text style={styles.stationCodeValue}>
            {station?.station_code || '---'}
          </Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'suivi' && styles.tabButtonActive]}
          onPress={() => setActiveTab('suivi')}
        >
          <Text style={[styles.tabText, activeTab === 'suivi' && styles.tabTextActive]}>
            Suivi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'admin' && styles.tabButtonActive]}
          onPress={() => setActiveTab('admin')}
        >
          <Text style={[styles.tabText, activeTab === 'admin' && styles.tabTextActive]}>
            Administration
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'suivi' ? (
        <>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={loadDashboard}>
              <Text style={styles.actionButtonText}>Actualiser</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Text style={styles.logoutButtonText}>Déconnexion</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <StatCard label="Transactions" value={stats.totalTransactions} />
            <StatCard label="Litres servis" value={formatLiters(stats.totalLiters)} />
            <StatCard label="Montant total" value={formatMoney(stats.totalAmount)} />
            <StatCard label="Structures" value={stats.uniqueStructures} />
            <StatCard label="Pompistes" value={stats.pumpAttendants} />
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
        </>
      ) : (
        <>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Créer un pompiste</Text>
            <Text style={styles.sectionText}>
              Le pompiste utilisera son PIN pour accéder aux demandes validées de cette station.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nom du pompiste"
              placeholderTextColor="#64748B"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={styles.input}
              placeholder="Téléphone du pompiste"
              placeholderTextColor="#64748B"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <TextInput
              style={styles.input}
              placeholder="PIN pompiste, ex : 1234"
              placeholderTextColor="#64748B"
              value={pinCode}
              onChangeText={setPinCode}
              keyboardType="number-pad"
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.createButton, saving && styles.disabledButton]}
              onPress={createPumpAttendant}
              disabled={saving}
            >
              <Text style={styles.createButtonText}>
                {saving ? 'Création...' : 'Créer le pompiste'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pompistes de la station</Text>

            {!pumpAttendants.length ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Aucun pompiste</Text>
                <Text style={styles.emptyText}>
                  Crée un pompiste pour qu’il puisse servir les demandes validées.
                </Text>
              </View>
            ) : null}

            {pumpAttendants.map((item) => (
              <PumpAttendantCard key={String(item.id)} item={item} />
            ))}
          </View>
        </>
      )}
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

function PumpAttendantCard({ item }) {
  return (
    <View style={styles.personCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {String(item.name || 'P').charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.personName}>{item.name || 'Pompiste'}</Text>
        <Text style={styles.personMeta}>
          {item.phone || 'Téléphone non renseigné'}
        </Text>
      </View>

      <View style={styles.activePill}>
        <Text style={styles.activeText}>Actif</Text>
      </View>
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

  const attendantName =
    item.pump_attendant?.name ||
    item.pump_attendant_name ||
    'Pompiste non renseigné'

  const liters = item.served_liters || item.quantity_liters || 0
  const amount = item.final_amount || item.total_amount || item.amount || 0

  return (
    <View style={styles.transactionCard}>
      <View style={styles.transactionTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.transactionTitle}>{structureName}</Text>
          <Text style={styles.transactionSub}>{driverName}</Text>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>Servie</Text>
        </View>
      </View>

      <View style={styles.transactionLine}>
        <Text style={styles.transactionMeta}>Pompiste</Text>
        <Text style={styles.transactionValue}>{attendantName}</Text>
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

      {item.served_at || item.created_at ? (
        <Text style={styles.dateText}>
          {new Date(item.served_at || item.created_at).toLocaleString('fr-FR')}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF6FB'
  },

  content: {
    padding: 16,
    paddingBottom: 40
  },

  center: {
    flex: 1,
    backgroundColor: '#EEF6FB',
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
    backgroundColor: '#002B45',
    borderRadius: 26,
    padding: 22,
    marginBottom: 16
  },

  headerSmall: {
    color: '#A7F3D0',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 8
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900'
  },

  headerText: {
    color: '#D6E4F0',
    marginTop: 10,
    lineHeight: 21,
    fontWeight: '700'
  },

  stationCodeBox: {
    backgroundColor: '#013A5C',
    borderRadius: 18,
    padding: 14,
    marginTop: 16
  },

  stationCodeLabel: {
    color: '#9DB8CA',
    fontWeight: '900',
    fontSize: 12
  },

  stationCodeValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#DDECF6',
    borderRadius: 18,
    padding: 5,
    marginBottom: 16
  },

  tabButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },

  tabButtonActive: {
    backgroundColor: '#002B45'
  },

  tabText: {
    color: '#48657A',
    fontWeight: '900'
  },

  tabTextActive: {
    color: '#FFFFFF'
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },

  actionButton: {
    flex: 1,
    backgroundColor: '#0F766E',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center'
  },

  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '900'
  },

  logoutButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center'
  },

  logoutButtonText: {
    color: '#B91C1C',
    fontWeight: '900'
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18
  },

  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D2E3EF'
  },

  statValue: {
    color: '#002B45',
    fontSize: 21,
    fontWeight: '900'
  },

  statLabel: {
    color: '#526D82',
    marginTop: 5,
    fontWeight: '800'
  },

  section: {
    marginTop: 4
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D2E3EF',
    marginBottom: 18
  },

  sectionTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8
  },

  sectionText: {
    color: '#526D82',
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 14
  },

  input: {
    backgroundColor: '#F8FBFD',
    borderWidth: 1,
    borderColor: '#C9DCEB',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 12,
    color: '#0F172A',
    fontWeight: '800'
  },

  createButton: {
    backgroundColor: '#0F766E',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4
  },

  disabledButton: {
    opacity: 0.6
  },

  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '900'
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D2E3EF'
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

  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D2E3EF',
    gap: 12
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center'
  },

  avatarText: {
    color: '#002B45',
    fontWeight: '900',
    fontSize: 18
  },

  personName: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 16
  },

  personMeta: {
    color: '#64748B',
    fontWeight: '700',
    marginTop: 3
  },

  activePill: {
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },

  activeText: {
    color: '#0F766E',
    fontWeight: '900',
    fontSize: 12
  },

  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D2E3EF'
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
    marginTop: 6,
    gap: 12
  },

  transactionMeta: {
    color: '#64748B',
    fontWeight: '700'
  },

  transactionValue: {
    color: '#0F172A',
    fontWeight: '900',
    flexShrink: 1,
    textAlign: 'right'
  },

  dateText: {
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: 12,
    fontSize: 12
  }
})