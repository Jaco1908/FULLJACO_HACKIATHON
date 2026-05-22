-- SaludIA - Seed Data Ecuador
-- INSTRUCCION: Ejecutar en Supabase SQL Editor
-- Si necesitas volver a ejecutar, corre primero el bloque de LIMPIEZA al final.

-- ══════════════════════════════
-- 1. ASEGURADORAS
-- ══════════════════════════════
INSERT INTO aseguradoras (id, nombre, descripcion, activa) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'IESS', 'Instituto Ecuatoriano de Seguridad Social. Cobertura publica para trabajadores afiliados.', TRUE),
  ('a1000000-0000-0000-0000-000000000002', 'Ecuasanitas', 'Lider en medicina prepagada privada del Ecuador con amplia red de clinicas.', TRUE),
  ('a1000000-0000-0000-0000-000000000003', 'Seguros Sucre', 'Aseguradora ecuatoriana con planes de salud individual y familiar a bajo costo.', TRUE),
  ('a1000000-0000-0000-0000-000000000004', 'AIG Ecuador', 'Cobertura internacional con red de hospitales privados de primer nivel.', TRUE),
  ('a1000000-0000-0000-0000-000000000005', 'Latina Seguros', 'Planes accesibles de salud con cobertura en hospitales publicos y privados.', TRUE);

