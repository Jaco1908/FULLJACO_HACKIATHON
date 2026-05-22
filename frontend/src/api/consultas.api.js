import { api } from './client'

/** Lista completa de consultas del usuario autenticado. */
export async function getConsultas() {
  return api.get('/consultas')
}

/** Últimas 3 consultas (para mostrar contexto en Chat). */
export async function getConsultasRecientes() {
  return api.get('/consultas/recientes')
}

/**
 * Guarda el resultado de una consulta.
 * @param {Object} data
 * @param {string}  data.sintomas
 * @param {string}  [data.especialidad_sugerida]
 * @param {string}  [data.nivel_urgencia]
 * @param {number}  [data.copago_estimado]
 * @param {Object}  [data.resumen]
 */
export async function guardarConsulta(data) {
  return api.post('/consultas', data)
}
