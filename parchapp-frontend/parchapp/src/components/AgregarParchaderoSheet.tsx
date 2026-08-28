// src/components/AgregarParchaderoSheet.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Animated, Dimensions, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { PARCHADERO_CONFIG, TAGS_DISPONIBLES, ParchaderoTipo } from '../types';
import { crearParchadero, obtenerParchadero, subirFoto } from '../services/parchaderos.service';
import { useStore } from '../store/useStore';

const { height: SCREEN_H } = Dimensions.get('window');

interface Props { onClose: () => void }

interface FotoLocal {
  uri: string;
  mimeType?: string;
  fileName?: string;
}

export default function AgregarParchaderoSheet({ onClose }: Props) {
  const usuario = useStore((s) => s.usuario);
  const coordenadas = useStore((s) => s.coordenadasNuevoPin);

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<ParchaderoTipo>('cafe');
  const [descripcion, setDescripcion] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [fotosLocales, setFotosLocales] = useState<FotoLocal[]>([]);
  const [guardando, setGuardando] = useState(false);

  const translateY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0, damping: 20, stiffness: 120, useNativeDriver: true,
    }).start();
  }, []);

  const cerrar = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_H, duration: 250, useNativeDriver: true,
    }).start(onClose);
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const seleccionarFoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setFotosLocales((prev) => [
        ...prev,
        ...result.assets.map((asset) => ({
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.fileName || undefined,
        })),
      ]);
    }
  };

  const guardar = async () => {
    if (!nombre.trim()) {
      Alert.alert('Falta el nombre', '¿Cómo se llama el parchadero?');
      return;
    }
    if (!descripcion.trim()) {
      Alert.alert('Falta la descripción', 'Cuéntale a la comunidad qué hace especial este lugar.');
      return;
    }
    if (fotosLocales.length === 0) {
      Alert.alert('Falta una foto', 'Sube al menos una imagen real del parchadero.');
      return;
    }
    if (!coordenadas) {
      Alert.alert('Ubicación', 'No se encontró la ubicación del pin.');
      return;
    }
    if (!usuario) {
      Alert.alert('Sesión', 'Debes iniciar sesión para agregar parchaderos.');
      return;
    }

    setGuardando(true);
    try {
      // 1. Crear el documento del parchadero
      const id = await crearParchadero({
        nombre: nombre.trim(),
        tipo,
        descripcion: descripcion.trim(),
        coordenadas: { lat: coordenadas.lat, lng: coordenadas.lng },
        fotos: [],
        tags,
        creadoPor: usuario.uid,
      });

      // 2. Subir fotos (en paralelo)
      await Promise.all(fotosLocales.map((foto) =>
        subirFoto(id, foto.uri, foto.mimeType, foto.fileName)
      ));

      // Refresca el lugar inmediatamente para que las URLs de MinIO aparezcan
      // sin esperar al siguiente ciclo de sincronización del mapa.
      const parchaderoActualizado = await obtenerParchadero(id);
      useStore.setState((state) => ({
        parchaderos: [
          parchaderoActualizado,
          ...state.parchaderos.filter((item) => item.id !== id),
        ],
      }));

      cerrar();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el parchadero. Intenta de nuevo.');
      console.error(e);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={cerrar}>
          <Ionicons name="close" size={22} color="#888" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agregar parchadero</Text>
        <TouchableOpacity onPress={guardar} disabled={guardando} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>{guardando ? 'Guardando...' : 'Publicar'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          {/* Nombre */}
          <Text style={styles.label}>Nombre del sitio *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Parque de los Novios"
            placeholderTextColor="#bbb"
            value={nombre}
            onChangeText={setNombre}
          />

          {/* Tipo */}
          <Text style={styles.label}>Tipo de parchadero</Text>
          <View style={styles.tiposGrid}>
            {(Object.entries(PARCHADERO_CONFIG) as [ParchaderoTipo, any][]).map(([key, cfg]) => (
              <TouchableOpacity
                key={key}
                style={[styles.tipoOpt, tipo === key && { borderColor: cfg.color, backgroundColor: cfg.color + '18' }]}
                onPress={() => setTipo(key)}
              >
                <Text style={styles.tipoEmoji}>{cfg.emoji}</Text>
                <Text style={[styles.tipoLabel, tipo === key && { color: cfg.color }]}>{cfg.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Descripción */}
          <Text style={styles.label}>Descripción *</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="¿Qué tiene de especial este parche?"
            placeholderTextColor="#bbb"
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
          />

          {/* Tags */}
          <Text style={styles.label}>Características</Text>
          <View style={styles.tagsGrid}>
            {TAGS_DISPONIBLES.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagOpt, tags.includes(tag) && styles.tagOptSel]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagText, tags.includes(tag) && styles.tagTextSel]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fotos */}
          <Text style={styles.label}>Foto del sitio *</Text>
          <TouchableOpacity style={styles.photoBtn} onPress={seleccionarFoto}>
            <Ionicons name="camera-outline" size={20} color="#7F77DD" />
            <Text style={styles.photoBtnText}>Seleccionar fotos ({fotosLocales.length})</Text>
          </TouchableOpacity>
          {fotosLocales.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoPreviewRow}>
              {fotosLocales.map((foto) => (
                <View key={foto.uri} style={styles.photoPreviewWrap}>
                  <Image source={{ uri: foto.uri }} style={styles.photoPreview} resizeMode="cover" />
                  <TouchableOpacity
                    accessibilityLabel="Eliminar foto"
                    style={styles.removePhoto}
                    onPress={() => setFotosLocales((prev) => prev.filter((item) => item.uri !== foto.uri))}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Ubicación */}
          <Text style={styles.label}>Ubicación</Text>
          <View style={styles.coordBox}>
            <Ionicons name="location" size={16} color="#7F77DD" />
            <Text style={styles.coordText}>
              {coordenadas
                ? `${coordenadas.lat.toFixed(5)}, ${coordenadas.lng.toFixed(5)}`
                : 'Sin ubicación'}
            </Text>
            <Text style={styles.coordHint}>  (mantén presionado el mapa para mover el pin)</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  saveBtn: { backgroundColor: '#7F77DD', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  form: { padding: 16 },

  label: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },

  input: {
    borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#222',
  },

  tiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipoOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e8e8e8',
  },
  tipoEmoji: { fontSize: 16 },
  tipoLabel: { fontSize: 13, fontWeight: '500', color: '#555' },

  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagOpt: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#f8f8f8',
  },
  tagOptSel: { backgroundColor: '#EEEDFE', borderColor: '#7F77DD' },
  tagText: { fontSize: 12, color: '#666' },
  tagTextSel: { color: '#534AB7', fontWeight: '600' },

  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#7F77DD', borderStyle: 'dashed',
    borderRadius: 12, padding: 14, justifyContent: 'center',
  },
  photoBtnText: { color: '#7F77DD', fontWeight: '600', fontSize: 14 },
  photoPreviewRow: { marginTop: 10 },
  photoPreviewWrap: { marginRight: 10 },
  photoPreview: { width: 92, height: 72, borderRadius: 12 },
  removePhoto: {
    position: 'absolute', right: -5, top: -5, width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#222', alignItems: 'center', justifyContent: 'center',
  },

  coordBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#f5f5f5', borderRadius: 10, padding: 12,
    flexWrap: 'wrap',
  },
  coordText: { fontSize: 13, color: '#333', fontWeight: '500' },
  coordHint: { fontSize: 11, color: '#999' },
});
