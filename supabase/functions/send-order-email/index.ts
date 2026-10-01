import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface OrderEmailData {
  emailType: 'order_confirmation' | 'payment_ready' | 'payment_confirmed' | 'shipped' | 'completed' | 'store_order_registered' | 'store_order_processing' | 'store_order_shipped'
  orderId: string
  customerEmail: string
  customerName: string
  items?: Array<{
    title: string
    quantity: number
    price: number
    author?: string
    ref?: string
  }>
  subtotal?: number
  tax?: number
  taxRate?: number
  shipping?: number
  total: number
  shippingAddress?: string
  paymentUrl?: string
  carrier?: string
  trackingNumber?: string
  storeName?: string // 'Librería Pérez Galdós' or 'Librería Galeón'
}

// ... (previous templates: generateOrderConfirmationHTML, generatePaymentReadyHTML, generatePaymentConfirmedHTML, generateShippedHTML, generateCompletedHTML - KEEP THESE)

const generateOrderConfirmationHTML = (data: OrderEmailData): string => {
  const itemsHTML = data.items?.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.title}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.price.toFixed(2)} €</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${(item.quantity * item.price).toFixed(2)} €</td>
    </tr>
  `).join('') || ''
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Pedido</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">¡Pedido Confirmado!</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Estimado/a <strong>${data.customerName}</strong>,</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 30px 0;">
            Hemos registrado su pedido en nuestros sistemas. A continuación encontrará los detalles de su compra:
          </p>
          <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 16px 20px; margin-bottom: 30px;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Número de Pedido</p>
            <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 700; color: #111827;">#${data.orderId}</p>
          </div>
          <h2 style="font-size: 20px; color: #111827; margin: 0 0 20px 0; font-weight: 600;">Detalles del Pedido</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Libro</th>
                <th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Cant.</th>
                <th style="padding: 12px; text-align: right; font-size: 14px; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Precio</th>
                <th style="padding: 12px; text-align: right; font-size: 14px; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #6b7280; font-size: 16px;">Subtotal:</span>
              <span style="color: #111827; font-size: 16px; font-weight: 600;">${data.subtotal?.toFixed(2)} €</span>
            </div>
            ${data.shipping && data.shipping > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #6b7280; font-size: 16px;">Gastos de envío:</span>
              <span style="color: #111827; font-size: 16px; font-weight: 600;">${data.shipping.toFixed(2)} €</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #6b7280; font-size: 16px;">IVA (${data.taxRate}%):</span>
              <span style="color: #111827; font-size: 16px; font-weight: 600;">${data.tax?.toFixed(2)} €</span>
            </div>
            <div style="border-top: 2px solid #e5e7eb; padding-top: 12px; margin-top: 12px; display: flex; justify-content: space-between;">
              <span style="color: #111827; font-size: 18px; font-weight: 700;">Total:</span>
              <span style="color: #667eea; font-size: 18px; font-weight: 700;">${data.total.toFixed(2)} €</span>
            </div>
          </div>
          <h2 style="font-size: 20px; color: #111827; margin: 0 0 16px 0; font-weight: 600;">Dirección de Envío</h2>
          <div style="background-color: #f9fafb; padding: 16px 20px; border-radius: 8px; margin-bottom: 30px;">
            <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">${data.shippingAddress}</p>
          </div>
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
            <p style="margin: 0; color: #1e40af; font-size: 16px; line-height: 1.6;">
              <strong>📦 Próximos pasos:</strong><br>
              Verificaremos el stock en las próximas 24-48 horas. Le notificaremos por correo cuando pueda realizar el pago.
            </p>
          </div>
          <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 10px 0;">Gracias por su compra,</p>
          <p style="font-size: 16px; color: #667eea; font-weight: 600; margin: 0;">Librería Pérez Galdós</p>
        </div>
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">Si tiene alguna pregunta, no dude en contactarnos</p>
          <p style="margin: 0; font-size: 14px; color: #667eea;"><a href="mailto:pedidos@perezgaldos.com" style="color: #667eea; text-decoration: none;">pedidos@perezgaldos.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `
}

