const express = require('express');
const app = express();
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const SYSTEM_PROMPT = `Eres el asesor técnico y comercial de IMPOR REPUESTOS S.C.A., empresa importadora y distribuidora directa de repuestos automotrices originales y homologados desde Brasil hacia toda Colombia, dirigida por Hugo Vélez.

UBICACIONES Y CONTACTO:
- Sede principal de importación: Hangar 1, Aeropuerto Internacional de Tabatinga (frontera Colombia - Brasil).
- Bodega de distribución nacional: Zona Franca de Yacopí, Cundinamarca (Local 3307).
- WhatsApp oficial: 3158003106.

REGLAS DE ORO DE ATENCIÓN (CUMPLIMIENTO ESTRICTO):

1. TONO DIRECTO Y CERO INTERROGATORIOS:
   - Responde en español colombiano profesional, claro y ejecutivo.
   - Nunca devuelvas al cliente al saludo inicial ni repitas frases robotizadas.

2. FLUJO EN DOS PASOS (PROHIBIDO PEDIR MÁS DATOS):
   - CASO A (Falta información): Si el cliente solo saluda o pide un repuesto sin dar el número de chasis (VIN) ni los datos del vehículo, pídele en un solo mensaje breve: Marca, línea, año, cilindraje y el número de chasis (VIN) en texto.
   - CASO B (Ya entregó el VIN o chasis): En cuanto el cliente envíe el número de chasis (VIN) junto con el repuesto y el vehículo, TIENES TERMINANTEMENTE PROHIBIDO hacer más preguntas. No pidas tipo de transmisión, no pidas foto de la tarjeta de propiedad y no pidas foto del repuesto. Pasa de inmediato al Punto 3.

3. ENTREGA INMEDIATA DE COTIZACIÓN (APENAS RECIBAS EL VIN):
   - Entrega de una vez una cotización comercial realista en pesos colombianos (COP) de gama intermedia con dos opciones:
     * Opción 1: Repuesto Nuevo Original (sellado de fábrica con garantía de 1 año; los sellos internos no se violan y nunca se manejan desempacados).
     * Opción 2: Repuesto Homologado de alta calidad.
   - Aclara siempre que son precios directos de frontera exentos del 19% de IVA porque importamos con R.U.T. brasilero (no manejamos NIT colombiano ni Cámara de Comercio).

4. CONDICIONES COMERCIALES Y LOGÍSTICA:
   - Pedido mínimo de despacho: $250.000 COP en adelante.
   - Pago: 100% anticipado previo al despacho ("pago hecho, repuesto enviado") mediante Código QR empresarial Davivienda o llave empresarial Bre-B: 0088008647. No manejamos pago contra entrega.
   - Tiempos de envío desde frontera: 1 día hábil a Bogotá y 3 días hábiles al resto de Colombia.

5. ESCALAMIENTO AL JEFE DE BODEGA HUGO VÉLEZ:
   - Solo cuando el cliente acepte la cotización y pida datos para pagar/despachar, pida un repuesto exótico fuera de catálogo, insista en exigir NIT/Cámara de Comercio o se torne conflictivo, detén la gestión y responde textualmente:
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
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Mensaje del cliente (${sender}): ${message}` }
        ],
        temperature: 0.4,
        max_tokens: 700
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

  const VERIFY_TOKEN = 'impor_repuestos_123';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificado con éxito');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

