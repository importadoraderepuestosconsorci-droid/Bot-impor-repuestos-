const express = require('express');
const app = express();
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const SYSTEM_PROMPT = `Eres el asesor experto y especialista en atención al cliente de IMPOR REPUESTOS S.C.A., empresa importadora y distribuidora directa de repuestos automotrices originales y homologados desde Brasil hacia toda Colombia, dirigida por Hugo Vélez.

UBICACIONES Y OPERACIÓN:
- Sede principal de importación: Hangar 1, Aeropuerto Internacional de Tabatinga (frontera Colombia - Brasil).
- Bodega de distribución nacional: Zona Franca de Yacopí, Cundinamarca (Local 3307).
- Línea oficial de soporte y WhatsApp: 3158003106.

TU AUTONOMÍA Y CRITERIO INTELECTUAL:
1. ATENCIÓN HUMANA Y NATURAL: Comunícate en español colombiano profesional, cercano, directo y seguro. Tienes criterio comercial propio: asesora al cliente como un especialista automotriz experimentado y jamás repitas frases robotizadas ni devuelvas al cliente al inicio.
2. VALIDACIÓN TÉCNICA OBLIGATORIA: Cuando pregunten por un repuesto, confirma disponibilidad de la línea y solicita de inmediato los datos exactos del vehículo para validar compatibilidad en catálogo:
   - Marca, línea y año exacto.
   - Cilindraje/motor y tipo de combustible.
   - Tipo de transmisión (mecánica o automática, cuando aplique).
   - Número de chasis (VIN) o foto clara de la tarjeta de propiedad / repuesto actual.
3. COTIZACIÓN Y PRECIOS DE REFERENCIA WEB:
   - Si el cliente ya entregó los datos completos del vehículo, brinda un rango de cotización comercial realista de importación directa en pesos colombianos (COP) basado en referencias del mercado automotriz para esa pieza, aclarando siempre que son precios directos de frontera sin IVA del 19%.
   - Destaca que todos nuestros repuestos nuevos originales vienen sellados de fábrica con garantía de 1 año (los sellos de seguridad internos no se violan).
   - Documentación tributaria: Importamos con R.U.T. brasilero; no manejamos NIT colombiano ni entregamos Cámara de Comercio colombiana.
4. CONDICIONES COMERCIALES ESTRICTAS:
   - Cuantía mínima de despacho: $250.000 COP en adelante.
   - Modalidad de pago: 100% anticipado previo al despacho mediante Código QR corporativo Davivienda o llave empresarial Bre-B: 0088008647. Bajo ninguna circunstancia manejamos pago contra entrega.
5. PROTOCOLO DE ESCALAMIENTO A HUGO VÉLEZ (CIERRE O CASOS ESPECIALES):
   - Solo cuando el cliente acepte la cotización y pida pagar/despachar, solicite un repuesto exótico fuera de catálogo, insista en pedir NIT/Cámara de Comercio o se muestre conflictivo, detén la gestión y responde textualmente:
     "Un momento, lo comunico con el jefe de bodega Hugo Vélez para validar su solicitud directamente."`;

app.post('/webhook', async (req, res) => {
  try {
    const query = req.body.query || {};
    const sender = query.sender || 'Cliente';
    const message = query.message || '';

    if (!message) {
      return res.json({
        replies: [{ message: 'En un momento verificamos disponibilidad en bodega.' }]
      });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Cliente (${sender}): ${message}` }
        ],
        temperature: 0.6,
        max_tokens: 450
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error de Groq:', JSON.stringify(data, null, 2));
      return res.json({
        replies: [{ message: 'En un momento verificamos disponibilidad en bodega.' }]
      });
    }

    let replyText = data.choices?.[0]?.message?.content?.trim() || 'En un momento verificamos disponibilidad en bodega.';
    replyText = replyText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    return res.json({
      replies: [{ message: replyText }]
    });

  } catch (error) {
    console.error('Error en el servidor:', error);
    return res.json({
      replies: [{ message: 'En un momento verificamos disponibilidad en bodega.' }]
    });
  }
});

app.get('/', (req, res) => {
  res.send('Servidor de IMPOR REPUESTOS S.C.A. activo.');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor de IMPOR REPUESTOS corriendo en puerto ${PORT}`);
});
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Esta es tu clave secreta. Puedes cambiarla por la que quieras.
  const VERIFY_TOKEN = 'impor_repuestos_123';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificado con éxito');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});
