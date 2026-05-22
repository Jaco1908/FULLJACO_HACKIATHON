# SaludIA 🏥🤖

> **HackIAthon 2025 · Ecuador**  
> Reto #3 — Estimador Agéntico de Copago y Cobertura para el Paciente

SaludIA es un asistente de triaje médico inteligente que analiza los síntomas del paciente, sugiere la especialidad médica correcta y le indica exactamente cuánto pagará de copago según su plan de seguro.

---

## ¿Qué hace?

1. **Triaje conversacional** — El paciente describe sus síntomas; la IA hace hasta 2 preguntas de precisión y en el tercer turno emite el diagnóstico de especialidad.
2. **Detección de emergencias** — Reconoce síntomas críticos en cualquier turno y responde de inmediato con instrucciones para llamar al ECU 911.
3. **Estimación de copago** — Cruza la especialidad sugerida con el plan de seguro del paciente y calcula exactamente cuánto paga él vs. cuánto cubre la aseguradora.
4. **Comparador de planes** — Compara todas las aseguradoras y planes disponibles para cualquier especialidad.
5. **Insights personalizados** — Resumen mensual de consultas, especialidades frecuentes y recomendación de planes.
6. **Panel admin** — CRUD completo de aseguradoras, planes, coberturas y hospitales.

---

## Arquitectura

```
[React Frontend]
      │
      │  JWT (Supabase Auth)
      ▼
[FastAPI Backend]   ←──  Groq API (Llama 3.3 70B)
      │
      │  service_role key
      ▼
[Supabase · PostgreSQL]
```

**Regla de oro:**
- El **frontend** solo llama a `supabase.auth.*` — nunca hace queries de datos.
- Todo pasa por el **backend**, que valida el JWT y ejecuta la lógica de negocio.
- El **backend** accede a Supabase con `service_role` (bypasea RLS).

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 8 + React Router 7 |
| UI | Lucide React + CSS custom (variables) |
| PDF | jsPDF |
| Auth (cliente) | Supabase JS `^2.106` — solo auth |
| Backend | FastAPI `0.136` · Python 3.11+ |
| IA | Groq API — Llama 3.3 70B Versatile |
| Base de datos | Supabase (PostgreSQL) |
| Auth (servidor) | PyJWT `2.13` — HS256, audience="authenticated" |
| Rate limiting | slowapi `0.1.9` — 10 req/min en `/analizar` |
| Config | pydantic-settings `2.9` |

---

## Estructura del proyecto

