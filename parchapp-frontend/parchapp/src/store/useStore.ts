// src/store/useStore.ts
import { create } from 'zustand';
import { Parchadero, Alerta, Usuario } from '../types';

interface AppState {
  // Auth
  usuario: Usuario | null;
  setUsuario: (u: Usuario | null) => void;

  // Parchaderos
  parchaderos: Parchadero[];
  setParchaderos: (p: Parchadero[]) => void;
  addParchadero: (p: Parchadero) => void;
  parchaderoSeleccionado: Parchadero | null;
  setParchaderoSeleccionado: (p: Parchadero | null) => void;

  // Alertas
  alertas: Alerta[];
  setAlertas: (a: Alerta[]) => void;
  addAlerta: (a: Alerta) => void;

  // Ubicación del usuario
  ubicacion: { lat: number; lng: number } | null;
  setUbicacion: (u: { lat: number; lng: number }) => void;

  // UI
  mostrarPanelAlerta: boolean;
  setMostrarPanelAlerta: (v: boolean) => void;
  mostrarFormAgregar: boolean;
  setMostrarFormAgregar: (v: boolean) => void;
  coordenadasNuevoPin: { lat: number; lng: number } | null;
  setCoordenaddasNuevoPin: (c: { lat: number; lng: number } | null) => void;
}

export const useStore = create<AppState>((set) => ({
  usuario: null,
  setUsuario: (usuario) => set({ usuario }),

  parchaderos: [],
  setParchaderos: (parchaderos) => set({ parchaderos }),
  addParchadero: (p) => set((s) => ({ parchaderos: [...s.parchaderos, p] })),
  parchaderoSeleccionado: null,
  setParchaderoSeleccionado: (parchaderoSeleccionado) => set({ parchaderoSeleccionado }),

  alertas: [],
  setAlertas: (alertas) => set({ alertas }),
  addAlerta: (a) => set((s) => ({ alertas: [...s.alertas, a] })),

  ubicacion: null,
  setUbicacion: (ubicacion) => set({ ubicacion }),

  mostrarPanelAlerta: false,
  setMostrarPanelAlerta: (mostrarPanelAlerta) => set({ mostrarPanelAlerta }),
  mostrarFormAgregar: false,
  setMostrarFormAgregar: (mostrarFormAgregar) => set({ mostrarFormAgregar }),
  coordenadasNuevoPin: null,
  setCoordenaddasNuevoPin: (coordenadasNuevoPin) => set({ coordenadasNuevoPin }),
}));
