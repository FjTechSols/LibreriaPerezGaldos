/*
  # Sistema completo de Librería Pérez Galdós

  ## 1. Nuevas Tablas
  
  ### Gestión de Roles y Usuarios
    - `roles` - Roles del sistema (admin, usuario)
    - `usuarios` - Usuarios del sistema con autenticación
  
  ### Catálogo de Libros
    - `editoriales` - Editoriales de los libros
    - `categorias` - Categorías jerárquicas de libros
    - `libros` - Catálogo completo de libros
  
  ### Gestión de Pedidos
    - `pedidos` - Pedidos de clientes (interno, iberlibro, conecta, etc.)
    - `pedido_detalles` - Líneas de detalle de cada pedido
  
  ### Sistema de Facturación
    - `facturas` - Facturas generadas (normal y rectificativas)
    - `reembolsos` - Reembolsos asociados a facturas
  
  ### Logística y Documentación
    - `envios` - Información de envíos y tracking
    - `documentos` - Documentos adicionales (certificados, etiquetas, etc.)

  ## 2. Cambios principales de MySQL a PostgreSQL
    - AUTO_INCREMENT → SERIAL o gen_random_uuid()
    - ENUM → tipo enum personalizado o CHECK constraint
    - Timestamps mejorados con timestamptz
    - Cascadas y políticas de eliminación

  ## 3. Seguridad
    - RLS habilitado en TODAS las tablas
    - Políticas restrictivas por rol
    - Admin puede ver/modificar todo
    - Usuarios solo sus propios datos

  ## 4. Índices
    - Índices en foreign keys
    - Índices en campos de búsqueda frecuente
    - Índices únicos donde corresponde

  ## 5. Datos iniciales
    - Roles: admin, usuario
    - Categorías base
    - Editoriales ejemplo
*/

-- =========================
-- Tipos ENUM personalizados
-- =========================
CREATE TYPE estado_pedido AS ENUM ('pendiente','procesando','enviado','completado','cancelado');
CREATE TYPE tipo_pedido AS ENUM ('interno','iberlibro','conecta','uniliber','libreros_de_viejo');
CREATE TYPE metodo_pago AS ENUM ('tarjeta','paypal','transferencia','reembolso');
CREATE TYPE transportista AS ENUM ('ASM','GLS','Envialia','otro');
CREATE TYPE tipo_factura AS ENUM ('normal','rectificativa');
CREATE TYPE tipo_documento AS ENUM ('certificado','factura','reembolso','tarjeta_adhesiva','tarjeta_termica','etiqueta_envio');

-- =========================
-- Tabla de roles
-- =========================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- Tabla de usuarios (integrada con auth.users de Supabase)
-- =========================
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    rol_id INT NOT NULL REFERENCES roles(id),
    fecha_registro TIMESTAMPTZ DEFAULT now(),
    legacy_id INT NULL,
    activo BOOLEAN DEFAULT TRUE
);

-- =========================
-- Tabla de editoriales
-- =========================
CREATE TABLE IF NOT EXISTS editoriales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    direccion VARCHAR(255),
    telefono VARCHAR(50),
    legacy_id INT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- Tabla de categorías (jerárquica)
