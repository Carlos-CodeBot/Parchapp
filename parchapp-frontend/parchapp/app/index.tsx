// app/index.tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useStore } from '../src/store/useStore';
import MapScreen from '../src/screens/MapScreen';
import AuthScreen from '../src/screens/AuthScreen';

export default function Index() {
  const usuario = useStore((s) => s.usuario);

  // Mientras Firebase verifica la sesión al arrancar (brevemente undefined)
  // se muestra un spinner. Cuando resuelve, va al mapa o al login.
  // Si quieres permitir uso anónimo (ver el mapa sin login),
  // cambia la condición: !usuario → false
  if (usuario === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#7F77DD" />
      </View>
    );
  }

  return usuario ? <MapScreen /> : <AuthScreen />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
