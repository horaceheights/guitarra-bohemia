import type { GrooveStyle } from './grooves';

export interface ProgressionPreset {
  id: string;
  title: string;
  genre: string;
  groove: GrooveStyle;
  bpm: number;
  chordsText: string;
  description: string;
  tip: string;
}

export const PROGRESSION_PRESETS: ProgressionPreset[] = [
  {
    id: 'sierreno-clasico',
    title: 'Primera, Segunda y Tercera (Sierreño)',
    genre: 'Sierreño / Ranchera',
    groove: '6/8',
    bpm: 108,
    chordsText: 'G D7 C G',
    description: 'El motor de cientos de canciones norteñas y sierreñas: I – V7 – IV – I en Sol.',
    tip: 'Prueba las Terceras en cuerdas 1 y 2 para hacer el requinto entre cada cambio.',
  },
  {
    id: 'circulo-bohemio',
    title: 'Círculo de Sol (Bohemia)',
    genre: 'Bolero / Balada Acústica',
    groove: '4/4',
    bpm: 84,
    chordsText: 'G Em Am D7',
    description: 'El clásico círculo bohemio que todo guitarrista conoce, ahora visto por dentro.',
    tip: 'Cada acorde comparte notas de la Escala Mayor de Sol. Aterriza en las notas del acorde cuando cambie.',
  },
  {
    id: 'pop-moderno',
    title: 'Progresión Universal (Pop / Corrido)',
    genre: 'Pop Acústico / Country',
    groove: '4/4',
    bpm: 96,
    chordsText: 'C G Am F',
    description: 'I – V – vi – IV en Do Mayor: la progresión más usada en pop acústico y country.',
    tip: 'Activa la Pentatónica Mayor de Do y verás que casi cualquier nota suena limpia encima.',
  },
  {
    id: 'norteno-alegre',
    title: 'Norteño 2/4 (Primera y Segunda)',
    genre: 'Norteño / Polka',
    groove: '2/4',
    bpm: 120,
    chordsText: 'A E7 A E7',
    description: 'Paso rápido de acordeón y bajo sexto entre Primera (A) y Segunda (E7).',
    tip: 'Usa la Escala Mayor de La en ruta horizontal para hacer adornos rápidos hacia el bajeo.',
  },
  {
    id: 'cadencia-andaluza',
    title: 'Cadencia Andaluza (Toque Español)',
    genre: 'Bolero / Guitarra Española',
    groove: '3/4',
    bpm: 92,
    chordsText: 'Am G F E7',
    description: 'El sonido español/flamenco clásico que baja por pasos hasta el dominante E7.',
    tip: 'Sobre Am, G y F usa La Menor Natural; cuando entre E7, sube 1 traste a Sol# (Menor Armónica).',
  },
  {
    id: 'corrido-menor',
    title: 'Base Menor Tumbada (i – iv – V7)',
    genre: 'Regional Menor / Sierreño',
    groove: '6/8',
    bpm: 102,
    chordsText: 'Dm Gm A7 Dm',
    description: 'Tonalidad menor dramática muy común en corridos y baladas modernas.',
    tip: 'Siente el jalón del A7 regresando a Dm: la nota Do# (7ma mayor) crea toda la tensión.',
  },
];

