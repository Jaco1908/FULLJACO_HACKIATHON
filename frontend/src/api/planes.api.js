import { api } from './client'

/** Lista de aseguradoras activas. */
export async function getAseguradoras() {
  return api.get('/aseguradoras')
}

/**
 * Lista de planes, opcionalmente filtrada por aseguradora.
 * @param {string|null} aseguradoraId
 */
export async function getPlanes(aseguradoraId = null) {
  const query = aseguradoraId ? `?aseguradora_id=${aseguradoraId}` : ''
  return api.get(`/planes${query}`)
}

/**
 * Comparador de planes para una especialidad.
 * El backend calcula el copago_estimado — el frontend solo renderiza.
 * @param {string} especialidad
 * @returns {{ especialidad: string, precio_referencia: number, planes: ComparadorItem[] }}
 */
export async function compararPlanes(especialidad) {
  return api.get(`/comparador?especialidad=${encodeURIComponent(especialidad)}`)
}
