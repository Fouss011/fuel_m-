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

const ACCESS_CARDS = [
  {
    key: 'chief',
    title: 'Chef de société',
    subtitle: 'Administration structure',
    description: 'Créer les chauffeurs, choisir les stations partenaires et valider les demandes carburant.',
    emoji: '🧾',
    accent: '#0F766E',
    soft: '#CCFBF1',
    route: 'PinAccess',
    params: { role: 'chief' },
    action: 'Entrer comme chef'
  },
  {
    key: 'driver',
    title: 'Chauffeur',
    subtitle: 'Agent terrain',
    description: 'Faire une demande carburant, suivre son statut et voir les validations du chef.',
    emoji: '🚛',
    accent: '#2563EB',
    soft: '#DBEAFE',
    route: 'PinAccess',
    params: { role: 'driver' },
    action: 'Entrer comme chauffeur'
  },
  {
    key: 'station_manager',
    title: 'Responsable station',
    subtitle: 'Gestion station',
    description: 'Créer la station, gérer les pompistes et suivre les transactions réalisées.',
    emoji: '🏪',
    accent: '#7C3AED',
    soft: '#EDE9FE',
    route: 'StationLogin',
    params: {},
    action: 'Gérer ma station'
  },
  {
    key: 'pump',
    title: 'Pompiste',
    subtitle: 'Service carburant',
    description: 'Entrer le code station, choisir son profil et servir les demandes validées.',
    emoji: '⛽',
    accent: '#B45309',
    soft: '#FEF3C7',
    route: 'StationAccess',
    params: {},
    action: 'Entrer comme pompiste'
  }
]

function AccessCard({ item, navigation }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.accessCard, { borderColor: item.soft }]}
      onPress={() => navigation.navigate(item.route, item.params)}
    >
      <View style={styles.accessTop}>
        <View style={[styles.iconBox, { backgroundColor: item.soft }]}>
          <Text style={styles.icon}>{item.emoji}</Text>
        </View>

        <View style={styles.cardTextBox}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={[styles.cardSubtitle, { color: item.accent }]}>
            {item.subtitle}
          </Text>
        </View>
      </View>

      <Text style={styles.cardDescription}>{item.description}</Text>

      <View style={styles.cardFooter}>
        <View style={[styles.line, { backgroundColor: item.accent }]} />
        <Text style={[styles.cardAction, { color: item.accent }]}>
          {item.action}
        </Text>
        <Text style={[styles.arrow, { color: item.accent }]}>→</Text>
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
        subtitle: 'Tu peux reprendre la gestion de ta structure.',
        accent: '#0F766E',
        icon: '🧾',
        targetScreen: 'ChiefDashboard'
      }
    }

    if (session.role === 'driver') {
      return {
        title: session.structureName || 'Session chauffeur',
        subtitle: 'Tu peux reprendre ton espace chauffeur.',
        accent: '#2563EB',
        icon: '🚛',
        targetScreen: 'DriverDashboard'
      }
    }

    if (session.role === 'pump_attendant') {
      return {
        title: session.stationName || 'Session pompiste',
        subtitle: 'Tu peux reprendre le service carburant.',
        accent: '#B45309',
        icon: '⛽',
        targetScreen: 'PumpAttendantDashboard'
      }
    }

    if (session.role === 'station_manager') {
      return {
        title: session.stationName || 'Session station',
        subtitle: 'Tu peux reprendre la gestion de ta station.',
        accent: '#7C3AED',
        icon: '🏪',
        targetScreen: 'StationManagerDashboard'
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
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroBadge}>Session active</Text>
              <Text style={styles.heroTitle}>Gestion carburant</Text>
            </View>

            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Connecté</Text>
            </View>
          </View>

          <Text style={styles.heroSubtitle}>
            Ton espace est déjà ouvert. Tu peux continuer sans te reconnecter.
          </Text>
        </View>

        <View style={styles.sessionCard}>
          <View style={[styles.sessionIconBox, { backgroundColor: `${sessionLabel.accent}22` }]}>
            <Text style={styles.sessionIcon}>{sessionLabel.icon}</Text>
          </View>

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
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroBadge}>Plateforme terrain</Text>
            <Text style={styles.heroTitle}>Gestion carburant</Text>
          </View>

          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Actif</Text>
          </View>
        </View>

        <Text style={styles.heroSubtitle}>
          Suivi des demandes, validation chef, service station et historique des transactions.
        </Text>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>4</Text>
            <Text style={styles.heroStatLabel}>espaces</Text>
          </View>

          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>24h</Text>
            <Text style={styles.heroStatLabel}>suivi</Text>
          </View>

          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>Pro</Text>
            <Text style={styles.heroStatLabel}>station</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Choisis ton accès</Text>
        <Text style={styles.sectionText}>
          Chaque rôle a son espace séparé pour éviter les confusions.
        </Text>
      </View>

      {ACCESS_CARDS.map((item) => (
        <AccessCard key={item.key} item={item} navigation={navigation} />
      ))}

      <View style={styles.footerNote}>
        <Text style={styles.footerTitle}>Architecture séparée</Text>
        <Text style={styles.footerText}>
          La société gère les chauffeurs et les validations. La station gère les pompistes et les transactions servies.
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
    paddingBottom: 36
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
    fontWeight: '800'
  },
  hero: {
    backgroundColor: '#061A2F',
    borderRadius: 30,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#061A2F',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start'
  },
  heroBadge: {
    color: '#99F6E4',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  heroSubtitle: {
    color: '#CBD5E1',
    fontSize: 14.5,
    lineHeight: 22,
    fontWeight: '700',
    marginTop: 14
  },
  livePill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#22C55E',
    marginRight: 7
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900'
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18
  },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900'
  },
  heroStatLabel: {
    color: '#BFD0E3',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3
  },
  sectionHeader: {
    marginBottom: 12
  },
  sectionTitle: {
    color: '#071C33',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4
  },
  sectionText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700'
  },
  accessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1.5,
    shadowColor: '#071C33',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3
  },
  accessTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  icon: {
    fontSize: 29
  },
  cardTextBox: {
    flex: 1
  },
  cardTitle: {
    color: '#071C33',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 3
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  cardDescription: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '650',
    marginBottom: 14
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  line: {
    width: 28,
    height: 4,
    borderRadius: 999,
    marginRight: 9
  },
  cardAction: {
    fontSize: 14,
    fontWeight: '900',
    flex: 1
  },
  arrow: {
    fontSize: 22,
    fontWeight: '900'
  },
  footerNote: {
    backgroundColor: '#E8F0F8',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D7E3EF',
    marginTop: 4
  },
  footerTitle: {
    color: '#071C33',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6
  },
  footerText: {
    color: '#64748B',
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '700'
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E1EAF3',
    shadowColor: '#071C33',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  sessionIconBox: {
    width: 66,
    height: 66,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  sessionIcon: {
    fontSize: 34
  },
  sessionTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#071C33',
    marginBottom: 7
  },
  sessionSubtitle: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    marginBottom: 18
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center'
  },
  secondaryButtonText: {
    color: '#071C33',
    fontWeight: '900',
    fontSize: 15
  }
})