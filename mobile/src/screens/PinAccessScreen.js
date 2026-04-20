import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput
} from 'react-native'
import { api, saveSession } from '../api/client'

export default function PinAccessScreen({ route, navigation }) {
  const rawRole = route?.params?.role || 'chief'
  const normalizedRole = rawRole === 'pump' ? 'pump_attendant' : rawRole

  const [pin, setPin] = useState('')
  const [structures, setStructures] = useState([])
  const [selectedStructureId, setSelectedStructureId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const isChief = normalizedRole === 'chief'
  const title = isChief ? 'Connexion chef' : 'Connexion pompiste'
  const subtitle = isChief
    ? 'Choisis une structure déjà créée puis entre le code PIN chef.'
    : 'Choisis une structure puis entre le code PIN pompiste.'
  const targetScreen = isChief ? 'ChiefDashboard' : 'PumpAttendantDashboard'
  const badgeLabel = isChief ? 'CHEF' : 'POMPISTE'
  const badgeStyle = isChief ? styles.badgeChief : styles.badgePump
  const badgeTextStyle = isChief ? styles.badgeChiefText : styles.badgePumpText

  const selectedStructure = useMemo(() => {
    return structures.find((item) => String(item.id) === String(selectedStructureId)) || null
  }, [structures, selectedStructureId])

  useEffect(() => {
    initialize()
  }, [])

  async function initialize() {
    try {
      setLoading(true)

      const structuresResponse = await api.getStructures()
      const allStructures = structuresResponse?.data || []

      setStructures(allStructures)

      if (allStructures.length > 0) {
        setSelectedStructureId(allStructures[0].id)
      }
    } catch (error) {
      console.log('Erreur init accès pin:', error?.data || error?.message || error)
      Alert.alert(
        'Erreur',
        error?.message || 'Impossible de charger les structures.'
      )
    } finally {
      setLoading(false)
    }
  }

  function handleSelectStructure(structure) {
    setSelectedStructureId(structure.id)
  }

  async function handleValidate() {
    const cleanPin = pin.trim()

    if (!selectedStructure) {
      Alert.alert(
        'Structure requise',
        'Sélectionne d’abord une structure avant de continuer.'
      )
      return
    }

    if (!cleanPin) {
      Alert.alert(
        'Code PIN requis',
        'Entre le code PIN pour continuer.'
      )
      return
    }

    if (cleanPin.length < 3) {
      Alert.alert(
        'Code PIN invalide',
        'Le code PIN saisi est trop court. Vérifie puis réessaie.'
      )
      return
    }

    try {
      setSubmitting(true)

      const loginResponse = await api.pinLogin({
        role: normalizedRole,
        structure_id: selectedStructure.id,
        pin: cleanPin
      })

      await saveSession(loginResponse)

      Alert.alert(
        'Connexion réussie',
        loginResponse?.message || 'Session ouverte avec succès.',
        [
          {
            text: 'Continuer',
            onPress: () => navigation.replace(targetScreen)
          }
        ]
      )
    } catch (error) {
      console.log('Erreur validation pin:', error?.data || error?.message || error)

      if (error?.status === 401 || error?.code === 'INVALID_PIN') {
        Alert.alert(
          'PIN incorrect',
          'Le code PIN saisi est incorrect. Vérifie le code puis réessaie.'
        )
        return
      }

      if (error?.status === 404) {
        Alert.alert(
          'Structure ou utilisateur introuvable',
          error?.message ||
            (isChief
              ? 'Aucun chef n’est rattaché à cette structure.'
              : 'Aucun pompiste n’est rattaché à cette structure.')
        )
        return
      }

      if (error?.status === 400) {
        Alert.alert(
          'Données invalides',
          error?.message || 'Tous les champs obligatoires doivent être remplis avant validation.'
        )
        return
      }

      Alert.alert(
        'Erreur',
        error?.message ||
          'Impossible d’ouvrir la session. Vérifie la structure et réessaie.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#081B33" />
        <Text style={styles.loadingText}>Chargement des structures...</Text>
      </View>
    )
  }

  if (structures.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topCard}>
          <View style={[styles.badgeBase, badgeStyle]}>
            <Text style={badgeTextStyle}>{badgeLabel}</Text>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {isChief
              ? 'Aucune structure n’existe encore. Crée d’abord ta structure.'
              : 'Aucune structure n’est disponible. Demande au chef de créer sa structure d’abord.'}
          </Text>
        </View>

        <View style={styles.formCard}>
          {isChief ? (
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('CreateStructure')}
              activeOpacity={0.9}
            >
              <Text style={styles.buttonText}>Créer ma structure</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Structure manquante</Text>
              <Text style={styles.infoText}>
                Le pompiste ne peut pas se connecter tant qu’aucune structure n’a été créée par le chef.
              </Text>
            </View>
          )}
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
      <View style={styles.topCard}>
        <View style={[styles.badgeBase, badgeStyle]}>
          <Text style={badgeTextStyle}>{badgeLabel}</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {isChief ? (
        <View style={styles.secondaryActionCard}>
          <Text style={styles.secondaryActionTitle}>Nouveau chef ?</Text>
          <Text style={styles.secondaryActionText}>
            Si tu n’as pas encore de structure, crée-la d’abord au lieu de choisir une structure existante.
          </Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('CreateStructure')}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryButtonText}>Créer une nouvelle structure</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.formCard}>
        <Text style={styles.label}>Structure</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsScroll}
        >
          {structures.map((item) => {
            const active = String(item.id) === String(selectedStructureId)

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => handleSelectStructure(item)}
                activeOpacity={0.9}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <Text style={styles.label}>Code PIN</Text>

        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          placeholder="Entrer le code PIN"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          secureTextEntry
          maxLength={8}
          editable={!submitting}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Accès protégé</Text>
          <Text style={styles.infoText}>
            L’accès est lié à la structure choisie. Vérifie bien que tu te connectes à la bonne structure.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleValidate}
          activeOpacity={0.9}
          disabled={submitting}
        >
          {submitting ? (
            <View style={styles.buttonInline}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.buttonTextLoading}>Connexion en cours...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Ouvrir la session</Text>
          )}
        </TouchableOpacity>
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
  topCard: {
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
  secondaryActionCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#DDD6FE'
  },
  secondaryActionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4C1D95',
    marginBottom: 8
  },
  secondaryActionText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#5B21B6',
    marginBottom: 14
  },
  secondaryButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },
  badgeBase: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12
  },
  badgeChief: {
    backgroundColor: '#CCFBF1'
  },
  badgePump: {
    backgroundColor: '#FEF3C7'
  },
  badgeChiefText: {
    color: '#115E59',
    fontWeight: '800',
    fontSize: 12
  },
  badgePumpText: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 12
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
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10
  },
  chipsScroll: {
    marginBottom: 18
  },
  chipsRow: {
    paddingRight: 8
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    marginRight: 10
  },
  chipActive: {
    backgroundColor: '#081B33'
  },
  chipText: {
    color: '#334155',
    fontWeight: '700'
  },
  chipTextActive: {
    color: '#FFFFFF'
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 16
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1D4ED8',
    marginBottom: 6
  },
  infoText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#1E3A8A'
  },
  button: {
    backgroundColor: '#081B33',
    borderRadius: 18,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800'
  },
  buttonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonTextLoading: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10
  }
})