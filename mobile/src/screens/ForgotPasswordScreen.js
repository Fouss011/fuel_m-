import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native'

import {
  forgotChiefPassword,
  forgotStationPassword
} from '../api/client'

const INPUT_PROPS = {
  placeholderTextColor: '#64748B',
  selectionColor: '#0F766E',
  cursorColor: '#0F766E'
}

export default function ForgotPasswordScreen({ route, navigation }) {
  const type = route?.params?.type || 'chief'

  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const isStation = type === 'station'

  async function handleResetPassword() {
    if (!email.trim()) {
      Alert.alert('Email requis', 'Entre ton email.')
      return
    }

    if (!newPassword.trim()) {
      Alert.alert('Mot de passe requis', 'Entre le nouveau mot de passe.')
      return
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.')
      return
    }

    try {
      setLoading(true)

      if (isStation) {
        await forgotStationPassword({
          email: email.trim().toLowerCase(),
          newPassword: newPassword.trim()
        })
      } else {
        await forgotChiefPassword({
          email: email.trim().toLowerCase(),
          newPassword: newPassword.trim()
        })
      }

      Alert.alert(
        'Succès',
        'Mot de passe modifié. Tu peux maintenant te connecter.'
      )

      navigation.goBack()
    } catch (error) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message ||
          error?.message ||
          'Impossible de modifier le mot de passe.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.badge}>
          {isStation ? 'RESPONSABLE STATION' : 'CHEF'}
        </Text>

        <Text style={styles.title}>Mot de passe oublié</Text>

        <Text style={styles.subtitle}>
          Entre l’email lié au compte puis choisis un nouveau mot de passe.
        </Text>
      </View>

      <View style={styles.card}>
        <TextInput
          {...INPUT_PROPS}
          style={styles.input}
          placeholder="Email du compte"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={styles.passwordBox}>
          <TextInput
            {...INPUT_PROPS}
            style={styles.passwordInput}
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />

          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.eyeText}>
              {showPassword ? 'Masquer' : 'Voir'}
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          {...INPUT_PROPS}
          style={styles.input}
          placeholder="Confirmer le mot de passe"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Modifier le mot de passe</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF6FB'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  hero: {
    backgroundColor: '#002B45',
    borderRadius: 26,
    padding: 22,
    marginBottom: 16
  },
  badge: {
    color: '#A7F3D0',
    fontWeight: '900',
    marginBottom: 10
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900'
  },
  subtitle: {
    color: '#D6E4F0',
    marginTop: 10,
    lineHeight: 22,
    fontWeight: '700'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D2E3EF'
  },
  input: {
    backgroundColor: '#F8FBFD',
    borderWidth: 1,
    borderColor: '#C9DCEB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    color: '#0F172A',
    fontWeight: '700'
  },
  passwordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FBFD',
    borderWidth: 1,
    borderColor: '#C9DCEB',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 14
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#0F172A',
    fontWeight: '700'
  },
  eyeText: {
    color: '#0F766E',
    fontWeight: '900'
  },
  button: {
    backgroundColor: '#0F766E',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center'
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900'
  }
})