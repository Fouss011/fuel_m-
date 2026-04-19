import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native'
import { api, saveSession } from '../api/client'

export default function PinAccessScreen({ route, navigation }) {
  const { role } = route.params

  const [pin, setPin] = useState('')
  const [structures, setStructures] = useState([])
  const [selectedStructureId, setSelectedStructureId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const isChief = role === 'chief'
  const title = isChief ? 'Accès chef' : 'Accès pompiste'
  const subtitle = isChief
    ? 'Entre le code PIN de la structure pour accéder à l’espace de pilotage.'
    : 'Entre le code PIN de la structure pour accéder à l’espace de confirmation.'
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

      const structuresResponse = await api.get('/structures')
      const allStructures = structuresResponse?.data?.data || []

      setStructures(allStructures)

      if (allStructures.length > 0) {
        setSelectedStructureId(allStructures[0].id)
      }
    } catch (error) {
      console.log('Erreur init accès pin:', error?.response?.data || error.message)
      Alert.alert('Erreur', 'Impossible de charger les structures.')
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
      Alert.alert('Code PIN requis', 'Entre le code PIN pour continuer.')
      return
    }

    const expectedPin = isChief
      ? selectedStructure.pin_chief
      : selectedStructure.pin_pump

    if (!expectedPin) {
      Alert.alert(
        'PIN manquant',
        isChief
          ? 'Aucun code PIN chef n’est défini pour cette structure.'
          : 'Aucun code PIN pompiste n’est défini pour cette structure.'
      )
      return
    }

    if (cleanPin !== String(expectedPin).trim()) {
      Alert.alert('Code PIN incorrect', 'Code PIN pas correct, réessaie.')
      return
    }

    try {
      setSubmitting(true)

      const usersResponse = await api.get(
        `/users?structure_id=${selectedStructure.id}&role=${
          isChief ? 'chief' : 'pump_attendant'
        }`
      )

      const matchedUsers = usersResponse?.data?.data || []
      const linkedUser = matchedUsers[0]

      if (!linkedUser) {
        Alert.alert(
          'Utilisateur introuvable',
          isChief
            ? 'Aucun chef n’est encore rattaché à cette structure.'
            : 'Aucun pompiste n’est encore rattaché à cette structure.'
        )
        return
      }

      await saveSession({
        userId: linkedUser.id,
        userName: linkedUser.name || null,
        role: linkedUser.role,
        structureId: selectedStructure.id,
        structureName: selectedStructure.name
      })

      navigation.replace(targetScreen)
    } catch (error) {
      console.log('Erreur validation pin:', error?.response?.data || error.message)
      Alert.alert(
        'Erreur',
        error?.response?.data?.message ||
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
      </View>
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
          placeholder="Entrer le code"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          secureTextEntry
          maxLength={8}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Accès protégé</Text>
          <Text style={styles.infoText}>
            L’accès est lié à la structure sélectionnée. Le code PIN doit correspondre
            au rôle et à la structure choisis.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleValidate}
          activeOpacity={0.9}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? 'Ouverture...' : 'Accéder à l’espace'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F7FB'
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F7FB'
  },
  content: {
    padding: 20,
    justifyContent: 'center',
    flexGrow: 1
  },
  topCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  badgeBase: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12
  },
  badgeChief: {
    backgroundColor: '#DCFCE7'
  },
  badgeChiefText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  badgePump: {
    backgroundColor: '#FEF3C7'
  },
  badgePumpText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8
  },
  subtitle: {
    color: '#475569',
    lineHeight: 21
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  label: {
    marginBottom: 8,
    fontWeight: '800',
    color: '#0F172A'
  },
  chipsScroll: {
    marginBottom: 14
  },
  chipsRow: {
    paddingRight: 8
  },
  chip: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 8
  },
  chipActive: {
    backgroundColor: '#081B33'
  },
  chipText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13
  },
  chipTextActive: {
    color: '#FFFFFF'
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    color: '#0F172A'
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  infoTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 6
  },
  infoText: {
    color: '#64748B',
    lineHeight: 20,
    fontSize: 13
  },
  button: {
    backgroundColor: '#081B33',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16
  }
})