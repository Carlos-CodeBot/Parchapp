// src/components/ParchaderoBottomSheet.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, Dimensions, Animated, PanResponder, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Parchadero, Comentario, PARCHADERO_CONFIG } from '../types';
import { suscribirComentarios, agregarComentario, calificarParchadero, subirFoto } from '../services/parchaderos.service';
import { useStore } from '../store/useStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.65;

interface Props {
  parchadero: Parchadero;
  onClose: () => void;
}

export default function ParchaderoBottomSheet({ parchadero, onClose }: Props) {
  const usuario = useStore((s) => s.usuario);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [miCalificacion, setMiCalificacion] = useState(0);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [fotos, setFotos] = useState(parchadero.fotos);
  const translateY = useRef(new Animated.Value(SHEET_H)).current;

  const cfg = PARCHADERO_CONFIG[parchadero.tipo];

  // Animación de entrada
  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0, damping: 20, stiffness: 120, useNativeDriver: true,
    }).start();
  }, []);

  // Suscribir comentarios
  useEffect(() => {
    const unsub = suscribirComentarios(parchadero.id, setComentarios);
    return unsub;
  }, [parchadero.id]);

  useEffect(() => setFotos(parchadero.fotos), [parchadero.fotos]);

  const cerrar = () => {
    Animated.timing(translateY, {
      toValue: SHEET_H, duration: 250, useNativeDriver: true,
    }).start(onClose);
  };

  // Drag to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.8) {
          cerrar();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const enviarComentario = async () => {
    if (!nuevoComentario.trim() || !usuario) return;
    await agregarComentario({
      parchaderoId: parchadero.id,
      usuarioId: usuario.uid,
      usuarioNombre: usuario.nombre,
      texto: nuevoComentario.trim(),
      calificacion: miCalificacion || 5,
    });
    setNuevoComentario('');
  };

  const seleccionarFoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setSubiendoFoto(true);
      const asset = result.assets[0];
      try {
        const url = await subirFoto(parchadero.id, asset.uri, asset.mimeType, asset.fileName || undefined);
        setFotos((actuales) => [...actuales, url]);
      } catch {
        Alert.alert('No se pudo subir la foto', 'Revisa tu conexión e intenta nuevamente.');
      } finally {
        setSubiendoFoto(false);
      }
    }
  };

  return (
    <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
      {/* Handle de drag */}
      <View {...panResponder.panHandlers} style={styles.handleArea}>
        <View style={styles.handle} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.typeChip, { backgroundColor: cfg.color + '20' }]}>
              <Text style={{ fontSize: 18 }}>{cfg.emoji}</Text>
              <Text style={[styles.typeLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <TouchableOpacity onPress={cerrar} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#888" />
            </TouchableOpacity>
          </View>

          <Text style={styles.nombre}>{parchadero.nombre}</Text>

          {/* Calificación */}
          <View style={styles.ratingRow}>
            <Estrellas valor={parchadero.calificacionPromedio} />
            <Text style={styles.ratingNum}>{parchadero.calificacionPromedio.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>· {parchadero.totalCalificaciones} reseñas</Text>
          </View>

          {/* Tags */}
          <View style={styles.tagsRow}>
            {parchadero.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* Descripción */}
          {parchadero.descripcion ? (
            <Text style={styles.descripcion}>{parchadero.descripcion}</Text>
          ) : null}

          {/* Fotos */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fotos</Text>
            <TouchableOpacity onPress={seleccionarFoto} style={styles.addPhotoBtn}>
              <Ionicons name="camera-outline" size={16} color="#7F77DD" />
              <Text style={styles.addPhotoText}>
                {subiendoFoto ? 'Subiendo...' : 'Agregar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosRow}>
            {fotos.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.photo} />
            ))}
            {fotos.length === 0 && (
              <View style={styles.noPhotos}>
                <Ionicons name="images-outline" size={24} color="#ccc" />
                <Text style={styles.noPhotosText}>Sin fotos aún</Text>
              </View>
            )}
          </ScrollView>

          {/* Mi calificación */}
          {usuario && (
            <View style={styles.myRatingBox}>
              <Text style={styles.sectionTitle}>Tu calificación</Text>
              <View style={styles.starsInput}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={async () => {
                      setMiCalificacion(n);
                      await calificarParchadero(parchadero.id, usuario.uid, n);
                    }}
                  >
                    <Ionicons
                      name={n <= miCalificacion ? 'star' : 'star-outline'}
                      size={28} color="#EF9F27"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Comentarios */}
          <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 16 }]}>
            Comentarios
          </Text>
          {comentarios.map((c) => (
            <View key={c.id} style={styles.comentario}>
              <View style={styles.comentarioHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{c.usuarioNombre[0]?.toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.comentarioNombre}>{c.usuarioNombre}</Text>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {Array.from({ length: c.calificacion }).map((_, i) => (
                      <Ionicons key={i} name="star" size={10} color="#EF9F27" />
                    ))}
                  </View>
                </View>
                <Text style={styles.comentarioFecha}>
                  {dayjs(c.creadoEn).fromNow()}
                </Text>
              </View>
              <Text style={styles.comentarioTexto}>{c.texto}</Text>
            </View>
          ))}

          {/* Input comentario */}
          {usuario && (
            <View style={styles.commentInput}>
              <TextInput
                style={styles.input}
                placeholder="Deja un comentario..."
                placeholderTextColor="#aaa"
                value={nuevoComentario}
                onChangeText={setNuevoComentario}
                multiline
              />
              <TouchableOpacity onPress={enviarComentario} style={styles.sendBtn}>
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

function Estrellas({ valor }: { valor: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= Math.round(valor) ? 'star' : 'star-outline'}
          size={14} color="#EF9F27"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SHEET_H,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, elevation: 12,
  },
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 36, height: 4, backgroundColor: '#ddd', borderRadius: 2 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 4,
  },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  typeLabel: { fontWeight: '600', fontSize: 13 },
  closeBtn: { padding: 4 },

  nombre: { fontSize: 20, fontWeight: '700', marginHorizontal: 16, marginTop: 6 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 4 },
  ratingNum: { fontSize: 13, fontWeight: '700', color: '#333' },
  ratingCount: { fontSize: 12, color: '#888' },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginHorizontal: 16, marginTop: 8 },
  tag: { backgroundColor: '#E6F1FB', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  tagText: { fontSize: 11, color: '#185FA5', fontWeight: '500' },

  descripcion: { fontSize: 13, color: '#555', marginHorizontal: 16, marginTop: 10, lineHeight: 20 },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addPhotoText: { fontSize: 12, color: '#7F77DD', fontWeight: '600' },

  photosRow: { paddingLeft: 16 },
  photo: { width: 110, height: 80, borderRadius: 10, marginRight: 8 },
  noPhotos: {
    width: 110, height: 80, borderRadius: 10,
    backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  noPhotosText: { fontSize: 10, color: '#bbb', marginTop: 4 },

  myRatingBox: { marginHorizontal: 16, marginTop: 16 },
  starsInput: { flexDirection: 'row', gap: 8, marginTop: 8 },

  comentario: {
    marginHorizontal: 16, marginTop: 10,
    backgroundColor: '#f8f8f8', borderRadius: 12, padding: 12,
  },
  comentarioHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  avatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#7F77DD', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  comentarioNombre: { fontWeight: '600', fontSize: 12 },
  comentarioFecha: { fontSize: 10, color: '#aaa', marginLeft: 'auto' },
  comentarioTexto: { fontSize: 13, color: '#444', lineHeight: 19 },

  commentInput: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    marginHorizontal: 16, marginTop: 12,
  },
  input: {
    flex: 1, backgroundColor: '#f2f2f2', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 13, maxHeight: 80,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#7F77DD', alignItems: 'center', justifyContent: 'center',
  },
});