```
FULLJACO_HACKIATHON/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, CORS, routers, exception handlers
│   │   ├── config.py                # Settings con pydantic-settings + lru_cache
│   │   ├── dependencies.py          # get_current_user, require_admin (JWT + TTL cache)
│   │   ├── exceptions.py            # SaludIAException y subclases
│   │   ├── rate_limiter.py          # slowapi Limiter
│   │   ├── controllers/
│   │   │   ├── analizar_controller.py   # POST /analizar, GET /analizar/precios
│   │   │   ├── perfil_controller.py     # GET/PUT /perfil
│   │   │   ├── consulta_controller.py   # GET/POST /consultas, GET /consultas/recientes
│   │   │   ├── plan_controller.py       # GET /aseguradoras, /planes, /comparador
│   │   │   ├── insights_controller.py   # GET /insights
│   │   │   └── admin_controller.py      # CRUD /admin/*
│   │   ├── services/
│   │   │   ├── ia_service.py            # Groq API, triaje 3 turnos, JSON parsing
│   │   │   ├── copago_service.py        # calcular_copago() — fuente única de verdad
│   │   │   ├── comparador_service.py    # Comparativa de planes por especialidad
│   │   │   └── insights_service.py      # Resumen mensual, recomendaciones, N+1 free
│   │   ├── repositories/
│   │   │   ├── supabase_client.py       # Cliente Supabase con service_role + lru_cache
│   │   │   ├── perfil_repository.py     # perfiles + plan + aseguradora + coberturas
│   │   │   ├── consulta_repository.py   # consultas — create, get_by_user, get_last_n
│   │   │   ├── plan_repository.py       # CRUD planes, coberturas, get_coberturas_bulk
│   │   │   ├── aseguradora_repository.py# CRUD aseguradoras + cascade delete
│   │   │   └── hospital_repository.py   # hospitales + precios_especialidad
│   │   ├── dtos/
│   │   │   ├── analizar_dto.py
│   │   │   ├── consulta_dto.py
│   │   │   ├── perfil_dto.py
│   │   │   ├── plan_dto.py
│   │   │   └── admin_dto.py
│   │   ├── prompts/
│   │   │   └── system_prompt.txt        # Prompt completo: triaje 3 turnos, emergencias,
│   │   │                                # mapeo síntomas→especialidades, multiidioma
│   │   └── utils/
│   │       └── helpers.py               # formatear_dinero, limpiar_texto, filtrar_nulos
│   ├── requirements.txt
│   └── .env                             # ← NO commitear
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   ├── client.js                # fetch wrapper — JWT auto-injection, ApiError
    │   │   ├── analizar.api.js          # analizarSintomas, getPreciosPorEspecialidad
    │   │   ├── consultas.api.js         # getConsultas, getConsultasRecientes, guardarConsulta
    │   │   ├── perfil.api.js            # getPerfil, actualizarPerfil
    │   │   ├── planes.api.js            # getAseguradoras, getPlanes, compararPlanes
    │   │   ├── insights.api.js          # getInsights
    │   │   └── admin.api.js             # adminAseguradoras/Planes/Coberturas/Hospitales
    │   ├── constants/
    │   │   └── especialidades.js        # Lista canónica de 17 especialidades
    │   ├── context/
    │   │   └── AuthContext.jsx          # user, perfil, loading, recargarPerfil
    │   ├── components/
    │   │   ├── ErrorBoundary.jsx
    │   │   ├── Navbar.jsx
    │   │   ├── ProtectedRoute.jsx
    │   │   ├── AdminRoute.jsx           # Usa perfil.es_admin — sin hardcode de emails
    │   │   └── SplashScreen.jsx
    │   ├── pages/
    │   │   ├── Chat.jsx                 # Triaje IA + copago + PDF export
    │   │   ├── Historial.jsx            # Dashboard de consultas pasadas
    │   │   ├── Comparador.jsx           # Comparativa de planes por especialidad
    │   │   ├── Insights.jsx             # Análisis mensual + recomendaciones de plan
    │   │   ├── Perfil.jsx               # Datos personales + cambio de plan
    │   │   ├── Admin.jsx                # Panel CRUD (solo admin)
    │   │   ├── Landing.jsx
    │   │   ├── Login.jsx
    │   │   ├── Registro.jsx
    │   │   └── ResetPassword.jsx
    │   ├── lib/
    │   │   └── supabase.js              # Cliente Supabase anon — SOLO para auth
    │   └── App.jsx
    ├── package.json
    └── .env                             # ← NO commitear
```

---

## Variables de entorno

### `backend/.env`

```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # service_role — NUNCA al frontend
SUPABASE_JWT_SECRET=tu-jwt-secret   # Project Settings → API → JWT Secret

ALLOWED_ORIGINS=["http://localhost:5173","https://tu-dominio.com"]
ENVIRONMENT=development              # production desactiva /docs y /redoc

# Valores por defecto para cálculos
DEFAULT_COVERAGE_PCT=70.0
FALLBACK_PRICE=50.0
```

### `frontend/.env`

```env
VITE_BACKEND_URL=http://localhost:8000
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...       # anon key — solo para supabase.auth.*
```

---

## Instalación y ejecución

### Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # completar las variables

uvicorn app.main:app --reload --port 8000
```

Documentación interactiva (solo en `ENVIRONMENT=development`):
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # completar las variables

npm run dev            # http://localhost:5173
npm run build          # build de producción
```

---

