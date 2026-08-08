// src/screens/MapScreen.tsx
import React, { useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, View, TouchableOpacity, Text, Pressable,
  Platform, Alert,
} from 'react-native';
import MapView, { Marker, Callout, MapPressEvent, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { useLocation } from '../hooks/useLocation';
import { suscribirParchaderos } from '../services/parchaderos.service';
import { suscribirAlertas } from '../services/alertas.service';
import { PARCHADERO_CONFIG, ALERTA_CONFIG, Parchadero, Alerta } from '../types';
import ParchaderoBottomSheet from '../components/ParchaderoBottomSheet';
import AgregarParchaderoSheet from '../components/AgregarParchaderoSheet';
import AlertaPanel from '../components/AlertaPanel';

// Coordenadas iniciales: Bucaramanga
const REGION_INICIAL: Region = {
  latitude: 7.1193,
  longitude: -73.1227,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);

  const {
    parchaderos, setParchaderos,
    alertas, setAlertas,
    ubicacion,
    parchaderoSeleccionado, setParchaderoSeleccionado,
    mostrarPanelAlerta, setMostrarPanelAlerta,
    mostrarFormAgregar, setMostrarFormAgregar,
    setCoordenaddasNuevoPin,
  } = useStore();

  useLocation(); // pide permisos y actualiza ubicacion en el store

  // Suscribirse a parchaderos en tiempo real
  useEffect(() => {
    const unsub = suscribirParchaderos(setParchaderos);
    return unsub;
  }, []);

  // Suscribirse a alertas en tiempo real
  useEffect(() => {
    const unsub = suscribirAlertas(setAlertas);
    return unsub;
  }, []);

  // Centrar mapa en ubicación del usuario cuando llega
  useEffect(() => {
    if (ubicacion && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: ubicacion.lat,
        longitude: ubicacion.lng,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 800);
    }
  }, [ubicacion?.lat]);

  // Long press en el mapa → modo "agregar parchadero"
  const handleLongPress = useCallback((e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCoordenaddasNuevoPin({ lat: latitude, lng: longitude });
    setMostrarFormAgregar(true);
  }, []);

  const centrarEnUsuario = useCallback(() => {
    if (!ubicacion) {
      Alert.alert('Ubicación', 'Aún no tenemos tu ubicación. Verifica los permisos.');
      return;
    }
    mapRef.current?.animateToRegion({
      latitude: ubicacion.lat,
      longitude: ubicacion.lng,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    }, 600);
  }, [ubicacion]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={REGION_INICIAL}
        showsUserLocation
        showsMyLocationButton={false}
        onLongPress={handleLongPress}
        onPress={() => {
          // Toque en el mapa limpia la selección si no hay sheet abierto
          if (!mostrarFormAgregar && !mostrarPanelAlerta) {
            setParchaderoSeleccionado(null);
          }
        }}
      >
        {/* ── Pines de parchaderos ── */}
        {parchaderos.map((p) => (
          <ParchaderoMarker
            key={p.id}
            parchadero={p}
            onPress={() => setParchaderoSeleccionado(p)}
          />
        ))}

        {/* ── Emojis de alertas ── */}
        {alertas.map((a) => (
          <AlertaMarker key={a.id} alerta={a} />
        ))}
      </MapView>

      {/* ── Barra de búsqueda (placeholder por ahora) ── */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#888" />
        <Text style={styles.searchPlaceholder}>Buscar parchaderos...</Text>
      </View>

      {/* ── Botón alerta (tipo Waze) ── */}
      <TouchableOpacity
        style={styles.alertBtn}
        onPress={() => setMostrarPanelAlerta(true)}
      >
        <Text style={styles.alertBtnText}>🚨 Alertar</Text>
      </TouchableOpacity>

      {/* ── FAB: agregar parchadero ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (ubicacion) {
            setCoordenaddasNuevoPin(ubicacion);
          }
          setMostrarFormAgregar(true);
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ── Botón centrar ── */}
      <TouchableOpacity style={styles.centerBtn} onPress={centrarEnUsuario}>
        <Ionicons name="locate" size={20} color="#7F77DD" />
      </TouchableOpacity>

      {/* ── Bottom Sheet: detalle del parchadero ── */}
      {parchaderoSeleccionado && (
        <ParchaderoBottomSheet
          parchadero={parchaderoSeleccionado}
          onClose={() => setParchaderoSeleccionado(null)}
        />
      )}

      {/* ── Panel: agregar parchadero ── */}
      {mostrarFormAgregar && (
        <AgregarParchaderoSheet onClose={() => setMostrarFormAgregar(false)} />
      )}

      {/* ── Panel: alertas tipo Waze ── */}
      {mostrarPanelAlerta && (
        <AlertaPanel onClose={() => setMostrarPanelAlerta(false)} />
      )}
    </View>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────

function ParchaderoMarker({
  parchadero, onPress,
}: { parchadero: Parchadero; onPress: () => void }) {
  const cfg = PARCHADERO_CONFIG[parchadero.tipo];
  return (
    <Marker
      coordinate={{ latitude: parchadero.coordenadas.lat, longitude: parchadero.coordenadas.lng }}
      onPress={onPress}
    >
      <View style={[styles.pinContainer, { backgroundColor: cfg.color }]}>
        <Text style={styles.pinEmoji}>{cfg.emoji}</Text>
      </View>
      <View style={[styles.pinTriangle, { borderTopColor: cfg.color }]} />
    </Marker>
  );
}

function AlertaMarker({ alerta }: { alerta: Alerta }) {
  const cfg = ALERTA_CONFIG[alerta.tipo];
  const minutosRestantes = Math.round((alerta.expiraEn - Date.now()) / 60000);
  return (
    <Marker
      coordinate={{ latitude: alerta.coordenadas.lat, longitude: alerta.coordenadas.lng }}
    >
      <View style={styles.alertaMarker}>
        <Text style={styles.alertaEmoji}>{cfg.emoji}</Text>
      </View>
      <Callout>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{cfg.label}</Text>
          <Text style={styles.calloutSub}>Expira en {minutosRestantes} min</Text>
          <Text style={styles.calloutSub}>✓ {alerta.confirmaciones} confirmaciones</Text>
        </View>
      </Callout>
    </Marker>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  searchBar: {
    position: 'absolute', top: 52, left: 12, right: 12,
    backgroundColor: '#fff', borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  searchPlaceholder: { color: '#aaa', fontSize: 14 },

  alertBtn: {
    position: 'absolute', top: 106, right: 12,
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },
  alertBtnText: { fontSize: 13, fontWeight: '600', color: '#D85A30' },

  fab: {
    position: 'absolute', bottom: 100, right: 16,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#7F77DD',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7F77DD', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  centerBtn: {
    position: 'absolute', bottom: 160, right: 16,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },

  // Pin de parchadero
  pinContainer: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  pinEmoji: { fontSize: 16 },
  pinTriangle: {
    width: 0, height: 0, alignSelf: 'center',
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -1,
  },

  // Marker de alerta
  alertaMarker: {
    backgroundColor: '#fff', borderRadius: 16, padding: 4,
    borderWidth: 1.5, borderColor: '#eee',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  alertaEmoji: { fontSize: 20 },

  // Callout de alerta
  callout: { padding: 8, minWidth: 120 },
  calloutTitle: { fontWeight: '700', fontSize: 13, marginBottom: 2 },
  calloutSub: { fontSize: 11, color: '#666' },
});
