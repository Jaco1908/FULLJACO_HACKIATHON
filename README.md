# SaludIA

> **HackIAthon 2025 · Ecuador**
> Reto #3 — Estimador Agéntico de Copago y Cobertura para el Paciente

---

## Indice

1. [Descripcion del proyecto](#descripcion-del-proyecto)
2. [Acceso rapido](#acceso-rapido)
3. [Funcionalidades](#funcionalidades)
4. [Arquitectura del sistema](#arquitectura-del-sistema)
5. [Stack tecnologico](#stack-tecnologico)
6. [Estructura del repositorio](#estructura-del-repositorio)
7. [Ejecucion local — paso a paso](#ejecucion-local--paso-a-paso)
8. [Variables de entorno](#variables-de-entorno)
9. [Endpoints de la API](#endpoints-de-la-api)
10. [Tablas en Supabase](#tablas-en-supabase)
11. [Especialidades medicas soportadas](#especialidades-medicas-soportadas)
12. [Flujo del triaje con IA](#flujo-del-triaje-con-ia)
13. [Calculo del copago](#calculo-del-copago)
14. [Seguridad](#seguridad)
15. [Deployment en produccion](#deployment-en-produccion)
16. [Equipo](#equipo)

---

## Descripcion del proyecto

SaludIA es una plataforma web de triaje medico asistido por inteligencia artificial. Su proposito principal es ayudar al paciente a entender, antes de ir al medico, tres cosas concretas:

1. **A que especialidad debe ir** segun los sintomas que describe.
2. **Que nivel de urgencia tiene su caso** (normal, urgente o emergencia).
3. **Cuanto pagara de copago** dependiendo del plan de seguro medico que tiene contratado.

El sistema conduce una entrevista conversacional de hasta seis turnos, haciendo preguntas precisas sobre el sintoma principal, la evolucion temporal y los sintomas acompanantes, antes de emitir una estimacion. Si en cualquier momento detecta senales de emergencia medica, interrumpe la entrevista y le indica al usuario que llame al ECU 911.

---

## Acceso rapido

| Recurso | URL |
|---|---|
| Aplicacion en produccion | https://saludia-six.vercel.app |
| API del backend | https://fulljaco-hackiathon.onrender.com |
| Health check del backend | https://fulljaco-hackiathon.onrender.com/health |
| Documentacion Swagger (solo en desarrollo) | http://localhost:8000/docs |

### Usuario de prueba

Para explorar la aplicacion sin necesidad de crear una cuenta:

| Campo | Valor |
|---|---|
| Correo electronico | juanperez@gmail.com |
| Contrasena | Test123 |

> Este usuario tiene un plan de seguro asignado y consultas previas registradas, por lo que es posible explorar todas las funciones: chat de triaje, historial, comparador e insights.

---

## Funcionalidades

### Chat de triaje con IA

El usuario describe sus sintomas en lenguaje natural. La IA conduce una entrevista clinica estructurada:

- **Turno 1:** pregunta sobre localizacion, tipo e intensidad del sintoma.
- **Turno 2:** pregunta sobre tiempo de evolucion y si es continuo o intermitente.
- **Turno 3:** pregunta sobre sintomas acompanantes (fiebre, nauseas, mareo, etc.).
- **Turnos 4 a 6:** profundiza en antecedentes o factores de riesgo si la confianza no supera el 75%.
- **Diagnostico:** emite la especialidad sugerida, nivel de urgencia, confianza del analisis y razon clinica.

Al recibir el diagnostico, el sistema calcula y muestra:

- El precio de referencia de la consulta para esa especialidad.
- El porcentaje que cubre el plan de seguro del usuario.
- El monto exacto que cubre la aseguradora.
- El copago final que paga el paciente.
- La lista de hospitales disponibles en la red de la aseguradora, ordenados de menor a mayor copago.
- Alertas si la cobertura es inferior al 60%, si la especialidad no esta cubierta, o si el usuario no tiene seguro y el nivel de urgencia es alto.

El resultado puede exportarse como PDF con todos los datos del analisis, el desglose del copago y la lista de hospitales.

### Deteccion de emergencias

Si en cualquier turno el usuario describe sintomas criticos (dolor toracico opresivo, dificultad respiratoria severa, perdida de conciencia, sangrado abundante, deficit neurologico agudo), la IA interrumpe la entrevista, muestra un modal de alerta y proporciona un enlace directo para llamar al ECU 911.

### Historial de consultas

El usuario puede revisar todas sus consultas anteriores: fecha, sintomas descritos, especialidad sugerida, nivel de urgencia y copago estimado.

### Comparador de planes

Permite seleccionar cualquiera de las 17 especialidades medicas soportadas y ver, en una tabla, todos los planes de todas las aseguradoras disponibles con su cobertura porcentual, copago estimado y copago fijo. Se resalta el plan con mejor precio y el plan que el usuario tiene actualmente activo.

### Insights personalizados

Analisis automatico basado en el historial de consultas del usuario:

- Total de consultas realizadas y total acumulado en copagos.
- Resumen desglosado por mes con especialidades atendidas.
- Si el usuario **tiene seguro:** comparativa historica contra otros planes disponibles, indicando cuanto hubiera ahorrado o gastado de mas con cada alternativa.
- Si el usuario **no tiene seguro:** recomendacion de los tres planes que mejor cubren sus especialidades mas frecuentes, con un score de cobertura calculado a partir de su propio historial.

### Perfil y plan de seguro

El usuario puede consultar sus datos y cambiar su plan de seguro en cualquier momento. La seleccion es por aseguradora primero y luego por plan especifico dentro de esa aseguradora. El cambio se refleja inmediatamente en el calculo de copagos del chat.

### Panel de administracion

Accesible unicamente para usuarios con rol de administrador. Permite gestionar el catalogo completo:

- Aseguradoras: crear, editar, activar o desactivar.
- Planes de seguro: crear, editar, asociar a aseguradora.
- Coberturas por especialidad: configurar porcentaje de cobertura y copago fijo para cada especialidad dentro de un plan.
- Hospitales: registrar nombre, ciudad, especialidades atendidas y precio de consulta.

---

## Arquitectura del sistema

```
[Navegador / React Frontend]
          |
          |  HTTPS · JWT Bearer (Supabase Auth)
          v
  [FastAPI Backend · Python]  <----  Groq API (Llama 3.3 70B)
          |
          |  service_role key (bypasea RLS)
          v
  [Supabase · PostgreSQL]
```

**Principio de diseno:**

- El **frontend** nunca hace consultas de datos directamente a Supabase. Solo usa `supabase.auth.*` para manejar la sesion en localStorage.
- Toda la logica de negocio vive en el **backend**, que valida el JWT en cada peticion y ejecuta las queries con la clave `service_role`.
- El **backend** es el unico que conoce `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_JWT_SECRET`. Estas claves nunca llegan al navegador.

---

## Stack tecnologico

| Capa | Tecnologia | Version |
|---|---|---|
| Frontend | React | 19.2 |
| Build tool | Vite | 8.0 |
| Routing | React Router | 7.15 |
| Iconos | Lucide React | 1.16 |
| Exportacion PDF | jsPDF | 4.2 |
| Auth cliente | Supabase JS | 2.106 |
| Backend | FastAPI | 0.136 |
| Runtime | Python | 3.13 |
| Servidor ASGI | Uvicorn | 0.47 |
| Modelo IA | Groq — Llama 3.3 70B Versatile | — |
| Base de datos | Supabase (PostgreSQL) | — |
| Validacion JWT | PyJWT | 2.13 |
| Rate limiting | slowapi | 0.1.9 |
| Configuracion | pydantic-settings | 2.9 |
| HTTP cliente | httpx | 0.28 |

---

## Estructura del repositorio

```
FULLJACO_HACKIATHON/
|
+-- backend/
|   +-- app/
|   |   +-- main.py                    # FastAPI app, CORS, routers, handlers de excepcion
|   |   +-- config.py                  # Settings via pydantic-settings con lru_cache
|   |   +-- dependencies.py            # get_current_user, require_admin, cache JWT/JWKS
|   |   +-- exceptions.py              # SaludIAException y subclases tipadas
|   |   +-- rate_limiter.py            # slowapi Limiter global
|   |   |
|   |   +-- controllers/
|   |   |   +-- auth_controller.py     # POST /auth/login, /register, /reset-password, /refresh
|   |   |   +-- analizar_controller.py # POST /analizar  GET /analizar/precios
|   |   |   +-- perfil_controller.py   # GET /perfil  PUT /perfil
|   |   |   +-- consulta_controller.py # GET /consultas  POST /consultas  GET /consultas/recientes
|   |   |   +-- plan_controller.py     # GET /aseguradoras  /planes  /comparador
|   |   |   +-- insights_controller.py # GET /insights
|   |   |   +-- admin_controller.py    # CRUD /admin/*  (requiere es_admin=true)
|   |   |
|   |   +-- services/
|   |   |   +-- ia_service.py          # Groq API, construccion de prompt, parsing JSON
|   |   |   +-- copago_service.py      # calcular_copago() — unica fuente de verdad
|   |   |   +-- comparador_service.py  # comparativa de planes por especialidad
|   |   |   +-- insights_service.py    # resumen mensual, comparativa, recomendaciones
|   |   |
|   |   +-- repositories/
|   |   |   +-- supabase_client.py     # cliente Supabase con service_role
|   |   |   +-- perfil_repository.py   # perfiles + plan + aseguradora + coberturas
|   |   |   +-- consulta_repository.py # consultas — create, get_by_user, get_last_n
|   |   |   +-- plan_repository.py     # planes, coberturas, get_coberturas_bulk (evita N+1)
|   |   |   +-- aseguradora_repository.py
|   |   |   +-- hospital_repository.py # hospitales + filtro por especialidad/aseguradora
|   |   |
|   |   +-- dtos/                      # Modelos Pydantic de entrada y salida
|   |   +-- prompts/
|   |   |   +-- system_prompt.txt      # Prompt del triaje: reglas, formato JSON, emergencias
|   |   +-- utils/
|   |       +-- helpers.py
|   |
|   +-- requirements.txt
|   +-- runtime.txt                    # python-3.13.0 (para Render)
|   +-- .env.example                   # Plantilla de variables — copiar a .env
|
+-- frontend/
|   +-- src/
|   |   +-- api/
|   |   |   +-- client.js              # fetch wrapper con inyeccion de JWT y refresco automatico
|   |   |   +-- analizar.api.js
|   |   |   +-- consultas.api.js
|   |   |   +-- perfil.api.js
|   |   |   +-- planes.api.js
|   |   |   +-- insights.api.js
|   |   |   +-- admin.api.js
|   |   |
|   |   +-- context/
|   |   |   +-- AuthContext.jsx        # user, perfil, loading, iniciarSesion, cerrarSesion
|   |   |
|   |   +-- components/
|   |   |   +-- Navbar.jsx
|   |   |   +-- ProtectedRoute.jsx     # Redirige a /login si no hay sesion
|   |   |   +-- AdminRoute.jsx         # Redirige si perfil.es_admin !== true
|   |   |   +-- SplashScreen.jsx
|   |   |   +-- ErrorBoundary.jsx
|   |   |
|   |   +-- pages/
|   |   |   +-- Landing.jsx
|   |   |   +-- Login.jsx
|   |   |   +-- Registro.jsx
|   |   |   +-- ResetPassword.jsx
|   |   |   +-- Chat.jsx               # Triaje IA, copago, alertas, exportar PDF
|   |   |   +-- Historial.jsx
|   |   |   +-- Comparador.jsx
|   |   |   +-- Insights.jsx
|   |   |   +-- Perfil.jsx
|   |   |   +-- Admin.jsx
|   |   |
|   |   +-- lib/
|   |   |   +-- supabase.js            # Cliente Supabase anon — solo para supabase.auth.*
|   |   |
|   |   +-- constants/
|   |       +-- especialidades.js      # Lista canonica de 17 especialidades
|   |
|   +-- package.json
|   +-- package-lock.json
|   +-- vercel.json                    # Rewrite de rutas para React Router SPA
|   +-- .env.example                   # Plantilla de variables — copiar a .env
|
+-- render.yaml                        # Configuracion de deployment en Render
+-- .gitignore
+-- README.md
```

---

## Ejecucion local — paso a paso

Esta seccion explica como levantar el proyecto completo en una maquina local desde cero.

### Paso 1 — Requisitos previos

Antes de comenzar, verificar que el sistema tiene instalado lo siguiente:

**Python 3.13**
Descargar desde https://www.python.org/downloads/
Durante la instalacion en Windows, marcar la opcion "Add Python to PATH".
Verificar la instalacion:
```bash
python --version
# Debe mostrar: Python 3.13.x
```

**Node.js 18 o superior**
Descargar desde https://nodejs.org/ (version LTS recomendada).
Verificar la instalacion:
```bash
node --version
# Debe mostrar: v18.x.x o superior

npm --version
# Debe mostrar: 9.x.x o superior
```

**Git**
Descargar desde https://git-scm.com/downloads si no esta instalado.

---

### Paso 2 — Clonar el repositorio

```bash
git clone https://github.com/Jaco1908/FULLJACO_HACKIATHON.git
cd FULLJACO_HACKIATHON
```

---

### Paso 3 — Obtener las credenciales necesarias

El proyecto requiere dos servicios externos. Hay que obtener las claves antes de configurar los archivos `.env`.

**Clave de Groq (modelo de IA)**

1. Ir a https://console.groq.com/keys
2. Crear una cuenta gratuita o iniciar sesion
3. Click en "Create API Key"
4. Copiar la clave — empieza con `gsk_`

**Credenciales de Supabase (base de datos y autenticacion)**

1. Ir a https://supabase.com y acceder al proyecto existente o crear uno nuevo
2. En el dashboard, ir a: Settings → API
3. Copiar los siguientes valores:

| Valor | Donde encontrarlo |
|---|---|
| `SUPABASE_URL` | Seccion "Project URL" |
| `SUPABASE_ANON_KEY` | Seccion "Project API keys" → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Seccion "Project API keys" → service_role |
| `SUPABASE_JWT_SECRET` | Settings → API → JWT Settings → JWT Secret |

> La `service_role` key solo va en el backend. La `anon` key solo va en el frontend.

---

### Paso 4 — Configurar y levantar el backend

Abrir una terminal en la raiz del proyecto.

**4.1 — Entrar a la carpeta del backend**
```bash
cd backend
```

**4.2 — Crear el entorno virtual de Python**
```bash
python -m venv venv
```

**4.3 — Activar el entorno virtual**

En Windows:
```bash
venv\Scripts\activate
```

En Mac o Linux:
```bash
source venv/bin/activate
```

Una vez activado, el prompt de la terminal muestra `(venv)` al inicio. Si no aparece, el entorno no se activo correctamente.

**4.4 — Instalar las dependencias**
```bash
pip install -r requirements.txt
```

Este proceso descarga e instala los 67 paquetes listados en `requirements.txt`. Puede tardar entre 1 y 3 minutos dependiendo de la conexion.

**4.5 — Crear el archivo de variables de entorno**

En Windows:
```bash
copy .env.example .env
```

En Mac o Linux:
```bash
cp .env.example .env
```

Abrir el archivo `backend/.env` con cualquier editor de texto y completar los valores con las credenciales obtenidas en el Paso 3:

```env
GROQ_API_KEY=gsk_TU_CLAVE_DE_GROQ
GROQ_MODEL=llama-3.3-70b-versatile

SUPABASE_URL=https://TU_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=TU_JWT_SECRET

ALLOWED_ORIGINS=["http://localhost:5173"]
ENVIRONMENT=development

DEFAULT_COVERAGE_PCT=70.0
FALLBACK_PRICE=50.0
```

**4.6 — Iniciar el servidor**
```bash
uvicorn app.main:app --reload --port 8000
```

Si el servidor inicio correctamente, la terminal muestra:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Verificar que el backend responde abriendo en el navegador:
```
http://localhost:8000/health
```

Debe devolver: `{"status": "ok", "service": "SaludIA Backend"}`

Con `ENVIRONMENT=development` tambien estan disponibles:
- Swagger UI (documentacion interactiva): http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

**Dejar esta terminal abierta.** El backend debe estar corriendo mientras se usa la aplicacion.

---

### Paso 5 — Configurar y levantar el frontend

Abrir **una segunda terminal** en la raiz del proyecto.

**5.1 — Entrar a la carpeta del frontend**
```bash
cd frontend
```

**5.2 — Instalar las dependencias**
```bash
npm install
```

Descarga los paquetes de Node.js listados en `package.json`. Puede tardar entre 30 segundos y 2 minutos.

**5.3 — Crear el archivo de variables de entorno**

En Windows:
```bash
copy .env.example .env
```

En Mac o Linux:
```bash
cp .env.example .env
```

Abrir el archivo `frontend/.env` y completar los valores:

```env
VITE_BACKEND_URL=http://localhost:8000
VITE_SUPABASE_URL=https://TU_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...LA_ANON_KEY...
```

> En `VITE_SUPABASE_ANON_KEY` va la clave `anon public`, no la `service_role`.

**5.4 — Iniciar el servidor de desarrollo**
```bash
npm run dev
```

La terminal muestra:
```
  VITE v8.x.x  ready in xxx ms

  Local:   http://localhost:5173/
```

Abrir el navegador en http://localhost:5173 para ver la aplicacion.

---

### Paso 6 — Verificar que todo funciona

Con el backend corriendo en el puerto 8000 y el frontend en el puerto 5173:

1. Abrir http://localhost:5173
2. Iniciar sesion con el usuario de prueba: `juanperez@gmail.com` / `Test123`
3. Ir al Chat y describir un sintoma
4. La IA debe responder con una pregunta de seguimiento

Si el login falla con un error de conexion, verificar que el backend esta corriendo y que `VITE_BACKEND_URL` en `frontend/.env` apunta a `http://localhost:8000`.

---

### Resolucion de problemas comunes

**El backend no arranca — error "ModuleNotFoundError"**
El entorno virtual no esta activado. Ejecutar `venv\Scripts\activate` (Windows) o `source venv/bin/activate` (Mac/Linux) y luego volver a correr `uvicorn`.

**El backend no arranca — error "ValidationError" o "field required"**
Falta alguna variable de entorno en `backend/.env`. Revisar que todas las claves del Paso 4.5 esten completas y sin espacios extra.

**El frontend muestra "No se puede conectar al servidor"**
Verificar que el backend esta corriendo en el puerto 8000. Si se cambio el puerto, actualizar `VITE_BACKEND_URL` en `frontend/.env` y reiniciar `npm run dev`.

**El frontend muestra errores de CORS**
Verificar que `ALLOWED_ORIGINS` en `backend/.env` incluye `http://localhost:5173`. Reiniciar el servidor de uvicorn despues de cualquier cambio en `.env`.

**npm install falla con errores de permisos (Mac/Linux)**
No usar `sudo npm install`. En su lugar, configurar los permisos de npm: https://docs.npmjs.com/resolving-eacces-permissions-errors-with-npm

---

## Variables de entorno

### Backend — `backend/.env`

```env
# Groq API — obtener en https://console.groq.com/keys
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# Supabase — obtener en https://supabase.com/dashboard/project/<ref>/settings/api
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # service_role — NUNCA exponer al frontend
SUPABASE_JWT_SECRET=...               # Settings > API > JWT Settings > Legacy JWT Secret

# CORS — origenes permitidos
ALLOWED_ORIGINS=["http://localhost:5173"]

# Entorno: development activa /docs y /redoc. production los desactiva.
ENVIRONMENT=development

# Valores por defecto para calculos medicos
DEFAULT_COVERAGE_PCT=70.0
FALLBACK_PRICE=50.0
```

### Frontend — `frontend/.env`

```env
# URL del backend FastAPI
VITE_BACKEND_URL=http://localhost:8000

# Supabase
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...         # anon key — es publica, seguro en el frontend
```

---

## Endpoints de la API

Todos los endpoints (excepto `/health` y `/auth/*`) requieren el header:

```
Authorization: Bearer <access_token>
```

| Metodo | Ruta | Descripcion |
|---|---|---|
| `POST` | `/auth/login` | Iniciar sesion — devuelve access_token y refresh_token |
| `POST` | `/auth/register` | Registrar nuevo usuario en Supabase Auth |
| `POST` | `/auth/reset-password` | Enviar correo de recuperacion de contrasena |
| `POST` | `/auth/refresh` | Renovar el access_token usando el refresh_token |
| `POST` | `/analizar` | Triaje IA — sintomas → especialidad + copago + hospitales |
| `GET` | `/analizar/precios` | Precios promedio por especialidad |
| `GET` | `/perfil` | Perfil completo del usuario con plan y coberturas |
| `PUT` | `/perfil` | Actualizar nombre o plan de seguro |
| `GET` | `/consultas` | Historial completo de consultas del usuario |
| `POST` | `/consultas` | Guardar resultado de una consulta |
| `GET` | `/consultas/recientes` | Ultimas 3 consultas (contexto para el chat) |
| `GET` | `/aseguradoras` | Lista de aseguradoras activas |
| `GET` | `/planes` | Planes de una aseguradora (filtro por `aseguradora_id`) |
| `GET` | `/comparador` | Copago estimado de todos los planes para una especialidad |
| `GET` | `/insights` | Analisis mensual, comparativa y recomendaciones de plan |
| `GET/POST/PUT/DELETE` | `/admin/aseguradoras` | CRUD de aseguradoras (solo admin) |
| `GET/POST/PUT/DELETE` | `/admin/planes` | CRUD de planes (solo admin) |
| `GET/POST/PUT/DELETE` | `/admin/coberturas` | CRUD de coberturas por especialidad (solo admin) |
| `GET/POST/PUT/DELETE` | `/admin/hospitales` | CRUD de hospitales (solo admin) |
| `GET` | `/health` | Estado del servicio — no requiere autenticacion |

---

## Tablas en Supabase

| Tabla | Campos principales | Descripcion |
|---|---|---|
| `perfiles` | `id`, `nombre_completo`, `plan_seguro_id`, `es_admin` | Datos del usuario. `id` es el mismo UUID de Supabase Auth. |
| `aseguradoras` | `id`, `nombre`, `descripcion`, `activa` | Catalogo de aseguradoras. |
| `planes_seguro` | `id`, `nombre`, `aseguradora_id`, `prima_mensual`, `deducible_anual`, `activo` | Planes asociados a una aseguradora. |
| `coberturas_especialidad` | `plan_id`, `especialidad`, `porcentaje_cobertura`, `copago_fijo`, `cubierta` | Cobertura de cada especialidad para un plan. |
| `hospitales` | `id`, `nombre`, `ciudad`, `especialidades` (JSONB), `precio` | Red de hospitales disponibles. |
| `precios_especialidad` | `especialidad`, `precio`, `hospital_id` | Precio de consulta por especialidad en cada hospital. |
| `consultas` | `id`, `usuario_id`, `sintomas`, `especialidad_sugerida`, `nivel_urgencia`, `copago_estimado`, `resumen` (JSONB), `created_at` | Historial de consultas por usuario. |

**Seguridad:** Todas las tablas deben tener Row Level Security (RLS) habilitado en Supabase. El backend usa la clave `service_role` que bypasea RLS, por lo que opera con privilegios completos. El frontend nunca accede directamente a estas tablas.

---

## Especialidades medicas soportadas

El sistema reconoce 17 especialidades. La IA unicamente puede devolver una de estas opciones; cualquier valor fuera de la lista es normalizado a Medicina General automaticamente.

```
Medicina General   Neurologia        Cardiologia
Gastroenterologia  Traumatologia     Pediatria
Ginecologia        Dermatologia      Oncologia
Oftalmologia       Urologia          Psiquiatria
Endocrinologia     Reumatologia      Otorrinolaringologia
Neumologia         Nefrologia
```

---

## Flujo del triaje con IA

```
Usuario: "Me duele la cabeza desde ayer"
      |
      v
Backend: construye historial + datos del perfil + prompt del sistema
      |
      v
Groq (Llama 3.3 70B): analiza y responde en JSON estricto
      |
      +-- tipo: "pregunta"   --> el backend devuelve la pregunta al frontend
      |                          el frontend la muestra como burbuja de chat
      |
      +-- tipo: "diagnostico" -> el backend calcula el copago y busca hospitales
      |                          devuelve especialidad + copago + hospitales al frontend
      |
      +-- tipo: "emergencia" --> el backend registra la consulta y devuelve la alerta
                                 el frontend muestra el modal de emergencia (ECU 911)

Minimo de preguntas antes del diagnostico: 3 turnos
Maximo de preguntas permitidas:            6 turnos
Si la confianza supera el 85% antes del minimo, se puede adelantar el diagnostico.
Si se alcanza el maximo, se fuerza el diagnostico inmediatamente.
```

---

## Calculo del copago

El calculo se realiza exclusivamente en `backend/app/services/copago_service.py`. No hay ninguna formula en el frontend.

```
precio_consulta     = precio del hospital segun la especialidad
cobertura_pct       = porcentaje de cobertura del plan para esa especialidad
monto_cubierto      = precio_consulta * (cobertura_pct / 100)
copago_porcentual   = precio_consulta - monto_cubierto
copago_fijo         = valor minimo configurado en el plan (puede ser 0)
copago_final        = max(copago_porcentual, copago_fijo)
```

Si el usuario no tiene plan de seguro, `cobertura_pct` es 0 y el copago es igual al precio completo de la consulta.

---

## Seguridad

| Mecanismo | Implementacion |
|---|---|
| Autenticacion | JWT de Supabase validado en cada request via PyJWT. Soporta ES256/RS256 (JWKS) y HS256 (legacy). |
| Autorizacion admin | Campo `es_admin` en la tabla `perfiles`. Verificacion con cache TTL de 60 segundos. |
| Rate limiting | 10 requests/minuto en `POST /analizar` por IP (slowapi). |
| CORS | Solo los dominios declarados en `ALLOWED_ORIGINS` pueden hacer peticiones al backend. |
| Secretos | `service_role` y `JWT_SECRET` solo existen en variables de entorno del backend. Nunca en el frontend ni en el repositorio. |
| RLS | Row Level Security habilitado en Supabase para todas las tablas. |
| `.gitignore` | Los archivos `.env` estan excluidos del control de versiones. |

---

## Deployment en produccion

La aplicacion esta desplegada con las siguientes plataformas:

| Componente | Plataforma | URL |
|---|---|---|
| Frontend | Vercel | https://saludia-six.vercel.app |
| Backend | Render (Free tier) | https://fulljaco-hackiathon.onrender.com |
| Base de datos | Supabase | Proyecto `nndvufsbdnnuaonkwetq` |

El repositorio en GitHub tiene auto-deploy configurado: cualquier `push` a la rama `main` dispara un nuevo deployment en Render y Vercel automaticamente.

**Nota sobre el Free Tier de Render:** El servicio se suspende tras 15 minutos de inactividad. La primera peticion despues de un periodo de inactividad puede tardar entre 20 y 40 segundos mientras el servidor se reactiva. Esta limitacion es propia del plan gratuito de Render y no afecta al comportamiento funcional de la aplicacion.

---

## Equipo

**FULLJACO** — HackIAthon 2025 · Ecuador
