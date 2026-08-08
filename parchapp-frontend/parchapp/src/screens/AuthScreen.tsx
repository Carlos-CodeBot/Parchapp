// src/screens/AuthScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { login, registrar } from '../services/auth.service';
import { useStore } from '../store/useStore';

export default function AuthScreen() {
  const setUsuario = useStore((s) => s.setUsuario);
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const submit = async () => {
    if (!email || !password) { Alert.alert('Completa todos los campos'); return; }
    if (modo === 'registro' && !nombre) { Alert.alert('¿Cómo te llamas?'); return; }
    setCargando(true);
    try {
      const usuario = modo === 'login'
        ? await login(email, password)
        : await registrar(nombre, email, password);
      setUsuario(usuario);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Algo salió mal');
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>📍</Text>
        <Text style={styles.title}>ParchApp</Text>
        <Text style={styles.subtitle}>Encuentra los mejores parchaderos</Text>

        <View style={styles.form}>
          {modo === 'registro' && (
            <TextInput
              style={styles.input} placeholder="Tu nombre" placeholderTextColor="#bbb"
              value={nombre} onChangeText={setNombre}
            />
          )}
          <TextInput
            style={styles.input} placeholder="Correo electrónico" placeholderTextColor="#bbb"
            value={email} onChangeText={setEmail}
            autoCapitalize="none" keyboardType="email-address"
          />
          <TextInput
            style={styles.input} placeholder="Contraseña" placeholderTextColor="#bbb"
            value={password} onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.btn} onPress={submit} disabled={cargando}>
            {cargando
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>{modo === 'login' ? 'Entrar al parche' : 'Crear cuenta'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setModo(modo === 'login' ? 'registro' : 'login')} style={styles.switchBtn}>
            <Text style={styles.switchText}>
              {modo === 'login'
                ? '¿Nuevo aquí? Crea tu cuenta'
                : '¿Ya tienes cuenta? Inicia sesión'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '800', color: '#7F77DD', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#999', textAlign: 'center', marginBottom: 40 },
  form: { gap: 12 },
  input: {
    borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#222',
  },
  btn: {
    backgroundColor: '#7F77DD', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  switchBtn: { alignItems: 'center', paddingTop: 8 },
  switchText: { color: '#7F77DD', fontWeight: '500', fontSize: 13 },
});
