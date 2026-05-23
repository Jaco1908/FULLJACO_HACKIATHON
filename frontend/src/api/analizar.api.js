import { api } from './client'

/**
 * Analiza síntomas con IA.
 * El backend obtiene el plan del usuario autenticado — ya no se envía desde el frontend.
 *
 * @param {string} texto - Mensaje actual del paciente
 * @param {Array<{role: "user"|"assistant", content: string}>} historial
 *        Turnos previos con roles explícitos. NO incluye el mensaje actual (texto).
 *        Ejemplo: [
 *          { role: "user",      content: "me duele el cuello" },
 *          { role: "assistant", content: "¿El dolor es constante o va y viene?" },
 *        ]
 */
export async function analizarSintomas(texto, historial = []) {
  return api.post('/analizar', { texto, historial })
}

/**
 * Precios promedio por especialidad desde hospitales reales.
 * Usados por el comparador; el frontend nunca usa PRECIO_FALLBACK.
 */
export async function getPreciosPorEspecialidad() {
  return api.get('/analizar/precios')
}
