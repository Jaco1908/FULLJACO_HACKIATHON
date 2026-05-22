import { api } from './client'

/**
 * Retorna el perfil completo del usuario autenticado,
 * incluyendo plan de seguro, aseguradora y coberturas.
 */
export async function getPerfil() {
  return api.get('/perfil')
}

/**
 * Actualiza nombre y/o plan del usuario autenticado.
 * @param {Object} data
 * @param {string} [data.nombre_completo]
 * @param {string} [data.plan_seguro_id]
 */
export async function actualizarPerfil(data) {
  return api.put('/perfil', data)
}
