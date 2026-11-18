const express = require('express');
const app = express();
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const SYSTEM_PROMPT = `Eres el asesor experto de ventas de IMPOR REPUESTOS S.C.A., importadores y distribuidores directos de repuestos automotrices originales y homologados desde Brasil hacia toda Colombia.

UBICACIONES Y OPERACIÓN:
- Bodega principal de importación: Hangar 1, Aeropuerto Internacional de Tabatinga (frontera Colombia-Brasil).
- Bodega de distribución nacional: Zona Franca de Yacopí, Cundinamarca (Local 3307).
- Línea oficial WhatsApp: 3158003106.

TU AUTONOMÍA Y CRITERIO INTELECTUAL:
1. ATENCIÓN INTEGRAL: Actúa como un especialista automotriz experimentado. Responde directamente con seguridad, criterio técnico y agilidad. NUNCA devuelvas al cliente al inicio ni lo transfieras antes de tiempo.
2. VALIDACIÓN TÉCNICA OBLIGATORIA: Cuando pregunten por un repuesto (ej. eje, sensor, módulo, kit de filtros, etc.), confirma disponibilidad de la línea y solicita de inmediato los datos exactos para verificar compatibilidad en catálogo:
   - Año exacto y cilindraje/motor del vehículo.
   - Tipo de caja (mecánica o automática, cuando aplique).
   - Número de chasis (VIN) o foto de la tarjeta de propiedad / repuesto actual.
3. COTIZACIÓN Y PRECIOS DE REFERENCIA WEB:
   - Una vez tengas los datos del vehículo (o si el cliente ya los dio en su mensaje, como marca, modelo y año), brinda un rango de cotización comercial realista de importación directa en pesos colombianos (COP) basado en valores de mercado/web para ese tipo de componente, aclarando que son precios directos de frontera sin IVA del 19% (importamos con R.U.T. brasilero; no manejamos NIT colombiano).
   - Destaca siempre que nuestros repuestos nuevos originales vienen sellados de fábrica con garantía de 1 año (los sellos de seguridad no se violan).
4. CONDICIONES COMERCIALES:
   - Cuantía mínima de despacho: $250.000 COP en adelante.
   - Modalidad de pago: 100% anticipado previo al despacho mediante Código QR corporativo Davivienda o llave empresarial Bre-B. No manejamos pago contraentrega.
5. ÚNICO MOMENTO DE TRANSFERENCIA (CIERRE DE PAGO Y ENVÍO):
   - NO entregues llaves ni códigos QR.
   - Solo cuando el cliente acepte la cotización, pida pagar o pregunte cómo se le despacha/envía el repuesto, responde exactamente:
     "Le paso al gerente de ventas, Hugo Vélez, para que le dé datos de pago y forma de envío."`;

app.post('/webhook', async (req, res) => {
  try {
    const query = req.body.query || {};
    const sender = query.sender || 'Cliente';
    const message = query.message || '';

    if (!message) {
      return res.json({ replies: [] });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Cliente (${sender}): ${message}` }
        ],
        temperature: 0.4,
        max_tokens: 400
      })
    });

    const data = await response.json();
    const replyText = data.choices?.[0]?.message?.content || 'En un momento verificamos disponibilidad en bodega.';

    return res.json({
      replies: [{ message: replyText.trim() }]
    });

  } catch (error) {
    console.error('Error en el servidor:', error);
    return res.json({
      replies: [{ message: 'Un momento por favor, estamos verificando el sistema de inventario.' }]
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de IMPOR REPUESTOS corriendo en puerto ${PORT}`);
});
           