const generatePaymentReadyHTML = (data: OrderEmailData): string => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pedido Listo para Pagar</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">✅ ¡Tu Pedido Está Listo!</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Estimado/a <strong>${data.customerName}</strong>,</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 30px 0;">
            ¡Buenas noticias! Hemos verificado el stock de su pedido y todo está disponible. Ya puede proceder con el pago.
          </p>
          <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px 20px; margin-bottom: 30px;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Número de Pedido</p>
            <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 700; color: #111827;">#${data.orderId}</p>
          </div>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Total a Pagar</p>
            <p style="margin: 0; font-size: 36px; font-weight: 700; color: #10b981;">${data.total.toFixed(2)} €</p>
          </div>
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${data.paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
              💳 Pagar Ahora
            </a>
          </div>
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
            <p style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px; line-height: 1.6;"><strong>📝 Instrucciones:</strong></p>
            <ol style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 15px; line-height: 1.8;">
              <li>Haga clic en el botón "Pagar Ahora" arriba</li>
              <li>Complete el proceso de pago de forma segura</li>
              <li>Recibirá una confirmación de pago por email</li>
              <li>Prepararemos y enviaremos su pedido inmediatamente</li>
            </ol>
          </div>
          <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 10px 0;">Gracias por confiar en nosotros,</p>
          <p style="font-size: 16px; color: #10b981; font-weight: 600; margin: 0;">Librería Pérez Galdós</p>
        </div>
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">Si tiene alguna pregunta, no dude en contactarnos</p>
          <p style="margin: 0; font-size: 14px; color: #10b981;"><a href="mailto:pedidos@perezgaldos.com" style="color: #10b981; text-decoration: none;">pedidos@perezgaldos.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `
}

const generatePaymentConfirmedHTML = (data: OrderEmailData): string => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Pago Recibido</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">¡Pago Recibido Correctamente!</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p>Estimado/a <strong>${data.customerName}</strong>,</p>
          <p>Su pago ha sido procesado con éxito. Su pedido <strong>#${data.orderId}</strong> ha pasado al estado de <strong>Preparación</strong>.</p>
          <p>Estamos preparando sus libros para el envío. Recibirá otro correo en cuanto el paquete sea entregado al transportista.</p>
          <br>
          <p>Gracias por su compra,</p>
          <p><strong>Librería Pérez Galdós</strong></p>
        </div>
      </div>
    </body>
    </html>
  `
}

const generateShippedHTML = (data: OrderEmailData): string => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Pedido Enviado</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🚀 ¡Su pedido ha sido enviado!</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p>Hola <strong>${data.customerName}</strong>,</p>
          <p>Grandes noticias: Su pedido <strong>#${data.orderId}</strong> ya está en camino.</p>
          
          <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Transportista:</strong> ${data.carrier || 'Agencia de transporte'}</p>
            <p style="margin: 0;"><strong>Número de seguimiento:</strong> ${data.trackingNumber || 'No disponible'}</p>
          </div>

          <p>Puede seguir el estado de su envío con la información proporcionada.</p>
          <br>
          <p>Atentamente,</p>
          <p><strong>Librería Pérez Galdós</strong></p>
        </div>
      </div>
    </body>
    </html>
  `
}

const generateCompletedHTML = (data: OrderEmailData): string => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Pedido Completado</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #047857 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">¡Gracias por su compra!</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p>Hola <strong>${data.customerName}</strong>,</p>
          <p>Su pedido <strong>#${data.orderId}</strong> ha sido marcado como <strong>Completado</strong>.</p>
          <p>Esperamos que disfrute de sus libros. Ha sido un placer atenderle.</p>
          
          <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; text-align: center;">¿Le ha gustado nuestra atención? ¡Esperamos verle pronto!</p>
          </div>

          <br>
          <p>Un cordial saludo,</p>
          <p><strong>Librería Pérez Galdós</strong></p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Store Specific Templates

const generateStoreOrderRegisteredHTML = (data: OrderEmailData): string => {
  const itemsHTML = data.items?.map(item => `
    <div style="border-bottom: 1px solid #e5e7eb; padding: 10px 0;">
      <p style="margin: 0; font-weight: 600; color: #111827;">${item.title}</p>
      <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">Autor: ${item.author || 'Sin autor'}</p>
      <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">Ref: ${item.ref || 'N/A'}</p>
    </div>
  `).join('') || '';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Pedido Registrado</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700;">Hemos registrado su pedido</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p>Estimado/a <strong>${data.customerName}</strong>,</p>
          <p>Hemos recibido correctamente su solicitud de pedido con los siguientes detalles:</p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${itemsHTML}
          </div>

          <p>Le mantendremos informado sobre el estado del mismo.</p>
          <br>
          <p>Atentamente,</p>
          <p><strong>${data.storeName || 'Librería Pérez Galdós'}</strong></p>
        </div>
      </div>
    </body>
    </html>
  `
}

