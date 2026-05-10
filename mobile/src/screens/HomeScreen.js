import { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { clearSession, getStoredSession } from '../api/client'

const COMPANY_CARDS = [
  {
    key: 'chief',
    title: 'Chef',
    subtitle: 'Structure',
    description: 'Créer, gérer et valider.',
    emoji: '🧾',
    accent: '#0F766E',
    soft: '#CCFBF1',
    route: 'PinAccess',
    params: { role: 'chief' }
  },
  {
    key: 'driver',
    title: 'Chauffeur',
    subtitle: 'Demandes',
    description: 'Demander et suivre.',
    emoji: '🚛',
    accent: '#2563EB',
    soft: '#DBEAFE',
    route: 'PinAccess',
    params: { role: 'driver' }
  },
  {
  key: 'pump',
  title: 'Pompiste',
  subtitle: 'Station',
  description: 'Entrer le code station.',
  emoji: '⛽',
  accent: '#B45309',
  soft: '#FEF3C7',
  route: 'StationAccess',
  params: {}
}
]

const STATION_CARD = {
  title: 'Responsable station',
  subtitle: 'Transactions, litres servis, sociétés et montants.',
  emoji: '🏪',
  accent: '#7C3AED',
  soft: '#EDE9FE',
  route: 'StationLogin',
  params: {}
}

function RoleCard({ item, navigation }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.roleCard}
      onPress={() => navigation.navigate(item.route, item.params)}
    >
      <View style={[styles.roleIconBox, { backgroundColor: item.soft }]}>
        <Text style={styles.roleIcon}>{item.emoji}</Text>
      </View>

      <Text style={styles.roleTitle}>{item.title}</Text>
      <Text style={styles.roleSubtitle}>{item.subtitle}</Text>
      <Text style={styles.roleDescription}>{item.description}</Text>

      <View style={styles.roleFooter}>
        <View style={[styles.roleDot, { backgroundColor: item.accent }]} />
        <Text style={styles.roleAction}>Accéder</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function HomeScreen({ navigation }) {
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)

  useFocusEffect(
    useCallback(() => {
      loadSession()
    }, [])
  )

  async function loadSession() {
    try {
      setLoadingSession(true)
      const storedSession = await getStoredSession()
      setSession(storedSession?.token && storedSession?.role ? storedSession : null)
    } catch {
      setSession(null)
    } finally {
      setLoadingSession(false)
    }
  }

  const sessionLabel = useMemo(() => {
    if (!session?.role) return null

    if (session.role === 'chief') {
      return {
        title: session.structureName || 'Session chef',
        subtitle: 'Une session chef est active.',
        accent: '#0F766E',
        icon: '🧾',
        targetScreen: 'ChiefDashboard'
      }
    }

    if (session.role === 'driver') {
      return {
        title: session.structureName || 'Session chauffeur',
        subtitle: 'Une session chauffeur est active.',
        accent: '#2563EB',
        icon: '🚛',
        targetScreen: 'DriverDashboard'
      }
    }

    if (session.role === 'pump_attendant') {
      return {
        title: session.stationName || 'Session pompiste',
        subtitle: 'Une session pompiste est active.',
        accent: '#B45309',
        icon: '⛽',
        targetScreen: 'PumpAttendantDashboard'
      }
    }

    if (session.role === 'station_manager') {
      return {
        title: session.stationName || 'Session station',
        subtitle: 'Une session responsable station est active.',
        accent: '#7C3AED',
        icon: '🏪',
        targetScreen: 'StationTransactions'
      }
    }

    return null
  }, [session])

  async function handleLogout() {
    try {
      await clearSession()
      setSession(null)
      Alert.alert('Déconnecté', 'La session a bien été supprimée.')
    } catch {
      Alert.alert('Erreur', 'Impossible de fermer la session.')
    }
  }

  if (loadingSession) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#061A2F" />
        <Text style={styles.loadingText}>Vérification de la session...</Text>
      </View>
    )
  }

  if (sessionLabel) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.compactHeader}>
          <View>
            <Text style={styles.headerTitle}>Gestion carburant</Text>
            <Text style={styles.headerSubtitle}>Session active</Text>
          </View>

          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Actif</Text>
          </View>
        </View>

        <View style={styles.sessionCard}>
          <Text style={styles.sessionIcon}>{sessionLabel.icon}</Text>
          <Text style={styles.sessionTitle}>{sessionLabel.title}</Text>
          <Text style={styles.sessionSubtitle}>{sessionLabel.subtitle}</Text>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: sessionLabel.accent }]}
            onPress={() => navigation.navigate(sessionLabel.targetScreen)}
          >
            <Text style={styles.primaryButtonText}>Reprendre mon espace</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout}>
            <Text style={styles.secondaryButtonText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.compactHeader}>
        <View>
          <Text style={styles.headerTitle}>Gestion carburant</Text>
          <Text style={styles.headerSubtitle}>Flotte • demandes • station</Text>
        </View>

        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Actif</Text>
        </View>
      </View>

      <View style={styles.sectionRow}>
        <View>
          <Text style={styles.sectionTitle}>Gestion société</Text>
          <Text style={styles.sectionText}>Choisis ton espace de travail.</Text>
        </View>
      </View>

      <View style={styles.rolesGrid}>
        {COMPANY_CARDS.map((item) => (
          <RoleCard key={item.key} item={item} navigation={navigation} />
        ))}
      </View>

      <View style={styles.sectionRow}>
        <View>
          <Text style={styles.sectionTitle}>Suivi station</Text>
          <Text style={styles.sectionText}>Récapitulatif des mouvements carburant.</Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.stationCard}
        onPress={() => navigation.navigate(STATION_CARD.route, STATION_CARD.params)}
      >
        <View style={[styles.stationIconBox, { backgroundColor: STATION_CARD.soft }]}>
          <Text style={styles.stationIcon}>{STATION_CARD.emoji}</Text>
        </View>

        <View style={styles.stationBody}>
          <View style={styles.stationTop}>
            <Text style={styles.stationTitle}>{STATION_CARD.title}</Text>
            <Text style={styles.stationBadge}>Module pro</Text>
          </View>

          <Text style={styles.stationSubtitle}>{STATION_CARD.subtitle}</Text>

          <View style={styles.stationFooter}>
            <Text style={styles.stationAction}>Ouvrir le suivi</Text>
            <Text style={styles.stationArrow}>→</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.footerNote}>
        <Text style={styles.footerTitle}>Accès séparés</Text>
        <Text style={styles.footerText}>
          La société gère les demandes. La station suit uniquement les transactions servies.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  content: {
    padding: 16,
    paddingBottom: 32
  },
  center: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '700'
  },
  compactHeader: {
    backgroundColor: '#061A2F',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#061A2F',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    marginBottom: 6
  },
  headerSubtitle: {
    color: '#BFD0E3',
    fontSize: 14,
    fontWeight: '700'
  },
  statusPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#22C55E',
    marginRight: 7
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900'
  },
  sectionRow: {
    marginBottom: 12,
    marginTop: 4
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#071C33',
    marginBottom: 3
  },
  sectionText: {
    color: '#64748B',
    fontSize: 13.5,
    fontWeight: '600'
  },
  rolesGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E1EAF3',
    shadowColor: '#071C33',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2
  },
  roleIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  roleIcon: {
    fontSize: 23
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#071C33',
    marginBottom: 2
  },
  roleSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 6
  },
  roleDescription: {
    color: '#64748B',
    fontSize: 12.5,
    lineHeight: 17,
    minHeight: 34
  },
  roleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12
  },
  roleDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginRight: 7
  },
  roleAction: {
    fontSize: 12.5,
    color: '#071C33',
    fontWeight: '900'
  },
  stationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    marginBottom: 18
  },
  stationIconBox: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  stationIcon: {
    fontSize: 28
  },
  stationBody: {
    flex: 1
  },
  stationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
    marginBottom: 6
  },
  stationTitle: {
    color: '#071C33',
    fontSize: 18,
    fontWeight: '900',
    flex: 1
  },
  stationBadge: {
    backgroundColor: '#F5F3FF',
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999
  },
  stationSubtitle: {
    color: '#64748B',
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 12
  },
  stationFooter: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stationAction: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '900',
    marginRight: 6
  },
  stationArrow: {
    color: '#7C3AED',
    fontSize: 18,
    fontWeight: '900'
  },
  footerNote: {
    backgroundColor: '#E8F0F8',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#D7E3EF'
  },
  footerTitle: {
    color: '#071C33',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 5
  },
  footerText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600'
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E1EAF3'
  },
  sessionIcon: {
    fontSize: 36,
    marginBottom: 12
  },
  sessionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#071C33',
    marginBottom: 7
  },
  sessionSubtitle: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 18
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center'
  },
  secondaryButtonText: {
    color: '#071C33',
    fontWeight: '900',
    fontSize: 15
  }
})