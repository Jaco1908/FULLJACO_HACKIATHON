import { api } from './client'

// ── ASEGURADORAS ──────────────────────────────────────────────────────────────
export const adminAseguradoras = {
  listar:     ()          => api.get('/admin/aseguradoras'),
  crear:      (data)      => api.post('/admin/aseguradoras', data),
  actualizar: (id, data)  => api.put(`/admin/aseguradoras/${id}`, data),
  eliminar:   (id)        => api.delete(`/admin/aseguradoras/${id}`),
}

// ── PLANES ────────────────────────────────────────────────────────────────────
export const adminPlanes = {
  listar:     ()          => api.get('/admin/planes'),
  crear:      (data)      => api.post('/admin/planes', data),
  actualizar: (id, data)  => api.put(`/admin/planes/${id}`, data),
  eliminar:   (id)        => api.delete(`/admin/planes/${id}`),
}

// ── COBERTURAS ────────────────────────────────────────────────────────────────
export const adminCoberturas = {
  listar:     (planId)    => api.get(`/admin/coberturas/${planId}`),
  crear:      (data)      => api.post('/admin/coberturas', data),
  actualizar: (id, data)  => api.put(`/admin/coberturas/${id}`, data),
  eliminar:   (id)        => api.delete(`/admin/coberturas/${id}`),
}

// ── HOSPITALES ────────────────────────────────────────────────────────────────
export const adminHospitales = {
  listar:     ()          => api.get('/admin/hospitales'),
  crear:      (data)      => api.post('/admin/hospitales', data),
  actualizar: (id, data)  => api.put(`/admin/hospitales/${id}`, data),
  eliminar:   (id)        => api.delete(`/admin/hospitales/${id}`),
}
