import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native'
import { api, setStoredSession } from '../api/client'

const INPUT_PROPS = {
  placeholderTextColor: '#64748B',
  selectionColor: '#0F766E',
  cursorColor: '#0F766E'
}

export default function PinAccessScreen({ route, navigation }) {
  const role = route?.params?.role || 'driver'

  const [mode, setMode] = useState(role === 'chief' ? 'login' : 'structure')
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)

  const [structureCode, setStructureCode] = useState('')
  const [availableUsers, setAvailableUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedUserName, setSelectedUserName] = useState('')
  const [selectedUserPin, setSelectedUserPin] = useState('')

  const [showChiefPassword, setShowChiefPassword] = useState(false)
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [showUserPin, setShowUserPin] = useState(false)

  const [chiefPhone, setChiefPhone] = useState('')
  const [chiefPassword, setChiefPassword] = useState('')

  const [createName, setCreateName] = useState('')
  const [createOwnerName, setCreateOwnerName] = useState('')
  const [createPhone, setCreatePhone] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createConfirmPassword, setCreateConfirmPassword] = useState('')
  const [createStructureCode, setCreateStructureCode] = useState('')

  useEffect(() => {
    setMode(role === 'chief' ? 'login' : 'structure')
  }, [role])

  const screenConfig = useMemo(() => {
    if (role === 'chief') {
      return {
        title: 'Espace chef',
        subtitle: 'Connecte-toi à ta structure ou crée ton compte pour démarrer.',
        accent: '#0F766E',
        badge: 'CHEF'
      }
    }

    if (role === 'pump_attendant') {
      return {
        title: 'Accès pompiste',
        subtitle: 'Entre le code station, choisis ton profil puis confirme ton code PIN.',
        accent: '#B45309',
        badge: 'POMPISTE'
      }
    }

    return {
      title: 'Accès chauffeur',
      subtitle: 'Entre le code structure, choisis ton nom puis confirme ton code PIN.',
      accent: '#2563EB',
      badge: 'CHAUFFEUR'
    }
  }, [role])

  function resetStructureFlow() {
    setAvailableUsers([])
    setSelectedUserId(null)
    setSelectedUserName('')
    setSelectedUserPin('')
  }

  async function handleChiefLogin() {
    if (!chiefPhone.trim()) {
      Alert.alert('Champ manquant', 'Entre le numéro du chef.')
      return
    }

    if (!chiefPassword.trim()) {
      Alert.alert('Champ manquant', 'Entre le mot de passe.')
      return
    }

    try {
      setLoading(true)

      const response = await api.post('/auth/chief-login', {
        phone: chiefPhone.trim(),
        password: chiefPassword.trim()
      })

      const payload = response?.data?.data

      if (!payload?.token || !payload?.session) {
        throw new Error('Réponse de connexion invalide')
      }

      await setStoredSession({
        token: payload.token,
        role: payload.session.role,
        userId: payload.session.userId,
        userName: payload.session.userName,
        structureId: payload.session.structureId || null,
        structureName: payload.session.structureName || null,
        structureCode: payload.session.structureCode || null,
        stationId: payload.session.stationId || payload.session.station_id || null,
        stationName: payload.session.stationName || payload.session.station_name || null,
        stationCode:
          payload.session.stationCode ||
          payload.session.station_code ||
          structureCode.trim().toUpperCase(),
        expiresAt: payload.expires_at
      })

      Alert.alert('Connexion réussie', 'Bienvenue dans ton espace chef.')

      navigation.reset({
        index: 0,
        routes: [{ name: 'ChiefDashboard' }]
      })
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Impossible de se connecter pour le moment.'

      Alert.alert('Connexion impossible', message)
    } finally {
      setLoading(false)
    }
  }

  async function handleChiefCreateAccount() {
    if (!createName.trim()) {
      Alert.alert('Champ manquant', 'Entre le nom de la structure.')
      return
    }

    if (!createOwnerName.trim()) {
      Alert.alert('Champ manquant', 'Entre le nom du chef.')
      return
    }

    if (!createPhone.trim()) {
      Alert.alert('Champ manquant', 'Entre le numéro du chef.')
      return
    }

    if (!createEmail.trim()) {
      Alert.alert('Champ manquant', 'Entre l’email du chef.')
      return
    }

    if (!createStructureCode.trim()) {
      Alert.alert('Champ manquant', 'Entre le code structure.')
      return
    }

    if (!createPassword.trim()) {
      Alert.alert('Champ manquant', 'Entre le mot de passe.')
      return
    }

    if (!createConfirmPassword.trim()) {
      Alert.alert('Champ manquant', 'Confirme le mot de passe.')
      return
    }

    if (createPassword.trim() !== createConfirmPassword.trim()) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.')
      return
    }

    try {
      setLoading(true)

      await api.post('/structures', {
        name: createName.trim(),
        owner_name: createOwnerName.trim(),
        owner_phone: createPhone.trim(),
        owner_email: createEmail.trim().toLowerCase(),
        owner_password: createPassword.trim(),
        confirm_password: createConfirmPassword.trim(),
        structure_code: createStructureCode.trim().toUpperCase()
      })

      Alert.alert(
        'Compte créé',
        'Le compte chef et la structure ont été créés. Connecte-toi maintenant.'
      )

      setChiefPhone(createPhone.trim())
      setChiefPassword(createPassword.trim())
      setMode('login')
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Impossible de créer le compte pour le moment.'

      Alert.alert('Création impossible', message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLoadStructureUsers() {
    if (!structureCode.trim()) {
      Alert.alert(
        'Champ manquant',
        role === 'pump_attendant'
          ? 'Entre le code station.'
          : 'Entre le code structure.'
      )
      return
    }

    try {
      setLoadingUsers(true)
      resetStructureFlow()

      const normalizedCode = structureCode.trim().toUpperCase()
      const roleQuery = role === 'pump_attendant' ? 'pump_attendant' : 'driver'

      const endpoint =
        role === 'pump_attendant'
          ? `/auth/station-users/${normalizedCode}?role=${roleQuery}`
          : `/auth/structure-users/${normalizedCode}?role=${roleQuery}`

      const response = await api.get(endpoint)
      const users = response?.data?.data?.users || []

      if (!users.length) {
        Alert.alert(
          'Aucun profil trouvé',
          `Aucun ${
            role === 'pump_attendant'
              ? 'pompiste actif trouvé pour cette station'
              : 'chauffeur actif trouvé pour cette structure'
          }.`
        )
        return
      }

      setAvailableUsers(users)
      setSelectedUserId(users[0]?.id || null)
      setSelectedUserName(users[0]?.name || '')
      setSelectedUserPin('')
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        (role === 'pump_attendant'
          ? 'Impossible de charger les profils de cette station.'
          : 'Impossible de charger les profils de cette structure.')

      Alert.alert('Accès impossible', message)
    } finally {
      setLoadingUsers(false)
    }
  }

  function handleSelectUser(user) {
    setSelectedUserId(user.id)
    setSelectedUserName(user.name)
    setSelectedUserPin('')
  }

  async function handleDriverAccess() {
    if (!structureCode.trim()) {
      Alert.alert('Champ manquant', 'Entre le code structure.')
      return
    }

    if (!selectedUserId) {
      Alert.alert('Champ manquant', 'Choisis ton nom dans la liste.')
      return
    }

    if (!selectedUserPin.trim()) {
      Alert.alert('Champ manquant', 'Entre le code PIN du chauffeur.')
      return
    }

    try {
      setLoading(true)

      const response = await api.post('/auth/driver-access', {
        structure_code: structureCode.trim().toUpperCase(),
        driver_id: selectedUserId,
        pin_code: selectedUserPin.trim()
      })

      const payload = response?.data?.data

      if (!payload?.token || !payload?.session) {
        throw new Error('Réponse chauffeur invalide')
      }

      await setStoredSession({
        token: payload.token,
        role: payload.session.role,
        userId: payload.session.userId,
        userName: payload.session.userName,
        structureId: payload.session.structureId || null,
        structureName: payload.session.structureName || null,
        structureCode: payload.session.structureCode || null,
        stationId: payload.session.stationId || payload.session.station_id || null,
        stationName: payload.session.stationName || payload.session.station_name || null,
        stationCode:
          payload.session.stationCode ||
          payload.session.station_code ||
          structureCode.trim().toUpperCase(),
        truckNumber: payload.session.truckNumber || null,
        expiresAt: payload.expires_at
      })

      Alert.alert('Accès autorisé', `Bienvenue ${payload.session.userName}.`)

      navigation.reset({
        index: 0,
        routes: [{ name: 'DriverDashboard' }]
      })
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Impossible d’ouvrir l’espace chauffeur.'

      Alert.alert('Accès refusé', message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePumpAccess() {
    if (!structureCode.trim()) {
      Alert.alert('Champ manquant', 'Entre le code station.')
      return
    }

    if (!selectedUserId) {
      Alert.alert('Champ manquant', 'Choisis ton profil pompiste.')
      return
    }

    if (!selectedUserPin.trim()) {
      Alert.alert('Champ manquant', 'Entre le code PIN du pompiste.')
      return
    }

    try {
      setLoading(true)

      const response = await api.post('/auth/pump-access', {
        station_code: structureCode.trim().toUpperCase(),
        pump_attendant_id: selectedUserId,
        pin_code: selectedUserPin.trim()
      })

      const payload = response?.data?.data

      if (!payload?.token || !payload?.session) {
        throw new Error('Réponse pompiste invalide')
      }

      await setStoredSession({
        token: payload.token,
        role: payload.session.role,
        userId: payload.session.userId,
        userName: payload.session.userName,
        structureId: payload.session.structureId || null,
        structureName: payload.session.structureName || null,
        structureCode: payload.session.structureCode || null,
        stationId: payload.session.stationId || payload.session.station_id || null,
        stationName: payload.session.stationName || payload.session.station_name || null,
        stationCode:
          payload.session.stationCode ||
          payload.session.station_code ||
          structureCode.trim().toUpperCase(),
        expiresAt: payload.expires_at
      })

      Alert.alert('Accès autorisé', `Bienvenue ${payload.session.userName}.`)

      navigation.reset({
        index: 0,
        routes: [{ name: 'PumpAttendantDashboard' }]
      })
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Impossible d’ouvrir l’espace pompiste.'

      Alert.alert('Accès refusé', message)
    } finally {
      setLoading(false)
    }
  }

  function renderPasswordInput({
    value,
    onChangeText,
    placeholder,
    visible,
    onToggle,
    keyboardType = 'default'
  }) {
    return (
      <View style={styles.passwordBox}>
        <TextInput
          {...INPUT_PROPS}
          style={styles.passwordInput}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          keyboardType={keyboardType}
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.eyeButton} onPress={onToggle}>
          <Text style={styles.eyeText}>{visible ? 'Masquer' : 'Voir'}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  function renderChiefLogin() {
    return (
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Se connecter</Text>

        <TextInput
          {...INPUT_PROPS}
          style={styles.input}
          placeholder="Numéro du chef"
          value={chiefPhone}
          onChangeText={setChiefPhone}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />

        {renderPasswordInput({
          value: chiefPassword,
          onChangeText: setChiefPassword,
          placeholder: 'Mot de passe',
          visible: showChiefPassword,
          onToggle: () => setShowChiefPassword(!showChiefPassword)
        })}

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={() =>
            navigation.navigate('ForgotPassword', {
              type: 'chief'
            })
          }
        >
          <Text style={[styles.forgotButtonText, { color: screenConfig.accent }]}>
            Mot de passe oublié ?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: screenConfig.accent }]}
          onPress={handleChiefLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setMode('register')}
        >
          <Text style={styles.switchButtonText}>Créer un compte chef</Text>
        </TouchableOpacity>
      </View>
    )
  }

  function renderChiefRegister() {
    return (
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Créer un compte chef</Text>

        <TextInput
          {...INPUT_PROPS}
          style={styles.input}
          placeholder="Nom de la structure"
          value={createName}
          onChangeText={setCreateName}
        />

        <TextInput
          {...INPUT_PROPS}
          style={styles.input}
          placeholder="Nom du chef"
          value={createOwnerName}
          onChangeText={setCreateOwnerName}
        />

        <TextInput
          {...INPUT_PROPS}
          style={styles.input}
          placeholder="Numéro du chef"
          value={createPhone}
          onChangeText={setCreatePhone}
          keyboardType="phone-pad"
        />

        <TextInput
          {...INPUT_PROPS}
          style={styles.input}
          placeholder="Email du chef"
          value={createEmail}
          onChangeText={setCreateEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          {...INPUT_PROPS}
          style={styles.input}
          placeholder="Code structure (ex: TEMYA01)"
          value={createStructureCode}
          onChangeText={(value) => setCreateStructureCode(value.toUpperCase())}
          autoCapitalize="characters"
        />

        {renderPasswordInput({
          value: createPassword,
          onChangeText: setCreatePassword,
          placeholder: 'Mot de passe',
          visible: showCreatePassword,
          onToggle: () => setShowCreatePassword(!showCreatePassword)
        })}

        {renderPasswordInput({
          value: createConfirmPassword,
          onChangeText: setCreateConfirmPassword,
          placeholder: 'Confirmer le mot de passe',
          visible: showCreatePassword,
          onToggle: () => setShowCreatePassword(!showCreatePassword)
        })}

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: screenConfig.accent }]}
          onPress={handleChiefCreateAccount}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Créer le compte</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setMode('login')}
        >
          <Text style={styles.switchButtonText}>J’ai déjà un compte</Text>
        </TouchableOpacity>
      </View>
    )
  }

  function renderStructureAccess() {
    return (
      <View style={styles.block}>
        <Text style={styles.blockTitle}>
          {role === 'pump_attendant'
            ? 'Entrer le code station'
            : 'Entrer le code structure'}
        </Text>

        <TextInput
          {...INPUT_PROPS}
          style={styles.input}
          placeholder={role === 'pump_attendant' ? 'Code station' : 'Code structure'}
          value={structureCode}
          onChangeText={(value) => {
            setStructureCode(value.toUpperCase())
            resetStructureFlow()
          }}
          autoCapitalize="characters"
        />

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: screenConfig.accent }]}
          onPress={handleLoadStructureUsers}
          disabled={loadingUsers}
        >
          {loadingUsers ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {role === 'pump_attendant'
                ? 'Charger les pompistes'
                : 'Charger les profils'}
            </Text>
          )}
        </TouchableOpacity>

        {!!availableUsers.length && (
          <View style={styles.selectionBox}>
            <Text style={styles.selectionTitle}>
              Choisis ton {role === 'pump_attendant' ? 'profil pompiste' : 'nom'}
            </Text>

            {availableUsers.map((user) => {
              const isSelected = selectedUserId === user.id

              return (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.userRow,
                    isSelected && {
                      borderColor: screenConfig.accent,
                      backgroundColor: '#F8FBFF'
                    }
                  ]}
                  onPress={() => handleSelectUser(user)}
                >
                  <View style={styles.userRowLeft}>
                    <Text style={styles.userName}>{user.name}</Text>

                    {!!user.truck_number && (
                      <Text style={styles.userMeta}>
                        Camion : {user.truck_number}
                      </Text>
                    )}

                    {!!user.phone && (
                      <Text style={styles.userMeta}>Tél : {user.phone}</Text>
                    )}
                  </View>

                  <View
                    style={[
                      styles.radio,
                      isSelected && {
                        borderColor: screenConfig.accent,
                        backgroundColor: screenConfig.accent
                      }
                    ]}
                  />
                </TouchableOpacity>
              )
            })}

            {renderPasswordInput({
              value: selectedUserPin,
              onChangeText: setSelectedUserPin,
              placeholder:
                role === 'pump_attendant'
                  ? 'Code PIN pompiste'
                  : 'Code PIN chauffeur',
              visible: showUserPin,
              onToggle: () => setShowUserPin(!showUserPin),
              keyboardType: 'numeric'
            })}

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: screenConfig.accent }]}
              onPress={role === 'pump_attendant' ? handlePumpAccess : handleDriverAccess}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {role === 'pump_attendant'
                    ? 'Ouvrir l’espace pompiste'
                    : 'Ouvrir l’espace chauffeur'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { borderTopColor: screenConfig.accent }]}>
        <View style={[styles.heroBadge, { backgroundColor: screenConfig.accent }]}>
          <Text style={styles.heroBadgeText}>{screenConfig.badge}</Text>
        </View>

        <Text style={styles.heroTitle}>{screenConfig.title}</Text>
        <Text style={styles.heroSubtitle}>{screenConfig.subtitle}</Text>
      </View>

      {role === 'chief'
        ? mode === 'register'
          ? renderChiefRegister()
          : renderChiefLogin()
        : renderStructureAccess()}

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← Retour</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },

  content: {
    padding: 18,
    paddingBottom: 32
  },

  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderTopWidth: 6,
    shadowColor: '#081B33',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },

  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12
  },

  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#081B33',
    marginBottom: 8
  },

  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#5F6E7D'
  },

  block: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#081B33',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2
  },

  blockTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#081B33',
    marginBottom: 14
  },

  input: {
    backgroundColor: '#F6F9FC',
    borderWidth: 1,
    borderColor: '#DFE7F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#081B33',
    marginBottom: 12
  },

  passwordBox: {
    backgroundColor: '#F6F9FC',
    borderWidth: 1,
    borderColor: '#DFE7F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#081B33'
  },

  eyeButton: {
    paddingLeft: 12,
    paddingVertical: 8
  },

  eyeText: {
    color: '#0F766E',
    fontWeight: '900',
    fontSize: 13
  },

  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 12,
    paddingVertical: 4
  },

  forgotButtonText: {
    fontWeight: '900',
    fontSize: 13
  },

  primaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },

  switchButton: {
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8
  },

  switchButtonText: {
    color: '#081B33',
    fontSize: 14,
    fontWeight: '700'
  },

  selectionBox: {
    marginTop: 16,
    paddingTop: 8
  },

  selectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#081B33',
    marginBottom: 12
  },

  userRow: {
    borderWidth: 1,
    borderColor: '#DFE7F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF'
  },

  userRowLeft: {
    flex: 1,
    paddingRight: 10
  },

  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#081B33',
    marginBottom: 4
  },

  userMeta: {
    fontSize: 13,
    color: '#5F6E7D'
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#C9D4E0'
  },

  backButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14
  },

  backButtonText: {
    color: '#516173',
    fontSize: 14,
    fontWeight: '700'
  }
})