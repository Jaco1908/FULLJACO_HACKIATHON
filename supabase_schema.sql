-- ══════════════════════════════════════════════════════════════
--  SaludIA — Esquema completo de Supabase
--  Ejecutar en orden en: Supabase Dashboard > SQL Editor
--  Habilitar RLS en todas las tablas ("Run and enable RLS")
-- ══════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────
-- 1. ASEGURADORAS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aseguradoras (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      TEXT NOT NULL,
    descripcion TEXT,
    activa      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE aseguradoras ENABLE ROW LEVEL SECURITY;

-- El backend usa service_role (bypasea RLS).
-- Esta política solo es para clientes con clave authenticated si alguna vez se usan.
CREATE POLICY "Lectura pública de aseguradoras activas"
    ON aseguradoras FOR SELECT
    TO authenticated
    USING (activa = TRUE);


-- ──────────────────────────────────────────────────────────────
-- 2. PLANES DE SEGURO
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planes_seguro (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre           TEXT NOT NULL,
    aseguradora_id   UUID REFERENCES aseguradoras(id) ON DELETE CASCADE,
    prima_mensual    NUMERIC(10,2) NOT NULL CHECK (prima_mensual > 0),
    deducible_anual  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deducible_anual >= 0),
    descripcion      TEXT,
    activo           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE planes_seguro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura de planes activos"
    ON planes_seguro FOR SELECT
    TO authenticated
    USING (activo = TRUE);


-- ──────────────────────────────────────────────────────────────
-- 3. COBERTURAS POR ESPECIALIDAD
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coberturas_especialidad (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id               UUID NOT NULL REFERENCES planes_seguro(id) ON DELETE CASCADE,
    especialidad          TEXT NOT NULL,
    porcentaje_cobertura  NUMERIC(5,2) NOT NULL
                              CHECK (porcentaje_cobertura >= 0 AND porcentaje_cobertura <= 100),
    copago_fijo           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (copago_fijo >= 0),
    cubierta              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (plan_id, especialidad)
);

ALTER TABLE coberturas_especialidad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura de coberturas"
    ON coberturas_especialidad FOR SELECT
    TO authenticated
    USING (cubierta = TRUE);


-- ──────────────────────────────────────────────────────────────
-- 4. PERFILES DE USUARIO
--    Vinculada a auth.users — se crea automáticamente con el trigger de abajo.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perfiles (
    id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo  TEXT,
    plan_seguro_id   UUID REFERENCES planes_seguro(id) ON DELETE SET NULL,
    es_admin         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo puede leer/editar su propio perfil
CREATE POLICY "Usuario lee su propio perfil"
    ON perfiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Usuario actualiza su propio perfil"
    ON perfiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);


-- ──────────────────────────────────────────────────────────────
-- 5. TRIGGER: crear perfil automáticamente al registrarse
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.perfiles (id, nombre_completo)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ──────────────────────────────────────────────────────────────
-- 6. HOSPITALES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospitales (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre         TEXT NOT NULL,
    ciudad         TEXT NOT NULL,
    direccion      TEXT,
    nivel          TEXT NOT NULL DEFAULT 'intermedio',
    -- Array JSONB de strings: ["Cardiología", "Neurología", ...]
    -- Usado con .contains("especialidades", [especialidad]) en hospital_repository.py
    especialidades JSONB NOT NULL DEFAULT '[]',
    -- Precio promedio de consulta en USD
    precio         NUMERIC(10,2),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hospitales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de hospitales"
    ON hospitales FOR SELECT
    TO authenticated
    USING (TRUE);


-- ──────────────────────────────────────────────────────────────
-- 7. PRECIOS POR ESPECIALIDAD
--    Permite calcular precios promedio por especialidad cruzando hospitales.
--    Usada por hospital_repository.get_precios_por_especialidad()
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS precios_especialidad (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    especialidad TEXT NOT NULL,
    precio       INTEGER NOT NULL CHECK (precio > 0),
    hospital_id  UUID REFERENCES hospitales(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE precios_especialidad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura de precios"
    ON precios_especialidad FOR SELECT
    TO authenticated
    USING (TRUE);


-- ──────────────────────────────────────────────────────────────
-- 8. CONSULTAS (historial de triaje del usuario)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultas (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sintomas              TEXT NOT NULL,
    especialidad_sugerida TEXT,
    nivel_urgencia        TEXT CHECK (nivel_urgencia IN ('normal', 'urgente', 'emergencia')),
    copago_estimado       NUMERIC(10,2),
    -- Resultado completo del triaje (tipo, copago, hospital, aseguradora, etc.)
    resumen               JSONB,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo puede leer/escribir sus propias consultas
CREATE POLICY "Usuario lee sus consultas"
    ON consultas FOR SELECT
    TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY "Usuario crea sus consultas"
    ON consultas FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = usuario_id);


-- ──────────────────────────────────────────────────────────────
-- 9. ÍNDICES para mejorar rendimiento
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_planes_aseguradora
    ON planes_seguro(aseguradora_id);

CREATE INDEX IF NOT EXISTS idx_coberturas_plan
    ON coberturas_especialidad(plan_id);

CREATE INDEX IF NOT EXISTS idx_coberturas_especialidad
    ON coberturas_especialidad(especialidad);

CREATE INDEX IF NOT EXISTS idx_perfiles_plan
    ON perfiles(plan_seguro_id);

CREATE INDEX IF NOT EXISTS idx_consultas_usuario
    ON consultas(usuario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_precios_especialidad
    ON precios_especialidad(especialidad);

-- Índice GIN para búsquedas en el array JSONB de especialidades de hospitales
CREATE INDEX IF NOT EXISTS idx_hospitales_especialidades
    ON hospitales USING GIN(especialidades);


-- ══════════════════════════════════════════════════════════════
--  DATOS DE EJEMPLO (opcional — ejecutar aparte si lo necesitas)
-- ══════════════════════════════════════════════════════════════

-- -- Aseguradora de ejemplo
-- INSERT INTO aseguradoras (nombre, descripcion) VALUES
--     ('IESS', 'Instituto Ecuatoriano de Seguridad Social'),
--     ('Salud S.A.', 'Aseguradora privada nacional'),
--     ('MedEcuador', 'Cobertura premium para Ecuador');

-- -- Plan de ejemplo (reemplazar <UUID_ASEGURADORA>)
-- INSERT INTO planes_seguro (nombre, aseguradora_id, prima_mensual, deducible_anual) VALUES
--     ('Plan Básico',    '<UUID_ASEGURADORA>', 45.00,  200.00),
--     ('Plan Familiar',  '<UUID_ASEGURADORA>', 120.00, 500.00),
--     ('Plan Premium',   '<UUID_ASEGURADORA>', 250.00, 0.00);

-- -- Hospital de ejemplo
-- INSERT INTO hospitales (nombre, ciudad, nivel, especialidades, precio) VALUES
--     ('Hospital Metropolitano', 'Quito',     'alto',       '["Cardiología","Neurología","Medicina General","Oncología"]',    80),
--     ('Clínica Pichincha',      'Quito',     'alto',       '["Medicina General","Ginecología","Pediatría","Traumatología"]', 65),
--     ('Hospital Luis Vernaza',  'Guayaquil', 'alto',       '["Medicina General","Cardiología","Nefrología"]',                70),
--     ('Hospital Baca Ortiz',    'Quito',     'alto',       '["Pediatría"]',                                                  50),
--     ('Centro Médico Metrored', 'Quito',     'intermedio', '["Dermatología","Oftalmología","Otorrinolaringología","Urología"]',55);
