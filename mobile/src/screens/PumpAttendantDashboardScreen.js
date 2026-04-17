import { useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { api } from '../api/client'

export default function PumpAttendantDashboardScreen({ navigation }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)

  async function loadRequests() {
    try {
      setLoading(true)
      const response = await api.get('/fuel-requests?status=approved')
      setRequests(response.data.data || [])
    } catch (error) {
      console.log('Erreur chargement pompiste:', error?.response?.data || error.message)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadRequests()
    }, [])
  )

  function renderHeader() {
    return (
      <>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>POMPISTE</Text>
            </View>

            <View style={styles.heroMiniCard}>
              <Text style={styles.heroMiniValue}>{requests.length}</Text>
              <Text style={styles.heroMiniLabel}>À servir</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Demandes prêtes au service</Text>
          <Text style={styles.heroText}>
            Consulte uniquement les demandes validées par le chef et confirme la livraison.
          </Text>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Demandes à servir</Text>
          <Text style={styles.sectionSubtitle}>
            Historique des validations prêtes au service
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
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ConfirmFuel', { requestId: item.id })}
            activeOpacity={0.94}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.truck}>{item.truck_number}</Text>
                <Text style={styles.meta}>
                  Chauffeur : {item.driver_name || item.driver?.name || 'N/A'}
                </Text>
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>À servir</Text>
              </View>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Carburant</Text>
                <Text style={styles.infoValue}>{item.fuel_type}</Text>
              </View>

              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Quantité validée</Text>
                <Text style={styles.infoValue}>
                  {item.approved_liters || item.requested_liters} L
                </Text>
              </View>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Ouvrir pour confirmer la livraison</Text>
              <Text style={styles.footerLink}>Confirmer ›</Text>
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>⛽</Text>
            <Text style={styles.emptyTitle}>Aucune demande validée</Text>
            <Text style={styles.emptyText}>
              Les demandes prêtes à être servies apparaîtront ici.
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
    marginBottom: 16,
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
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  roleBadgeText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  heroMiniCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 88
  },
  heroMiniValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#9A3412'
  },
  heroMiniLabel: {
    color: '#B45309',
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
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#C2410C'
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  infoBlock: {
    width: '48.5%',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14
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
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footerText: {
    color: '#334155',
    fontWeight: '700'
  },
  footerLink: {
    color: '#B45309',
    fontWeight: '800',
    fontSize: 13
  }
})