-- =========================
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    codigo VARCHAR(10),
    legacy_id INT,
    activa BOOLEAN DEFAULT TRUE,
    parent_id INT DEFAULT NULL REFERENCES categorias(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- Tabla de libros
-- =========================
CREATE TABLE IF NOT EXISTS libros (
    id SERIAL PRIMARY KEY,
    isbn VARCHAR(20) UNIQUE,
    titulo VARCHAR(255) NOT NULL,
    anio SMALLINT,
    paginas INT,
    descripcion TEXT,
    notas TEXT,
    categoria_id INT REFERENCES categorias(id),
    editorial_id INT REFERENCES editoriales(id),
    legacy_id VARCHAR(50),
    precio DECIMAL(10,2) DEFAULT 0.00,
    ubicacion VARCHAR(100),
    fecha_ingreso DATE DEFAULT CURRENT_DATE,
    activo BOOLEAN DEFAULT TRUE,
    imagen_url TEXT,
    stock INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- Tabla de pedidos
-- =========================
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha_pedido TIMESTAMPTZ DEFAULT now(),
    estado estado_pedido DEFAULT 'pendiente',
    tipo tipo_pedido DEFAULT 'interno',
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    iva DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) DEFAULT 0.00,
    metodo_pago metodo_pago DEFAULT 'tarjeta',
    direccion_envio TEXT,
    transportista transportista DEFAULT 'otro',
    tracking VARCHAR(100),
    observaciones TEXT,
    legacy_id INT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- Tabla de detalles de pedido
-- =========================
CREATE TABLE IF NOT EXISTS pedido_detalles (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    libro_id INT NOT NULL REFERENCES libros(id),
    cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- Tabla de facturas
-- =========================
CREATE TABLE IF NOT EXISTS facturas (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    numero_factura VARCHAR(50) NOT NULL UNIQUE,
    fecha TIMESTAMPTZ DEFAULT now(),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    iva DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tipo tipo_factura DEFAULT 'normal',
    factura_original_id INT REFERENCES facturas(id),
    archivo_pdf TEXT,
    archivo_xml TEXT,
    anulada BOOLEAN DEFAULT FALSE,
    motivo_anulacion TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- Tabla de reembolsos
-- =========================
CREATE TABLE IF NOT EXISTS reembolsos (
    id SERIAL PRIMARY KEY,
    factura_id INT NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ DEFAULT now(),
    motivo TEXT,
    importe DECIMAL(10,2) NOT NULL CHECK (importe > 0),
    estado VARCHAR(50) DEFAULT 'pendiente',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- Tabla de envíos
-- =========================
CREATE TABLE IF NOT EXISTS envios (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    transportista transportista DEFAULT 'otro',
    tracking VARCHAR(100),
    etiqueta_pdf TEXT,
    fecha_envio TIMESTAMPTZ NULL,
    fecha_entrega TIMESTAMPTZ NULL,
    estado VARCHAR(50) DEFAULT 'pendiente',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- Tabla de documentos adicionales
-- =========================
CREATE TABLE IF NOT EXISTS documentos (
    id SERIAL PRIMARY KEY,
    pedido_id INT REFERENCES pedidos(id) ON DELETE CASCADE,
    tipo tipo_documento,
    archivo TEXT,
    nombre_archivo VARCHAR(255),
    descripcion TEXT,
    fecha TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- Tabla de auditoría
-- =========================
CREATE TABLE IF NOT EXISTS auditoria (
    id SERIAL PRIMARY KEY,
    tabla VARCHAR(50) NOT NULL,
    registro_id INT NOT NULL,
    accion VARCHAR(20) NOT NULL,
    usuario_id UUID REFERENCES usuarios(id),
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    fecha TIMESTAMPTZ DEFAULT now()
);

-- =========================
-- Índices para optimización
-- =========================
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_auth ON usuarios(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_libros_categoria ON libros(categoria_id);
CREATE INDEX IF NOT EXISTS idx_libros_editorial ON libros(editorial_id);
CREATE INDEX IF NOT EXISTS idx_libros_isbn ON libros(isbn);
CREATE INDEX IF NOT EXISTS idx_libros_activo ON libros(activo);
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(fecha_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedido_detalles_pedido ON pedido_detalles(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_detalles_libro ON pedido_detalles(libro_id);
CREATE INDEX IF NOT EXISTS idx_facturas_numero ON facturas(numero_factura);
CREATE INDEX IF NOT EXISTS idx_facturas_pedido ON facturas(pedido_id);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas(fecha);
CREATE INDEX IF NOT EXISTS idx_envios_tracking ON envios(tracking);
CREATE INDEX IF NOT EXISTS idx_envios_pedido ON envios(pedido_id);
CREATE INDEX IF NOT EXISTS idx_reembolsos_factura ON reembolsos(factura_id);
CREATE INDEX IF NOT EXISTS idx_documentos_pedido ON documentos(pedido_id);

-- =========================
-- Función para actualizar updated_at
-- =========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_libros_updated_at BEFORE UPDATE ON libros
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON pedidos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facturas_updated_at BEFORE UPDATE ON facturas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_envios_updated_at BEFORE UPDATE ON envios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================
-- Función para generar número de factura automático
-- =========================
CREATE OR REPLACE FUNCTION generar_numero_factura()
RETURNS TRIGGER AS $$
DECLARE
    anio INT;
    ultimo_numero INT;
    nuevo_numero VARCHAR(50);
BEGIN
    anio := EXTRACT(YEAR FROM CURRENT_DATE);
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_factura FROM '\d+$') AS INT)), 0)
    INTO ultimo_numero
    FROM facturas
    WHERE numero_factura LIKE 'F' || anio || '-%';
    
    nuevo_numero := 'F' || anio || '-' || LPAD((ultimo_numero + 1)::TEXT, 4, '0');
    NEW.numero_factura := nuevo_numero;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generar_numero_factura_trigger
BEFORE INSERT ON facturas
FOR EACH ROW
WHEN (NEW.numero_factura IS NULL OR NEW.numero_factura = '')
EXECUTE FUNCTION generar_numero_factura();

-- =========================
-- Función para calcular totales de pedido
-- =========================
CREATE OR REPLACE FUNCTION calcular_totales_pedido()
RETURNS TRIGGER AS $$
DECLARE
    nuevo_subtotal DECIMAL(10,2);
    nuevo_iva DECIMAL(10,2);
    nuevo_total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(cantidad * precio_unitario), 0)
    INTO nuevo_subtotal
    FROM pedido_detalles
    WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id);
    
    nuevo_iva := nuevo_subtotal * 0.21;
    nuevo_total := nuevo_subtotal + nuevo_iva;
    
    UPDATE pedidos
    SET subtotal = nuevo_subtotal,
        iva = nuevo_iva,
        total = nuevo_total
    WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calcular_totales_pedido_insert
AFTER INSERT ON pedido_detalles
FOR EACH ROW EXECUTE FUNCTION calcular_totales_pedido();

CREATE TRIGGER calcular_totales_pedido_update
AFTER UPDATE ON pedido_detalles
FOR EACH ROW EXECUTE FUNCTION calcular_totales_pedido();

CREATE TRIGGER calcular_totales_pedido_delete
AFTER DELETE ON pedido_detalles
FOR EACH ROW EXECUTE FUNCTION calcular_totales_pedido();

-- =========================
-- Row Level Security
-- =========================

-- Habilitar RLS en todas las tablas
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE editoriales ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE libros ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reembolsos ENABLE ROW LEVEL SECURITY;
ALTER TABLE envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- Políticas para roles (solo admin)
CREATE POLICY "Admin can view roles" ON roles FOR SELECT TO authenticated
USING ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1);

-- Políticas para usuarios
CREATE POLICY "Users can view own profile" ON usuarios FOR SELECT TO authenticated
USING (auth_user_id = auth.uid() OR (SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1);

CREATE POLICY "Users can update own profile" ON usuarios FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Admin can manage all users" ON usuarios FOR ALL TO authenticated
USING ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1)
WITH CHECK ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1);

-- Políticas para editoriales (lectura pública, admin modifica)
CREATE POLICY "Anyone can view editoriales" ON editoriales FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admin can manage editoriales" ON editoriales FOR ALL TO authenticated
USING ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1)
WITH CHECK ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1);

