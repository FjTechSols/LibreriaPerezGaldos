# Scripts de Gestión y Normalización de Libros

Este directorio contiene las herramientas desarrolladas para la limpieza, normalización e importación masiva del catálogo de libros.

## Flujo de Trabajo Principal

1.  **Normalización (`convert_to_schema.mjs`)**:
    Convierte y limpia los datos crudos (tablas) al esquema JSON de la base de datos.
2.  **Extracción de Entidades (`extract_entities.mjs`)**:
    Analiza el JSON y extrae listas únicas de Categorías y Editoriales para su revisión.

3.  **Unificación (`unify_categories.mjs`, `unify_editorials.mjs`)**:
    Procesa las listas extraídas y agrupa variaciones (ej: "Planeta", "Ed. Planeta") en nombres canónicos. Genera los archivos de mapeo.

4.  **Importación Maestra (`import_master_v2.mjs`)**:
    Script final que orquesta la carga:
    - Sincroniza Categorías y Editoriales unificadas con Supabase.
    - Aplica los mapas de unificación a los libros.
    - Inserta los libros filtrando duplicados.

## Herramientas de Mantenimiento

- **`eliminar-duplicados-optimizado.mjs`**: Detecta y elimina libros duplicados basándose en `legacy_id`. Ejecutar si se detectan redundancias.
- **`full_audit_backup.mjs`**: Genera una copia de seguridad completa de las tablas principales en formato JSON.
- **`check_invoices.mjs` / `check_fk.mjs`**: Scripts de diagnóstico para verificar el estado de facturación y restricciones de base de datos.
- **`verify_count.mjs`**: Verifica el número total de libros en la base de datos.
