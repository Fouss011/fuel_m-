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
    subtitle: 'Créer et piloter une structure, gérer les chauffeurs, pompistes et demandes.',
    emoji: '🧾',
    accent: '#0F766E',
    soft: '#CCFBF1',
    route: 'PinAccess',
    params: { role: 'chief' }
  },
  {
    key: 'driver',
    title: 'Chauffeur',
    subtitle: 'Entrer dans sa structure, créer une demande et suivre son statut.',
    emoji: '🚛',
    accent: '#2563EB',
    soft: '#DBEAFE',
    route: 'PinAccess',
    params: { role: 'driver' }
  },
  {
    key: 'pump',
    title: 'Pompiste',
    subtitle: 'Valider les approvisionnements autorisés et enregistrer les litres servis.',
    emoji: '⛽',
    accent: '#B45309',
    soft: '#FEF3C7',
    route: 'PinAccess',
    params: { role: 'pump_attendant' }
  }
]

const STATION_CARD = {
  key: 'station',
  title: 'Responsable station',
  subtitle: 'Voir les chauffeurs passés, les sociétés, les litres servis et les montants.',
  emoji: '🏪',
  accent: '#7C3AED',
  soft: '#EDE9FE',
  route: 'StationLogin',
  params: {}
}

function AccessCard({ item, navigation, featured = false }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.card, featured && styles.stationCard]}
      onPress={() => navigation.navigate(item.route, item.params)}
    >
      <View style={[styles.iconWrap, { backgroundColor: item.soft }]}>
        <View style={[styles.iconInner, { backgroundColor: item.accent }]}>
          <Text style={styles.iconText}>{item.emoji}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardSubtitle}>{item.subtitle}</Text>

        <View style={styles.cardFooter}>
          <View style={[styles.dot, { backgroundColor: item.accent }]} />
          <Text style={styles.cardAction}>Accéder</Text>
        </View>
      </View>

      <Text style={styles.chevron}>›</Text>
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
    } catch (error) {
      setSession(null)
    } finally {
      setLoadingSession(false)
    }
  }

  const sessionLabel = useMemo(() => {
    if (!session?.role) return null

    if (session.role === 'chief') {
      return {
        badge: 'SESSION CHEF',
        title: session.structureName
          ? `Reprendre ${session.structureName}`
          : 'Reprendre ma session chef',
        subtitle: 'Une session chef est déjà active sur cet appareil.',
        primaryText: 'Reprendre mon espace',
        accent: '#0F766E',
        soft: '#CCFBF1',
        icon: '🧾',
        targetScreen: 'ChiefDashboard'
      }
    }

    if (session.role === 'driver') {
      return {
        badge: 'SESSION CHAUFFEUR',
        title: session.structureName
          ? `Reprendre ${session.structureName}`
          : 'Reprendre ma session chauffeur',
        subtitle: 'Une session chauffeur est déjà active sur cet appareil.',
        primaryText: 'Reprendre ma session',
        accent: '#2563EB',
        soft: '#DBEAFE',
        icon: '🚛',
        targetScreen: 'DriverDashboard'
      }
    }

    if (session.role === 'pump_attendant') {
      return {
        badge: 'SESSION POMPISTE',
        title: session.structureName
          ? `Reprendre ${session.structureName}`
          : 'Reprendre ma session pompiste',
        subtitle: 'Une session pompiste est déjà active sur cet appareil.',
        primaryText: 'Reprendre ma session',
        accent: '#B45309',
        soft: '#FEF3C7',
        icon: '⛽',
        targetScreen: 'PumpAttendantDashboard'
      }
    }

    return null
  }, [session])

  async function handleLogout() {
    try {
      await clearSession()
      setSession(null)
      Alert.alert('Déconnecté', 'La session a bien été supprimée.')
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de fermer la session.')
    }
  }

  if (loadingSession) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#081B33" />
        <Text style={styles.loadingText}>Vérification de la session...</Text>
      </View>
    )
  }

  if (sessionLabel) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
  <View style={styles.heroGlow} />
  <View style={styles.heroGlowTwo} />
          <Text style={styles.heroBadge}>Gestion carburant</Text>
          <Text style={styles.heroTitle}>Session détectée</Text>
          <Text style={styles.heroText}>
            Tu peux reprendre ton espace directement ou fermer la session.
          </Text>
        </View>

        <View style={styles.sessionCard}>
          <View style={[styles.iconWrap, { backgroundColor: sessionLabel.soft }]}>
            <View style={[styles.iconInner, { backgroundColor: sessionLabel.accent }]}>
              <Text style={styles.iconText}>{sessionLabel.icon}</Text>
            </View>
          </View>

          <Text style={styles.sessionBadge}>{sessionLabel.badge}</Text>
          <Text style={styles.sessionTitle}>{sessionLabel.title}</Text>
          <Text style={styles.sessionSubtitle}>{sessionLabel.subtitle}</Text>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: sessionLabel.accent }]}
            onPress={() => navigation.navigate(sessionLabel.targetScreen)}
          >
            <Text style={styles.primaryButtonText}>{sessionLabel.primaryText}</Text>
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
        <Text style={styles.heroBadge}>SUIVI FLOTTE • TEMPS RÉEL</Text>
        <Text style={styles.heroTitle}>
  Gestion{'\n'}carburant
