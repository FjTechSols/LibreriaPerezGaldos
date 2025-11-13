# Integración de Stripe - Sistema de Pagos Online

## Resumen

La integración con Stripe está completada y lista para aceptar pagos online en la aplicación de la librería.

---

## Configuración Completada

### 1. Variables de Entorno

Ya está configurado en `.env`:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51ST4JLJMCWYCqQ6Qk2xLm5Pq1fs6saOMhcmH7dTWoTL24Z9j6YPeqbN0LYK2zHPgt2hBaC6g6LGJamQtFkBcEZAd00bcdl57Cx
```

### 2. Dependencias Instaladas

```json
{
  "@stripe/stripe-js": "^latest",
  "@stripe/react-stripe-js": "^latest"
}
```

---

## Pasos Pendientes en Supabase

### 1. Configurar Secret Key en Supabase

**IMPORTANTE:** Debes configurar tu Secret Key de Stripe en Supabase:

1. Ve a tu [Dashboard de Stripe](https://dashboard.stripe.com/test/apikeys)
2. Copia tu **Secret key** (empieza con `sk_test_...`)
3. Ve a [Supabase Dashboard](https://supabase.com/dashboard/project/weaihscsaqxadxjgsfbt/settings/secrets)
4. Ve a **Settings** → **Edge Functions** → **Secrets**
5. Agrega un nuevo secreto:
   - **Name**: `STRIPE_SECRET_KEY`
   - **Value**: tu secret key de Stripe

### 2. Desplegar Edge Functions

Necesitas desplegar las Edge Functions manualmente:

#### **Función 1: create-payment-intent**

**Ubicación:** `supabase/functions/create-payment-intent/index.ts`

**Para desplegar:**
1. Ve a Supabase Dashboard → Edge Functions
2. Crea una nueva función llamada `create-payment-intent`
3. Copia el contenido del archivo `supabase/functions/create-payment-intent/index.ts`
4. Despliega la función

#### **Función 2: stripe-webhook (Opcional)**

**Ubicación:** `supabase/functions/stripe-webhook/index.ts`

Esta función maneja los webhooks de Stripe. Si la despliegas:

1. Crea la función en Supabase
2. Obtén la URL de la función deployada
3. Ve a [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
4. Crea un nuevo endpoint con la URL de tu función
5. Selecciona eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
6. Copia el **Webhook signing secret**
7. Agrégalo en Supabase Secrets:
   - **Name**: `STRIPE_WEBHOOK_SECRET`
   - **Value**: el signing secret

### 3. Ejecutar Migración de Base de Datos

Ejecuta la migración para agregar el campo de Stripe:

1. Ve a [SQL Editor en Supabase](https://supabase.com/dashboard/project/weaihscsaqxadxjgsfbt/sql)
2. Copia y pega el contenido de:
   ```
   supabase/migrations/20251113000000_add_stripe_payment_fields.sql
   ```
3. Ejecuta la query

---

## Flujo de Pago Implementado

### Paso 1: Usuario Agrega Items al Carrito
- Usuario navega por el catálogo
- Agrega libros al carrito
- Ve resumen en `/carrito`

### Paso 2: Checkout
- Click en "Proceder al Checkout"
- Rellena formulario con datos personales y dirección
- Selecciona "Tarjeta de Crédito/Débito"
- Click en "Confirmar Pedido"

### Paso 3: Pago con Stripe
- Redirige a `/stripe-checkout`
- Se crea un pedido en estado `pendiente`
- Se genera un Payment Intent en Stripe
- Usuario ve formulario de pago de Stripe
- Introduce datos de tarjeta

### Paso 4: Confirmación
- Stripe procesa el pago
- Si éxito: redirige a `/pago-completado`
- Pedido actualiza a estado `procesando`
- Se guarda `stripe_payment_id` en el pedido
- Carrito se vacía

---

## Componentes Creados

### 1. **StripePaymentForm.tsx**
Componente que renderiza el formulario de pago de Stripe.

**Props:**
```typescript
interface StripePaymentFormProps {
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}
```

### 2. **StripeCheckout.tsx**
Página completa del checkout con Stripe.

**Funcionalidades:**
- Inicializa Payment Intent
- Carga datos del checkout desde localStorage
- Integra StripePaymentForm
- Maneja éxito/error de pago

### 3. **PaymentSuccess.tsx**
Página de confirmación post-pago.

**Muestra:**
- Número de pedido
- ID de transacción
- Total pagado
- Botones: "Ver Mis Pedidos" y "Seguir Comprando"

---

## Servicios Creados

### **stripeService.ts**

```typescript
class StripeService {
  async createPaymentIntent(amount: number, metadata?: Record<string, string>)
  async checkPaymentStatus(paymentIntentId: string)
}
```

---

## Rutas Agregadas

| Ruta | Descripción | Protección |
|------|-------------|------------|
| `/stripe-checkout` | Página de pago con Stripe | Requiere autenticación |
| `/pago-completado` | Confirmación de pago exitoso | Requiere autenticación |

---

## Base de Datos

### Cambios en la tabla `pedidos`

```sql
ALTER TABLE pedidos ADD COLUMN stripe_payment_id text;
CREATE INDEX idx_pedidos_stripe_payment_id ON pedidos(stripe_payment_id);
```

**Nuevo campo:**
- `stripe_payment_id` (text) - ID del Payment Intent de Stripe

---

## Testing

### Tarjetas de Prueba de Stripe

Para probar la integración, usa estas tarjetas de prueba:

| Tarjeta | Número | CVV | Fecha | Resultado |
|---------|--------|-----|-------|-----------|
| Visa | 4242 4242 4242 4242 | Cualquiera | Futura | Éxito |
| Visa (3D Secure) | 4000 0025 0000 3155 | Cualquiera | Futura | Requiere autenticación |
| Visa (Fallida) | 4000 0000 0000 0002 | Cualquiera | Futura | Pago rechazado |
| Mastercard | 5555 5555 5555 4444 | Cualquiera | Futura | Éxito |

**Más tarjetas de prueba:** [Stripe Testing](https://stripe.com/docs/testing)

### Flujo de Test Completo

1. Iniciar sesión en la app
2. Agregar libros al carrito
3. Ir a checkout
4. Rellenar datos personales
5. Seleccionar "Tarjeta"
6. Usar tarjeta de prueba: `4242 4242 4242 4242`
7. CVV: `123`, Fecha: `12/34`, ZIP: `12345`
8. Confirmar pago
9. Verificar redirección a página de éxito
10. Verificar pedido en "Mis Pedidos"

---

## Seguridad

### Buenas Prácticas Implementadas

✅ **Secret Key en servidor:** Nunca expuesta en frontend
✅ **CORS configurado:** Solo orígenes permitidos
✅ **Payment Intent:** Generado en servidor
✅ **Verificación de webhooks:** Firma verificada con secret
✅ **HTTPS requerido:** Stripe requiere HTTPS en producción

---

## Producción

### Pasos para Go-Live

1. **Activar cuenta de Stripe:**
   - Completar información de la empresa
   - Verificar cuenta bancaria
   - Aceptar términos de servicio

2. **Cambiar a claves Live:**
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```
   - En Supabase Secrets: `STRIPE_SECRET_KEY=sk_live_...`