const generateStoreOrderProcessingHTML = (data: OrderEmailData): string => {
  const itemsHTML = data.items?.map(item => `
    <li style="margin-bottom: 8px;">
      <strong>${item.title}</strong> (${item.ref || 'Ref: N/A'}) - ${item.author || ''}
    </li>
  `).join('') || '';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Procesando Pedido</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700;">Pedido en Proceso</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p>Hola <strong>${data.customerName}</strong>,</p>
          <p>Su pedido está siendo <strong>procesado en nuestros almacenes</strong>.</p>
          
          <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #92400e;">Artículos:</p>
            <ul style="margin: 0; padding-left: 20px; color: #92400e;">
               ${itemsHTML}
            </ul>
          </div>

          <p>Le avisaremos en cuanto salga hacia su destino.</p>
          <br>
          <p>Atentamente,</p>
          <p><strong>${data.storeName || 'Librería Pérez Galdós'}</strong></p>
        </div>
      </div>
    </body>
    </html>
  `
}

const generateStoreOrderShippedHTML = (data: OrderEmailData): string => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Pedido en Camino</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700;">¡Su pedido está en camino!</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p>Hola <strong>${data.customerName}</strong>,</p>
          <p>Le informamos que su pedido ya ha salido de nuestros almacenes.</p>
          
          <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="font-size: 18px; text-align: center; color: #5b21b6; margin: 0;">
              🚚 En camino a: <strong>${data.storeName || 'Librería Pérez Galdós'}</strong>
            </p>
          </div>

          <p>Le avisaremos cuando esté disponible para su estatus final.</p>
          <br>
          <p>Atentamente,</p>
          <p><strong>${data.storeName || 'Librería Pérez Galdós'}</strong></p>
        </div>
      </div>
    </body>
    </html>
  `
}

Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const { orderData } = await req.json() as { orderData: OrderEmailData }
    
    let html = '';
    let subject = '';

    switch (orderData.emailType) {
      case 'payment_ready':
        html = generatePaymentReadyHTML(orderData);
        subject = `Pedido #${orderData.orderId} - ¡Listo para Pagar!`;
        break;
      case 'payment_confirmed':
        html = generatePaymentConfirmedHTML(orderData);
        subject = `Pedido #${orderData.orderId} - Pago Recibido - Preparando envío`;
        break;
      case 'shipped':
        html = generateShippedHTML(orderData);
        subject = `Pedido #${orderData.orderId} - ¡Enviado! 🚀`;
        break;
      case 'completed':
        html = generateCompletedHTML(orderData);
        subject = `Pedido #${orderData.orderId} - Completado - ¡Gracias!`;
        break;
      case 'store_order_registered':
        html = generateStoreOrderRegisteredHTML(orderData);
        subject = `Pedido #${orderData.orderId} - Registrado correctamente`;
        break;
      case 'store_order_processing':
        html = generateStoreOrderProcessingHTML(orderData);
        subject = `Pedido #${orderData.orderId} - Procesando en almacén`;
        break;
      case 'store_order_shipped':
        html = generateStoreOrderShippedHTML(orderData);
        subject = `Pedido #${orderData.orderId} - En camino a ${orderData.storeName}`;
        break;
      case 'order_confirmation':
      default:
        html = generateOrderConfirmationHTML(orderData);
        subject = `Pedido #${orderData.orderId} - Confirmación de Pedido`;
        break;
    }

    // Send email via Resend
    const data = await resend.emails.send({
      from: 'Librería Pérez Galdós <pedidos@perezgaldos.com>',
      to: [orderData.customerEmail],
      subject: subject,
      html: html,
    })

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error: any) {
    console.error('Error sending order email:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
});
