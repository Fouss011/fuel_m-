import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'

const DRIVER_CARD = {
  key: 'driver',
  title: 'Chauffeur',
  subtitle: 'Créer une demande, suivre son évolution et consulter son historique.',
  emoji: '🚛',
  accent: '#2563EB',
  soft: '#DBEAFE',
  route: 'DriverDashboard'
}

const CHIEF_ACTIONS = [
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
  }
]

const PUMP_CARD = {
  key: 'pump_attendant',
  title: 'Pompiste',
  subtitle: 'Confirmer les demandes validées et enregistrer le service effectué.',
  emoji: '⛽',
  accent: '#B45309',
  soft: '#FEF3C7',
  route: 'PinAccess',
  params: { role: 'pump_attendant' }
}

function RoleCard({ item, navigation }) {
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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Chauffeur</Text>
        <Text style={styles.sectionSubtitle}>
          Demande de carburant et suivi.
        </Text>
      </View>
      <RoleCard item={DRIVER_CARD} navigation={navigation} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Chef</Text>
        <Text style={styles.sectionSubtitle}>
          Nouveau chef ou chef déjà rattaché à une structure.
        </Text>
      </View>
      {CHIEF_ACTIONS.map((item) => (
        <RoleCard key={item.key} item={item} navigation={navigation} />
      ))}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Pompiste</Text>
        <Text style={styles.sectionSubtitle}>
          Confirmation des demandes validées.
        </Text>
      </View>
      <RoleCard item={PUMP_CARD} navigation={navigation} />

      <View style={styles.bottomCard}>
        <View style={styles.bottomHeader}>
          <Text style={styles.bottomTitle}>Parcours conseillé</Text>
          <Text style={styles.bottomBadge}>Clair</Text>
        </View>

        <Text style={styles.bottomText}>
          Nouveau chef → créer sa structure → définir les PIN → se connecter → gérer l’équipe.
        </Text>

        <Text style={styles.bottomHint}>
          Ainsi, un nouveau client ne tombe plus par erreur sur la structure d’un autre.
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
  sectionHeader: {
    marginBottom: 12,
    marginTop: 4
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4
  },
  sectionSubtitle: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21
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