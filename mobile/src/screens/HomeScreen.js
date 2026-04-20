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
    key: 'driver',
    title: 'Chauffeur',
    subtitle: 'Créer une demande, suivre son évolution et consulter son historique.',
    emoji: '🚛',
    accent: '#2563EB',
    soft: '#DBEAFE',
    route: 'DriverDashboard'
  },
  {
    key: 'chief-login',
    title: 'Chef — Se connecter',
    subtitle: 'Accéder à une structure déjà créée avec le code PIN chef.',
    emoji: '🧾',
    accent: '#0F766E',
    soft: '#CCFBF1',
    route: 'PinAccess',
    params: { role: 'chief' }
  },
  {
    key: 'chief-create',
    title: 'Chef — Créer ma structure',
    subtitle: 'Créer une nouvelle structure et définir les accès chef / pompiste.',
    emoji: '🏗️',
    accent: '#7C3AED',
    soft: '#EDE9FE',
    route: 'CreateStructure'
  },
  {
    key: 'pump',
    title: 'Pompiste',
    subtitle: 'Confirmer les demandes validées et enregistrer le service effectué.',
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
        subtitle: 'Tu es déjà connecté sur cet appareil. Tu peux reprendre directement ton espace.',
        primaryText: 'Reprendre ma structure',
        secondaryText: 'Se déconnecter',
        accent: '#0F766E',
        soft: '#CCFBF1',
        icon: '🧾',
        targetScreen: 'ChiefDashboard'
      }
    }

    if (session.role === 'pump_attendant') {
      return {
        badge: 'SESSION POMPISTE',
        title: session.structureName
          ? `Reprendre l’espace pompiste de ${session.structureName}`
          : 'Reprendre ma session pompiste',
        subtitle: 'La session pompiste est déjà active sur cet appareil.',
        primaryText: 'Reprendre la session',
        secondaryText: 'Se déconnecter',
        accent: '#B45309',
        soft: '#FEF3C7',
        icon: '⛽',
        targetScreen: 'PumpAttendantDashboard'
      }
    }

    return {
      badge: 'SESSION ACTIVE',
      title: 'Reprendre ma session',
      subtitle: 'Une session existe déjà sur cet appareil.',
      primaryText: 'Continuer',
      secondaryText: 'Se déconnecter',
      accent: '#2563EB',
      soft: '#DBEAFE',
      icon: '🔐',
      targetScreen: 'Home'
    }
  }, [session])

  async function handleLogout() {
    Alert.alert(
      'Déconnexion',
      'Veux-tu vraiment fermer la session sur cet appareil ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearSession()
              setSession(null)
              Alert.alert('Déconnecté', 'La session a bien été supprimée de cet appareil.')
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de fermer la session pour le moment.')
            }
          }
        }
      ]
    )
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

            <View style={styles.sessionMetaBox}>
              <Text style={styles.sessionMetaLabel}>Structure</Text>
              <Text style={styles.sessionMetaValue}>{session.structureName || 'Non renseignée'}</Text>
            </View>

            <View style={styles.sessionMetaBox}>
              <Text style={styles.sessionMetaLabel}>Utilisateur</Text>
              <Text style={styles.sessionMetaValue}>{session.userName || 'Non renseigné'}</Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.9}
              onPress={() => navigation.replace(sessionLabel.targetScreen)}
            >
              <Text style={styles.primaryButtonText}>{sessionLabel.primaryText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.9}
              onPress={handleLogout}
            >
              <Text style={styles.secondaryButtonText}>{sessionLabel.secondaryText}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomCard}>
          <View style={styles.bottomHeader}>
            <Text style={styles.bottomTitle}>Mode pro</Text>
            <Text style={styles.bottomBadge}>Actif</Text>
          </View>

          <Text style={styles.bottomText}>
            Tant que tu ne te déconnectes pas, l’application garde ta session sur cet appareil.
          </Text>

          <Text style={styles.bottomHint}>
            Un autre utilisateur sur un autre téléphone aura sa propre session et sa propre structure.
          </Text>
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
          Choisis le bon parcours selon ton rôle et ta situation.
        </Text>
      </View>

      {PUBLIC_CARDS.map((item) => (
        <PublicCard key={item.key} item={item} navigation={navigation} />
      ))}

      <View style={styles.bottomCard}>
        <View style={styles.bottomHeader}>
          <Text style={styles.bottomTitle}>Parcours conseillé</Text>
          <Text style={styles.bottomBadge}>Clair</Text>
        </View>

        <Text style={styles.bottomText}>
          Nouveau chef → créer sa structure → définir les PIN → se connecter → gérer l’équipe.
        </Text>

        <Text style={styles.bottomHint}>
          Une fois connecté, l’utilisateur retrouve sa session sur son propre appareil.
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
    padding: 20,
    paddingBottom: 32
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F7FB',
    paddingHorizontal: 24
  },
  loadingText: {
    marginTop: 12,
    color: '#475569',
    fontSize: 15,
    textAlign: 'center'
  },
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12
  },
  badgeText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800'
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  iconInner: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconText: {
    fontSize: 24
  },
  cardBody: {
    flex: 1
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
    marginBottom: 12
  },
  cardFooter: {
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
    fontWeight: '800',
    color: '#334155'
  },
  chevron: {
    fontSize: 34,
    color: '#94A3B8',
    marginLeft: 12,
    marginTop: -4
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3
  },
  sessionIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  sessionIconInner: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sessionIconText: {
    fontSize: 26
  },
  sessionBody: {
    width: '100%'
  },
  sessionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2E8F0',
    color: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 12
  },
  sessionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8
  },
  sessionSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
    marginBottom: 14
  },
  sessionMetaBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12
  },
  sessionMetaLabel: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 4
  },
  sessionMetaValue: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800'
  },
  primaryButton: {
    backgroundColor: '#081B33',
    borderRadius: 18,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 4
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800'
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 12
  },
  secondaryButtonText: {
    color: '#B91C1C',
    fontSize: 15,
    fontWeight: '800'
  },
  bottomCard: {
    backgroundColor: '#081B33',
    borderRadius: 24,
    padding: 20,
    marginTop: 8
  },
  bottomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  bottomTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900'
  },
  bottomBadge: {
    color: '#081B33',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '800'
  },
  bottomText: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10
  },
  bottomHint: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 20
  }
})