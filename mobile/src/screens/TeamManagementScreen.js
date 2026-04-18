import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../api/client'

const DRIVER_STRUCTURE_NAME_KEY = 'fuel_app_structure_name'

const ROLE_OPTIONS = [
  { label: 'Chauffeur', value: 'driver' },
  { label: 'Chef', value: 'chief' },
  { label: 'Pompiste', value: 'pump_attendant' }
]

export default function TeamManagementScreen() {
  const [structureName, setStructureName] = useState('')
  const [structures, setStructures] = useState([])
  const [selectedStructureId, setSelectedStructureId] = useState(null)

  const [users, setUsers] = useState([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('driver')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    initialize()
  }, [])

  async function initialize() {
    try {
      const storedStructureName = await AsyncStorage.getItem(DRIVER_STRUCTURE_NAME_KEY)
      if (storedStructureName) {
        setStructureName(storedStructureName)
      }

      const structuresResponse = await api.get('/structures')
      const allStructures = structuresResponse?.data?.data || []
      setStructures(allStructures)

      let currentStructure = null

      if (storedStructureName) {
        currentStructure = allStructures.find(
          (item) => item.name?.toLowerCase() === storedStructureName.toLowerCase()
        )
      }

      if (!currentStructure && allStructures.length > 0) {
        currentStructure = allStructures[0]
      }

      if (currentStructure) {
        setSelectedStructureId(currentStructure.id)
        setStructureName(currentStructure.name)
        await loadUsers(currentStructure.id)
      } else {
        setUsers([])
      }
    } catch (error) {
      console.log('Erreur init équipe:', error?.response?.data || error.message)
      setUsers([])
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

  async function handleSelectStructure(structure) {
    try {
      setSelectedStructureId(structure.id)
      setStructureName(structure.name)
      await AsyncStorage.setItem(DRIVER_STRUCTURE_NAME_KEY, structure.name)
      await loadUsers(structure.id)
    } catch (error) {
      console.log('Erreur sélection structure:', error.message)
    }
  }

  async function handleAddUser() {
    if (!selectedStructureId) {
      Alert.alert('Erreur', 'Aucune structure sélectionnée')
      return
    }

    if (!name.trim() || !phone.trim()) {
      Alert.alert('Erreur', 'Le nom et le téléphone sont obligatoires')
      return
    }

    try {
      setLoading(true)

      await api.post('/users', {
        structure_id: selectedStructureId,
        name: name.trim(),
        phone: phone.trim(),
        role
      })

      setName('')
      setPhone('')
      setRole('driver')

      await loadUsers(selectedStructureId)
      Alert.alert('Succès', 'Membre ajouté à l’équipe')
    } catch (error) {
      console.log('Erreur création utilisateur:', error?.response?.data || error.message)
      Alert.alert(
        'Erreur',
        error?.response?.data?.message || 'Impossible d’ajouter ce membre'
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
              Ajoute et visualise les membres d’une structure.
            </Text>

            <View style={styles.structureBox}>
              <Text style={styles.structureLabel}>Structure active</Text>
              <Text style={styles.structureValue}>
                {structureName || 'Aucune structure sélectionnée'}
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.structureChips}
            style={styles.structureScroll}
          >
            {structures.map((item) => {
              const active = selectedStructureId === item.id

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.structureChip, active && styles.structureChipActive]}
                  onPress={() => handleSelectStructure(item)}
                  activeOpacity={0.9}
                >
                  <Text
                    style={[
                      styles.structureChipText,
                      active && styles.structureChipTextActive
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

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
              <View>
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
  structureScroll: {
    marginBottom: 14
  },
  structureChips: {
    paddingRight: 8
  },
  structureChip: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 8
  },
  structureChipActive: {
    backgroundColor: '#081B33'
  },
  structureChipText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13
  },
  structureChipTextActive: {
    color: '#FFFFFF'
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
    marginBottom: 18
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