-- Políticas para categorías (lectura pública, admin modifica)
CREATE POLICY "Anyone can view categorias" ON categorias FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admin can manage categorias" ON categorias FOR ALL TO authenticated
USING ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1)
WITH CHECK ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1);

-- Políticas para libros (lectura pública, admin modifica)
CREATE POLICY "Anyone can view active libros" ON libros FOR SELECT TO authenticated
USING (activo = true OR (SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1);

CREATE POLICY "Admin can manage libros" ON libros FOR ALL TO authenticated
USING ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1)
WITH CHECK ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1);

-- Políticas para pedidos
CREATE POLICY "Users can view own pedidos" ON pedidos FOR SELECT TO authenticated
USING (usuario_id = (SELECT id FROM usuarios WHERE auth_user_id = auth.uid()) 
       OR (SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1);

CREATE POLICY "Users can create own pedidos" ON pedidos FOR INSERT TO authenticated
WITH CHECK (usuario_id = (SELECT id FROM usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admin can manage all pedidos" ON pedidos FOR ALL TO authenticated
USING ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1)
WITH CHECK ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1);

-- Políticas para pedido_detalles
CREATE POLICY "Users can view own pedido_detalles" ON pedido_detalles FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM pedidos p 
        WHERE p.id = pedido_id 
        AND (p.usuario_id = (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
             OR (SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1)
    )
);

CREATE POLICY "Users can insert own pedido_detalles" ON pedido_detalles FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM pedidos p 
        WHERE p.id = pedido_id 
        AND p.usuario_id = (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
    )
);

