import { NextResponse } from 'next/server';

interface TutorRequestBody {
  question: string;
  context?: {
    keyDisplay?: string;
    progression?: string;
    scaleName?: string;
    genre?: string;
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TutorRequestBody;
    const question = body.question?.trim();

    if (!question) {
      return NextResponse.json(
        { error: 'Por favor escribe una pregunta para el Tutor IA.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    const model = process.env.OPENROUTER_MODEL?.trim() || 'google/gemini-2.5-flash';

    if (!apiKey) {
      const ctx = body.context;
      const fallbackText = [
        `Modo local sin llave de OpenRouter detectada (puedes agregar OPENROUTER_API_KEY en tu archivo .env.local para respuestas abiertas con IA).`,
        '',
        ctx?.keyDisplay
          ? `Sobre tu contexto actual (${ctx.keyDisplay}${ctx.progression ? ` · ${ctx.progression}` : ''}):`
          : 'Consejo práctico:',
        `• Recuerda que los acordes y la escala comparten las mismas notas: usa las notas del acorde activo (1, 3 y 5) para descansar tus frases.`,
        `• Si buscas sonido mexicano/sierreño, prueba caminar en Terceras por las cuerdas 1 y 2 usando ${ctx?.scaleName || 'la Escala Mayor'}.`,
      ].join('\n');

      return NextResponse.json({
        reply: fallbackText,
        mode: 'fallback',
      });
    }

    const systemPrompt = [
      'Eres el Tutor de Guitarra Bohemia, un maestro mexicano cercano, claro y práctico.',
      'Tu alumno ya sabe cambiar acordes básicos y con cejilla, pero quiere entender teoría musical sin tecnicismos pesados, tocar requintos/adornos (terceras y sextas), improvisar y sacar canciones de oído.',
      'Responde siempre en español natural (términos como tónica/casa, primera/segunda/tercera, adornos, terceras, sextas, requinto).',
      'Sé concreto y breve (máximo 3-4 párrafos cortos o viñetas accionables). Conecta siempre la teoría con lo que el alumno puede tocar hoy mismo en el diapasón.',
    ].join(' ');

    const contextLine = body.context
      ? `Contexto actual del alumno: Tonalidad=${body.context.keyDisplay || 'N/A'}, Progresión=${body.context.progression || 'N/A'}, Escala=${body.context.scaleName || 'N/A'}, Estilo=${body.context.genre || 'Regional Mexicano / Acústico'}.`
      : '';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Guitarra Bohemia',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: contextLine ? `${contextLine}\n\nPregunta: ${question}` : question,
          },
        ],
        temperature: 0.6,
        max_tokens: 450,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        {
          reply: `No se pudo conectar con OpenRouter (${response.status}). Verifica tu OPENROUTER_API_KEY en .env.local.`,
          detail: errText,
          mode: 'error',
        },
        { status: 200 }
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const reply =
      data.choices?.[0]?.message?.content?.trim() ||
      'No recibí respuesta del modelo. Intenta reformular tu pregunta.';

    return NextResponse.json({
      reply,
      mode: 'openrouter',
      model,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Error inesperado en /api/tutor',
      },
      { status: 500 }
    );
  }
}

