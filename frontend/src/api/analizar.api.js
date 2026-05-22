import { api } from './client'

/**
 * Analiza síntomas con IA.
 * El backend obtiene el plan del usuario autenticado — ya no se envía desde el frontend.
 * @param {string} texto - Síntomas descritos por el paciente
 * @param {string[]} historial - Historial de mensajes anteriores
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
