# Backend.md — Guía de Refactorización Completa
## SaludIA · HackIAthon 2025

> **Estado actual:** El backend tiene una base funcional con FastAPI, pero le faltan capas completas de arquitectura: DTOs de respuesta, Repositorios, manejo centralizado de excepciones, autenticación JWT, configuración centralizada y todos los endpoints que actualmente el frontend resuelve llamando a Supabase directamente.
>
> **Objetivo:** Arquitectura en capas completa donde **el frontend nunca toca Supabase** — todo pasa por el backend.

---

## Índice

1. [Arquitectura objetivo](#1-arquitectura-objetivo)
2. [Estructura de carpetas](#2-estructura-de-carpetas)
3. [Lo que está mal ahora y por qué](#3-lo-que-está-mal-ahora-y-por-qué)
4. [Capa 1 — Configuración (config.py)](#4-capa-1--configuración-configpy)
5. [Capa 2 — Cliente Supabase (repositories/supabase_client.py)](#5-capa-2--cliente-supabase)
6. [Capa 3 — DTOs (dtos/)](#6-capa-3--dtos)
7. [Capa 4 — Repositorios (repositories/)](#7-capa-4--repositorios)
8. [Capa 5 — Servicios (services/)](#8-capa-5--servicios)
9. [Capa 6 — Autenticación y dependencias (dependencies.py)](#9-capa-6--autenticación-y-dependencias)
10. [Capa 7 — Excepciones (exceptions.py)](#10-capa-7--excepciones)
11. [Capa 8 — Controladores (controllers/)](#11-capa-8--controladores)
12. [Capa 9 — Main actualizado (main.py)](#12-capa-9--main-actualizado)
13. [Todos los endpoints requeridos](#13-todos-los-endpoints-requeridos)
14. [requirements.txt correcto](#14-requirementstxt-correcto)
15. [Variables de entorno (.env)](#15-variables-de-entorno-env)
16. [Orden de refactorización recomendado](#16-orden-de-refactorización-recomendado)

---

## 1. Arquitectura objetivo

```
HTTP Request
     │
     ▼
┌─────────────┐
│ Controller  │  ← Recibe request, valida DTO de entrada, devuelve DTO de salida
│  (router)   │    NO tiene lógica de negocio
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Service   │  ← Toda la lógica de negocio aquí (copago, IA, insights, comparador)
│             │    Orquesta llamadas a repositorios
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Repository  │  ← Único punto de contacto con Supabase
│             │    Solo hace queries, devuelve datos crudos o None
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Supabase   │  ← Base de datos (PostgreSQL gestionado)
│  (service   │    El backend usa service_role key para bypass RLS
│   role key) │    La seguridad la controla el backend, no RLS
└─────────────┘
```

### Flujo de autenticación

```
Frontend                    Backend                     Supabase
   │                           │                           │
   │── supabase.auth.signIn ──►│                           │
   │◄── JWT token ─────────────│◄── JWT token ─────────────│
   │                           │                           │
   │── POST /analizar ─────────│                           │
   │   Authorization: Bearer   │                           │
   │   {JWT}                   │── verify_jwt(token) ─────►│
   │                           │◄── user_id ───────────────│
   │                           │── supabase.from('...') ──►│
   │◄── response ──────────────│◄── data ──────────────────│
```

---

## 2. Estructura de carpetas

### Estructura actual (con problemas)
```
backend/
└── app/
    ├── main.py                    ← ✅ existe
    ├── data/
    │   ├── hospitales.json        ← ⚠️ duplicado con tabla Supabase
    │   ├── especialidades.json    ← ❌ no se usa
    │   └── planes.json            ← ❌ no se usa
    ├── models/
    │   └── request_models.py      ← ⚠️ solo AnalizarRequest, no hay DTOs de respuesta
    ├── routes/
    │   └── analizar.py            ← ⚠️ mezcla routing con lógica
    ├── services/
    │   ├── ia_service.py          ← ⚠️ prompt hardcodeado, ruta relativa, sin auth
    │   └── copago_service.py      ← ✅ correcto pero muy pequeño
    ├── utils/
    │   └── helpers.py             ← ❌ vacío
    └── prompts/
        └── system_prompt.txt      ← ❌ existe pero no se usa
```

### Estructura objetivo (arquitectura en capas)
```
backend/
├── app/
│   ├── main.py                          ← app FastAPI + registro de routers + middleware
│   ├── config.py                        ← NUEVO: todas las variables de entorno centralizadas
│   ├── dependencies.py                  ← NUEVO: get_current_user, require_admin
│   ├── exceptions.py                    ← NUEVO: excepciones custom + handlers globales
│   │
│   ├── dtos/                            ← NUEVO: Data Transfer Objects
│   │   ├── __init__.py
│   │   ├── analizar_dto.py              ← AnalizarRequest + AnalizarResponse
│   │   ├── consulta_dto.py              ← ConsultaCreate + ConsultaResponse
│   │   ├── perfil_dto.py                ← PerfilResponse + PerfilUpdate
│   │   ├── plan_dto.py                  ← PlanResponse + AseguradoraResponse
│   │   └── admin_dto.py                 ← DTOs para CRUD admin
│   │
│   ├── repositories/                    ← NUEVO: capa de acceso a datos
│   │   ├── __init__.py
│   │   ├── supabase_client.py           ← cliente Supabase singleton
│   │   ├── perfil_repository.py         ← queries sobre tabla 'perfiles'
│   │   ├── consulta_repository.py       ← queries sobre tabla 'consultas'
│   │   ├── plan_repository.py           ← queries sobre tablas 'planes_seguro', 'coberturas_especialidad'
│   │   ├── aseguradora_repository.py    ← queries sobre tabla 'aseguradoras'
│   │   └── hospital_repository.py       ← queries sobre tabla 'hospitales'
│   │
│   ├── services/                        ← lógica de negocio
│   │   ├── __init__.py
│   │   ├── ia_service.py                ← REFACTORIZAR: usa repositorio en vez de JSON
│   │   ├── copago_service.py            ← ✅ mantener, pequeño ajuste
│   │   ├── comparador_service.py        ← NUEVO: lógica del comparador de planes
│   │   ├── insights_service.py          ← NUEVO: lógica de insights/estadísticas
│   │   └── perfil_service.py            ← NUEVO: lógica de perfil
│   │
│   ├── controllers/                     ← RENOMBRAR desde routes/
│   │   ├── __init__.py
│   │   ├── analizar_controller.py       ← POST /analizar, GET /precios
│   │   ├── consulta_controller.py       ← GET /consultas, POST /consultas
│   │   ├── perfil_controller.py         ← GET /perfil, PUT /perfil
│   │   ├── plan_controller.py           ← GET /planes, GET /aseguradoras
│   │   ├── comparador_controller.py     ← GET /comparador
│   │   ├── insights_controller.py       ← GET /insights
│   │   └── admin_controller.py          ← CRUD /admin/*
│   │
│   └── prompts/
│       └── system_prompt.txt            ← USAR ESTE en vez de hardcodear en Python
│
├── requirements.txt                     ← CORREGIR: agregar groq, supabase, python-jose
└── .env                                 ← agregar SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_JWT_SECRET
```

---

## 3. Lo que está mal ahora y por qué

### ❌ 3.1 No hay DTOs de respuesta

**Archivo actual:** `app/models/request_models.py`

**Problema:** Solo existe `AnalizarRequest`. Las respuestas se devuelven como `dict` sin estructura definida. Esto significa:
- No hay documentación automática de los responses en Swagger
- El frontend no sabe qué esperar — si cambia la lógica, no hay contrato
- No hay validación de lo que el backend devuelve

```python
# ❌ ACTUAL: el backend devuelve dicts sueltos sin esquema
return {
    "tipo": "diagnostico",
    "especialidad": especialidad,
    "copago": copago,
    # ¿qué más viene aquí? nadie lo sabe sin leer el código
}
```

**Solución:** Definir Pydantic models para CADA response. Ver [sección 6](#6-capa-3--dtos).

---

### ❌ 3.2 No hay Repositorios — datos en archivo JSON estático

**Archivo:** `app/services/ia_service.py`, línea 11

```python
# ❌ ACTUAL: lee un JSON estático al arrancar el servidor
with open("app/data/hospitales.json", "r", encoding="utf-8") as f:
    hospitales = json.load(f)
```

**Problema:**
- Los hospitales que el admin crea en Supabase nunca aparecen en los diagnósticos
- Si el archivo no existe o la ruta es incorrecta, el servidor no arranca
- No hay forma de actualizar hospitales sin hacer deploy

**Solución:** Crear `hospital_repository.py` que lea de la tabla `hospitales` de Supabase. Ver [sección 7](#7-capa-4--repositorios).

---

### ❌ 3.3 No hay manejo de excepciones centralizado

**Problema:** Los errores se manejan con `try/except` dentro de cada función, y se devuelven como dicts con campo `"tipo": "error"`. Esto hace que el frontend no pueda distinguir un error de negocio de un error HTTP real.

```python
# ❌ ACTUAL: error disfrazado como respuesta exitosa (HTTP 200)
except Exception as e:
    return {"tipo": "error", "mensaje": f"Error al conectar con la IA: {str(e)}"}
```

**Correcto:** Los errores deben ser excepciones HTTP reales (404, 401, 422, 500). El frontend puede usar `response.ok` y el status code.

---

### ❌ 3.4 No hay autenticación en ningún endpoint

**Problema:** Cualquier persona sin cuenta puede:
- Llamar a `POST /analizar` y consumir tu cuota de Groq
- Llamar a `GET /precios` sin restricción

**Solución:** Dependency injection de FastAPI para verificar JWT de Supabase. Ver [sección 9](#9-capa-6--autenticación-y-dependencias).

---

### ❌ 3.5 No hay configuración centralizada

**Problema:** Variables de entorno con `os.getenv()` directamente en `ia_service.py`. Si cambias el nombre de una variable o necesitas un valor por defecto, tienes que buscar en todos los archivos.

```python
# ❌ ACTUAL: disperso en el código
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
```

---

### ❌ 3.6 `groq` no está en requirements.txt

**El archivo importa:**
```python
from groq import Groq   # línea 3 de ia_service.py
```
**Pero requirements.txt lista `openai==2.37.0`** — quien instale el proyecto obtendrá `ModuleNotFoundError`.

---

### ❌ 3.7 System prompt hardcodeado ignorando el archivo .txt

`app/prompts/system_prompt.txt` existe pero no se usa. El prompt de 117 líneas está hardcodeado en `ia_service.py` entre las líneas 21-137.

---

### ❌ 3.8 El backend no expone endpoints para lo que el frontend necesita

El frontend actualmente llama a Supabase directamente para:

| Operación | Tabla Supabase | Debe ser endpoint |
|-----------|---------------|-------------------|
| Ver perfil + plan de seguro | `perfiles`, `planes_seguro`, `coberturas_especialidad` | `GET /perfil` |
| Actualizar perfil | `perfiles` | `PUT /perfil` |
| Guardar consulta | `consultas` | `POST /consultas` |
| Ver historial | `consultas` | `GET /consultas` |
| Listar aseguradoras | `aseguradoras` | `GET /aseguradoras` |
| Listar planes | `planes_seguro` | `GET /planes` |
| Comparador | `coberturas_especialidad` | `GET /comparador` |
| Insights | `consultas`, `coberturas_especialidad` | `GET /insights` |
| Admin CRUD | múltiples tablas | `CRUD /admin/*` |

---

## 4. Capa 1 — Configuración (config.py)

**Crear:** `app/config.py`

```python
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # IA
    groq_api_key: str
    groq_model: str = "llama-3.3-70b-versatile"

    # Supabase
    supabase_url: str
    supabase_service_role_key: str   # service_role key — nunca la anon key en el backend
    supabase_jwt_secret: str          # Settings > API > JWT Secret en el dashboard

    # App
    allowed_origins: list[str] = ["http://localhost:5173"]
    environment: str = "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

**Por qué `lru_cache`:** Se lee el `.env` una sola vez y se cachea. Seguro y eficiente.

**Actualizar `.env`:**
```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # en Dashboard > Settings > API > service_role
SUPABASE_JWT_SECRET=tu-jwt-secret  # en Dashboard > Settings > API > JWT Secret

ALLOWED_ORIGINS=["http://localhost:5173","https://tu-dominio.com"]
ENVIRONMENT=development
```

> ⚠️ **IMPORTANTE:** El backend usa la `service_role` key, **no la anon key**. La service_role bypassa RLS y permite al backend operar como administrador de la BD. **NUNCA exponer esta key en el frontend.**

---

## 5. Capa 2 — Cliente Supabase

**Crear:** `app/repositories/supabase_client.py`

```python
from supabase import create_client, Client
from functools import lru_cache
from app.config import get_settings


@lru_cache()
def get_supabase() -> Client:
    """
    Cliente Supabase singleton con service_role key.
    Bypass completo de RLS — la seguridad la controla el backend.
    """
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key
    )
```

**Por qué singleton con `lru_cache`:** El cliente Supabase mantiene conexiones internas. Crear uno por request es ineficiente. Un singleton es correcto aquí.

---

## 6. Capa 3 — DTOs

Los DTOs definen el **contrato** entre frontend y backend. Cada endpoint tiene un DTO de entrada (Request) y uno de salida (Response).

### 6.1 `app/dtos/analizar_dto.py`

```python
from pydantic import BaseModel, Field
from typing import Optional


# ── REQUEST ──────────────────────────────────────────────────────────────
class AnalizarRequest(BaseModel):
    texto: str = Field(..., min_length=3, max_length=2000,
                       description="Descripción de síntomas del usuario")
    historial: list[str] = Field(default=[], max_length=20)
    # Estos campos los rellena el backend desde el perfil del usuario autenticado
    # Ya NO los manda el frontend — el backend los obtiene de Supabase


# ── RESPONSES ─────────────────────────────────────────────────────────────
class HospitalDTO(BaseModel):
    nombre: str
    ciudad: str
    precio: float
    copago: float


class AnalizarPreguntaResponse(BaseModel):
    tipo: str = "pregunta"
    pregunta: str
    opciones: list[str]


class AnalizarDiagnosticoResponse(BaseModel):
    tipo: str = "diagnostico"
    especialidad: str
    nivel_urgencia: str          # "normal" | "urgente" | "emergencia"
    confianza: int               # 1-100
    razon: str
    copago: float
    precio_consulta: float
    cobertura_aplicada: float
    monto_cubierto: float
    copago_fijo: float
    plan_nombre: Optional[str]
    aseguradora: Optional[str]
    hospital: str
    ciudad_hospital: str
    hospitales_disponibles: list[HospitalDTO]


class AnalizarEmergenciaResponse(BaseModel):
    tipo: str = "emergencia"
    nivel_urgencia: str = "emergencia"
    mensaje: str


class PreciosResponse(BaseModel):
    """Precio promedio por especialidad calculado desde hospitales reales"""
    precios: dict[str, float]
```

---

### 6.2 `app/dtos/consulta_dto.py`

```python
from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


class ConsultaCreate(BaseModel):
    sintomas: str = Field(..., max_length=2000)
    especialidad_sugerida: Optional[str] = None
    nivel_urgencia: Optional[str] = None
    copago_estimado: Optional[float] = None
    resumen: Optional[dict] = None  # JSON completo del resultado


class ConsultaResponse(BaseModel):
    id: str
    usuario_id: str
    sintomas: str
    especialidad_sugerida: Optional[str]
    nivel_urgencia: Optional[str]
    copago_estimado: Optional[float]
    resumen: Optional[Any]
    created_at: datetime
```

---

### 6.3 `app/dtos/perfil_dto.py`

```python
from pydantic import BaseModel
from typing import Optional


class CoberturaDTO(BaseModel):
    especialidad: str
    porcentaje_cobertura: float
    copago_fijo: float


class PlanSeguroDTO(BaseModel):
    id: str
    nombre: str
    prima_mensual: float
    deducible_anual: float
    aseguradora_nombre: str
    coberturas: list[CoberturaDTO]


class PerfilResponse(BaseModel):
    id: str
    nombre_completo: Optional[str]
    email: str
    plan_seguro: Optional[PlanSeguroDTO]
    es_admin: bool = False


class PerfilUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    plan_seguro_id: Optional[str] = None
```

---

### 6.4 `app/dtos/plan_dto.py`

```python
from pydantic import BaseModel
from typing import Optional


class AseguradoraResponse(BaseModel):
    id: str
    nombre: str
    descripcion: Optional[str]
    activa: bool


class PlanResponse(BaseModel):
    id: str
    nombre: str
    prima_mensual: float
    deducible_anual: float
    descripcion: Optional[str]
    activo: bool
    aseguradora_id: str
    aseguradora_nombre: str


class ComparadorItemResponse(BaseModel):
    plan_id: str
    plan_nombre: str
    aseguradora_nombre: str
    prima_mensual: float
    porcentaje_cobertura: float
    copago_estimado: float
    copago_fijo: float
    es_mi_plan: bool
```

---

### 6.5 `app/dtos/admin_dto.py`

```python
from pydantic import BaseModel, Field
from typing import Optional


# ── ASEGURADORAS ──────────────────────────────────────────────────────────
class AseguradoraCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    descripcion: Optional[str] = None
    activa: bool = True


class AseguradoraUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None


# ── PLANES ────────────────────────────────────────────────────────────────
class PlanCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    aseguradora_id: str
    prima_mensual: float = Field(..., gt=0)
    deducible_anual: float = Field(default=0, ge=0)
    descripcion: Optional[str] = None
    activo: bool = True


class PlanUpdate(BaseModel):
    nombre: Optional[str] = None
    prima_mensual: Optional[float] = None
    deducible_anual: Optional[float] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


# ── COBERTURAS ────────────────────────────────────────────────────────────
class CoberturaCreate(BaseModel):
    plan_id: str
    especialidad: str
    porcentaje_cobertura: float = Field(..., ge=0, le=100)
    copago_fijo: float = Field(default=0, ge=0)
    cubierta: bool = True


class CoberturaUpdate(BaseModel):
    porcentaje_cobertura: Optional[float] = Field(None, ge=0, le=100)
    copago_fijo: Optional[float] = Field(None, ge=0)


# ── HOSPITALES ────────────────────────────────────────────────────────────
class HospitalCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=200)
    ciudad: str
    direccion: Optional[str] = None
    nivel: str = "intermedio"


class HospitalUpdate(BaseModel):
    nombre: Optional[str] = None
    ciudad: Optional[str] = None
    direccion: Optional[str] = None
    nivel: Optional[str] = None
```

---

## 7. Capa 4 — Repositorios

Los repositorios son la **única** capa que habla con Supabase. No tienen lógica de negocio — solo ejecutan queries y retornan datos o `None`.

### 7.1 `app/repositories/hospital_repository.py`

```python
from app.repositories.supabase_client import get_supabase


class HospitalRepository:

    def __init__(self):
        self.db = get_supabase()

    def get_all(self) -> list[dict]:
        response = self.db.table("hospitales").select("*").order("ciudad,nombre").execute()
        return response.data or []

    def get_by_id(self, hospital_id: str) -> dict | None:
        response = self.db.table("hospitales").select("*").eq("id", hospital_id).single().execute()
        return response.data

    def get_by_especialidad(self, especialidad: str) -> list[dict]:
        """
        Retorna hospitales que tienen precio definido para esa especialidad.
        Como la tabla 'hospitales' en Supabase no tiene los precios por especialidad
        (eso era el JSON), necesitamos una tabla 'hospital_especialidades' o
        ajustar el esquema. Ver nota abajo.
        """
        response = (
            self.db.table("hospital_especialidades")
            .select("*, hospital:hospital_id(*)")
            .eq("especialidad", especialidad)
            .order("precio")
            .execute()
        )
        return response.data or []

    def create(self, data: dict) -> dict:
        response = self.db.table("hospitales").insert(data).execute()
        return response.data[0]

    def update(self, hospital_id: str, data: dict) -> dict:
        response = self.db.table("hospitales").update(data).eq("id", hospital_id).execute()
        return response.data[0]

    def delete(self, hospital_id: str) -> None:
        self.db.table("hospitales").delete().eq("id", hospital_id).execute()

    def get_precios_por_especialidad(self) -> dict[str, float]:
        """Precio promedio por especialidad desde la tabla hospital_especialidades"""
        response = self.db.table("hospital_especialidades").select("especialidad,precio").execute()
        datos = response.data or []
        precios: dict[str, list[float]] = {}
        for row in datos:
            esp = row["especialidad"]
            precio = row["precio"]
            precios.setdefault(esp, []).append(precio)
        return {esp: round(sum(vals) / len(vals)) for esp, vals in precios.items()}
```

> ⚠️ **NOTA IMPORTANTE — Esquema de BD requerido:**
>
> El JSON actual de hospitales tiene precios por especialidad (`"Neurología": 110`). La tabla `hospitales` de Supabase solo tiene nombre, ciudad, dirección, nivel — **no tiene precios por especialidad**.
>
> Se debe crear la tabla `hospital_especialidades`:
> ```sql
> CREATE TABLE hospital_especialidades (
>   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
>   hospital_id UUID REFERENCES hospitales(id) ON DELETE CASCADE,
>   especialidad TEXT NOT NULL,
>   precio NUMERIC NOT NULL,
>   UNIQUE(hospital_id, especialidad)
> );
> ```
> Y migrar los datos del JSON a esta tabla.

---

### 7.2 `app/repositories/consulta_repository.py`

```python
from app.repositories.supabase_client import get_supabase


class ConsultaRepository:

    def __init__(self):
        self.db = get_supabase()

    def create(self, data: dict) -> dict:
        response = self.db.table("consultas").insert(data).execute()
        return response.data[0]

    def get_by_user(self, user_id: str, limit: int = 50) -> list[dict]:
        response = (
            self.db.table("consultas")
            .select("*")
            .eq("usuario_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []

    def get_last_n(self, user_id: str, n: int = 3) -> list[dict]:
        response = (
            self.db.table("consultas")
            .select("especialidad_sugerida, sintomas, created_at")
            .eq("usuario_id", user_id)
            .order("created_at", desc=True)
            .limit(n)
            .execute()
        )
        return response.data or []
```

---

### 7.3 `app/repositories/perfil_repository.py`

```python
from app.repositories.supabase_client import get_supabase


class PerfilRepository:

    def __init__(self):
        self.db = get_supabase()

    def get_by_id(self, user_id: str) -> dict | None:
        response = (
            self.db.table("perfiles")
            .select("""
                *,
                plan_seguro:plan_seguro_id(
                    *,
                    aseguradora:aseguradora_id(*),
                    coberturas:coberturas_especialidad(*)
                )
            """)
            .eq("id", user_id)
            .single()
            .execute()
        )
        return response.data

    def update(self, user_id: str, data: dict) -> dict:
        response = (
            self.db.table("perfiles")
            .update(data)
            .eq("id", user_id)
            .execute()
        )
        return response.data[0]
```

---

### 7.4 `app/repositories/plan_repository.py`

```python
from app.repositories.supabase_client import get_supabase


class PlanRepository:

    def __init__(self):
        self.db = get_supabase()

    def get_aseguradoras(self, solo_activas: bool = True) -> list[dict]:
        query = self.db.table("aseguradoras").select("*").order("nombre")
        if solo_activas:
            query = query.eq("activa", True)
        return query.execute().data or []

    def get_planes(self, aseguradora_id: str | None = None) -> list[dict]:
        query = (
            self.db.table("planes_seguro")
            .select("*, aseguradora:aseguradora_id(nombre)")
            .eq("activo", True)
            .order("prima_mensual")
        )
        if aseguradora_id:
            query = query.eq("aseguradora_id", aseguradora_id)
        return query.execute().data or []

    def get_coberturas_por_especialidad(self, especialidad: str) -> list[dict]:
        response = (
            self.db.table("coberturas_especialidad")
            .select("*, plan:plan_id(*, aseguradora:aseguradora_id(nombre))")
            .eq("especialidad", especialidad)
            .eq("cubierta", True)
            .order("porcentaje_cobertura", desc=True)
            .execute()
        )
        return response.data or []

    def get_coberturas_de_plan(self, plan_id: str) -> list[dict]:
        response = (
            self.db.table("coberturas_especialidad")
            .select("*")
            .eq("plan_id", plan_id)
            .order("especialidad")
            .execute()
        )
        return response.data or []
```

---

### 7.5 `app/repositories/aseguradora_repository.py`

```python
from app.repositories.supabase_client import get_supabase


class AseguradoraRepository:

    def __init__(self):
        self.db = get_supabase()

    def get_all(self) -> list[dict]:
        return self.db.table("aseguradoras").select("*").order("nombre").execute().data or []

    def get_by_id(self, aseguradora_id: str) -> dict | None:
        return self.db.table("aseguradoras").select("*").eq("id", aseguradora_id).single().execute().data

    def create(self, data: dict) -> dict:
        return self.db.table("aseguradoras").insert(data).execute().data[0]

    def update(self, aseguradora_id: str, data: dict) -> dict:
        return self.db.table("aseguradoras").update(data).eq("id", aseguradora_id).execute().data[0]

    def delete(self, aseguradora_id: str) -> None:
        # Primero obtener planes para cascada manual
        planes = self.db.table("planes_seguro").select("id").eq("aseguradora_id", aseguradora_id).execute().data or []
        plan_ids = [p["id"] for p in planes]
        if plan_ids:
            self.db.table("coberturas_especialidad").delete().in_("plan_id", plan_ids).execute()
            self.db.table("planes_seguro").delete().in_("id", plan_ids).execute()
        self.db.table("aseguradoras").delete().eq("id", aseguradora_id).execute()
```

---

## 8. Capa 5 — Servicios

Los servicios contienen **toda** la lógica de negocio. Llaman a los repositorios, procesan datos, toman decisiones.

### 8.1 `app/services/ia_service.py` — Refactorizado

```python
import json
from pathlib import Path
from groq import Groq
from app.config import get_settings
from app.services.copago_service import calcular_copago
from app.repositories.hospital_repository import HospitalRepository
from app.exceptions import IAServiceError

settings = get_settings()
client = Groq(api_key=settings.groq_api_key)

# Cargar prompt desde archivo externo
PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "system_prompt.txt"
SYSTEM_PROMPT = PROMPT_PATH.read_text(encoding="utf-8")

ESPECIALIDADES_VALIDAS = [
    "Medicina General", "Neurología", "Cardiología", "Gastroenterología",
    "Traumatología", "Pediatría", "Ginecología", "Dermatología", "Oncología",
    "Oftalmología", "Urología", "Psiquiatría", "Endocrinología", "Reumatología",
    "Otorrinolaringología", "Neumología", "Nefrología"
]


def _buscar_hospitales(especialidad: str, hospital_repo: HospitalRepository) -> list[dict]:
    """Obtiene hospitales desde Supabase (no desde JSON)"""
    disponibles = hospital_repo.get_by_especialidad(especialidad)
    if not disponibles:
        disponibles = hospital_repo.get_by_especialidad("Medicina General")
    return sorted(disponibles, key=lambda x: x["precio"])


def _construir_system_prompt(num_intercambios: int) -> str:
    """Agrega instrucciones específicas por turno al system prompt base"""
    system = SYSTEM_PROMPT
    if num_intercambios == 0:
        system += "\n\n⚠️ TURNO 1: Responde SOLO con tipo 'pregunta' sobre sexo/edad."
    elif num_intercambios == 1:
        system += "\n\n⚠️ TURNO 2: Responde SOLO con tipo 'pregunta' sobre duración/intensidad."
    else:
        system += "\n\n⚠️ TURNO 3: Da el diagnóstico final. PROHIBIDO hacer más preguntas."
    return system


async def analizar_sintomas(
    texto: str,
    historial: list[str],
    plan_cobertura: float,
    plan_nombre: str | None,
    aseguradora: str | None,
    coberturas_por_especialidad: dict | None,
    hospital_repo: HospitalRepository
) -> dict:
    """
    Lógica principal del triaje con IA.
    Ahora recibe hospital_repo como dependencia en vez de leer JSON.
    """
    num_intercambios = len(historial) // 2
    system = _construir_system_prompt(num_intercambios)

    messages = [{"role": "system", "content": system}]
    for i, msg in enumerate(historial[-10:]):
        role = "user" if i % 2 == 0 else "assistant"
        messages.append({"role": role, "content": msg})
    messages.append({"role": "user", "content": texto})

    try:
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
            temperature=0.2,
            max_tokens=700,
        )
        raw = response.choices[0].message.content.strip()

        # Limpiar bloques ```json si la IA los incluye
        if "```" in raw:
            for part in raw.split("```"):
                part = part.strip().lstrip("json").strip()
                if part.startswith("{"):
                    raw = part
                    break

        data = json.loads(raw)

    except json.JSONDecodeError:
        # La IA no devolvió JSON válido — fallback conservador
        data = {
            "tipo": "diagnostico",
            "especialidad": "Medicina General",
            "nivel_urgencia": "normal",
            "confianza": 40,
            "razon": "No pude analizar tus síntomas con precisión. Te recomiendo consultar con un médico general."
        }
    except Exception as e:
        raise IAServiceError(f"Error al conectar con el servicio de IA: {str(e)}")

    return _procesar_respuesta_ia(data, plan_cobertura, plan_nombre, aseguradora,
                                   coberturas_por_especialidad, hospital_repo)


def _procesar_respuesta_ia(
    data: dict,
    plan_cobertura: float,
    plan_nombre: str | None,
    aseguradora: str | None,
    coberturas_por_especialidad: dict | None,
    hospital_repo: HospitalRepository
) -> dict:
    tipo = data.get("tipo")

    if tipo == "emergencia":
        return {
            "tipo": "emergencia",
            "nivel_urgencia": "emergencia",
            "mensaje": f"⚠️ {data.get('mensaje', 'Acude inmediatamente a urgencias o llama al ECU 911.')}"
        }

    if tipo == "pregunta":
        return {
            "tipo": "pregunta",
            "pregunta": data.get("pregunta", "¿Puedes describir con más detalle cómo te sientes?"),
            "opciones": data.get("opciones", ["Leve", "Moderado", "Fuerte", "Otro"])
        }

    if tipo == "diagnostico":
        especialidad = data.get("especialidad", "Medicina General")
        if especialidad not in ESPECIALIDADES_VALIDAS:
            especialidad = "Medicina General"

        confianza = max(1, min(100, int(data.get("confianza", 75))))
        hospitales_disp = _buscar_hospitales(especialidad, hospital_repo)
        hospital = hospitales_disp[0] if hospitales_disp else {
            "nombre": "Hospital General", "ciudad": "N/A", "precio": 50
        }

        cobertura_esp = coberturas_por_especialidad.get(especialidad) if coberturas_por_especialidad else None
        if cobertura_esp:
            pct = cobertura_esp.get("pct", plan_cobertura)
            copago_fijo = cobertura_esp.get("copago", 0)
            copago = max(calcular_copago(hospital["precio"], pct), copago_fijo)
            cobertura_aplicada = pct
        else:
            pct = plan_cobertura
            copago_fijo = 0
            copago = calcular_copago(hospital["precio"], plan_cobertura)
            cobertura_aplicada = plan_cobertura

        for h in hospitales_disp:
            h["copago"] = max(calcular_copago(h["precio"], pct), copago_fijo) if cobertura_esp \
                          else calcular_copago(h["precio"], plan_cobertura)

        precio = hospital["precio"]
        return {
            "tipo": "diagnostico",
            "especialidad": especialidad,
            "nivel_urgencia": data.get("nivel_urgencia", "normal"),
            "confianza": confianza,
            "razon": data.get("razon", ""),
            "copago": copago,
            "precio_consulta": precio,
            "cobertura_aplicada": cobertura_aplicada,
            "monto_cubierto": round(precio * cobertura_aplicada / 100, 2),
            "copago_fijo": copago_fijo,
            "plan_nombre": plan_nombre,
            "aseguradora": aseguradora,
            "hospital": hospital["nombre"],
            "ciudad_hospital": hospital["ciudad"],
            "hospitales_disponibles": hospitales_disp[:3],
        }

    raise IAServiceError("Tipo de respuesta IA no reconocido")
```

---

### 8.2 `app/services/copago_service.py` — Sin cambios (ya es correcto)

```python
def calcular_copago(precio: float, cobertura: float) -> float:
    """
    Calcula el copago que paga el paciente.
    Esta función es la ÚNICA fuente de verdad para el cálculo del copago.
    El frontend NO debe replicar esta fórmula.
    """
    return round(precio - (precio * cobertura / 100), 2)
```

---

### 8.3 `app/services/comparador_service.py` — NUEVO

```python
from app.repositories.plan_repository import PlanRepository
from app.repositories.hospital_repository import HospitalRepository
from app.services.copago_service import calcular_copago


class ComparadorService:

    def __init__(self, plan_repo: PlanRepository, hospital_repo: HospitalRepository):
        self.plan_repo = plan_repo
        self.hospital_repo = hospital_repo

    def comparar_planes(self, especialidad: str, mi_plan_id: str | None) -> dict:
        coberturas = self.plan_repo.get_coberturas_por_especialidad(especialidad)
        precios = self.hospital_repo.get_precios_por_especialidad()
        precio_referencia = precios.get(especialidad, 80)

        resultado = []
        for c in coberturas:
            plan = c.get("plan") or {}
            copago_estimado = calcular_copago(precio_referencia, c["porcentaje_cobertura"])
            resultado.append({
                "plan_id": c["plan_id"],
                "plan_nombre": plan.get("nombre", ""),
                "aseguradora_nombre": (plan.get("aseguradora") or {}).get("nombre", ""),
                "prima_mensual": plan.get("prima_mensual", 0),
                "porcentaje_cobertura": c["porcentaje_cobertura"],
                "copago_estimado": copago_estimado,
                "copago_fijo": c.get("copago_fijo", 0),
                "es_mi_plan": c["plan_id"] == mi_plan_id,
            })

        return {
            "especialidad": especialidad,
            "precio_referencia": precio_referencia,
            "planes": resultado
        }
```

---

### 8.4 `app/services/insights_service.py` — NUEVO

```python
from app.repositories.consulta_repository import ConsultaRepository
from app.repositories.plan_repository import PlanRepository
from app.services.copago_service import calcular_copago


class InsightsService:

    def __init__(self, consulta_repo: ConsultaRepository, plan_repo: PlanRepository):
        self.consulta_repo = consulta_repo
        self.plan_repo = plan_repo

    def get_insights(self, user_id: str, mi_plan_id: str | None) -> dict:
        consultas = self.consulta_repo.get_by_user(user_id)

        # Resumen mensual
        meses = self._resumen_mensual(consultas)

        # Especialidades frecuentes
        especialidades_freq = self._frecuencia_especialidades(consultas)

        # Comparativa de planes (si tiene plan)
        comparativa = self._comparativa_planes(consultas, mi_plan_id) if mi_plan_id else None

        # Recomendaciones (si no tiene plan)
        recomendaciones = self._recomendar_planes(especialidades_freq) if not mi_plan_id else None

        return {
            "resumen_mensual": meses,
            "especialidades_frecuentes": especialidades_freq[:3],
            "comparativa_planes": comparativa,
            "recomendaciones": recomendaciones,
            "total_consultas": len(consultas),
            "total_copago": sum(float(c.get("copago_estimado") or 0) for c in consultas),
        }

    def _resumen_mensual(self, consultas: list) -> list:
        meses: dict = {}
        for c in consultas:
            from datetime import datetime
            fecha = datetime.fromisoformat(c["created_at"])
            key = fecha.strftime("%B %Y")
            if key not in meses:
                meses[key] = {"mes": key, "consultas": 0, "copago": 0.0, "especialidades": []}
            meses[key]["consultas"] += 1
            meses[key]["copago"] += float(c.get("copago_estimado") or 0)
            if c.get("especialidad_sugerida"):
                meses[key]["especialidades"].append(c["especialidad_sugerida"])
        return list(meses.values())

    def _frecuencia_especialidades(self, consultas: list) -> list[dict]:
        freq: dict = {}
        for c in consultas:
            esp = c.get("especialidad_sugerida")
            if esp:
                freq[esp] = freq.get(esp, 0) + 1
        return [{"especialidad": k, "cantidad": v}
                for k, v in sorted(freq.items(), key=lambda x: -x[1])]

    def _comparativa_planes(self, consultas: list, mi_plan_id: str) -> list:
        # Obtiene todas las coberturas de todos los planes activos
        todos_planes = self.plan_repo.get_planes()
        resultado = []
        for plan in todos_planes:
            if plan["id"] == mi_plan_id:
                continue
            coberturas = {
                c["especialidad"]: c["porcentaje_cobertura"]
                for c in self.plan_repo.get_coberturas_de_plan(plan["id"])
            }
            costo = sum(
                calcular_copago(c["resumen"]["precio_consulta"], coberturas.get(c["especialidad_sugerida"], 0))
                for c in consultas
                if c.get("resumen") and c.get("especialidad_sugerida")
                   and c["resumen"].get("precio_consulta")
            )
            resultado.append({"plan": plan, "costo_historico": round(costo, 2)})
        return sorted(resultado, key=lambda x: x["costo_historico"])[:5]

    def _recomendar_planes(self, especialidades_freq: list) -> list:
        top_esps = [e["especialidad"] for e in especialidades_freq[:3]]
        todos_planes = self.plan_repo.get_planes()
        resultado = []
        for plan in todos_planes:
            coberturas = {
                c["especialidad"]: c["porcentaje_cobertura"]
                for c in self.plan_repo.get_coberturas_de_plan(plan["id"])
            }
            score = sum(coberturas.get(esp, 0) for esp in top_esps) / max(len(top_esps), 1)
            resultado.append({"plan": plan, "score": round(score)})
        return sorted(resultado, key=lambda x: -x["score"])[:3]
```

---

## 9. Capa 6 — Autenticación y dependencias

**Crear:** `app/dependencies.py`

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import get_settings
from app.repositories.perfil_repository import PerfilRepository

security = HTTPBearer()
settings = get_settings()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Verifica el JWT de Supabase y retorna el user_id.
    Úsalo en CUALQUIER endpoint que requiera usuario autenticado.

    Ejemplo de uso en un controller:
        @router.get("/perfil")
        async def get_perfil(user_id: str = Depends(get_current_user_id)):
            ...
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False}  # Supabase no usa 'aud' estándar
        )
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: no contiene user_id"
            )
        return user_id
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido o expirado: {str(e)}"
        )


def require_admin(user_id: str = Depends(get_current_user_id)) -> str:
    """
    Verifica que el usuario autenticado sea administrador.
    El campo 'es_admin' se lee desde la tabla 'perfiles' en Supabase.

    Ejemplo de uso:
        @router.delete("/admin/aseguradoras/{id}")
        async def eliminar(id: str, admin_id: str = Depends(require_admin)):
            ...
    """
    repo = PerfilRepository()
    perfil = repo.get_by_id(user_id)
    if not perfil or not perfil.get("es_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador"
        )
    return user_id
```

> ⚠️ **Agregar a Supabase:** Ejecutar en el SQL Editor de Supabase:
> ```sql
> ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS es_admin BOOLEAN DEFAULT FALSE;
> -- Dar admin al primer usuario:
> UPDATE perfiles SET es_admin = TRUE WHERE id = 'uuid-del-admin';
> ```

---

## 10. Capa 7 — Excepciones

**Crear:** `app/exceptions.py`

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


# ── Excepciones personalizadas ───────────────────────────────────────────

class SaludIAException(Exception):
    """Base de todas las excepciones de la aplicación"""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class IAServiceError(SaludIAException):
    """Error al comunicarse con el servicio de IA (Groq)"""
    def __init__(self, message: str):
        super().__init__(message, status_code=503)


class RecursoNoEncontrado(SaludIAException):
    """El recurso solicitado no existe en la BD"""
    def __init__(self, recurso: str, id: str):
        super().__init__(f"{recurso} con id '{id}' no encontrado", status_code=404)


class PermisoDenegado(SaludIAException):
    """El usuario no tiene permisos para esta operación"""
    def __init__(self, detail: str = "No tienes permisos para esta operación"):
        super().__init__(detail, status_code=403)


class ValidacionError(SaludIAException):
    """Error de validación de negocio (distinto de validación de Pydantic)"""
    def __init__(self, message: str):
        super().__init__(message, status_code=422)


# ── Registro de handlers en FastAPI ─────────────────────────────────────

def register_exception_handlers(app: FastAPI) -> None:
    """Llama esto en main.py para registrar todos los handlers"""

    @app.exception_handler(SaludIAException)
    async def saludia_exception_handler(request: Request, exc: SaludIAException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.message, "tipo": type(exc).__name__}
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        # En producción nunca exponer el detalle del error interno
        import logging
        logging.error(f"Error no manejado: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": "Error interno del servidor", "tipo": "InternalServerError"}
        )
```

---

## 11. Capa 8 — Controladores

Los controladores son delgados: reciben el request, llaman al servicio, devuelven el DTO de respuesta. **Sin lógica de negocio aquí.**

### 11.1 `app/controllers/analizar_controller.py`

```python
from fastapi import APIRouter, Depends
from app.dtos.analizar_dto import AnalizarRequest, PreciosResponse
from app.services.ia_service import analizar_sintomas
from app.repositories.hospital_repository import HospitalRepository
from app.repositories.perfil_repository import PerfilRepository
from app.dependencies import get_current_user_id

router = APIRouter(prefix="/analizar", tags=["Análisis IA"])


@router.post("")
async def analizar(
    data: AnalizarRequest,
    user_id: str = Depends(get_current_user_id)  # ← requiere autenticación
):
    """
    Analiza síntomas con IA y calcula copago según el plan del usuario.
    El backend obtiene el plan del usuario desde Supabase — el frontend
    ya NO necesita enviar plan_cobertura, aseguradora ni coberturas.
    """
    perfil_repo = PerfilRepository()
    hospital_repo = HospitalRepository()

    perfil = perfil_repo.get_by_id(user_id)
    plan_seguro = (perfil or {}).get("plan_seguro")

    # Extraer datos del plan desde el perfil en Supabase
    plan_cobertura = 70.0
    plan_nombre = None
    aseguradora = None
    coberturas_por_especialidad = None

    if plan_seguro:
        plan_nombre = plan_seguro.get("nombre")
        aseguradora = (plan_seguro.get("aseguradora") or {}).get("nombre")
        coberturas_raw = plan_seguro.get("coberturas", [])
        if coberturas_raw:
            coberturas_por_especialidad = {
                c["especialidad"]: {"pct": c["porcentaje_cobertura"], "copago": c["copago_fijo"]}
                for c in coberturas_raw
            }

    return await analizar_sintomas(
        texto=data.texto,
        historial=data.historial,
        plan_cobertura=plan_cobertura,
        plan_nombre=plan_nombre,
        aseguradora=aseguradora,
        coberturas_por_especialidad=coberturas_por_especialidad,
        hospital_repo=hospital_repo
    )


@router.get("/precios", response_model=PreciosResponse)
async def get_precios(user_id: str = Depends(get_current_user_id)):
    """Precio promedio por especialidad desde la base de datos real"""
    hospital_repo = HospitalRepository()
    precios = hospital_repo.get_precios_por_especialidad()
    return PreciosResponse(precios=precios)
```

---

### 11.2 `app/controllers/consulta_controller.py`

```python
from fastapi import APIRouter, Depends
from app.dtos.consulta_dto import ConsultaCreate, ConsultaResponse
from app.repositories.consulta_repository import ConsultaRepository
from app.dependencies import get_current_user_id

router = APIRouter(prefix="/consultas", tags=["Consultas"])


@router.post("", response_model=ConsultaResponse)
async def crear_consulta(
    data: ConsultaCreate,
    user_id: str = Depends(get_current_user_id)
):
    repo = ConsultaRepository()
    consulta = repo.create({
        "usuario_id": user_id,
        "sintomas": data.sintomas,
        "especialidad_sugerida": data.especialidad_sugerida,
        "nivel_urgencia": data.nivel_urgencia,
        "copago_estimado": data.copago_estimado,
        "resumen": data.resumen,
    })
    return ConsultaResponse(**consulta)


@router.get("", response_model=list[ConsultaResponse])
async def listar_consultas(user_id: str = Depends(get_current_user_id)):
    repo = ConsultaRepository()
    consultas = repo.get_by_user(user_id)
    return [ConsultaResponse(**c) for c in consultas]


@router.get("/recientes")
async def consultas_recientes(user_id: str = Depends(get_current_user_id)):
    """Últimas 3 consultas — para mostrar contexto en el chat"""
    repo = ConsultaRepository()
    return repo.get_last_n(user_id, n=3)
```

---

### 11.3 `app/controllers/perfil_controller.py`

```python
from fastapi import APIRouter, Depends
from app.dtos.perfil_dto import PerfilResponse, PerfilUpdate
from app.repositories.perfil_repository import PerfilRepository
from app.dependencies import get_current_user_id
from app.exceptions import RecursoNoEncontrado

router = APIRouter(prefix="/perfil", tags=["Perfil"])


@router.get("", response_model=PerfilResponse)
async def get_perfil(user_id: str = Depends(get_current_user_id)):
    repo = PerfilRepository()
    perfil = repo.get_by_id(user_id)
    if not perfil:
        raise RecursoNoEncontrado("Perfil", user_id)
    # Mapear estructura de Supabase al DTO
    plan = perfil.get("plan_seguro")
    plan_dto = None
    if plan:
        plan_dto = {
            "id": plan["id"],
            "nombre": plan["nombre"],
            "prima_mensual": plan["prima_mensual"],
            "deducible_anual": plan["deducible_anual"],
            "aseguradora_nombre": (plan.get("aseguradora") or {}).get("nombre", ""),
            "coberturas": plan.get("coberturas", [])
        }
    return PerfilResponse(
        id=perfil["id"],
        nombre_completo=perfil.get("nombre_completo"),
        email=perfil.get("email", ""),
        plan_seguro=plan_dto,
        es_admin=perfil.get("es_admin", False)
    )


@router.put("")
async def actualizar_perfil(
    data: PerfilUpdate,
    user_id: str = Depends(get_current_user_id)
):
    repo = PerfilRepository()
    updates = data.model_dump(exclude_none=True)
    if not updates:
        return {"message": "Sin cambios"}
    updated = repo.update(user_id, updates)
    return updated
```

---

### 11.4 `app/controllers/plan_controller.py`

```python
from fastapi import APIRouter, Depends, Query
from app.repositories.plan_repository import PlanRepository
from app.services.comparador_service import ComparadorService
from app.repositories.hospital_repository import HospitalRepository
from app.dependencies import get_current_user_id, get_current_user_id
from app.repositories.perfil_repository import PerfilRepository

router = APIRouter(tags=["Planes y Comparador"])


@router.get("/aseguradoras")
async def listar_aseguradoras(user_id: str = Depends(get_current_user_id)):
    repo = PlanRepository()
    return repo.get_aseguradoras(solo_activas=True)


@router.get("/planes")
async def listar_planes(
    aseguradora_id: str | None = Query(None),
    user_id: str = Depends(get_current_user_id)
):
    repo = PlanRepository()
    return repo.get_planes(aseguradora_id=aseguradora_id)


@router.get("/comparador")
async def comparar_planes(
    especialidad: str = Query(..., description="Nombre de la especialidad médica"),
    user_id: str = Depends(get_current_user_id)
):
    plan_repo = PlanRepository()
    hospital_repo = HospitalRepository()
    perfil_repo = PerfilRepository()

    perfil = perfil_repo.get_by_id(user_id)
    mi_plan_id = (perfil or {}).get("plan_seguro_id")

    service = ComparadorService(plan_repo, hospital_repo)
    return service.comparar_planes(especialidad, mi_plan_id)
```

---

### 11.5 `app/controllers/insights_controller.py`

```python
from fastapi import APIRouter, Depends
from app.repositories.consulta_repository import ConsultaRepository
from app.repositories.plan_repository import PlanRepository
from app.repositories.perfil_repository import PerfilRepository
from app.services.insights_service import InsightsService
from app.dependencies import get_current_user_id

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("")
async def get_insights(user_id: str = Depends(get_current_user_id)):
    perfil_repo = PerfilRepository()
    perfil = perfil_repo.get_by_id(user_id)
    mi_plan_id = (perfil or {}).get("plan_seguro_id")

    service = InsightsService(
        consulta_repo=ConsultaRepository(),
        plan_repo=PlanRepository()
    )
    return service.get_insights(user_id, mi_plan_id)
```

---

### 11.6 `app/controllers/admin_controller.py`

```python
from fastapi import APIRouter, Depends
from app.dtos.admin_dto import (
    AseguradoraCreate, AseguradoraUpdate,
    PlanCreate, PlanUpdate,
    CoberturaCreate, CoberturaUpdate,
    HospitalCreate, HospitalUpdate
)
from app.repositories.aseguradora_repository import AseguradoraRepository
from app.repositories.plan_repository import PlanRepository
from app.repositories.hospital_repository import HospitalRepository
from app.repositories.supabase_client import get_supabase
from app.dependencies import require_admin
from app.exceptions import RecursoNoEncontrado

router = APIRouter(prefix="/admin", tags=["Admin"])

# ── ASEGURADORAS ──────────────────────────────────────────────────────────

@router.get("/aseguradoras")
async def listar_aseguradoras(admin_id: str = Depends(require_admin)):
    return AseguradoraRepository().get_all()

@router.post("/aseguradoras", status_code=201)
async def crear_aseguradora(data: AseguradoraCreate, admin_id: str = Depends(require_admin)):
    return AseguradoraRepository().create(data.model_dump())

@router.put("/aseguradoras/{aseguradora_id}")
async def actualizar_aseguradora(aseguradora_id: str, data: AseguradoraUpdate, admin_id: str = Depends(require_admin)):
    return AseguradoraRepository().update(aseguradora_id, data.model_dump(exclude_none=True))

@router.delete("/aseguradoras/{aseguradora_id}", status_code=204)
async def eliminar_aseguradora(aseguradora_id: str, admin_id: str = Depends(require_admin)):
    AseguradoraRepository().delete(aseguradora_id)

# ── PLANES ────────────────────────────────────────────────────────────────

@router.get("/planes")
async def listar_planes(admin_id: str = Depends(require_admin)):
    repo = PlanRepository()
    return get_supabase().table("planes_seguro").select("*, aseguradora:aseguradora_id(nombre)").order("nombre").execute().data or []

@router.post("/planes", status_code=201)
async def crear_plan(data: PlanCreate, admin_id: str = Depends(require_admin)):
    return get_supabase().table("planes_seguro").insert(data.model_dump()).execute().data[0]

@router.put("/planes/{plan_id}")
async def actualizar_plan(plan_id: str, data: PlanUpdate, admin_id: str = Depends(require_admin)):
    return get_supabase().table("planes_seguro").update(data.model_dump(exclude_none=True)).eq("id", plan_id).execute().data[0]

@router.delete("/planes/{plan_id}", status_code=204)
async def eliminar_plan(plan_id: str, admin_id: str = Depends(require_admin)):
    get_supabase().table("coberturas_especialidad").delete().eq("plan_id", plan_id).execute()
    get_supabase().table("planes_seguro").delete().eq("id", plan_id).execute()

# ── COBERTURAS ────────────────────────────────────────────────────────────

@router.get("/coberturas/{plan_id}")
async def listar_coberturas(plan_id: str, admin_id: str = Depends(require_admin)):
    return PlanRepository().get_coberturas_de_plan(plan_id)

@router.post("/coberturas", status_code=201)
async def crear_cobertura(data: CoberturaCreate, admin_id: str = Depends(require_admin)):
    db = get_supabase()
    return db.table("coberturas_especialidad").upsert(
        data.model_dump(), on_conflict="plan_id,especialidad"
    ).execute().data[0]

@router.put("/coberturas/{cobertura_id}")
async def actualizar_cobertura(cobertura_id: str, data: CoberturaUpdate, admin_id: str = Depends(require_admin)):
    return get_supabase().table("coberturas_especialidad").update(
        data.model_dump(exclude_none=True)
    ).eq("id", cobertura_id).execute().data[0]

@router.delete("/coberturas/{cobertura_id}", status_code=204)
async def eliminar_cobertura(cobertura_id: str, admin_id: str = Depends(require_admin)):
    get_supabase().table("coberturas_especialidad").delete().eq("id", cobertura_id).execute()

# ── HOSPITALES ────────────────────────────────────────────────────────────

@router.get("/hospitales")
async def listar_hospitales(admin_id: str = Depends(require_admin)):
    return HospitalRepository().get_all()

@router.post("/hospitales", status_code=201)
async def crear_hospital(data: HospitalCreate, admin_id: str = Depends(require_admin)):
    return HospitalRepository().create(data.model_dump())

@router.put("/hospitales/{hospital_id}")
async def actualizar_hospital(hospital_id: str, data: HospitalUpdate, admin_id: str = Depends(require_admin)):
    return HospitalRepository().update(hospital_id, data.model_dump(exclude_none=True))

@router.delete("/hospitales/{hospital_id}", status_code=204)
async def eliminar_hospital(hospital_id: str, admin_id: str = Depends(require_admin)):
    HospitalRepository().delete(hospital_id)
```

---

## 12. Capa 9 — Main actualizado

**Archivo:** `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.exceptions import register_exception_handlers
from app.controllers import (
    analizar_controller,
    consulta_controller,
    perfil_controller,
    plan_controller,
    insights_controller,
    admin_controller,
)

settings = get_settings()

app = FastAPI(
    title="SaludIA API",
    description="Backend del asistente médico con IA para el sistema de salud ecuatoriano",
    version="1.0.0",
    docs_url="/docs" if settings.environment == "development" else None,
)

# CORS — restringido al dominio del frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# Handlers de excepciones globales
register_exception_handlers(app)

# Registro de routers
app.include_router(analizar_controller.router)
app.include_router(consulta_controller.router)
app.include_router(perfil_controller.router)
app.include_router(plan_controller.router)
app.include_router(insights_controller.router)
app.include_router(admin_controller.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "SaludIA Backend"}
```

---

## 13. Todos los endpoints requeridos

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `POST` | `/analizar` | ✅ JWT | Analiza síntomas con IA |
| `GET` | `/analizar/precios` | ✅ JWT | Precios promedio por especialidad |
| `GET` | `/perfil` | ✅ JWT | Perfil del usuario + plan de seguro |
| `PUT` | `/perfil` | ✅ JWT | Actualizar nombre y plan |
| `POST` | `/consultas` | ✅ JWT | Guardar resultado de consulta |
| `GET` | `/consultas` | ✅ JWT | Historial completo |
| `GET` | `/consultas/recientes` | ✅ JWT | Últimas 3 consultas |
| `GET` | `/aseguradoras` | ✅ JWT | Lista aseguradoras activas |
| `GET` | `/planes` | ✅ JWT | Lista planes (filtrable por aseguradora) |
| `GET` | `/comparador` | ✅ JWT | Comparar planes para una especialidad |
| `GET` | `/insights` | ✅ JWT | Insights personalizados |
| `GET` | `/admin/aseguradoras` | 🔒 Admin | Lista todas las aseguradoras |
| `POST` | `/admin/aseguradoras` | 🔒 Admin | Crear aseguradora |
| `PUT` | `/admin/aseguradoras/{id}` | 🔒 Admin | Editar aseguradora |
| `DELETE` | `/admin/aseguradoras/{id}` | 🔒 Admin | Eliminar aseguradora |
| `GET` | `/admin/planes` | 🔒 Admin | Lista todos los planes |
| `POST` | `/admin/planes` | 🔒 Admin | Crear plan |
| `PUT` | `/admin/planes/{id}` | 🔒 Admin | Editar plan |
| `DELETE` | `/admin/planes/{id}` | 🔒 Admin | Eliminar plan |
| `GET` | `/admin/coberturas/{plan_id}` | 🔒 Admin | Coberturas de un plan |
| `POST` | `/admin/coberturas` | 🔒 Admin | Crear/actualizar cobertura |
| `PUT` | `/admin/coberturas/{id}` | 🔒 Admin | Editar cobertura |
| `DELETE` | `/admin/coberturas/{id}` | 🔒 Admin | Eliminar cobertura |
| `GET` | `/admin/hospitales` | 🔒 Admin | Lista hospitales |
| `POST` | `/admin/hospitales` | 🔒 Admin | Crear hospital |
| `PUT` | `/admin/hospitales/{id}` | 🔒 Admin | Editar hospital |
| `DELETE` | `/admin/hospitales/{id}` | 🔒 Admin | Eliminar hospital |

---

## 14. requirements.txt correcto

```txt
fastapi==0.136.1
uvicorn==0.47.0
pydantic==2.13.4
pydantic-settings==2.7.0        # para BaseSettings
python-dotenv==1.2.2

# IA
groq==0.9.0                     # ← FALTABA — causa ModuleNotFoundError

# Base de datos
supabase==2.10.0                # ← NUEVO — cliente Python para Supabase

# Autenticación
python-jose[cryptography]==3.3.0  # ← NUEVO — para verificar JWT de Supabase

# HTTP
httpx==0.28.1
```

---

## 15. Variables de entorno (.env)

```env
# IA
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# Supabase — usar SERVICE ROLE KEY (no anon key)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Dashboard > Settings > API > service_role key
SUPABASE_JWT_SECRET=tu-jwt-secret  # Dashboard > Settings > API > JWT Secret

# CORS — dominio del frontend
ALLOWED_ORIGINS=["http://localhost:5173"]
ENVIRONMENT=development
```

> ⚠️ El `.env` del backend ya está en `.gitignore` (`backend/.gitignore` línea 2). Correcto.

---

## 16. Orden de refactorización recomendado

Seguir este orden para no romper nada mientras se refactoriza:

```
Paso 1 — Fundación (no rompe nada)
  ├─ Crear config.py
  ├─ Crear repositories/supabase_client.py
  ├─ Actualizar requirements.txt (agregar groq, supabase, python-jose, pydantic-settings)
  └─ pip install -r requirements.txt

Paso 2 — Repositorios (independientes entre sí)
  ├─ hospital_repository.py
  ├─ consulta_repository.py
  ├─ perfil_repository.py
  ├─ plan_repository.py
  └─ aseguradora_repository.py

Paso 3 — DTOs (independientes, solo Pydantic)
  ├─ analizar_dto.py
  ├─ consulta_dto.py
  ├─ perfil_dto.py
  ├─ plan_dto.py
  └─ admin_dto.py

Paso 4 — Autenticación
  └─ dependencies.py (get_current_user_id, require_admin)
     + SQL: ALTER TABLE perfiles ADD COLUMN es_admin BOOLEAN DEFAULT FALSE;

Paso 5 — Excepciones
  └─ exceptions.py

Paso 6 — Servicios (refactorizar los existentes)
  ├─ ia_service.py (usar repositorio, cargar prompt desde .txt)
  ├─ copago_service.py (sin cambios)
  ├─ comparador_service.py (nuevo)
  └─ insights_service.py (nuevo)

Paso 7 — Controladores (crear carpeta controllers/)
  ├─ analizar_controller.py (migrar desde routes/analizar.py)
  ├─ consulta_controller.py
  ├─ perfil_controller.py
  ├─ plan_controller.py
  ├─ insights_controller.py
  └─ admin_controller.py

Paso 8 — Main (registrar todo)
  └─ main.py actualizado

Paso 9 — Limpieza
  ├─ Eliminar app/routes/analizar.py (reemplazado)
  ├─ Eliminar app/data/especialidades.json (no se usa)
  ├─ Eliminar app/data/planes.json (no se usa)
  ├─ Mover contenido del system prompt a app/prompts/system_prompt.txt
  └─ app/utils/helpers.py (agregar funciones de utilidad reales o eliminar)

Paso 10 — Migración de datos
  └─ Ejecutar script para migrar hospitales.json → tabla hospital_especialidades en Supabase
```
