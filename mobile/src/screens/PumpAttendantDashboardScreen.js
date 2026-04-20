import { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import {
  fetchFuelRequests,
  serveFuelRequest,
  getStoredSession,
  clearSession
} from '../api/client'

export default function PumpAttendantDashboardScreen({ navigation }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [servingId, setServingId] = useState(null)
  const [requests, setRequests] = useState([])
  const [servedValues, setServedValues] = useState({})

  useFocusEffect(
    useCallback(() => {
      loadPumpDashboard()
    }, [])
  )

  async function loadPumpDashboard() {
    try {
      setLoading(true)

      const storedSession = await getStoredSession()

      if (!storedSession?.token || storedSession?.role !== 'pump_attendant') {
        Alert.alert('Session expirée', 'Reconnecte-toi comme pompiste.')
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }]
        })
        return
      }

      setSession(storedSession)

      const response = await fetchFuelRequests('approved')
      setRequests(response?.data || [])
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Impossible de charger l’espace pompiste.'
      Alert.alert('Erreur', message)
    } finally {
      setLoading(false)
    }
  }

  async function handleServe(item) {
    const rawValue = servedValues[item.id]

    if (!rawValue?.trim()) {
      Alert.alert('Champ manquant', 'Entre la quantité réellement servie.')
      return
    }

    const liters = Number(rawValue)

    if (Number.isNaN(liters) || liters <= 0) {
      Alert.alert('Valeur invalide', 'Entre une quantité correcte.')
      return
    }

    if (liters > Number(item.approved_liters || 0)) {
      Alert.alert(
        'Quantité trop élevée',
        `Tu ne peux pas servir plus de ${item.approved_liters} L validés par le chef.`
      )
      return
    }

    Alert.alert(
      'Confirmer le service',
      `Confirmer ${liters} L servis pour ${item.driver_name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              setServingId(item.id)

              await serveFuelRequest(item.id, {
                served_liters: liters
              })

              Alert.alert('Succès', 'Le service a été confirmé.')

              setServedValues((prev) => ({
                ...prev,
                [item.id]: ''
              }))

              await loadPumpDashboard()
            } catch (error) {
              const message =
                error?.response?.data?.message ||
                error?.message ||
                'Impossible de confirmer le service.'
              Alert.alert('Erreur', message)
            } finally {
              setServingId(null)
            }
          }
        }
      ]
    )
  }

  async function handleLogout() {
    Alert.alert(
      'Déconnexion',
      'Veux-tu vraiment quitter la session pompiste ?',
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

  const stats = useMemo(() => {
    const total = requests.length
    const totalLiters = requests.reduce(
      (sum, item) => sum + Number(item.approved_liters || 0),
      0
    )

    return {
      total,
      totalLiters
    }
  }, [requests])

  function renderRequestItem({ item }) {
    const currentValue = servedValues[item.id] || ''
    const isServing = servingId === item.id

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.requestInfo}>
            <Text style={styles.driverName}>{item.driver_name}</Text>
            <Text style={styles.driverTruck}>{item.truck_number}</Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>VALIDÉE</Text>
          </View>
        </View>

        <View style={styles.metaBox}>
          <Text style={styles.metaText}>Carburant : {item.fuel_type}</Text>
          <Text style={styles.metaText}>
            Quantité validée : {item.approved_liters} L
          </Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder={`Servi (max ${item.approved_liters} L)`}
          keyboardType="numeric"
          value={currentValue}
          onChangeText={(value) => {
            setServedValues((prev) => ({
              ...prev,
              [item.id]: value
            }))
          }}
        />

        <TouchableOpacity
          style={[
            styles.confirmButton,
            isServing && styles.confirmButtonDisabled
          ]}
          onPress={() => handleServe(item)}
          disabled={isServing}
        >
          {isServing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirmer le service</Text>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <FlatList
      data={requests}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderRequestItem}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadPumpDashboard} />
      }
      ListHeaderComponent={
        <View style={styles.headerContainer}>
          <View style={styles.heroCard}>
            <View>
              <Text style={styles.heroTitle}>
                {session?.userName || 'Espace pompiste'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {session?.structureName || 'Structure'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>Déconnexion</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Demandes à servir</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalLiters} L</Text>
              <Text style={styles.statLabel}>Volume validé</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Demandes prêtes</Text>
            <Text style={styles.infoText}>
              Tu vois uniquement les demandes validées de ta structure. Une fois
              servie, la demande disparaît automatiquement de cette liste.
            </Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Aucune demande à servir</Text>
          <Text style={styles.emptyText}>
            Les demandes validées par le chef apparaîtront ici.
          </Text>
        </View>
      }
      contentContainerStyle={styles.content}
      style={styles.container}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F7FB'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  headerContainer: {
    paddingBottom: 8
  },
  heroCard: {
    backgroundColor: '#7C2D12',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6
  },
  heroSubtitle: {
    color: '#FDE8D6',
    fontSize: 14,
    marginBottom: 14
  },
  logoutButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#B45309',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700'
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#081B33',
    marginBottom: 8
  },
  infoText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20
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
    marginBottom: 12
  },
  requestInfo: {
    flex: 1,
    paddingRight: 10
  },
  driverName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#081B33'
  },
  driverTruck: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B'
  },
  statusBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8'
  },
  metaBox: {
    marginBottom: 12
  },
  metaText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4
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
  confirmButton: {
    backgroundColor: '#B45309',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmButtonDisabled: {
    opacity: 0.7
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },
  emptyWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
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
    lineHeight: 20
  }
})