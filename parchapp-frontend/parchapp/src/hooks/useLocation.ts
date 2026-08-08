// src/hooks/useLocation.ts
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { useStore } from '../store/useStore';

export function useLocation() {
  const setUbicacion = useStore((s) => s.setUbicacion);
  const [permiso, setPermiso] = useState<boolean | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let suscripcion: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const tiene = status === 'granted';
      setPermiso(tiene);

      if (!tiene) {
        setCargando(false);
        return;
      }

      // Posición inicial rápida
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setCargando(false);

      // Actualizaciones continuas mientras el usuario se mueve
      suscripcion = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
        (pos) => setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      );
    })();

    return () => { suscripcion?.remove(); };
  }, []);

  return { permiso, cargando };
}
