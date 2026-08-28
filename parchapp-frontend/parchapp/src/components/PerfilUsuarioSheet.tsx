import React from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logout } from '../services/auth.service';
import { useStore } from '../store/useStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function PerfilUsuarioSheet({ visible, onClose }: Props) {
  const usuario = useStore((state) => state.usuario);
  const parchaderos = useStore((state) => state.parchaderos);
  const setUsuario = useStore((state) => state.setUsuario);

  if (!usuario) return null;

  const contribuciones = parchaderos.filter((item) => item.creadoPor === usuario.uid).length;
  const inicial = usuario.nombre.trim().charAt(0).toUpperCase() || 'P';

  const confirmarLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Quieres salir de ParchApp?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              setUsuario(null);
              onClose();
            } catch {
              Alert.alert('No se pudo cerrar sesión', 'Intenta nuevamente.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Tu perfil</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Cerrar perfil" style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.identity}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{inicial}</Text></View>
            <View style={styles.identityText}>
              <Text style={styles.name}>{usuario.nombre}</Text>
              <Text style={styles.email}>{usuario.email}</Text>
            </View>
          </View>

          <View style={styles.stats}>
            <Stat icon="location" value={contribuciones} label="Parches publicados" />
            <View style={styles.divider} />
            <Stat icon="sparkles" value={usuario.puntos} label="Puntos de comunidad" />
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="people-outline" size={20} color="#6558D3" />
            <Text style={styles.infoText}>Gracias por ayudar a la comunidad a encontrar nuevos lugares para parchar.</Text>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={confirmarLogout} accessibilityRole="button">
            <Ionicons name="log-out-outline" size={20} color="#B42318" />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Stat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={20} color="#6558D3" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,24,39,0.35)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32,
  },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  closeButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#6558D3', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  identityText: { flex: 1, marginLeft: 14 },
  name: { color: '#1F2937', fontSize: 19, fontWeight: '800' },
  email: { color: '#6B7280', fontSize: 13, marginTop: 3 },
  stats: { flexDirection: 'row', backgroundColor: '#F7F6FF', borderRadius: 18, paddingVertical: 18, marginTop: 24 },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  statValue: { color: '#1F2937', fontSize: 22, fontWeight: '800', marginTop: 5 },
  statLabel: { color: '#6B7280', fontSize: 11, textAlign: 'center', marginTop: 2 },
  divider: { width: 1, backgroundColor: '#DDD9FA' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginTop: 16 },
  infoText: { flex: 1, color: '#4B5563', fontSize: 13, lineHeight: 19 },
  logoutButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#FDA29B', backgroundColor: '#FFF5F4', borderRadius: 14,
    paddingVertical: 14, marginTop: 20,
  },
  logoutText: { color: '#B42318', fontSize: 15, fontWeight: '700' },
});
