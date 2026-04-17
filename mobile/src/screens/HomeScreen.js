import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'

const ROLE_CARDS = [
  {
    key: 'driver',
    title: 'Chauffeur',
    subtitle: 'Créer une demande, suivre l’évolution et consulter l’historique.',
    emoji: '🚛',
    accent: '#2563EB',
    soft: '#DBEAFE',
    route: 'DriverDashboard'
  },
  {
    key: 'chief',
    title: 'Chef',
    subtitle: 'Valider, ajuster et superviser toutes les opérations carburant.',
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroOverlay} />

        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>Plateforme métier</Text>
        </View>

        <Text style={styles.title}>Gestion professionnelle du carburant</Text>

        <Text style={styles.subtitle}>
          Une interface claire pour centraliser les demandes, les validations
          et les confirmations de service avec une traçabilité simple.
        </Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>3</Text>
            <Text style={styles.heroStatLabel}>Espaces</Text>
          </View>

          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>Fluide</Text>
            <Text style={styles.heroStatLabel}>Parcours</Text>
          </View>

          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>Suivi</Text>
            <Text style={styles.heroStatLabel}>Complet</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Choisir un espace</Text>
        <Text style={styles.sectionSubtitle}>
          Sélectionne le rôle adapté pour accéder à ton interface.
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

      <View style={styles.bottomInfo}>
        <View style={styles.bottomInfoHeader}>
          <Text style={styles.bottomInfoTitle}>Cycle opérationnel</Text>
          <Text style={styles.bottomInfoBadge}>Traçable</Text>
        </View>

        <Text style={styles.bottomInfoText}>
          Chauffeur → validation du chef → confirmation du pompiste
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
  hero: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#081B33',
    borderRadius: 28,
    padding: 22,
    marginBottom: 24,
    shadowColor: '#081B33',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6
  },
  heroOverlay: {
    position: 'absolute',
    right: -40,
    top: -30,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14
  },
  heroBadgeText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '800'
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: '#CBD5E1',
    marginBottom: 20,
    maxWidth: '92%'
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  heroStatCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minWidth: 95,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 4
  },
  heroStatLabel: {
    color: '#CBD5E1',
    fontSize: 13
  },
  sectionHeader: {
    marginBottom: 14
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6
  },
  sectionSubtitle: {
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
  bottomInfo: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  bottomInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  bottomInfoTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A'
  },
  bottomInfoBadge: {
    backgroundColor: '#E2E8F0',
    color: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '800'
  },
  bottomInfoText: {
    color: '#475569',
    lineHeight: 21,
    fontSize: 14
  }
})