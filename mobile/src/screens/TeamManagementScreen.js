import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator
} from 'react-native'
import { api, getStoredSession } from '../api/client'

const ROLE_OPTIONS = [
  { label: 'Chauffeur', value: 'driver' },
  { label: 'Pompiste', value: 'pump_attendant' }
]

export default function TeamManagementScreen() {
  const [session, setSession] = useState(null)
  const [structureName, setStructureName] = useState('')
  const [users, setUsers] = useState([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('driver')
  const [loading, setLoading] = useState(false)
  const [screenLoading, setScreenLoading] = useState(true)

  useEffect(() => {
    initialize()
  }, [])

  async function initialize() {
    try {
      setScreenLoading(true)

      const storedSession = await getStoredSession()

      if (!storedSession?.structureId) {
        setUsers([])
        setSession(null)
        Alert.alert(
          'Structure requise',
          'Crée ou sélectionne une structure avant de gérer ton équipe.'
        )
        return
      }

      setSession(storedSession)
      setStructureName(storedSession.structureName || '')

      await loadUsers(storedSession.structureId)
    } catch (error) {
      console.log('Erreur init équipe:', error?.response?.data || error.message)
      setUsers([])
    } finally {
      setScreenLoading(false)
    }
  }

  async function loadUsers(structureId) {
    try {
      if (!structureId) {
        setUsers([])
        return
      }

      const response = await api.get(`/users?structure_id=${structureId}`)
      setUsers(response?.data?.data || [])
    } catch (error) {
      console.log('Erreur chargement utilisateurs:', error?.response?.data || error.message)
      setUsers([])
    }
  }

  async function handleAddUser() {
    if (!session?.structureId) {
      Alert.alert('Structure requise', 'Aucune structure active détectée.')
      return
    }

    const cleanName = name.trim()
    const cleanPhone = phone.trim()

    if (!cleanName) {
      Alert.alert('Nom requis', 'Le nom du membre est obligatoire.')
      return
    }

    if (!cleanPhone) {
      Alert.alert('Téléphone requis', 'Le téléphone du membre est obligatoire.')
      return
    }

    if (!role) {
      Alert.alert('Rôle requis', 'Choisis un rôle avant d’ajouter le membre.')
      return
    }

    try {
      setLoading(true)

      await api.post('/users', {
        structure_id: session.structureId,
        name: cleanName,
        phone: cleanPhone,
        role
      })

      setName('')
      setPhone('')
      setRole('driver')

      await loadUsers(session.structureId)

      Alert.alert('Succès', 'Membre ajouté à l’équipe.')
    } catch (error) {
      console.log('Erreur création utilisateur:', error?.response?.data || error.message)

      Alert.alert(
        'Erreur',
        error?.response?.data?.message || 'Impossible d’ajouter ce membre.'
      )
    } finally {
      setLoading(false)
    }
  }

  function renderRole(roleValue) {
    switch (roleValue) {
      case 'driver':
        return { label: 'Chauffeur', bg: '#DBEAFE', color: '#1D4ED8' }
      case 'chief':
        return { label: 'Chef', bg: '#DCFCE7', color: '#047857' }
      case 'pump_attendant':
        return { label: 'Pompiste', bg: '#FEF3C7', color: '#B45309' }
      default:
        return { label: roleValue || 'Inconnu', bg: '#E2E8F0', color: '#475569' }
    }
  }

  if (screenLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#081B33" />
      </View>
    )
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={users}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Gestion équipe</Text>
            <Text style={styles.heroText}>
              Ajoute et visualise les membres de ta structure active.
            </Text>

            <View style={styles.structureBox}>
              <Text style={styles.structureLabel}>Structure active</Text>
              <Text style={styles.structureValue}>
                {structureName || 'Aucune structure sélectionnée'}
              </Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Ajouter un membre</Text>

            <Text style={styles.label}>Nom</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex : Kossi Chauffeur"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex : 90000001"
              placeholderTextColor="#94A3B8"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Rôle</Text>
            <View style={styles.roleRow}>
              {ROLE_OPTIONS.map((item) => {
                const active = role === item.value

                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.roleOption, active && styles.roleOptionActive]}
                    onPress={() => setRole(item.value)}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.roleText, active && styles.roleTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Ajout par structure</Text>
              <Text style={styles.infoText}>
                Chaque membre ajouté ici sera automatiquement rattaché à la structure active.
                Le chef principal n’est pas créé ici : il est créé dès la création de la structure.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleAddUser}
              disabled={loading}
              activeOpacity={0.9}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Ajout en cours...' : 'Ajouter à l’équipe'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Membres</Text>
            <Text style={styles.sectionSubtitle}>
              {users.length} membre{users.length > 1 ? 's' : ''}
            </Text>
          </View>
        </>
      }
      renderItem={({ item }) => {
        const roleUi = renderRole(item.role)

        return (
          <View style={styles.userCard}>
            <View style={styles.userHeader}>
              <View style={styles.userInfos}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userPhone}>{item.phone}</Text>
              </View>

              <View style={[styles.roleBadge, { backgroundColor: roleUi.bg }]}>
                <Text style={[styles.roleBadgeText, { color: roleUi.color }]}>
                  {roleUi.label}
                </Text>
              </View>
            </View>
          </View>
        )
      }}
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Aucun membre pour le moment</Text>
          <Text style={styles.emptyText}>
            Les membres ajoutés à cette structure apparaîtront ici.
          </Text>
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
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
    padding: 16,
    paddingBottom: 28
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6
  },
  heroText: {
    color: '#475569',
    lineHeight: 21,
    marginBottom: 14
  },
  structureBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  structureLabel: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 4
  },
  structureValue: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800'
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14
  },
  label: {
    marginBottom: 8,
    fontWeight: '800',
    color: '#0F172A'
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    color: '#0F172A'
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  roleOption: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  roleOptionActive: {
    backgroundColor: '#081B33',
    borderColor: '#081B33'
  },
  roleText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13
  },
  roleTextActive: {
    color: '#FFFFFF'
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
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16
  },
  sectionRow: {
    marginBottom: 14
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 14
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  userInfos: {
    flex: 1,
    paddingRight: 10
  },
  userName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4
  },
  userPhone: {
    color: '#64748B',
    fontSize: 14
  },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '900'
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20
  }
})