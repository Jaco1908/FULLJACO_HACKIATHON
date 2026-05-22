# Frontend.md — Guía de Refactorización Completa
## SaludIA · HackIAthon 2025

> **Estado actual:** El frontend mezcla UI con lógica de negocio y hace llamadas directas a Supabase para todo (datos, auth, historial, admin). Además duplica fórmulas de negocio que pertenecen al backend.
>
> **Objetivo:** El frontend es responsable **únicamente** de UI/UX. Toda operación de datos pasa por el backend. La experiencia del usuario y su facilidad/gusto por el sistema es el valor agregado.

---

## Índice

1. [Regla de oro](#1-regla-de-oro)
2. [Estructura de carpetas objetivo](#2-estructura-de-carpetas-objetivo)
3. [Lo que está mal ahora y por qué](#3-lo-que-está-mal-ahora-y-por-qué)
4. [Capa de servicios API (api/)](#4-capa-de-servicios-api)
5. [Autenticación — qué queda en el frontend](#5-autenticación--qué-queda-en-el-frontend)
6. [AuthContext refactorizado](#6-authcontext-refactorizado)
7. [Refactorización por página](#7-refactorización-por-página)
   - [Chat.jsx](#71-chatjsx)
   - [Historial.jsx](#72-historialjsx)
   - [Comparador.jsx](#73-comparadorjsx)
   - [Insights.jsx](#74-insightsjsx)
   - [Perfil.jsx](#75-perfiljsx)
   - [Admin.jsx](#76-adminjsx)
   - [AdminRoute.jsx](#77-adminroutejsx)
8. [Validaciones que sí pertenecen al frontend](#8-validaciones-que-sí-pertenecen-al-frontend)
9. [Error Boundary](#9-error-boundary)
10. [Variables de entorno](#10-variables-de-entorno)
11. [.gitignore — corrección crítica](#11-gitignore--corrección-crítica)
12. [Orden de refactorización recomendado](#12-orden-de-refactorización-recomendado)

---

## 1. Regla de oro

```
┌─────────────────────────────────────────────────────────┐
│  El frontend NUNCA llama a Supabase directamente para   │
│  obtener o modificar datos de negocio.                  │
│                                                         │
│  SOLO EXCEPCIÓN:                                        │
│  supabase.auth.* para login, registro, sesión y logout  │
└─────────────────────────────────────────────────────────┘

Frontend puede hacer:          Frontend NO puede hacer:
✅ supabase.auth.signIn        ❌ supabase.from('consultas').select(...)
✅ supabase.auth.signUp        ❌ supabase.from('planes_seguro').select(...)
✅ supabase.auth.getUser()     ❌ supabase.from('perfiles').update(...)
✅ supabase.auth.signOut()     ❌ supabase.from('aseguradoras').insert(...)
✅ supabase.auth.onAuthStateChange()
✅ fetch(`${BACKEND}/consultas`)
✅ fetch(`${BACKEND}/perfil`)
✅ fetch(`${BACKEND}/admin/planes`)
```

**¿Por qué?**
- La lógica de quién puede ver qué debe estar en el backend, no en el cliente
- Las claves de Supabase en el frontend son públicas — cualquiera puede verlas
- Si la lógica de negocio está en el frontend, puede manipularse desde el navegador

---

## 2. Estructura de carpetas objetivo

### Estructura actual (con problemas)
```
frontend/src/
├── App.jsx                    ← ⚠️ sin Error Boundary
├── context/
│   └── AuthContext.jsx        ← ⚠️ hace queries a Supabase directamente
├── components/
│   ├── AdminRoute.jsx         ← ❌ admin por email hardcodeado
│   ├── ProtectedRoute.jsx     ← ✅ correcto
│   ├── Navbar.jsx             ← (revisar)
│   └── SplashScreen.jsx       ← ✅ correcto
├── pages/
│   ├── Chat.jsx               ← ❌ lógica de copago, llama Supabase
│   ├── Historial.jsx          ← ❌ llama Supabase directamente, cálculos
│   ├── Comparador.jsx         ← ❌ lógica de negocio + fallbacks hardcodeados
│   ├── Insights.jsx           ← ❌ lógica compleja + llama Supabase
│   ├── Perfil.jsx             ← ❌ llama Supabase directamente
│   ├── Admin.jsx              ← ❌ llama Supabase directamente
│   ├── Landing.jsx            ← ⚠️ stats hardcodeadas
│   ├── Login.jsx              ← ✅ correcto (usa supabase.auth)
│   ├── Registro.jsx           ← ⚠️ revisar
│   └── ResetPassword.jsx      ← ✅ correcto
├── lib/
│   └── supabase.js            ← ✅ mantener (solo para auth)
└── assets/
```

### Estructura objetivo
```
frontend/src/
├── App.jsx                    ← + ErrorBoundary envolviendo la app
├── context/
│   └── AuthContext.jsx        ← refactorizado: solo auth + perfil vía backend
├── components/
│   ├── AdminRoute.jsx         ← refactorizado: rol desde perfil del backend
│   ├── ProtectedRoute.jsx     ← ✅ sin cambios
│   ├── Navbar.jsx             ← ✅ sin cambios
│   └── SplashScreen.jsx       ← ✅ sin cambios
│
├── api/                       ← NUEVO: capa de servicios que llama al backend
│   ├── client.js              ← fetch configurado con JWT automático
│   ├── analizar.api.js        ← POST /analizar, GET /analizar/precios
│   ├── consultas.api.js       ← GET /consultas, POST /consultas
│   ├── perfil.api.js          ← GET /perfil, PUT /perfil
│   ├── planes.api.js          ← GET /aseguradoras, GET /planes, GET /comparador
│   ├── insights.api.js        ← GET /insights
│   └── admin.api.js           ← CRUD /admin/*
│
├── constants/
│   └── especialidades.js      ← NUEVO: lista única de especialidades (sin duplicar)
│
├── pages/
│   ├── Chat.jsx               ← refactorizado: sin lógica de copago
│   ├── Historial.jsx          ← refactorizado: solo muestra datos del backend
│   ├── Comparador.jsx         ← refactorizado: sin PRECIO_FALLBACK ni fórmulas
│   ├── Insights.jsx           ← refactorizado: sin cálculos de negocio
│   ├── Perfil.jsx             ← refactorizado: usa api/perfil.api.js
│   ├── Admin.jsx              ← refactorizado: usa api/admin.api.js
│   ├── Landing.jsx            ← mejora: stats dinámicas (opcional)
│   ├── Login.jsx              ← ✅ sin cambios
│   ├── Registro.jsx           ← ajuste menor
│   └── ResetPassword.jsx      ← ✅ sin cambios
│
└── lib/
    └── supabase.js            ← ✅ mantener SOLO para auth
```

---

## 3. Lo que está mal ahora y por qué

### ❌ 3.1 — Supabase directo en 6 páginas distintas

| Archivo | Línea | Qué hace mal |
|---------|-------|--------------|
| `AuthContext.jsx` | 37-49 | Query a `perfiles` + join a `planes_seguro` + `coberturas` |
| `Chat.jsx` | 55-59 | Query a `consultas` para últimas 3 |
| `Chat.jsx` | 126 | Insert en `consultas` |
| `Historial.jsx` | 20-23 | Query a `consultas` |
| `Comparador.jsx` | 43-48 | Query a `coberturas_especialidad` + join planes |
| `Insights.jsx` | 16-17 | Query a `consultas` + `coberturas_especialidad` |
| `Perfil.jsx` | 18, 33, 39 | Query a `aseguradoras`, `planes_seguro`, update `perfiles` |
| `Admin.jsx` | múltiples | CRUD completo directo a Supabase |

---

### ❌ 3.2 — Lógica de negocio duplicada en el frontend

La fórmula de copago (`precio - precio * cobertura / 100`) aparece en:

| Archivo | Línea | Forma |
|---------|-------|-------|
| `Chat.jsx` | 225 | inline en `exportarPDF()` |
| `Chat.jsx` | 473 | función `calcularCopago()` al final del archivo |
| `Comparador.jsx` | 90 | inline en el render |

Esta lógica pertenece **exclusivamente** al backend. El frontend solo muestra el número que el backend devuelve.

---

### ❌ 3.3 — PRECIO_FALLBACK y ESPECIALIDADES duplicados

```js
// Comparador.jsx líneas 12-17 — réplica de datos del backend
const PRECIO_FALLBACK = {
  'Medicina General': 40, 'Neurología': 110, ...
}

// Comparador.jsx líneas 6-10 Y Admin.jsx líneas 5-9 — lista duplicada
const ESPECIALIDADES = ['Medicina General', 'Neurología', ...]
```

---

### ❌ 3.4 — Admin por email hardcodeado en el código fuente

```js
// AdminRoute.jsx líneas 4-6
const ADMIN_EMAILS = [
  'bryanfamiliat@gmail.com',  // email personal en el repositorio
]
```

El rol admin debe venir del backend (campo `es_admin` en el perfil).

---

### ❌ 3.5 — `.env` con JWT completo versionado en git

```
frontend/.env  ← ¡ESTÁ EN GIT!
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  (JWT completo visible)
```

El `.gitignore` del frontend no incluye `.env` (solo `*.local`).

---

### ❌ 3.6 — `catch` vacíos que silencian errores

```js
// Chat.jsx línea 119 — el error real desaparece
} catch {
  setMensajes(prev => [...prev, { role:'assistant', content:'Error al conectar...' }])
}

// Insights.jsx líneas 15-22 — Promise.all sin .catch()
Promise.all([...]).then(([...]) => { ... })  // si falla → loading=true para siempre
```

---

### ❌ 3.7 — Otros problemas de calidad

| Archivo | Línea | Problema |
|---------|-------|---------|
| `Chat.jsx` | 305 | `key={i}` con índice — bugs visuales |
| `App.jsx` | 39 | Sin `<ErrorBoundary>` |
| `AuthContext.jsx` | 12 | `getSession()` en vez de `getUser()` |
| `Landing.jsx` | 34-38 | Stats hardcodeadas ("5 Hospitales", "6 Aseguradoras") |
| `Admin.jsx` | 71, 200, 382, 529 | `window.confirm()` nativo ×4 |

---

## 4. Capa de servicios API

Esta es la pieza central de la refactorización. Toda comunicación con el backend pasa por aquí.

### 4.1 `src/api/client.js` — Fetch configurado con JWT automático

```js
import { supabase } from '../lib/supabase'

const BACKEND = import.meta.env.VITE_BACKEND_URL

/**
 * Wrapper de fetch que automáticamente:
 * 1. Agrega el JWT de Supabase en el header Authorization
 * 2. Agrega Content-Type: application/json
 * 3. Lanza error si la respuesta no es ok (4xx, 5xx)
 */
async function apiClient(endpoint, options = {}) {
  // Obtener el JWT actual de Supabase Auth
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const response = await fetch(`${BACKEND}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message = errorData.error || errorData.detail || `Error ${response.status}`
    throw new ApiError(message, response.status)
  }

  // 204 No Content no tiene body
  if (response.status === 204) return null

  return response.json()
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

export const api = {
  get: (endpoint) => apiClient(endpoint, { method: 'GET' }),
  post: (endpoint, body) => apiClient(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => apiClient(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => apiClient(endpoint, { method: 'DELETE' }),
}
```

---

### 4.2 `src/api/analizar.api.js`

```js
import { api } from './client'

/**
 * Analiza síntomas con IA.
 * El backend obtiene el plan del usuario autenticado — ya no hay que enviarlo.
 */
export async function analizarSintomas(texto, historial = []) {
  return api.post('/analizar', { texto, historial })
}

/**
 * Precio promedio por especialidad desde hospitales reales.
 */
export async function getPreciosPorEspecialidad() {
  return api.get('/analizar/precios')
}
```

---

### 4.3 `src/api/consultas.api.js`

```js
import { api } from './client'

export async function getConsultas() {
  return api.get('/consultas')
}

export async function getConsultasRecientes() {
  return api.get('/consultas/recientes')
}

/**
 * Guarda el resultado de una consulta.
 * @param {Object} data - { sintomas, especialidad_sugerida, nivel_urgencia, copago_estimado, resumen }
 */
export async function guardarConsulta(data) {
  return api.post('/consultas', data)
}
```

---

### 4.4 `src/api/perfil.api.js`

```js
import { api } from './client'

/**
 * Retorna el perfil completo del usuario autenticado,
 * incluyendo plan de seguro, aseguradora y coberturas.
 */
export async function getPerfil() {
  return api.get('/perfil')
}

/**
 * @param {Object} data - { nombre_completo?, plan_seguro_id? }
 */
export async function actualizarPerfil(data) {
  return api.put('/perfil', data)
}
```

---

### 4.5 `src/api/planes.api.js`

```js
import { api } from './client'

export async function getAseguradoras() {
  return api.get('/aseguradoras')
}

export async function getPlanes(aseguradoraId = null) {
  const query = aseguradoraId ? `?aseguradora_id=${aseguradoraId}` : ''
  return api.get(`/planes${query}`)
}

/**
 * Comparador de planes para una especialidad.
 * El backend calcula el copago con su lógica — el frontend solo muestra.
 * @returns {{ especialidad, precio_referencia, planes: ComparadorItem[] }}
 */
export async function compararPlanes(especialidad) {
  return api.get(`/comparador?especialidad=${encodeURIComponent(especialidad)}`)
}
```

---

### 4.6 `src/api/insights.api.js`

```js
import { api } from './client'

/**
 * Insights personalizados basados en el historial del usuario.
 * Toda la lógica de cálculo (resumen mensual, comparativa, recomendaciones)
 * la hace el backend — el frontend solo renderiza.
 */
export async function getInsights() {
  return api.get('/insights')
}
```

---

### 4.7 `src/api/admin.api.js`

```js
import { api } from './client'

// ── ASEGURADORAS ──────────────────────────────────────────────────────────
export const adminAseguradoras = {
  listar: () => api.get('/admin/aseguradoras'),
  crear: (data) => api.post('/admin/aseguradoras', data),
  actualizar: (id, data) => api.put(`/admin/aseguradoras/${id}`, data),
  eliminar: (id) => api.delete(`/admin/aseguradoras/${id}`),
}

// ── PLANES ────────────────────────────────────────────────────────────────
export const adminPlanes = {
  listar: () => api.get('/admin/planes'),
  crear: (data) => api.post('/admin/planes', data),
  actualizar: (id, data) => api.put(`/admin/planes/${id}`, data),
  eliminar: (id) => api.delete(`/admin/planes/${id}`),
}

// ── COBERTURAS ────────────────────────────────────────────────────────────
export const adminCoberturas = {
  listar: (planId) => api.get(`/admin/coberturas/${planId}`),
  crear: (data) => api.post('/admin/coberturas', data),
  actualizar: (id, data) => api.put(`/admin/coberturas/${id}`, data),
  eliminar: (id) => api.delete(`/admin/coberturas/${id}`),
}

// ── HOSPITALES ────────────────────────────────────────────────────────────
export const adminHospitales = {
  listar: () => api.get('/admin/hospitales'),
  crear: (data) => api.post('/admin/hospitales', data),
  actualizar: (id, data) => api.put(`/admin/hospitales/${id}`, data),
  eliminar: (id) => api.delete(`/admin/hospitales/${id}`),
}
```

---

### 4.8 `src/constants/especialidades.js` — Fuente única de verdad

```js
/**
 * Lista canónica de especialidades médicas.
 * Esta es la ÚNICA fuente en el frontend — no duplicar en Comparador.jsx ni Admin.jsx.
 */
export const ESPECIALIDADES = [
  'Medicina General', 'Neurología', 'Cardiología', 'Gastroenterología',
  'Traumatología', 'Pediatría', 'Ginecología', 'Dermatología', 'Oncología',
  'Oftalmología', 'Urología', 'Psiquiatría', 'Endocrinología', 'Reumatología',
  'Otorrinolaringología', 'Neumología', 'Nefrología'
]
```

> ⚠️ Importar de aquí en `Comparador.jsx` y `Admin.jsx`. Eliminar las declaraciones locales.

---

## 5. Autenticación — qué queda en el frontend

El frontend **sí** puede usar `supabase.auth.*` directamente. Es la excepción permitida porque el JWT resultante se envía al backend en cada request.

```
supabase.auth.signUp()          ← ✅ frontend lo puede usar
supabase.auth.signInWithPassword() ← ✅ frontend lo puede usar
supabase.auth.signOut()         ← ✅ frontend lo puede usar
supabase.auth.onAuthStateChange() ← ✅ frontend lo puede usar
supabase.auth.getUser()         ← ✅ preferir sobre getSession() para seguridad
```

**Cambio clave:** Usar `getUser()` en vez de `getSession()` donde se necesite verificar si el usuario está autenticado, porque `getUser()` valida el token con el servidor.

```js
// ❌ ACTUAL — puede devolver sesión stale
supabase.auth.getSession().then(({ data: { session } }) => { ... })

// ✅ CORRECTO — valida con el servidor
supabase.auth.getUser().then(({ data: { user } }) => { ... })
```

---

## 6. AuthContext refactorizado

El AuthContext solo gestiona el estado de autenticación. El perfil lo obtiene del backend (no de Supabase directamente).

**Archivo:** `src/context/AuthContext.jsx`

```jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getPerfil } from '../api/perfil.api'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)   // viene del backend, no de Supabase
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sesión inicial con el servidor (no solo caché local)
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null)
      if (user) {
        cargarPerfil()
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null)
        await cargarPerfil()
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setUser(null)
        setPerfil(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function cargarPerfil() {
    try {
      // ← El perfil ahora viene del BACKEND, no de Supabase directamente
      const data = await getPerfil()
      setPerfil(data)
    } catch (error) {
      console.error('Error al cargar perfil:', error)
      setPerfil(null)
    } finally {
      setLoading(false)
    }
  }

  async function registrar(nombre, email, password, planSeguroId) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre_completo: nombre } }
    })
    if (error) throw error

    // Si tiene plan, actualizar vía backend (no Supabase directo)
    if (data.user && planSeguroId) {
      // Esperar a que el trigger de Supabase cree el perfil
      await new Promise(r => setTimeout(r, 500))
      await actualizarPerfil({ plan_seguro_id: planSeguroId })
    }
    return data
  }

  async function iniciarSesion(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function cerrarSesion() {
    setUser(null)
    setPerfil(null)
    await supabase.auth.signOut()
  }

  // Helper para recargar el perfil después de actualizarlo
  async function recargarPerfil() {
    await cargarPerfil()
  }

  return (
    <AuthContext.Provider value={{
      user, perfil, loading,
      registrar, iniciarSesion, cerrarSesion, recargarPerfil
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

---

## 7. Refactorización por página

### 7.1 Chat.jsx

**Qué cambiar:**

| Problema actual | Solución |
|----------------|----------|
| `supabase.from('consultas').select(...)` (línea 55) | → `getConsultasRecientes()` de `consultas.api.js` |
| `supabase.from('consultas').insert(...)` (línea 126) | → `guardarConsulta(data)` de `consultas.api.js` |
| `function calcularCopago()` (línea 473) | → **Eliminar.** El backend devuelve el copago calculado |
| `h.precio - (h.precio * resultado.cobertura_aplicada / 100)` (línea 225) | → Usar `h.copago` que ya viene del backend |
| `catch {` sin parámetro (línea 119) | → `catch (error) { console.error(error); ... }` |
| `key={i}` en mensajes (línea 305) | → `key={m.id || i}` o generar IDs únicos |
| Envío de `plan_cobertura`, `aseguradora`, `coberturas_por_especialidad` al backend (líneas 95-99) | → **Eliminar.** El backend los obtiene del perfil del usuario |

**Fragmento refactorizado — función enviar:**

```jsx
// ✅ CORRECTO: el frontend no calcula copago ni envía datos del plan
async function enviar(texto) {
  if (!texto.trim()) return
  const ts = new Date()
  setMensajes(prev => [...prev, { role: 'user', content: texto, ts, id: crypto.randomUUID() }])
  setInput('')
  setLoading(true)
  setAlertas([])

  try {
    // Solo texto e historial — el backend resuelve el plan del usuario autenticado
    const data = await analizarSintomas(texto, historialIA)
    const tsResp = new Date()

    if (data.tipo === 'emergencia') {
      setHistorialIA(prev => [...prev, texto, data.mensaje])
      setEmergenciaModal(data.mensaje)
      setMensajes(prev => [...prev, {
        role: 'assistant', content: data.mensaje,
        tipo: 'emergencia', ts: tsResp, id: crypto.randomUUID()
      }])
      await guardarConsulta({ sintomas: texto, nivel_urgencia: 'emergencia', resumen: data })

    } else if (data.tipo === 'pregunta') {
      setHistorialIA(prev => [...prev, texto, data.pregunta])
      setMensajes(prev => [...prev, {
        role: 'assistant', content: data.pregunta,
        opciones: data.opciones, tipo: 'pregunta', ts: tsResp, id: crypto.randomUUID()
      }])

    } else if (data.tipo === 'diagnostico') {
      setHistorialIA(prev => [...prev, texto])
      setMensajes(prev => [...prev, {
        role: 'assistant',
        content: 'He analizado tus síntomas. Aquí tienes tu estimación de copago:',
        tipo: 'diagnostico', ts: tsResp, id: crypto.randomUUID()
      }])
      setResultado(data)
      generarAlertas(data)  // ya no necesita coberturas — vienen en data
      await guardarConsulta({
        sintomas: texto,
        especialidad_sugerida: data.especialidad,
        nivel_urgencia: data.nivel_urgencia,
        copago_estimado: data.copago,
        resumen: data
      })
    }

  } catch (error) {
    console.error('Error en chat:', error)
    const mensaje = error.status === 401
      ? 'Tu sesión expiró. Por favor recarga la página.'
      : 'Error al conectar con el servicio. Verifica tu conexión.'
    setMensajes(prev => [...prev, {
      role: 'assistant', content: mensaje, ts: new Date(), id: crypto.randomUUID()
    }])
  } finally {
    setLoading(false)
  }
}
```

**En el PDF — eliminar el cálculo inline:**

```jsx
// ❌ ACTUAL — línea 225: calcula copago en el frontend
const copago = h.precio - (h.precio * resultado.cobertura_aplicada / 100)

// ✅ CORRECTO — el backend ya devuelve h.copago calculado
doc.text(`${i+1}. ${h.nombre} (${h.ciudad}) — Copago: $${h.copago.toFixed(2)}`, 25, y)
```

**Carga de últimas consultas:**

```jsx
// ❌ ACTUAL — línea 55-59: Supabase directo
useEffect(() => {
  if (!user) return
  supabase.from('consultas').select('...')
    .eq('usuario_id', user.id).limit(3)
    .then(({ data }) => setUltimasConsultas(data || []))
}, [user])

// ✅ CORRECTO — vía backend
useEffect(() => {
  if (!user) return
  getConsultasRecientes()
    .then(data => setUltimasConsultas(data || []))
    .catch(err => console.error('Error al cargar consultas recientes:', err))
}, [user])
```

---

### 7.2 Historial.jsx

**Qué cambiar:**

| Problema actual | Solución |
|----------------|----------|
| `supabase.from('consultas').select(...)` (líneas 20-23) | → `getConsultas()` de `consultas.api.js` |
| `ahorroEstimado` calculado en línea 33-37 | → El backend puede devolverlo en `/insights`, o calcularlo en `Historial` con los datos recibidos (es presentación, no negocio) |

> **Nota:** `ahorroEstimado` es suma de `(precio - copago)` — son datos que ya vienen del backend en cada consulta. Hacer la suma en el frontend está bien porque es solo agregar números para mostrar, no es lógica de negocio.

**Refactorizado:**

```jsx
// ✅ CORRECTO
import { getConsultas } from '../api/consultas.api'

export default function Historial() {
  const [consultas, setConsultas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getConsultas()
      .then(data => setConsultas(data || []))
      .catch(err => {
        console.error('Error al cargar historial:', err)
        setError('No se pudo cargar el historial. Intenta de nuevo.')
      })
      .finally(() => setLoading(false))
  }, [])

  // El resto del JSX permanece igual
}
```

---

### 7.3 Comparador.jsx

**Qué cambiar:**

| Problema actual | Solución |
|----------------|----------|
| `const ESPECIALIDADES = [...]` (líneas 6-10) | → Importar de `constants/especialidades.js` |
| `const PRECIO_FALLBACK = {...}` (líneas 12-17) | → **Eliminar.** El backend devuelve `precio_referencia` |
| `supabase.from('coberturas_especialidad')...` (líneas 43-48) | → `compararPlanes(especialidad)` de `planes.api.js` |
| `const copago = precio - (precio * c.porcentaje_cobertura / 100)` (línea 90) | → Usar `c.copago_estimado` que devuelve el backend |
| `fetch(${BACKEND}/precios)` (línea 31) | → Incluido en la respuesta del comparador del backend |

**Refactorizado:**

```jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { compararPlanes } from '../api/planes.api'
import { ESPECIALIDADES } from '../constants/especialidades'  // ← importar, no declarar
import { TrendingDown, ShieldCheck, Search, Star } from 'lucide-react'

export default function Comparador() {
  const { perfil } = useAuth()
  const [especialidad, setEspecialidad] = useState('Medicina General')
  const [resultado, setResultado] = useState(null)  // { especialidad, precio_referencia, planes }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const miPlanId = perfil?.plan_seguro?.id

  useEffect(() => {
    buscar()
  }, [especialidad])

  async function buscar() {
    setLoading(true)
    setError(null)
    try {
      const data = await compararPlanes(especialidad)
      setResultado(data)
    } catch (err) {
      console.error('Error en comparador:', err)
      setError('No se pudo cargar la comparación. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="comparador-container">
      <h2><TrendingDown size={22} /> Comparador de planes</h2>
      <p className="comparador-sub">Selecciona una especialidad y compara cuánto pagarías con cada plan</p>

      {miPlanId && (
        <div className="comparador-mi-plan-info">
          <Star size={14} color="#f59e0b" fill="#f59e0b"/>
          Tu plan actual: <strong>{perfil?.plan_seguro?.nombre}</strong>
        </div>
      )}

      <div className="comparador-filtro">
        <Search size={18} color="var(--text-dim)" />
        <select value={especialidad} onChange={e => setEspecialidad(e.target.value)}>
          {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        {resultado && (
          <span className="precio-referencia">
            Precio de referencia: <strong>${resultado.precio_referencia}</strong>
          </span>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <div className="page-loading">Cargando planes...</div>
      ) : (
        <div className="comparador-table-wrap">
          <table className="comparador-table">
            <thead>
              <tr>
                <th>Aseguradora</th>
                <th>Plan</th>
                <th>Prima mensual</th>
                <th>Cobertura</th>
                <th>Copago estimado</th>  {/* ← ya lo calcula el backend */}
                <th>Copago fijo</th>
              </tr>
            </thead>
            <tbody>
              {(resultado?.planes || []).map((c, i) => {
                const esMejor = i === 0
                const esMiPlan = c.plan_id === miPlanId
                return (
                  <tr key={c.plan_id} className={`${esMejor ? 'fila-mejor' : ''} ${esMiPlan ? 'fila-mi-plan' : ''}`}>
                    <td><span className="aseg-nombre">{c.aseguradora_nombre}</span></td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {c.plan_nombre}
                        {esMiPlan && <span className="badge-mi-plan"><Star size={10} fill="currentColor"/> Mi plan</span>}
                      </span>
                    </td>
                    <td>${c.prima_mensual}/mes</td>
                    <td>
                      <div className="cobertura-bar-wrap">
                        <div className="cobertura-bar" style={{ width: `${c.porcentaje_cobertura}%` }} />
                        <span>{c.porcentaje_cobertura}%</span>
                      </div>
                    </td>
                    <td>
                      {/* ← c.copago_estimado viene del backend, no se calcula aquí */}
                      <span className={`copago-valor ${esMejor ? 'copago-mejor' : ''}`}>
                        ${c.copago_estimado.toFixed(2)}
                      </span>
                      {esMejor && <span className="badge-mejor">Mejor precio</span>}
                    </td>
                    <td className="copago-fijo">${c.copago_fijo || 0}</td>
                  </tr>
                )
              })}
              {(resultado?.planes || []).length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>
                    No hay planes con cobertura para esta especialidad
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="comparador-nota">
        <ShieldCheck size={14} /> Los copagos son estimados basados en el precio de referencia.
      </div>
    </div>
  )
}
```

---

### 7.4 Insights.jsx

**Qué cambiar:**

| Problema actual | Solución |
|----------------|----------|
| `supabase.from('consultas').select(...)` + `supabase.from('coberturas_especialidad').select(...)` (líneas 16-17) | → `getInsights()` de `insights.api.js` |
| Todo el bloque de cálculo (líneas 29-90: `meses`, `planesUnicos`, `calcularCostoHistorial`, `comparaciones`, `recomendaciones`) | → **Eliminar.** El backend devuelve estos datos calculados |
| `Promise.all([...]).then(...)` sin `.catch()` (líneas 15-22) | → Reemplazado por un solo `getInsights()` con try/catch |

**Refactorizado:**

```jsx
import { useState, useEffect } from 'react'
import { getInsights } from '../api/insights.api'
// ... resto de imports de iconos

export default function Insights() {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getInsights()
      .then(data => setInsights(data))
      .catch(err => {
        console.error('Error al cargar insights:', err)
        setError('No se pudieron cargar los insights.')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading">Calculando insights...</div>
  if (error) return <div className="error-msg">{error}</div>

  // El JSX usa directamente los datos de insights:
  // insights.resumen_mensual
  // insights.comparativa_planes
  // insights.recomendaciones
  // insights.especialidades_frecuentes
  // insights.total_copago
  // insights.total_consultas
  // Todo calculado en el backend
  return (
    <div className="insights-container">
      {/* ... renderizar insights sin ningún cálculo aquí ... */}
    </div>
  )
}
```

---

### 7.5 Perfil.jsx

**Qué cambiar:**

| Problema actual | Solución |
|----------------|----------|
| `supabase.from('aseguradoras').select(...)` (línea 18) | → `getAseguradoras()` de `planes.api.js` |
| `supabase.from('planes_seguro').select(...)` (línea 33) | → `getPlanes(aseguradoraId)` de `planes.api.js` |
| `supabase.from('perfiles').update(...)` (línea 39) | → `actualizarPerfil(data)` de `perfil.api.js` |

**Refactorizado:**

```jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { actualizarPerfil } from '../api/perfil.api'
import { getAseguradoras, getPlanes } from '../api/planes.api'

export default function Perfil() {
  const { user, perfil, loading: authLoading, recargarPerfil } = useAuth()
  const [aseguradoras, setAseguradoras] = useState([])
  const [planes, setPlanes] = useState([])
  const [aseguradoraId, setAseguradoraId] = useState('')
  const [planId, setPlanId] = useState('')
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getAseguradoras()
      .then(data => setAseguradoras(data || []))
      .catch(err => console.error('Error al cargar aseguradoras:', err))
  }, [])

  useEffect(() => {
    if (perfil) {
      setNombre(perfil.nombre_completo || '')
      const aid = perfil.plan_seguro?.aseguradora_id || ''
      setAseguradoraId(aid)
      setPlanId(perfil.plan_seguro?.id || '')
    }
  }, [perfil])

  useEffect(() => {
    if (!aseguradoraId) { setPlanes([]); return }
    getPlanes(aseguradoraId)
      .then(data => setPlanes(data || []))
      .catch(err => console.error('Error al cargar planes:', err))
  }, [aseguradoraId])

  async function guardar() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await actualizarPerfil({
        nombre_completo: nombre,
        plan_seguro_id: planId || null
      })
      await recargarPerfil()  // recargar el perfil en el contexto
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message || 'Error al guardar el perfil')
    } finally {
      setSaving(false)
    }
  }

  // El JSX permanece igual — solo cambian las fuentes de datos
}
```

---

### 7.6 Admin.jsx

Todos los `supabase.from('...')` se reemplazan por las funciones de `admin.api.js`.

**Patrón de refactorización para cada sección (ejemplo con Aseguradoras):**

```jsx
// ❌ ACTUAL
async function cargar() {
  const { data } = await supabase.from('aseguradoras').select('*').order('nombre')
  setAseguradoras(data || [])
  setLoading(false)
}

async function guardar() {
  if (editando) {
    const { error } = await supabase.from('aseguradoras').update(form).eq('id', editando)
    if (error) { setError(error.message); return }
  } else {
    const { error } = await supabase.from('aseguradoras').insert(form)
    if (error) { setError(error.message); return }
  }
  cancelar(); cargar()
}

async function eliminar(id) {
  if (!confirm('¿Eliminar?')) return
  // ...operaciones Supabase
}
```

```jsx
// ✅ CORRECTO
import { adminAseguradoras } from '../api/admin.api'

async function cargar() {
  try {
    const data = await adminAseguradoras.listar()
    setAseguradoras(data || [])
  } catch (err) {
    setError('Error al cargar aseguradoras')
  } finally {
    setLoading(false)
  }
}

async function guardar() {
  setError('')
  if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
  try {
    if (editando) {
      await adminAseguradoras.actualizar(editando, form)
    } else {
      await adminAseguradoras.crear(form)
    }
    cancelar()
    cargar()
  } catch (err) {
    setError(err.message || 'Error al guardar')
  }
}

// Reemplazar confirm() nativo por un estado de confirmación en el JSX
const [confirmDelete, setConfirmDelete] = useState(null)  // id a eliminar

async function eliminar(id) {
  try {
    await adminAseguradoras.eliminar(id)
    setConfirmDelete(null)
    cargar()
  } catch (err) {
    setError(err.message || 'Error al eliminar')
  }
}

// En JSX: en vez de confirm(), mostrar un mini-modal o botón de confirmación inline
{confirmDelete === id ? (
  <>
    <button className="btn-icon danger" onClick={() => eliminar(id)}>Confirmar</button>
    <button className="btn-icon" onClick={() => setConfirmDelete(null)}>Cancelar</button>
  </>
) : (
  <button className="btn-icon danger" onClick={() => setConfirmDelete(id)}>
    <Trash2 size={14}/>
  </button>
)}
```

> Aplicar este mismo patrón para **Planes**, **Coberturas** y **Hospitales** en Admin.jsx.

---

### 7.7 AdminRoute.jsx

**Qué cambiar:**

```jsx
// ❌ ACTUAL — admin hardcodeado en el código
const ADMIN_EMAILS = [
  'bryanfamiliat@gmail.com',
]
if (!ADMIN_EMAILS.includes(user.email)) { ... }
```

```jsx
// ✅ CORRECTO — rol viene del perfil que retorna el backend
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminRoute({ children }) {
  const { user, perfil, loading } = useAuth()

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ color: 'var(--accent)', fontSize: '1rem' }}>Verificando permisos...</div>
    </div>
  )

  if (!user) return <Navigate to="/login" />

  // perfil.es_admin viene del backend — campo en la tabla 'perfiles' de Supabase
  if (!perfil?.es_admin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <h2 style={{ color: 'var(--navy)', margin: 0 }}>Acceso restringido</h2>
        <p style={{ color: 'var(--text2)' }}>No tienes permisos para acceder al panel de administración.</p>
        <a href="/chat" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
          ← Volver al chat
        </a>
      </div>
    )
  }

  return children
}
```

---

## 8. Validaciones que sí pertenecen al frontend

El frontend sí puede y debe validar cosas de UI antes de enviar al backend:

```
✅ Validaciones del frontend (UI/UX):
   - Campo de texto vacío antes de enviar
   - Formato de email válido en el login
   - Contraseña mínima en el registro
   - Campos requeridos en formularios del admin
   - Que un número esté en rango (0-100 para cobertura)
   - Que se haya seleccionado una aseguradora antes de seleccionar plan

❌ Validaciones que NO le pertenecen al frontend:
   - Si el usuario tiene permisos de admin (el backend lo verifica)
   - Si una especialidad es válida (el backend tiene la lista canónica)
   - Calcular si el copago es correcto
   - Verificar si el plan existe en la BD
   - Cualquier lógica de negocio disfrazada de validación
```

---

## 9. Error Boundary

**Crear:** `src/components/ErrorBoundary.jsx`

```jsx
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary capturó:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: '1rem', padding: '2rem'
        }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h2 style={{ color: 'var(--navy)' }}>Algo salió mal</h2>
          <p style={{ color: 'var(--text2)', textAlign: 'center' }}>
            Ocurrió un error inesperado. Por favor recarga la página.
          </p>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '0.75rem 2rem' }}
            onClick={() => window.location.reload()}
          >
            Recargar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

**Registrar en App.jsx:**

```jsx
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  const [splash, setSplash] = useState(!sessionStorage.getItem('splashShown'))
  if (splash) return <SplashScreen onDone={hideSplash} />

  return (
    <ErrorBoundary>  {/* ← envuelve toda la aplicación */}
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* ... rutas sin cambio ... */}
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
```

---

## 10. Variables de entorno

**Archivo:** `frontend/.env` — **debe tener solo estas dos variables** (ya no necesita la anon key de Supabase para datos porque el backend maneja Supabase):

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...     ← necesaria SOLO para supabase.auth.*
VITE_BACKEND_URL=https://tu-backend.com
```

> La `anon key` de Supabase es segura de exponer en el frontend siempre que las **RLS policies** estén configuradas correctamente en Supabase. En la nueva arquitectura, el frontend solo la usa para Auth — los datos los maneja el backend con la service_role key.

---

## 11. .gitignore — corrección crítica

**Archivo:** `frontend/.gitignore`

```diff
  # Logs
  logs
  *.log
  ...
  node_modules
  dist
  dist-ssr
  *.local
+ .env          ← AGREGAR ESTA LÍNEA
+ .env.*        ← Y ESTA para cubrir .env.production, .env.staging, etc.
```

**Después de agregar la línea, eliminar `.env` del historial de git:**

```bash
# En terminal, desde la carpeta frontend/
git rm --cached .env
git commit -m "chore: remover .env del repositorio"
```

> ⚠️ Como el `.env` ya está en el historial de git, las claves actuales deben considerarse comprometidas. Regenerar la `anon key` en el dashboard de Supabase.

---

## 12. Orden de refactorización recomendado

```
Paso 1 — Fundación (sin romper nada existente)
  ├─ Crear src/api/client.js
  ├─ Crear src/constants/especialidades.js
  ├─ Corregir frontend/.gitignore (agregar .env)
  └─ Hacer git rm --cached .env

Paso 2 — Servicios API (sin tocar las páginas aún)
  ├─ src/api/analizar.api.js
  ├─ src/api/consultas.api.js
  ├─ src/api/perfil.api.js
  ├─ src/api/planes.api.js
  ├─ src/api/insights.api.js
  └─ src/api/admin.api.js

Paso 3 — Infraestructura de la app
  ├─ ErrorBoundary.jsx (crear)
  ├─ App.jsx (agregar ErrorBoundary)
  └─ AuthContext.jsx (refactorizar para usar getPerfil() del backend)

Paso 4 — Seguridad
  └─ AdminRoute.jsx (usar perfil.es_admin del backend, eliminar ADMIN_EMAILS)

Paso 5 — Páginas (una por una, probar cada una antes de continuar)
  ├─ Perfil.jsx       (más sencilla — solo CRUD de perfil)
  ├─ Historial.jsx    (solo listar consultas)
  ├─ Comparador.jsx   (eliminar cálculos y PRECIO_FALLBACK)
  ├─ Insights.jsx     (solo renderizar lo que devuelve el backend)
  ├─ Chat.jsx         (más compleja — eliminar calcularCopago, refactorizar enviar)
  └─ Admin.jsx        (reemplazar todos los supabase.from() por admin.api.js)

Paso 6 — Limpieza
  ├─ Eliminar import de 'supabase' en todas las páginas excepto lib/supabase.js
  ├─ Eliminar la función calcularCopago() de Chat.jsx (líneas 473-475)
  ├─ Eliminar PRECIO_FALLBACK de Comparador.jsx (líneas 12-17)
  ├─ Eliminar const ESPECIALIDADES de Comparador.jsx (línea 6) y Admin.jsx (línea 5)
  └─ Verificar que ninguna página importe de '../lib/supabase' para datos
```

---

## Resumen de lo que el frontend NO debe hacer nunca más

| ❌ No hacer | ✅ Hacer en su lugar |
|-------------|---------------------|
| `supabase.from('consultas').select(...)` | `getConsultas()` |
| `supabase.from('perfiles').update(...)` | `actualizarPerfil(data)` |
| `supabase.from('coberturas_especialidad').select(...)` | `compararPlanes(especialidad)` |
| `supabase.from('aseguradoras').insert(...)` | `adminAseguradoras.crear(data)` |
| `precio - (precio * cobertura / 100)` | usar `copago` que devuelve el backend |
| `const ADMIN_EMAILS = ['email@...']` | `perfil.es_admin` del backend |
| `window.confirm('¿Eliminar?')` | UI de confirmación inline con estado |
| `catch {` sin parámetro | `catch (error) { console.error(error) }` |
| `key={i}` con índice | `key={item.id}` con ID único |
