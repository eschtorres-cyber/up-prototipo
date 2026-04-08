// api/gemini.js — Vercel Serverless Function
// La API key de Gemini vive acá, nunca en el frontend

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tipo, datos } = req.body;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'API key no configurada' });
  }

  let prompt = '';

  // ── 1. SÍNTESIS DE ENTRADA DE DIARIO ─────────────────
  if (tipo === 'sintesis') {
    const { texto, norte, rol } = datos;
    prompt = `Sos UP, un coach de desarrollo profesional directo y empático.

El usuario trabaja como: ${rol || 'profesional'}
Su norte (objetivo): ${norte || 'crecer profesionalmente'}
Entrada de diario de hoy: "${texto}"

Escribí UNA síntesis de máximo 2 oraciones que:
- Resalte el patrón de liderazgo o crecimiento que se ve en esta entrada
- Use segunda persona ("Lideraste...", "Propusiste...", "Demostraste...")
- Sea específica a lo que escribió, no genérica
- Conecte con su norte si es relevante

Solo devolvé las 2 oraciones, sin introducción ni explicación.`;
  }

  // ── 2. MEJORAR OBJETIVO CON UP ────────────────────────
  else if (tipo === 'mejorar_norte') {
    const { objetivo, rol, horizonte } = datos;
    prompt = `Sos UP, un coach de carrera experto en desarrollo profesional.

El usuario trabaja como: ${rol || 'profesional'}
Su objetivo en bruto: "${objetivo}"
Horizonte de tiempo: ${horizonte || '3 meses'}

Devolvé EXACTAMENTE este JSON (sin markdown, sin explicación):
{
  "objetivo": "versión mejorada del objetivo, específica, medible, orientada al impacto. Máx 2 oraciones.",
  "hitos": [
    "hito 1 concreto y accionable",
    "hito 2 concreto y accionable",
    "hito 3 concreto y accionable"
  ]
}`;
  }

  // ── 3. RESUMEN SEMANAL EJECUTIVO ──────────────────────
  else if (tipo === 'resumen_semanal') {
    const { entradas, norte, rol } = datos;
    const textos = entradas.map((e, i) => `Entrada ${i+1}: ${e.texto}`).join('\n');
    prompt = `Sos UP, coach de desarrollo profesional.

Usuario: ${rol || 'profesional'}
Norte: ${norte || 'crecer profesionalmente'}

Entradas de diario de esta semana:
${textos}

Devolvé EXACTAMENTE este JSON (sin markdown):
{
  "avances": ["logro 1 específico", "logro 2", "logro 3"],
  "para_llevar": ["acción concreta 1 para esta semana", "acción 2"],
  "intencion": "una frase motivadora y específica para arrancar la semana"
}`;
  }

  // ── 4. DETECTAR LOGROS ────────────────────────────────
  else if (tipo === 'detectar_logros') {
    const { entradas, norte } = datos;
    const textos = entradas.slice(0, 20).map((e, i) => `${i+1}. ${e.texto}`).join('\n');
    prompt = `Sos UP. Analizá estas entradas de diario y detectá logros concretos.

Norte del usuario: ${norte || 'crecimiento profesional'}

Entradas:
${textos}

Devolvé EXACTAMENTE este JSON (sin markdown):
{
  "logros": [
    { "titulo": "título corto del logro", "descripcion": "descripción de 1-2 oraciones" }
  ]
}
Máximo 5 logros. Solo los más significativos.`;
  }

  else {
    return res.status(400).json({ error: 'Tipo de análisis no reconocido' });
  }

  // Fallback chain: prueba modelos en orden hasta encontrar uno disponible
  const MODELS = [
    'gemini-2.5-flash-preview-04-17',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
  ];

  let lastError = '';

  for (const model of MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
          })
        }
      );

      // 404 / 400 = modelo no disponible → probar el siguiente
      if (response.status === 404 || response.status === 400) {
        const errBody = await response.text();
        lastError = `${model} → ${response.status}`;
        console.warn(`Model ${model} unavailable:`, errBody.slice(0, 120));
        continue;
      }

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`Gemini ${model} error ${response.status}:`, errBody.slice(0, 200));
        return res.status(502).json({ error: `Gemini error ${response.status} (${model})` });
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!text) {
        console.error(`Gemini ${model} empty response:`, JSON.stringify(result).slice(0, 200));
        continue;
      }

      console.log(`Gemini responded with model: ${model}`);

      // Para respuestas JSON intentar parsear
      if (['mejorar_norte', 'resumen_semanal', 'detectar_logros'].includes(tipo)) {
        try {
          const json = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
          return res.status(200).json({ resultado: json, model });
        } catch {
          return res.status(200).json({ resultado: text, model });
        }
      }

      return res.status(200).json({ resultado: text, model });

    } catch (error) {
      lastError = `${model} → ${error.message}`;
      console.error(`Gemini fetch error (${model}):`, error.message);
      continue;
    }
  }

  // Todos los modelos fallaron
  return res.status(502).json({ error: `Ningún modelo disponible. Último error: ${lastError}` });
}
