import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'

const ROLE_CARDS = [
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
    key: 'chief',
    title: 'Chef',
    subtitle: 'Valider les demandes, piloter l’activité et superviser l’équipe.',
    emoji: '🧾',
    accent: '#0F766E',
    soft: '#CCFBF1',
    route: 'PinAccess',
    params: { role: 'chief' }
  },
  {
    key: 'pump',
    title: 'Pompiste',
    subtitle: 'Confirmer les demandes validées et enregistrer le service effectué.',
    emoji: '⛽',
    accent: '#B45309',
    soft: '#FEF3C7',
    route: 'PinAccess',
    params: { role: 'pump' }
  }
]

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
          Choisis un espace pour continuer.
        </Text>
      </View>

      <View style={styles.rolesHeader}>
        <Text style={styles.rolesTitle}>Les 3 espaces</Text>
        <Text style={styles.rolesSubtitle}>
          Accède directement à l’interface adaptée à ton rôle.
        </Text>
      </View>

      {ROLE_CARDS.map((item) => (
        <TouchableOpacity
          key={item.key}
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
              <Text style={styles.cardAction}>Accéder à l’espace</Text>
            </View>
          </View>

          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.bottomCard}>
        <View style={styles.bottomHeader}>
          <Text style={styles.bottomTitle}>Fonctionnement</Text>
          <Text style={styles.bottomBadge}>Simple</Text>
        </View>

        <Text style={styles.bottomText}>
          Chauffeur → validation du chef → confirmation du pompiste
        </Text>

        <Text style={styles.bottomHint}>
          Prochaine évolution : séparation des données par structure pour un usage multi-entreprises.
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
  rolesHeader: {
    marginBottom: 14
  },
  rolesTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6
  },
  rolesSubtitle: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22
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
    fontSize: 20,
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
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13
  },
  chevron: {
    fontSize: 30,
    color: '#94A3B8',
    marginLeft: 8
  },
  bottomCard: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  bottomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  bottomTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A'
  },
  bottomBadge: {
    backgroundColor: '#E2E8F0',
    color: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '800'
  },
  bottomText: {
    color: '#475569',
    lineHeight: 21,
    fontSize: 14,
    marginBottom: 8
  },
  bottomHint: {
    color: '#64748B',
    lineHeight: 20,
    fontSize: 13
  }
})