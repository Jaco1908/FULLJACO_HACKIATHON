import { api } from './client'

/**
 * Insights personalizados basados en el historial del usuario.
 * Toda la lógica de cálculo (resumen mensual, comparativa, recomendaciones)
 * la hace el backend — el frontend solo renderiza.
 *
 * @returns {{
 *   total_consultas: number,
 *   total_copago: number,
 *   resumen_mensual: Array<{ mes: string, consultas: number, copago: number, especialidades: string[] }>,
 *   especialidades_frecuentes: Array<{ especialidad: string, cantidad: number }>,
 *   comparativa_planes: Array<{ plan: Object, costo_historico: number }> | null,
 *   recomendaciones: Array<{ plan: Object, score: number }> | null
 * }}
 */
export async function getInsights() {
  return api.get('/insights')
}
