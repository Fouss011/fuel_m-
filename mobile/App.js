import { Image, StyleSheet, View } from 'react-native'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import AppNavigator from './src/navigation/AppNavigator'

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent'
  }
}

export default function App() {
  return (
    <View style={styles.root}>
      <Image
        source={require('./assets/fuel-bg.png')}
        style={styles.fixedBackground}
        resizeMode="cover"
      />

      <View style={styles.overlay} />

      <View style={styles.appLayer}>
        <NavigationContainer theme={navigationTheme}>
          <AppNavigator />
        </NavigationContainer>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EEF4FA',
    overflow: 'hidden'
  },
  fixedBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%'
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(238,244,250,0.72)'
  },
  appLayer: {
    flex: 1,
    backgroundColor: 'transparent'
  }
})