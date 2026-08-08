// src/components/AlertaPanel.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, Alert,
} from 'react-native';
import { ALERTA_CONFIG, AlertaTipo } from '../types';
import { crearAlerta } from '../services/alertas.service';
import { useStore } from '../store/useStore';

const { height: SCREEN_H } = Dimensions.get('window');
const PANEL_H = 340;

interface Props { onClose: () => void }

export default function AlertaPanel({ onClose }: Props) {
  const usuario = useStore((s) => s.usuario);
  const ubicacion = useStore((s) => s.ubicacion);
  const [enviando, setEnviando] = useState<AlertaTipo | null>(null);
  const translateY = useRef(new Animated.Value(PANEL_H)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0, damping: 18, stiffness: 120, useNativeDriver: true,
    }).start();
  }, []);

  const cerrar = () => {
    Animated.timing(translateY, {
      toValue: PANEL_H, duration: 220, useNativeDriver: true,
    }).start(onClose);
  };

  const reportar = async (tipo: AlertaTipo) => {
    if (!usuario) {
      Alert.alert('Sesión', 'Debes iniciar sesión para reportar alertas.');
      return;
    }
    if (!ubicacion) {
      Alert.alert('Ubicación', 'No podemos detectar tu posición.');
      return;
    }
    setEnviando(tipo);
    try {
      await crearAlerta(tipo, ubicacion.lat, ubicacion.lng, usuario.uid);
      cerrar();
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar la alerta.');
    } finally {
      setEnviando(null);
    }
  };

  const tipos = Object.entries(ALERTA_CONFIG) as [AlertaTipo, { emoji: string; label: string }][];

  return (
    <>
      {/* Overlay oscuro */}
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={cerrar} />

      <Animated.View style={[styles.panel, { transform: [{ translateY }] }]}>
        {/* Handle */}
        <View style={styles.handleArea}>
          <View style={styles.handle} />
        </View>

        <Text style={styles.title}>¿Qué está pasando cerca?</Text>
        <Text style={styles.subtitle}>La alerta dura 45 minutos y avisa a todos en la zona</Text>

        <View style={styles.grid}>
          {tipos.map(([key, cfg]) => (
            <TouchableOpacity
              key={key}
              style={[styles.alertaOpt, enviando === key && styles.alertaOptActive]}
              onPress={() => reportar(key)}
              disabled={enviando !== null}
            >
              <Text style={styles.alertaEmoji}>{cfg.emoji}</Text>
              <Text style={styles.alertaLabel}>{cfg.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.cancelBtn} onPress={cerrar}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: PANEL_H,
    backgroundColor: '#fff',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 16, paddingBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, elevation: 12,
  },
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 36, height: 4, backgroundColor: '#ddd', borderRadius: 2 },

  title: { fontSize: 17, fontWeight: '700', color: '#222', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#999', marginBottom: 16 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  alertaOpt: {
    width: '22%', aspectRatio: 1,
    backgroundColor: '#f7f7f7', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  alertaOptActive: {
    backgroundColor: '#EEEDFE', borderColor: '#7F77DD',
  },
  alertaEmoji: { fontSize: 24 },
  alertaLabel: { fontSize: 9, color: '#555', fontWeight: '500', textAlign: 'center' },

  cancelBtn: {
    marginTop: 16, alignItems: 'center', padding: 12,
    backgroundColor: '#f2f2f2', borderRadius: 14,
  },
  cancelText: { fontWeight: '600', color: '#666', fontSize: 14 },
});