</Text>
        <Text style={styles.heroText}>
          Pilote les demandes, les validations et les approvisionnements avec un suivi clair par rôle.
        </Text>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNumber}>3</Text>
            <Text style={styles.heroStatLabel}>rôles société</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNumber}>1</Text>
            <Text style={styles.heroStatLabel}>suivi station</Text>
          </View>
        </View>

        <View
  style={{
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center'
  }}
>
  <View
    style={{
      width: 10,
      height: 10,
      borderRadius: 999,
      backgroundColor: '#22C55E',
      marginRight: 8
    }}
  />

  <Text
    style={{
      color: '#D7E4F2',
      fontSize: 13,
      fontWeight: '700'
    }}
  >
    Plateforme opérationnelle active
  </Text>
</View>
      </View>

      <Text style={styles.sectionTitle}>Gestion société</Text>
      <Text style={styles.sectionText}>
        Les chefs, chauffeurs et pompistes travaillent dans l’environnement de leur structure.
      </Text>

      <View style={styles.cardsList}>
        {COMPANY_CARDS.map((item) => (
          <AccessCard key={item.key} item={item} navigation={navigation} />
        ))}
      </View>

      <Text style={[styles.sectionTitle, styles.stationSectionTitle]}>Suivi station</Text>
      <Text style={styles.sectionText}>
        Espace dédié au responsable station pour consulter les mouvements carburant.
      </Text>

      <AccessCard item={STATION_CARD} navigation={navigation} featured />

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Séparation claire des accès</Text>
        <Text style={styles.footerText}>
          La société gère les demandes. La station consulte uniquement les transactions servies.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF4FA'
  },
  content: {
    padding: 18,
    paddingBottom: 34
  },
  center: {
    flex: 1,
    backgroundColor: '#EEF4FA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#536273'
  },
  hero: {
  borderRadius: 34,
  padding: 24,
  marginBottom: 24,
  overflow: 'hidden',
  backgroundColor: '#031526',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.06)',
  shadowColor: '#000',
  shadowOpacity: 0.28,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 14 },
  elevation: 10
},
heroGlow: {
  position: 'absolute',
  width: 240,
  height: 240,
  borderRadius: 999,
  backgroundColor: 'rgba(124,58,237,0.18)',
  top: -90,
  right: -70
},

heroGlowTwo: {
  position: 'absolute',
  width: 180,
  height: 180,
  borderRadius: 999,
  backgroundColor: 'rgba(14,165,233,0.14)',
  bottom: -70,
  left: -40
},
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 16
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '900',
    marginBottom: 10
  },
  heroText: {
    color: '#D7E4F2',
    fontSize: 15,
    lineHeight: 22
  },
  heroStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20
  },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    padding: 14
  },
  heroStatNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900'
  },
  heroStatLabel: {
    color: '#C8D8EA',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#071C33',
    marginBottom: 5
  },
  stationSectionTitle: {
    marginTop: 24
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5F6E7D',
    marginBottom: 12
  },
  cardsList: {
    gap: 14
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#071C33',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E1EAF3'
  },
  stationCard: {
    borderColor: '#C4B5FD',
    backgroundColor: '#FFFFFF'
  },
  iconWrap: {
    width: 66,
    height: 66,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  iconInner: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconText: {
    fontSize: 23
  },
  cardBody: {
    flex: 1
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#071C33',
    marginBottom: 5
  },
  cardSubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    color: '#536273'
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 8
  },
  cardAction: {
    fontSize: 13,
    fontWeight: '900',
    color: '#071C33'
  },
  chevron: {
    fontSize: 30,
    color: '#A2AFBD',
    marginLeft: 8
  },
  footerCard: {
    marginTop: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 17,
    borderWidth: 1,
    borderColor: '#E1EAF3'
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#071C33',
    marginBottom: 6
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5F6E7D'
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E1EAF3'
  },
  sessionBadge: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.7,
    marginBottom: 8
  },
  sessionTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#071C33',
    marginBottom: 8
  },
  sessionSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#5F6E7D',
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
    fontSize: 15,
    fontWeight: '900'
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#EEF3F8'
  },
  secondaryButtonText: {
    color: '#071C33',
    fontSize: 15,
    fontWeight: '900'
  }
})