// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { escucharSesion } from '../src/services/auth.service';
import { useStore } from '../src/store/useStore';

export default function RootLayout() {
  const setUsuario = useStore((s) => s.setUsuario);

  useEffect(() => {
    const unsub = escucharSesion(
      (usuario) => setUsuario(usuario),
      () => setUsuario(null)
    );
    return unsub;
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