CREATE POLICY "Admin can manage pedido_detalles" ON pedido_detalles FOR ALL TO authenticated
USING ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1)
WITH CHECK ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1);

-- Políticas para facturas
CREATE POLICY "Users can view own facturas" ON facturas FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM pedidos p 
        WHERE p.id = pedido_id 
        AND (p.usuario_id = (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
             OR (SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1)
    )
);

CREATE POLICY "Admin can manage facturas" ON facturas FOR ALL TO authenticated
USING ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1)
WITH CHECK ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1);

-- Políticas para reembolsos
CREATE POLICY "Users can view own reembolsos" ON reembolsos FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM facturas f
        JOIN pedidos p ON p.id = f.pedido_id
        WHERE f.id = factura_id 
        AND (p.usuario_id = (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
             OR (SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1)
    )
);

CREATE POLICY "Admin can manage reembolsos" ON reembolsos FOR ALL TO authenticated
USING ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1)
WITH CHECK ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1);

-- Políticas para envíos
CREATE POLICY "Users can view own envios" ON envios FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM pedidos p 
        WHERE p.id = pedido_id 
        AND (p.usuario_id = (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
             OR (SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1)
    )
);

CREATE POLICY "Admin can manage envios" ON envios FOR ALL TO authenticated
USING ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1)
WITH CHECK ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1);

-- Políticas para documentos
CREATE POLICY "Users can view own documentos" ON documentos FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM pedidos p 
        WHERE p.id = pedido_id 
        AND (p.usuario_id = (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
             OR (SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1)
    )
);

CREATE POLICY "Admin can manage documentos" ON documentos FOR ALL TO authenticated
USING ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1)
WITH CHECK ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1);

-- Políticas para auditoría (solo admin)
CREATE POLICY "Admin can view auditoria" ON auditoria FOR SELECT TO authenticated
USING ((SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1);

-- =========================
-- Datos iniciales
-- =========================

-- Roles
INSERT INTO roles (nombre) VALUES ('admin'), ('usuario')
ON CONFLICT (nombre) DO NOTHING;

-- Categorías base
INSERT INTO categorias (nombre, descripcion, codigo, activa) VALUES
('Literatura', 'Novelas, poesía, ensayo literario', 'LIT', true),
('Historia', 'Historia general y especializada', 'HIS', true),
('Ciencias', 'Ciencias naturales y exactas', 'CIE', true),
('Arte', 'Arte, arquitectura, diseño', 'ART', true),
('Filosofía', 'Filosofía y pensamiento', 'FIL', true)
ON CONFLICT DO NOTHING;

-- Editoriales ejemplo
INSERT INTO editoriales (nombre, direccion, telefono) VALUES
('Penguin Random House', 'Barcelona, España', '+34900123456'),
('Planeta', 'Madrid, España', '+34900654321'),
('Anagrama', 'Barcelona, España', '+34900111222')
ON CONFLICT (nombre) DO NOTHING;