## Endpoints de la API

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/analizar` | JWT | Triaje IA — síntomas → especialidad + copago |
| `GET` | `/analizar/precios` | JWT | Precios promedio por especialidad |
| `GET` | `/perfil` | JWT | Perfil completo con plan y coberturas |
| `PUT` | `/perfil` | JWT | Actualizar nombre y/o plan |
| `GET` | `/consultas` | JWT | Historial de consultas del usuario |
| `POST` | `/consultas` | JWT | Guardar resultado de consulta |
| `GET` | `/consultas/recientes` | JWT | Últimas 3 consultas (contexto en chat) |
| `GET` | `/aseguradoras` | JWT | Lista de aseguradoras activas |
| `GET` | `/planes` | JWT | Lista de planes, filtrable por aseguradora |
| `GET` | `/comparador` | JWT | Comparativa de planes para una especialidad |
| `GET` | `/insights` | JWT | Análisis mensual + recomendaciones de plan |
| `GET/POST/PUT/DELETE` | `/admin/*` | JWT + Admin | CRUD de aseguradoras, planes, coberturas, hospitales |
| `GET` | `/health` | — | Estado del servicio |

---

## Tablas en Supabase

| Tabla | Descripción |
|---|---|
| `perfiles` | Datos del usuario: `nombre_completo`, `plan_seguro_id`, `es_admin` |
| `aseguradoras` | `nombre`, `descripcion`, `activa` |
| `planes_seguro` | `nombre`, `aseguradora_id`, `prima_mensual`, `deducible_anual`, `activo` |
| `coberturas_especialidad` | `plan_id`, `especialidad`, `porcentaje_cobertura`, `copago_fijo`, `cubierta` |
| `hospitales` | `nombre`, `ciudad`, `especialidades` (JSONB array), `precio` |
| `precios_especialidad` | `especialidad`, `precio`, `hospital_id` |
| `consultas` | `usuario_id`, `sintomas`, `especialidad_sugerida`, `nivel_urgencia`, `copago_estimado`, `resumen` (JSONB) |

> **RLS:** Todas las tablas deben tener RLS habilitado. El backend usa `service_role` que bypasea RLS. El frontend no hace queries directas a Supabase.

---

## Especialidades médicas soportadas

`Medicina General` · `Neurología` · `Cardiología` · `Gastroenterología` · `Traumatología` · `Pediatría` · `Ginecología` · `Dermatología` · `Oncología` · `Oftalmología` · `Urología` · `Psiquiatría` · `Endocrinología` · `Reumatología` · `Otorrinolaringología` · `Neumología` · `Nefrología`

---

## Flujo de triaje (cómo funciona la IA)

```
Turno 1 → Paciente describe síntomas
        ← IA hace UNA pregunta de precisión (JSON: tipo "pregunta")

Turno 2 → Paciente responde
        ← IA hace UNA pregunta final (JSON: tipo "pregunta")

Turno 3 → Paciente responde
        ← IA emite diagnóstico (JSON: tipo "diagnostico")
           con especialidad + nivel_urgencia + confianza + razon

En cualquier turno → Si hay señal de emergencia:
        ← IA responde inmediatamente (JSON: tipo "emergencia")
           con instrucciones para llamar al ECU 911
```

---

## Seguridad

- **JWT validation:** PyJWT con `SUPABASE_JWT_SECRET`, algoritmo HS256, audience `"authenticated"`.
- **Admin TTL cache:** Verificación de rol admin con caché de 60 segundos — evita queries repetidas.
- **Rate limiting:** 10 requests/minuto en `POST /analizar` por IP.
- **CORS restringido:** Solo los orígenes declarados en `ALLOWED_ORIGINS`.
- **service_role solo en backend:** Nunca expuesto al cliente.
- **RLS en Supabase:** Habilitado en todas las tablas.
- **`.env` en `.gitignore`:** Nunca commitear credenciales.

---

## Equipo

**FULLJACO** — HackIAthon 2025 · Ecuador
