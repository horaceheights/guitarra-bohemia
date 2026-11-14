import type { FretboardViewMode, ScaleId } from './theory';
import type { GrooveStyle } from './grooves';

export interface CurriculumModule {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  duration: string;
  universalConcept: {
    heading: string;
    body: string;
    keyTakeaway: string;
  };
  guitarBridge: {
    heading: string;
    body: string;
  };
  labPreset: {
    rootPc: number;
    scaleId: ScaleId;
    viewMode: FretboardViewMode;
    groove: GrooveStyle;
    bpm: number;
    progression: string;
  };
  earGoal: {
    title: string;
    instruction: string;
    drillType: 'find-root' | 'call-response' | 'target-tone';
  };
}

export const CURRICULUM_MODULES: CurriculumModule[] = [
  {
    id: 'mod-1-mapa',
    number: 1,
    title: 'El Mapa Universal: Notas, Distancias y Acordes',
    subtitle: 'Por qué los acordes que ya tocas y las escalas son exactamente lo mismo.',
    duration: '4 min',
    universalConcept: {
      heading: 'Solo existen 12 sonidos en la música',
      body: 'No importa si tocas piano, acordeón o guitarra: toda la música occidental usa las mismas 12 notas que se repiten. Un traste en la guitarra equivale a 1 "medio tono" de distancia. Una escala no es un castigo de memoria: es simplemente elegir 7 de esas 12 notas que suenan bien juntas.',
      keyTakeaway: 'Los acordes nacen de la escala tomando los grados 1, 3 y 5 (saltándote una nota sí y una no).',
    },
    guitarBridge: {
      heading: 'En tu guitarra',
      body: 'Cuando pones un acorde de Sol (G), ya estás pisando las notas 1 (Sol), 3 (Si) y 5 (Re) de la Escala Mayor de Sol. La escala simplemente rellena los huecos entre esas notas para que puedas hacer melodías.',
    },
    labPreset: {
      rootPc: 7, // G
      scaleId: 'major',
      viewMode: 'position',
      groove: '4/4',
      bpm: 84,
      progression: 'G Em Am D7',
    },
    earGoal: {
      title: 'Reto de oído: Encuentra la nota "Casa" (Tónica)',
      instruction: 'Escucha la base en Sol y busca en la cuerda 1 o 6 la nota donde el sonido descansa por completo.',
      drillType: 'find-root',
    },
  },
  {
    id: 'mod-2-mayor',
    number: 2,
    title: 'La Escala Mayor: Un Solo Molde Movible',
    subtitle: 'Olvídate de aprender 12 escalas distintas. Aprende 1 patrón y muévelo por todo el mástil.',
    duration: '5 min',
    universalConcept: {
      heading: 'La fórmula del sonido alegre y brillante',
      body: 'La Escala Mayor sigue siempre la misma escalera de distancias: Tono – Tono – Medio – Tono – Tono – Tono – Medio. Si entiendes los números (grados 1 al 7) en vez de memorizar letras sueltas, puedes tocar en cualquier tono al instante.',
      keyTakeaway: 'En el mástil, mover el mismo dibujo 2 trastes arriba te cambia automáticamente de Sol a La.',
    },
    guitarBridge: {
      heading: 'Tus acordes adentro de la escala',
      body: 'En el Laboratorio verás los grados 1, 3 y 5 resaltados en ámbar y turquesa. Cuando estés soleando, termina tus frases en esas notas y sonarás musical al instante en lugar de sonar como "ejercicio".',
    },
    labPreset: {
      rootPc: 7,
      scaleId: 'major',
      viewMode: 'position',
      groove: '3/4',
      bpm: 100,
      progression: 'G D7 C G',
    },
    earGoal: {
      title: 'Reto de oído: Aterriza en la 3ra del acorde',
      instruction: 'Cuando cambie el acorde, toca la 3ra en tu guitarra para sentir cómo define si el acorde es mayor o menor.',
      drillType: 'target-tone',
    },
  },
  {
    id: 'mod-3-requinto',
    number: 3,
    title: 'Sonido Sierreño, Country y Pop: Pentatónica y Terceras',
    subtitle: 'El secreto real detrás de los requintos mexicanos y melodías limpias.',
    duration: '6 min',
    universalConcept: {
      heading: 'Menos notas, más música',
      body: 'Si a la Escala Mayor le quitas el grado 4 y el 7 (las dos notas con más tensión), te queda la Pentatónica Mayor: 5 notas donde casi nada choca. Y si tocas dos notas de la escala al mismo tiempo separadas por 3 pasos, nacen las famosas "Terceras".',
      keyTakeaway: 'El requinto mexicano no se toca en "cajas verticales": camina horizontalmente en pares de cuerdas por Terceras y Sextas.',
    },
    guitarBridge: {
      heading: 'Ruta Horizontal de Requinto (Cuerdas 1 y 2)',
      body: 'Cambia la vista del diapasón a "Requinto Terceras" y verás dos formas clave: dedos juntos en diagonal (1 traste de diferencia = 3ra Mayor) y dedos abiertos (2 trastes = 3ra menor). Con eso sacas casi cualquier intro sierreño.',
    },
    labPreset: {
      rootPc: 7,
      scaleId: 'major',
      viewMode: 'requinto-terceras',
      groove: '6/8',
      bpm: 108,
      progression: 'G D7 C G',
    },
    earGoal: {
      title: 'Reto Llama y Responde: Frase de 3 notas',
      instruction: 'Escucha una mini melodía de 3 notas sobre la escala mayor y repítela con tu guitarra sin ver tablatura.',
      drillType: 'call-response',
    },
  },
  {
    id: 'mod-4-menor-bolero',
    number: 4,
    title: 'El Mundo Menor y el Toque Español / Bolero',
    subtitle: 'Cómo conseguir ese giro dramático con un solo traste de diferencia.',
    duration: '5 min',
    universalConcept: {
      heading: 'Mismas notas, otro centro de gravedad',
      body: 'La escala de Sol Mayor y la de Mi Menor tienen exactamente las mismas 7 notas. Lo único que cambia es qué acorde sientes como "casa". Y cuando quieres el toque español, bolero o de corrido dramático, solo subes 1 traste la 7ma nota (Menor Armónica).',
      keyTakeaway: 'En una canción menor (como Am – G – F – E7), ese E7 te pide subir el Sol a Sol# justo en ese compás.',
    },
    guitarBridge: {
      heading: 'El acorde V7 que jala a casa',
      body: 'Prueba la progresión Am – G – F – E7 en el Analizador. Observa cómo la Escala Menor Armónica ilumina ese Sol# que conecta directo con la nota La.',
    },
    labPreset: {
      rootPc: 9, // A
      scaleId: 'harmonic-minor',
      viewMode: 'position',
      groove: '3/4',
      bpm: 92,
      progression: 'Am G F E7',
    },
    earGoal: {
      title: 'Reto de oído: Distingue el salto armónico',
      instruction: 'Escucha la frase con sabor a bolero y encuéntrala en tu diapasón.',
      drillType: 'call-response',
    },
  },
  {
    id: 'mod-5-adornos',
    number: 5,
    title: 'Adornos, Bajeos I–IV–V y Sacar Canciones de Oído',
    subtitle: 'Une los acordes con caminatas de escala y entrena tu oído para sacar rolas.',
    duration: '6 min',
    universalConcept: {
      heading: 'Los adornos son puentes entre acordes',
      body: 'Un adorno norteño o sierreño no es magia: es caminar por la escala desde la tónica del acorde actual hasta la tónica del siguiente acorde (por ejemplo, de Sol a Re caminando por Sol – Fa# – Mi – Re).',
      keyTakeaway: 'Para sacar una canción de oído: 1) Encuentra la nota Casa, 2) Decide si suena alegre (Mayor) o melancólica (menor), 3) Busca Primera, Segunda y Tercera.',
    },
    guitarBridge: {
      heading: 'Tu rutina diaria de 10 minutos',
      body: 'Usa el Analizador de Progresiones con cualquier canción que te sepas los acordes, activa el groove 2/4 o 6/8, y practica hacer un adorno corto de 3 notas justo antes de caer al siguiente acorde.',
    },
    labPreset: {
      rootPc: 9,
      scaleId: 'major',
      viewMode: 'requinto-terceras',
      groove: '2/4',
      bpm: 116,
      progression: 'A E7 A E7',
    },
    earGoal: {
      title: 'Reto final: Saca el adorno de oído',
      instruction: 'Repite un adorno clásico de 4 notas que resuelve directo a la tónica.',
      drillType: 'call-response',
    },
  },
];

