import { useState } from 'react'
import { setStoredSession } from '../api/client'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native'

const API_URL = 'https://backend-withered-sky-4709.fly.dev'

export default function SuperAdminLoginScreen({ navigation }) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Entre le téléphone et le mot de passe.')
      return
    }

    try {
      setLoading(true)

      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phone.trim(),
          password: password.trim()
        })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        Alert.alert('Connexion impossible', data.message || 'Identifiants incorrects.')
        return
      }

      const token = data.token || data.data?.token
const admin = data.data?.admin
const session = data.data?.session

await setStoredSession({
  token,
  role: 'super_admin',
  userName: admin?.name || 'Super Admin',
  admin,
  ...session
})

navigation.reset({
  index: 0,
  routes: [
    {
      name: 'SuperAdminDashboard',
      params: {
        token,
        admin,
        session
      }
    }
  ]
})
    } catch (error) {
      Alert.alert('Erreur réseau', 'Impossible de joindre le serveur.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>SUPER ADMIN</Text>
          </View>

          <Text style={styles.title}>Pilotage global</Text>
          <Text style={styles.subtitle}>
            Connecte-toi pour surveiller les stations, les structures, les chauffeurs,
            les pompistes et toutes les transactions.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="90000000"
              placeholderTextColor="#8A97A8"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Mot de passe"
              placeholderTextColor="#8A97A8"
              secureTextEntry
              style={styles.input}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Accéder au tableau de bord</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.warning}>
            Accès réservé au propriétaire de la plateforme.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#07172B'
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF2FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 16
  },
  badgeText: {
    color: '#0B3B75',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1
  },
  title: {
    color: '#081B33',
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 8
  },
  subtitle: {
    color: '#506070',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24
  },
  field: {
    marginBottom: 16
  },
  label: {
    color: '#081B33',
    fontWeight: '800',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#D8E0EA',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#081B33',
    fontSize: 16,
    backgroundColor: '#F8FAFC'
  },
  button: {
    marginTop: 8,
    backgroundColor: '#0B3B75',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16
  },
  warning: {
    textAlign: 'center',
    marginTop: 16,
    color: '#6B7280',
    fontSize: 13
  }
})