3. **Configurar webhook en producción:**
   - URL: `https://tu-proyecto.supabase.co/functions/v1/stripe-webhook`
   - Agregar `STRIPE_WEBHOOK_SECRET` en Supabase

4. **Verificar SSL/HTTPS:**
   - Stripe requiere HTTPS en producción

---

## Monitoreo

### Dashboard de Stripe

Accede a [Stripe Dashboard](https://dashboard.stripe.com) para:

- Ver todos los pagos
- Gestionar reembolsos
- Ver disputas
- Analizar métricas
- Descargar reportes

### Logs en Supabase

Revisa logs de Edge Functions:
1. Ve a Edge Functions en Supabase
2. Selecciona la función
3. Ve a "Logs"

---

## Troubleshooting

### Error: "No se pudo cargar el sistema de pagos"

**Causa:** Falta configurar `VITE_STRIPE_PUBLISHABLE_KEY`

**Solución:** Verificar archivo `.env`

### Error: "Stripe Secret Key not configured"

**Causa:** Falta configurar secret en Supabase

**Solución:**
1. Ve a Supabase → Settings → Secrets
2. Agrega `STRIPE_SECRET_KEY`

### Pago no actualiza el pedido

**Causa:** Webhook no configurado o secreto incorrecto

**Solución:**
1. Verificar webhook en Stripe Dashboard
2. Verificar `STRIPE_WEBHOOK_SECRET` en Supabase
3. Revisar logs de la función webhook

### Error en producción pero funciona en test

**Causa:** Claves de test usadas en producción

**Solución:**
1. Cambiar a claves `pk_live_` y `sk_live_`
2. Verificar que la cuenta de Stripe esté activada

---

## Costos

### Tarifas de Stripe

- **Tarjetas europeas:** 1.5% + €0.25 por transacción
- **Tarjetas no europeas:** 2.9% + €0.25 por transacción
- **Sin cuota mensual**
- **Sin costos de setup**

**Documentación:** [Stripe Pricing](https://stripe.com/es/pricing)

---

## Soporte

### Recursos

- [Documentación Stripe](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- [Stripe Status](https://status.stripe.com)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## Checklist de Implementación

- [x] Instalar dependencias npm
- [x] Configurar publishable key en `.env`
- [x] Crear Edge Function `create-payment-intent`
- [x] Crear componente StripePaymentForm
- [x] Crear página StripeCheckout
- [x] Crear página PaymentSuccess
- [x] Integrar en flujo de Cart
- [x] Agregar rutas en App.tsx
- [x] Crear migración de BD
- [ ] Configurar `STRIPE_SECRET_KEY` en Supabase Secrets
- [ ] Desplegar Edge Function en Supabase
- [ ] Ejecutar migración en BD
- [ ] Probar con tarjeta de test
- [ ] Configurar webhook (opcional)

---

## Próximos Pasos

1. **Configurar Secret Key en Supabase** (ver sección "Pasos Pendientes")
2. **Desplegar Edge Function** (ver instrucciones arriba)
3. **Ejecutar migración de BD** (copiar SQL a Supabase)
4. **Probar con tarjeta de test** 4242 4242 4242 4242
5. **Verificar todo el flujo** de carrito a confirmación

Una vez completados estos pasos, ¡los pagos estarán funcionando completamente! 🎉

---

**Fecha de implementación:** 2025-11-13
