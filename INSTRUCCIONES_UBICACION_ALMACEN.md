# Instrucciones para Agregar la Ubicación "Almacén"

La tabla de ubicaciones ya existe pero está vacía. Para agregar la ubicación inicial "Almacén", tienes 2 opciones:

## Opción 1: Desde la Interfaz de Gestión de Ubicaciones (Recomendado)

1. Inicia sesión como admin en la aplicación
2. Ve a **Ajustes** → **Ubicaciones**
3. Haz clic en **"Nueva Ubicación"**
4. Completa el formulario:
   - **Nombre**: `Almacén`
   - **Descripción**: `Ubicación principal de almacenamiento`
   - **Activa**: ✅ (marcado)
5. Haz clic en **"Guardar"**

## Opción 2: Directamente en Supabase Dashboard

1. Ve a [Supabase Dashboard](https://weaihscsaqxadxjgsfbt.supabase.co)
2. Navega a **SQL Editor**
3. Ejecuta esta consulta:

```sql
INSERT INTO ubicaciones (nombre, descripcion, activa)
VALUES ('Almacén', 'Ubicación principal de almacenamiento', true)
ON CONFLICT (nombre) DO NOTHING;
```

4. Haz clic en **"Run"**

---

## Verificar que se agregó correctamente

Ejecuta esta consulta en SQL Editor:

```sql
SELECT * FROM ubicaciones;
```

Deberías ver:

```
id | nombre   | descripcion                        | activa | created_at
---+----------+------------------------------------+--------+-----------
1  | Almacén  | Ubicación principal de almacenamiento | true   | 2025-...
```

---

## Agregar más ubicaciones

Una vez que tengas "Almacén", puedes agregar más ubicaciones desde la interfaz de gestión o ejecutando:

```sql
INSERT INTO ubicaciones (nombre, descripcion, activa)
VALUES
  ('H20006547', 'Estante H, sección 20006547', true),
  ('A123456789', 'Estante A, sección 123456789', true);
```

---

**Nota**: Las ubicaciones se mostrarán automáticamente en el selector del formulario de libros una vez creadas.
