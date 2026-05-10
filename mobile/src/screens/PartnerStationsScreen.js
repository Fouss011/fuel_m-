import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native'
import { api, getStoredSession } from '../api/client'

export default function PartnerStationsScreen({ navigation }) {
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [structureId, setStructureId] = useState(null)
  const [stations, setStations] = useState([])
  const [partners, setPartners] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)

      const session = await getStoredSession()
      const sid = session?.structureId || session?.structure_id

      if (!sid) {
        Alert.alert('Session invalide', 'Structure introuvable dans la session.')
        return
      }

      setStructureId(sid)

      const [stationsResponse, partnersResponse] = await Promise.all([
        api.get('/station'),
        api.get(`/structures/${sid}/partner-stations`)
      ])

      setStations(stationsResponse?.data?.data || [])
      setPartners(partnersResponse?.data?.data || [])
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        'Impossible de charger les stations partenaires.'

      Alert.alert('Erreur', message)
    } finally {
      setLoading(false)
    }
  }

  function isPartner(stationId) {
    return partners.some((item) => item.id === stationId || item.station_id === stationId)
  }

  async function togglePartner(station) {
    if (!structureId) return

    try {
      setSavingId(station.id)

      if (isPartner(station.id)) {
        await api.delete(`/structures/${structureId}/partner-stations/${station.id}`)
        setPartners((prev) =>
          prev.filter((item) => item.id !== station.id && item.station_id !== station.id)
        )
      } else {
        await api.post(`/structures/${structureId}/partner-stations`, {
          station_id: station.id
        })
        setPartners((prev) => [...prev, station])
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        'Impossible de modifier cette station partenaire.'

      Alert.alert('Erreur', message)
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F766E" />
        <Text style={styles.loadingText}>Chargement des stations...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.badge}>Stations partenaires</Text>
        <Text style={styles.title}>Choisis les stations avec qui ta société travaille</Text>
        <Text style={styles.subtitle}>
          Quand tu valides une demande carburant, elle partira vers une station partenaire.
        </Text>
      </View>

      <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
        <Text style={styles.refreshText}>Actualiser</Text>
      </TouchableOpacity>

      {!stations.length ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Aucune station disponible</Text>
          <Text style={styles.emptyText}>
            L’admin doit d’abord créer des stations dans la base.
          </Text>
        </View>
      ) : null}

      {stations.map((station) => {
        const selected = isPartner(station.id)
        const saving = savingId === station.id

        return (
          <View key={station.id} style={[styles.card, selected && styles.cardSelected]}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stationName}>{station.name}</Text>
                <Text style={styles.stationCode}>Code : {station.station_code}</Text>
              </View>

              <View style={[styles.statusPill, selected && styles.statusPillSelected]}>
                <Text style={[styles.statusText, selected && styles.statusTextSelected]}>
                  {selected ? 'Partenaire' : 'Disponible'}
                </Text>
              </View>
            </View>

            <View style={styles.infoGrid}>
              <Text style={styles.infoText}>Ville : {station.city || 'Non renseignée'}</Text>
              <Text style={styles.infoText}>
                Responsable : {station.manager_name || 'Non renseigné'}
              </Text>
              <Text style={styles.infoText}>
                Téléphone : {station.manager_phone || 'Non renseigné'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.actionButton,
                selected ? styles.removeButton : styles.addButton,
                saving && styles.disabledButton
              ]}
              onPress={() => togglePartner(station)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>
                  {selected ? 'Retirer des partenaires' : 'Ajouter comme partenaire'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6FF'
  },
  content: {
    padding: 20,
    paddingBottom: 40
  },
  center: {
    flex: 1,
    backgroundColor: '#EFF6FF',
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
    backgroundColor: '#081B33',
    borderRadius: 28,
    padding: 24,
    marginBottom: 16
  },
  badge: {
    color: '#99F6E4',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30
  },
  subtitle: {
    color: '#CBD5E1',
    marginTop: 10,
    lineHeight: 21,
    fontWeight: '600'
  },
  refreshButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DCE8F5'
  },
  refreshText: {
    color: '#0F766E',
    fontWeight: '900'
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DCE8F5'
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DCE8F5'
  },
  cardSelected: {
    borderColor: '#0F766E',
    backgroundColor: '#F0FDFA'
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  stationName: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '900'
  },
  stationCode: {
    color: '#64748B',
    marginTop: 4,
    fontWeight: '800'
  },
  statusPill: {
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  statusPillSelected: {
    backgroundColor: '#0F766E'
  },
  statusText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '900'
  },
  statusTextSelected: {
    color: '#FFFFFF'
  },
  infoGrid: {
    marginTop: 14,
    gap: 5
  },
  infoText: {
    color: '#475569',
    fontWeight: '700'
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16
  },
  addButton: {
    backgroundColor: '#0F766E'
  },
  removeButton: {
    backgroundColor: '#DC2626'
  },
  disabledButton: {
    opacity: 0.65
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '900'
  }
})