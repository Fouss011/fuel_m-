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

const PUBLIC_CARDS = [
  {
    key: 'chief',
    title: 'Chef',
    subtitle:
      'Créer un compte, se connecter, gérer la structure, les chauffeurs et les pompistes.',
    emoji: '🧾',
    accent: '#0F766E',
    soft: '#CCFBF1',
    route: 'PinAccess',
    params: { role: 'chief' }
  },
  {
    key: 'driver',
    title: 'Chauffeur',
    subtitle:
      'Entrer le code structure, choisir son nom puis entrer son code PIN.',
    emoji: '🚛',
    accent: '#2563EB',
    soft: '#DBEAFE',
    route: 'PinAccess',
    params: { role: 'driver' }
  },
  {
    key: 'pump',
    title: 'Pompiste',
    subtitle:
      'Entrer le code structure, choisir son profil puis entrer son code PIN.',
    emoji: '⛽',
    accent: '#B45309',
    soft: '#FEF3C7',
    route: 'PinAccess',
    params: { role: 'pump_attendant' }
  }
]

function PublicCard({ item, navigation }) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={styles.card}
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
          <Text style={styles.cardAction}>Continuer</Text>
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

      if (storedSession?.token && storedSession?.role) {
        setSession(storedSession)
      } else {
        setSession(null)
      }
    } catch (error) {
      console.log('Erreur chargement session home:', error?.message || error)
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
          ? `Reprendre la structure ${session.structureName}`
          : 'Reprendre ma session chef',
        subtitle:
          'Tu es déjà connecté sur cet appareil. Tu peux reprendre directement ton espace chef.',
        primaryText: 'Reprendre mon espace',
        secondaryText: 'Se déconnecter',
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
          ? `Reprendre l’espace chauffeur de ${session.structureName}`
          : 'Reprendre ma session chauffeur',
        subtitle:
          'La session chauffeur est déjà active sur cet appareil.',
        primaryText: 'Reprendre ma session',
        secondaryText: 'Se déconnecter',
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
          ? `Reprendre l’espace pompiste de ${session.structureName}`
          : 'Reprendre ma session pompiste',
        subtitle:
          'La session pompiste est déjà active sur cet appareil.',
        primaryText: 'Reprendre ma session',
        secondaryText: 'Se déconnecter',
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
      Alert.alert('Déconnecté', 'La session a bien été supprimée de cet appareil.')
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de fermer la session pour le moment.')
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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Gestion carburant</Text>
          </View>

          <Text style={styles.title}>Session détectée</Text>
          <Text style={styles.subtitle}>
            Cet appareil possède déjà une session active. Tu peux reprendre directement ton espace.
          </Text>
        </View>

        <View style={styles.sessionCard}>
          <View style={[styles.sessionIconWrap, { backgroundColor: sessionLabel.soft }]}>
            <View style={[styles.sessionIconInner, { backgroundColor: sessionLabel.accent }]}>
              <Text style={styles.sessionIconText}>{sessionLabel.icon}</Text>
            </View>
          </View>

          <View style={styles.sessionBody}>
            <Text style={styles.sessionBadge}>{sessionLabel.badge}</Text>
            <Text style={styles.sessionTitle}>{sessionLabel.title}</Text>
            <Text style={styles.sessionSubtitle}>{sessionLabel.subtitle}</Text>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: sessionLabel.accent }]}
              onPress={() => navigation.navigate(sessionLabel.targetScreen)}
            >
              <Text style={styles.primaryButtonText}>{sessionLabel.primaryText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleLogout}
            >
              <Text style={styles.secondaryButtonText}>{sessionLabel.secondaryText}</Text>
            </TouchableOpacity>
          </View>
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
      <View style={styles.introCard}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Plateforme métier</Text>
        </View>

        <Text style={styles.title}>Gestion carburant</Text>
        <Text style={styles.subtitle}>
          Choisis ton profil pour accéder à ton espace. Chaque structure reste séparée et chaque
          utilisateur travaille dans le bon environnement.
        </Text>
      </View>

      <View style={styles.cardsList}>
        {PUBLIC_CARDS.map((item) => (
          <PublicCard key={item.key} item={item} navigation={navigation} />
        ))}
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Connexion simplifiée</Text>
        <Text style={styles.footerText}>
          Le chef crée la structure. Les chauffeurs et pompistes entrent ensuite dans la bonne
          structure avec le code fourni par leur chef.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F7FB'
  },
  content: {
    padding: 18,
    paddingBottom: 28
  },
  center: {
    flex: 1,
    backgroundColor: '#F3F7FB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#516173',
    textAlign: 'center'
  },
  introCard: {
    backgroundColor: '#081B33',
    borderRadius: 24,
    padding: 22,
    marginBottom: 18
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 10
  },
  subtitle: {
    color: '#D6E2F0',
    fontSize: 15,
    lineHeight: 22
  },
  cardsList: {
    gap: 14
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#081B33',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  iconWrap: {
    width: 66,
    height: 66,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  iconInner: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconText: {
    fontSize: 22
  },
  cardBody: {
    flex: 1
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#081B33',
    marginBottom: 6
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#536273'
  },
  cardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 8
  },
  cardAction: {
    fontSize: 13,
    fontWeight: '700',
    color: '#081B33'
  },
  chevron: {
    fontSize: 28,
    color: '#9AA8B6',
    marginLeft: 10
  },
  footerCard: {
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4EBF3'
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#081B33',
    marginBottom: 6
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5F6E7D'
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#081B33',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  sessionIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  sessionIconInner: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sessionIconText: {
    fontSize: 24
  },
  sessionBody: {
    width: '100%'
  },
  sessionBadge: {
    fontSize: 12,
    fontWeight: '900',
    color: '#5F6E7D',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8
  },
  sessionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#081B33',
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
    justifyContent: 'center',
    marginBottom: 10
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3F8'
  },
  secondaryButtonText: {
    color: '#081B33',
    fontSize: 15,
    fontWeight: '800'
  }
})