-- ══════════════════════════════
-- 2. PLANES DE SEGURO
-- ══════════════════════════════
INSERT INTO planes_seguro (id, nombre, aseguradora_id, prima_mensual, deducible_anual, descripcion, activo) VALUES
  ('c1000000-0000-0000-0000-000000000001','IESS General','a1000000-0000-0000-0000-000000000001',0.00,0.00,'Cobertura general del IESS para trabajadores dependientes.',TRUE),
  ('c1000000-0000-0000-0000-000000000002','IESS Jubilados','a1000000-0000-0000-0000-000000000001',0.00,0.00,'Cobertura completa para jubilados del IESS.',TRUE),
  ('c1000000-0000-0000-0000-000000000003','Plan Basico','a1000000-0000-0000-0000-000000000002',65.00,300.00,'Consultas ambulatorias y hospitalizacion basica en red Ecuasanitas.',TRUE),
  ('c1000000-0000-0000-0000-000000000004','Plan Familiar','a1000000-0000-0000-0000-000000000002',145.00,500.00,'Cobertura para familia, especialidades y cirugias programadas.',TRUE),
  ('c1000000-0000-0000-0000-000000000005','Plan Premium','a1000000-0000-0000-0000-000000000002',280.00,0.00,'Cobertura total con acceso ilimitado a especialistas, sin deducible.',TRUE),
  ('c1000000-0000-0000-0000-000000000006','Salud Sucre Basico','a1000000-0000-0000-0000-000000000003',38.00,400.00,'Plan individual economico con atencion en red de clinicas afiliadas.',TRUE),
  ('c1000000-0000-0000-0000-000000000007','Salud Sucre Plus','a1000000-0000-0000-0000-000000000003',80.00,250.00,'Plan mejorado con acceso a especialistas y examenes de laboratorio.',TRUE),
  ('c1000000-0000-0000-0000-000000000008','AIG Salud Individual','a1000000-0000-0000-0000-000000000004',110.00,500.00,'Atencion en hospitales privados de referencia. Cobertura nacional e internacional.',TRUE),
  ('c1000000-0000-0000-0000-000000000009','AIG Salud Elite','a1000000-0000-0000-0000-000000000004',250.00,0.00,'Cobertura premium con segunda opinion medica internacional.',TRUE),
  ('c1000000-0000-0000-0000-00000000000a','Latina Basico','a1000000-0000-0000-0000-000000000005',28.00,600.00,'Plan asequible con atencion en clinicas de convenio.',TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Latina Familiar','a1000000-0000-0000-0000-000000000005',75.00,350.00,'Cobertura familiar con enfasis en pediatria y ginecologia.',TRUE);

-- ══════════════════════════════
-- 3. COBERTURAS POR ESPECIALIDAD
-- ══════════════════════════════

-- IESS General (100%)
INSERT INTO coberturas_especialidad (plan_id, especialidad, porcentaje_cobertura, copago_fijo, cubierta) VALUES
  ('c1000000-0000-0000-0000-000000000001','Medicina General',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000001','Pediatria',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000001','Cardiologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000001','Neurologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000001','Ginecologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000001','Dermatologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000001','Traumatologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000001','Oftalmologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000001','Psiquiatria',80,0,TRUE),
  ('c1000000-0000-0000-0000-000000000001','Urologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000001','Gastroenterologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000001','Endocrinologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000001','Reumatologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000001','Otorrinolaringologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000001','Medicina Interna',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000001','Oncologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000001','Nefrologia',100,0,TRUE);

-- IESS Jubilados (100%)
INSERT INTO coberturas_especialidad (plan_id, especialidad, porcentaje_cobertura, copago_fijo, cubierta) VALUES
  ('c1000000-0000-0000-0000-000000000002','Medicina General',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000002','Pediatria',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000002','Cardiologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000002','Neurologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000002','Ginecologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000002','Dermatologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000002','Traumatologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000002','Oftalmologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000002','Psiquiatria',80,0,TRUE),
  ('c1000000-0000-0000-0000-000000000002','Urologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000002','Gastroenterologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000002','Endocrinologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000002','Reumatologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000002','Otorrinolaringologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000002','Medicina Interna',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000002','Oncologia',100,0,TRUE),
  ('c1000000-0000-0000-0000-000000000002','Nefrologia',100,0,TRUE);

-- Ecuasanitas Plan Basico (70%)
INSERT INTO coberturas_especialidad (plan_id, especialidad, porcentaje_cobertura, copago_fijo, cubierta) VALUES
  ('c1000000-0000-0000-0000-000000000003','Medicina General',70,5,TRUE),
  ('c1000000-0000-0000-0000-000000000003','Pediatria',70,5,TRUE),
  ('c1000000-0000-0000-0000-000000000003','Cardiologia',65,10,TRUE),
  ('c1000000-0000-0000-0000-000000000003','Neurologia',65,10,TRUE),
  ('c1000000-0000-0000-0000-000000000003','Ginecologia',70,5,TRUE),
  ('c1000000-0000-0000-0000-000000000003','Dermatologia',60,8,TRUE),
  ('c1000000-0000-0000-0000-000000000003','Traumatologia',65,8,TRUE),
  ('c1000000-0000-0000-0000-000000000003','Oftalmologia',60,8,TRUE),
  ('c1000000-0000-0000-0000-000000000003','Psiquiatria',50,15,TRUE),
  ('c1000000-0000-0000-0000-000000000003','Urologia',65,8,TRUE),
  ('c1000000-0000-0000-0000-000000000003','Gastroenterologia',65,8,TRUE),
  ('c1000000-0000-0000-0000-000000000003','Endocrinologia',65,8,TRUE),
  ('c1000000-0000-0000-0000-000000000003','Reumatologia',65,8,TRUE),
  ('c1000000-0000-0000-0000-000000000003','Otorrinolaringologia',65,8,TRUE),
  ('c1000000-0000-0000-0000-000000000003','Medicina Interna',70,5,TRUE),
  ('c1000000-0000-0000-0000-000000000003','Oncologia',50,20,TRUE),
  ('c1000000-0000-0000-0000-000000000003','Nefrologia',60,10,TRUE);

-- Ecuasanitas Plan Familiar (80%)
INSERT INTO coberturas_especialidad (plan_id, especialidad, porcentaje_cobertura, copago_fijo, cubierta) VALUES
  ('c1000000-0000-0000-0000-000000000004','Medicina General',80,5,TRUE),
  ('c1000000-0000-0000-0000-000000000004','Pediatria',85,5,TRUE),
  ('c1000000-0000-0000-0000-000000000004','Cardiologia',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000004','Neurologia',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000004','Ginecologia',85,5,TRUE),
  ('c1000000-0000-0000-0000-000000000004','Dermatologia',75,5,TRUE),
  ('c1000000-0000-0000-0000-000000000004','Traumatologia',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000004','Oftalmologia',70,8,TRUE),
  ('c1000000-0000-0000-0000-000000000004','Psiquiatria',60,10,TRUE),
  ('c1000000-0000-0000-0000-000000000004','Urologia',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000004','Gastroenterologia',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000004','Endocrinologia',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000004','Reumatologia',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000004','Otorrinolaringologia',75,5,TRUE),
  ('c1000000-0000-0000-0000-000000000004','Medicina Interna',80,5,TRUE),
  ('c1000000-0000-0000-0000-000000000004','Oncologia',65,15,TRUE),
  ('c1000000-0000-0000-0000-000000000004','Nefrologia',70,10,TRUE);

-- Ecuasanitas Plan Premium (90%, sin copago)
INSERT INTO coberturas_especialidad (plan_id, especialidad, porcentaje_cobertura, copago_fijo, cubierta) VALUES
  ('c1000000-0000-0000-0000-000000000005','Medicina General',90,0,TRUE),
  ('c1000000-0000-0000-0000-000000000005','Pediatria',90,0,TRUE),
  ('c1000000-0000-0000-0000-000000000005','Cardiologia',90,0,TRUE),
  ('c1000000-0000-0000-0000-000000000005','Neurologia',90,0,TRUE),
  ('c1000000-0000-0000-0000-000000000005','Ginecologia',90,0,TRUE),
  ('c1000000-0000-0000-0000-000000000005','Dermatologia',85,0,TRUE),
  ('c1000000-0000-0000-0000-000000000005','Traumatologia',90,0,TRUE),
  ('c1000000-0000-0000-0000-000000000005','Oftalmologia',85,0,TRUE),
  ('c1000000-0000-0000-0000-000000000005','Psiquiatria',80,0,TRUE),
  ('c1000000-0000-0000-0000-000000000005','Urologia',90,0,TRUE),
  ('c1000000-0000-0000-0000-000000000005','Gastroenterologia',90,0,TRUE),
  ('c1000000-0000-0000-0000-000000000005','Endocrinologia',90,0,TRUE),
  ('c1000000-0000-0000-0000-000000000005','Reumatologia',90,0,TRUE),
  ('c1000000-0000-0000-0000-000000000005','Otorrinolaringologia',90,0,TRUE),
  ('c1000000-0000-0000-0000-000000000005','Medicina Interna',90,0,TRUE),
  ('c1000000-0000-0000-0000-000000000005','Oncologia',80,0,TRUE),
  ('c1000000-0000-0000-0000-000000000005','Nefrologia',90,0,TRUE);

-- Seguros Sucre Basico (60%)
INSERT INTO coberturas_especialidad (plan_id, especialidad, porcentaje_cobertura, copago_fijo, cubierta) VALUES
  ('c1000000-0000-0000-0000-000000000006','Medicina General',60,8,TRUE),
  ('c1000000-0000-0000-0000-000000000006','Pediatria',60,8,TRUE),
  ('c1000000-0000-0000-0000-000000000006','Cardiologia',55,12,TRUE),
  ('c1000000-0000-0000-0000-000000000006','Neurologia',55,12,TRUE),
  ('c1000000-0000-0000-0000-000000000006','Ginecologia',60,8,TRUE),
  ('c1000000-0000-0000-0000-000000000006','Dermatologia',50,10,TRUE),
  ('c1000000-0000-0000-0000-000000000006','Traumatologia',55,10,TRUE),
  ('c1000000-0000-0000-0000-000000000006','Oftalmologia',50,10,TRUE),
  ('c1000000-0000-0000-0000-000000000006','Psiquiatria',40,15,TRUE),
  ('c1000000-0000-0000-0000-000000000006','Urologia',55,10,TRUE),
  ('c1000000-0000-0000-0000-000000000006','Gastroenterologia',55,10,TRUE),
  ('c1000000-0000-0000-0000-000000000006','Endocrinologia',55,10,TRUE),
  ('c1000000-0000-0000-0000-000000000006','Reumatologia',55,10,TRUE),
  ('c1000000-0000-0000-0000-000000000006','Otorrinolaringologia',55,10,TRUE),
  ('c1000000-0000-0000-0000-000000000006','Medicina Interna',60,8,TRUE),
  ('c1000000-0000-0000-0000-000000000006','Oncologia',40,20,TRUE),
  ('c1000000-0000-0000-0000-000000000006','Nefrologia',50,15,TRUE);

-- Seguros Sucre Plus (75%)
INSERT INTO coberturas_especialidad (plan_id, especialidad, porcentaje_cobertura, copago_fijo, cubierta) VALUES
  ('c1000000-0000-0000-0000-000000000007','Medicina General',75,5,TRUE),
  ('c1000000-0000-0000-0000-000000000007','Pediatria',75,5,TRUE),
  ('c1000000-0000-0000-0000-000000000007','Cardiologia',70,8,TRUE),
  ('c1000000-0000-0000-0000-000000000007','Neurologia',70,8,TRUE),
  ('c1000000-0000-0000-0000-000000000007','Ginecologia',75,5,TRUE),
  ('c1000000-0000-0000-0000-000000000007','Dermatologia',65,8,TRUE),
  ('c1000000-0000-0000-0000-000000000007','Traumatologia',70,8,TRUE),
  ('c1000000-0000-0000-0000-000000000007','Oftalmologia',65,8,TRUE),
  ('c1000000-0000-0000-0000-000000000007','Psiquiatria',55,12,TRUE),
  ('c1000000-0000-0000-0000-000000000007','Urologia',70,8,TRUE),
  ('c1000000-0000-0000-0000-000000000007','Gastroenterologia',70,8,TRUE),
  ('c1000000-0000-0000-0000-000000000007','Endocrinologia',70,8,TRUE),
  ('c1000000-0000-0000-0000-000000000007','Reumatologia',70,8,TRUE),
  ('c1000000-0000-0000-0000-000000000007','Otorrinolaringologia',70,5,TRUE),
  ('c1000000-0000-0000-0000-000000000007','Medicina Interna',75,5,TRUE),
  ('c1000000-0000-0000-0000-000000000007','Oncologia',55,15,TRUE),
  ('c1000000-0000-0000-0000-000000000007','Nefrologia',65,10,TRUE);

-- AIG Salud Individual (75%)
INSERT INTO coberturas_especialidad (plan_id, especialidad, porcentaje_cobertura, copago_fijo, cubierta) VALUES
  ('c1000000-0000-0000-0000-000000000008','Medicina General',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000008','Pediatria',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000008','Cardiologia',75,10,TRUE),
  ('c1000000-0000-0000-0000-000000000008','Neurologia',75,10,TRUE),
  ('c1000000-0000-0000-0000-000000000008','Ginecologia',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000008','Dermatologia',70,8,TRUE),
  ('c1000000-0000-0000-0000-000000000008','Traumatologia',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000008','Oftalmologia',70,10,TRUE),
  ('c1000000-0000-0000-0000-000000000008','Psiquiatria',60,12,TRUE),
  ('c1000000-0000-0000-0000-000000000008','Urologia',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000008','Gastroenterologia',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000008','Endocrinologia',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000008','Reumatologia',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000008','Otorrinolaringologia',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000008','Medicina Interna',75,8,TRUE),
  ('c1000000-0000-0000-0000-000000000008','Oncologia',70,15,TRUE),
  ('c1000000-0000-0000-0000-000000000008','Nefrologia',75,10,TRUE);

-- AIG Salud Elite (95%, sin copago)
INSERT INTO coberturas_especialidad (plan_id, especialidad, porcentaje_cobertura, copago_fijo, cubierta) VALUES
  ('c1000000-0000-0000-0000-000000000009','Medicina General',95,0,TRUE),
  ('c1000000-0000-0000-0000-000000000009','Pediatria',95,0,TRUE),
  ('c1000000-0000-0000-0000-000000000009','Cardiologia',95,0,TRUE),
  ('c1000000-0000-0000-0000-000000000009','Neurologia',95,0,TRUE),
  ('c1000000-0000-0000-0000-000000000009','Ginecologia',95,0,TRUE),
  ('c1000000-0000-0000-0000-000000000009','Dermatologia',90,0,TRUE),
  ('c1000000-0000-0000-0000-000000000009','Traumatologia',95,0,TRUE),
  ('c1000000-0000-0000-0000-000000000009','Oftalmologia',90,0,TRUE),
  ('c1000000-0000-0000-0000-000000000009','Psiquiatria',85,0,TRUE),
  ('c1000000-0000-0000-0000-000000000009','Urologia',95,0,TRUE),
  ('c1000000-0000-0000-0000-000000000009','Gastroenterologia',95,0,TRUE),
  ('c1000000-0000-0000-0000-000000000009','Endocrinologia',95,0,TRUE),
  ('c1000000-0000-0000-0000-000000000009','Reumatologia',95,0,TRUE),
  ('c1000000-0000-0000-0000-000000000009','Otorrinolaringologia',95,0,TRUE),
  ('c1000000-0000-0000-0000-000000000009','Medicina Interna',95,0,TRUE),
  ('c1000000-0000-0000-0000-000000000009','Oncologia',90,0,TRUE),
  ('c1000000-0000-0000-0000-000000000009','Nefrologia',95,0,TRUE);

-- Latina Basico (55%)
INSERT INTO coberturas_especialidad (plan_id, especialidad, porcentaje_cobertura, copago_fijo, cubierta) VALUES
  ('c1000000-0000-0000-0000-00000000000a','Medicina General',55,10,TRUE),
  ('c1000000-0000-0000-0000-00000000000a','Pediatria',55,10,TRUE),
  ('c1000000-0000-0000-0000-00000000000a','Cardiologia',50,12,TRUE),
  ('c1000000-0000-0000-0000-00000000000a','Neurologia',50,12,TRUE),
  ('c1000000-0000-0000-0000-00000000000a','Ginecologia',55,10,TRUE),
  ('c1000000-0000-0000-0000-00000000000a','Dermatologia',50,10,TRUE),
  ('c1000000-0000-0000-0000-00000000000a','Traumatologia',50,12,TRUE),
  ('c1000000-0000-0000-0000-00000000000a','Oftalmologia',50,12,TRUE),
  ('c1000000-0000-0000-0000-00000000000a','Psiquiatria',40,15,FALSE),
  ('c1000000-0000-0000-0000-00000000000a','Urologia',50,12,TRUE),
  ('c1000000-0000-0000-0000-00000000000a','Gastroenterologia',50,12,TRUE),
  ('c1000000-0000-0000-0000-00000000000a','Endocrinologia',50,12,TRUE),
  ('c1000000-0000-0000-0000-00000000000a','Reumatologia',50,12,TRUE),
  ('c1000000-0000-0000-0000-00000000000a','Otorrinolaringologia',50,12,TRUE),
  ('c1000000-0000-0000-0000-00000000000a','Medicina Interna',55,10,TRUE),
  ('c1000000-0000-0000-0000-00000000000a','Oncologia',40,20,FALSE),
  ('c1000000-0000-0000-0000-00000000000a','Nefrologia',45,15,TRUE);

-- Latina Familiar (70%)
INSERT INTO coberturas_especialidad (plan_id, especialidad, porcentaje_cobertura, copago_fijo, cubierta) VALUES
  ('c1000000-0000-0000-0000-00000000000b','Medicina General',70,5,TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Pediatria',80,5,TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Cardiologia',65,8,TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Neurologia',65,8,TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Ginecologia',80,5,TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Dermatologia',60,8,TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Traumatologia',65,8,TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Oftalmologia',60,8,TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Psiquiatria',50,12,TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Urologia',65,8,TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Gastroenterologia',65,8,TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Endocrinologia',65,8,TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Reumatologia',65,8,TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Otorrinolaringologia',65,8,TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Medicina Interna',70,5,TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Oncologia',55,15,TRUE),
  ('c1000000-0000-0000-0000-00000000000b','Nefrologia',60,10,TRUE);

-- ══════════════════════════════
-- 4. HOSPITALES
-- ══════════════════════════════
INSERT INTO hospitales (nombre, ciudad, direccion, nivel, especialidades, precio) VALUES
  ('Hospital Metropolitano','Quito','Av. Mariana de Jesus s/n y Occidental','alto','["Cardiologia","Neurologia","Oncologia","Ginecologia","Pediatria","Medicina General","Traumatologia","Gastroenterologia","Endocrinologia","Medicina Interna","Nefrologia"]',85),
  ('Clinica Pichincha','Quito','Veintimilla E3-30 y Paez','alto','["Medicina General","Ginecologia","Pediatria","Traumatologia","Cardiologia","Dermatologia","Urologia","Otorrinolaringologia","Reumatologia"]',70),
  ('Hospital Voz Andes','Quito','Villalengua OE2-37 y Av. America','intermedio','["Medicina General","Pediatria","Ginecologia","Traumatologia","Dermatologia","Medicina Interna"]',45),
  ('Hospital Carlos Andrade Marin - IESS','Quito','Av. Universitaria y Sodiro','alto','["Medicina General","Cardiologia","Neurologia","Oncologia","Ginecologia","Pediatria","Traumatologia","Nefrologia","Psiquiatria","Gastroenterologia","Endocrinologia","Medicina Interna","Otorrinolaringologia","Urologia"]',35),
  ('Hospital Eugenio Espejo','Quito','Av. Gran Colombia y Yaguachi','alto','["Medicina General","Cardiologia","Neurologia","Ginecologia","Traumatologia","Medicina Interna","Gastroenterologia","Nefrologia","Oncologia"]',30),
  ('Hospital Baca Ortiz','Quito','Av. Colon y Naciones Unidas','alto','["Pediatria","Medicina General"]',30),
  ('Hospital Luis Vernaza','Guayaquil','Loja 1000 y Escobedo','alto','["Medicina General","Cardiologia","Nefrologia","Neurologia","Gastroenterologia","Medicina Interna","Oncologia","Traumatologia"]',65),
  ('Clinica Kennedy','Guayaquil','Av. San Jorge y Av. del Periodista','alto','["Medicina General","Cardiologia","Ginecologia","Pediatria","Neurologia","Traumatologia","Dermatologia","Endocrinologia","Psiquiatria","Urologia","Oftalmologia","Gastroenterologia"]',80),
  ('Hospital Abel Gilbert Ponton','Guayaquil','Av. Cuba y Av. Oriente','alto','["Medicina General","Cardiologia","Neurologia","Ginecologia","Traumatologia","Medicina Interna","Nefrologia"]',28),
  ('Clinica Santa Ana','Guayaquil','Av. Pedro Menendez Gilbert y Ficus','intermedio','["Medicina General","Ginecologia","Pediatria","Dermatologia","Otorrinolaringologia","Oftalmologia"]',55),
  ('Hospital Jose Carrasco Arteaga - IESS Cuenca','Cuenca','Av. Popayan y El Paraiso','alto','["Medicina General","Cardiologia","Neurologia","Ginecologia","Pediatria","Traumatologia","Oncologia","Gastroenterologia","Nefrologia","Medicina Interna"]',32),
  ('Hospital Vicente Corral Moscoso','Cuenca','Av. 12 de Abril y El Paraiso','alto','["Medicina General","Ginecologia","Pediatria","Traumatologia","Medicina Interna","Neurologia"]',28),
  ('Clinica Santa Ines','Cuenca','Av. Daniel Leon Borja y Unidad Nacional','intermedio','["Medicina General","Ginecologia","Pediatria","Cardiologia","Dermatologia","Traumatologia"]',50),
  ('Centro Medico Metrored','Quito','Av. Naciones Unidas y Shyris','intermedio','["Dermatologia","Oftalmologia","Otorrinolaringologia","Urologia","Reumatologia","Endocrinologia","Psiquiatria"]',58),
  ('Hospital General del Norte Los Ceibos','Guayaquil','Francisco de Orellana y Av. Del Bombero','alto','["Medicina General","Ginecologia","Pediatria","Traumatologia","Medicina Interna","Cardiologia"]',28);

-- ══════════════════════════════
-- 5. PRECIOS POR ESPECIALIDAD
-- ══════════════════════════════
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Medicina General', 35, id FROM hospitales WHERE nombre = 'Hospital Metropolitano';
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Cardiologia', 80, id FROM hospitales WHERE nombre = 'Hospital Metropolitano';
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Neurologia', 90, id FROM hospitales WHERE nombre = 'Hospital Metropolitano';
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Traumatologia', 70, id FROM hospitales WHERE nombre = 'Hospital Metropolitano';
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Gastroenterologia', 80, id FROM hospitales WHERE nombre = 'Hospital Metropolitano';
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Medicina Interna', 65, id FROM hospitales WHERE nombre = 'Hospital Metropolitano';
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Oncologia', 120, id FROM hospitales WHERE nombre = 'Hospital Metropolitano';
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Nefrologia', 85, id FROM hospitales WHERE nombre = 'Hospital Metropolitano';
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Ginecologia', 60, id FROM hospitales WHERE nombre = 'Clinica Pichincha';
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Pediatria', 45, id FROM hospitales WHERE nombre = 'Clinica Pichincha';
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Dermatologia', 55, id FROM hospitales WHERE nombre = 'Clinica Pichincha';
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Urologia', 65, id FROM hospitales WHERE nombre = 'Clinica Pichincha';
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Otorrinolaringologia', 60, id FROM hospitales WHERE nombre = 'Clinica Pichincha';
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Reumatologia', 70, id FROM hospitales WHERE nombre = 'Clinica Pichincha';
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Oftalmologia', 65, id FROM hospitales WHERE nombre = 'Centro Medico Metrored';
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Psiquiatria', 75, id FROM hospitales WHERE nombre = 'Centro Medico Metrored';
INSERT INTO precios_especialidad (especialidad, precio, hospital_id)
SELECT 'Endocrinologia', 75, id FROM hospitales WHERE nombre = 'Centro Medico Metrored';

-- ══════════════════════════════
-- LIMPIEZA (solo si necesitas re-ejecutar el seed)
-- Descomentar y ejecutar ANTES de volver a ejecutar este script:
-- ══════════════════════════════
-- DELETE FROM precios_especialidad;
-- DELETE FROM coberturas_especialidad WHERE plan_id::text LIKE 'c1000000%';
-- DELETE FROM planes_seguro WHERE id::text LIKE 'c1000000%';
-- DELETE FROM aseguradoras WHERE id::text LIKE 'a1000000%';
-- DELETE FROM hospitales;