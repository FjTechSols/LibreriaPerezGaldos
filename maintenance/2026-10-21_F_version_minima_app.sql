-- =====================================================================================
-- F · Versión mínima de la app Android
--
-- Ajustes públicos (categoría 'system', ya legible por anon desde el paso A) que la app
-- consulta al arrancar. Si su número de compilación es menor que app_android_min_build,
-- muestra "Actualiza la app" con un botón a app_android_update_url.
--   · app_android_min_build: 1 = no se bloquea ninguna versión. Subirlo solo cuando un
--     cambio de base de datos o de seguridad deje inservibles las versiones antiguas.
--   · app_android_update_url: hoy el último APK; con Play Store, la ficha de la tienda.
--   · app_update_message: texto opcional para esa pantalla ('' = texto por defecto).
-- Solo añade filas; si ya existen, no las cambia.
-- =====================================================================================
BEGIN;

INSERT INTO public.settings (key, value, category, description) VALUES
  ('app_android_min_build', '1'::jsonb, 'system', 'App Android: número de compilación mínimo permitido (1 = ninguna bloqueada)'),
  ('app_android_update_url', to_jsonb('https://expo.dev/artifacts/eas/ixZ8nDcJuwXxWAjJfsOl-ia9uluaoV_65y1GeWP50cU.apk'::text), 'system', 'App Android: enlace para descargar la versión nueva (APK o ficha de Play Store)'),
  ('app_update_message', to_jsonb(''::text), 'system', 'App Android: mensaje opcional al pedir actualizar')
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- Marcha atrás:
-- DELETE FROM public.settings WHERE key IN ('app_android_min_build', 'app_android_update_url', 'app_update_message');
