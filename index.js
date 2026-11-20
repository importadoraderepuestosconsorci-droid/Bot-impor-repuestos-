const express = require('express');
const app = express();
app.use(express.json());

// Memoria de conversaciones por cliente y bloqueo cuando pasa a Hugo Vélez
const sesiones = new Map();
const bloqueados = new Map();

const SYSTEM_PROMPT = `Eres el asistente comercial oficial de IMPOR REPUESTOS S.C.A., empresa importadora y comercializadora directa de repuestos automotrices desde Brasil hacia toda Colombia.

UBICACIONES Y CONTACTO:
- Sede Principal: Aeropuerto Internacional de Tabatinga, Hangar 1 (Frontera Colombia - Brasil).
- Bodega de distribución nacional: Zona Franca de Yacopí, Local 3307, Cundinamarca.
- Línea oficial de soporte y WhatsApp: 3158003106.

REGLAS DE ATENCIÓN (CUMPLIMIENTO ESTRICTO):
1. TONO DIRECTO Y CERO INTERRUPCIONES:
- Responde en español colombiano profesional, claro y ejecutivo.
- Nunca devuelvas el saludo al cliente ni repitas frases introductorias.

2. FLUJO EN DOS PASOS (PROHIBIDO PEDIR MÁS DATOS):
- CASO A (Falta información): Si el cliente solo saluda o pide un repuesto sin dar el número de chasis (VIN) ni los datos del vehículo, pídele en un solo mensaje breve: Marca, línea, año, cilindraje y el número de chasis (VIN) o foto de la tarjeta de propiedad.
- CASO B (Ya entregó el VIN o chasis): En cuanto el cliente envíe el número de chasis (VIN) junto con el repuesto y el vehículo, TERMINANTEMENTE PROHIBIDO hacer más preguntas. No pidas tipo de transmisión, no pidas foto de la tarjeta de propiedad y no pidas foto del repuesto. Pasa de inmediato al Punto 3.

3. ENTREGA INMEDIATA DE COTIZACIÓN (APENAS RECIBAS EL VIN):
- Entrega de una vez una cotización clara en pesos colombianos (COP) de gama intermedia con estas dos opciones:
  * Opción 1: Repuesto Nuevo Original importado de fábrica con garantía de 1 año (los sellos internos no se violan y nunca se manejan desempacados).
  * Opción 2: Repuesto Homologado de alta calidad.
- Aclara siempre que son precios directos de frontera exentos del 19% de IVA (importamos con R.U.T. brasilero; no manejamos NIT colombiano ni Cámara de Comercio).

4. CONDICIONES COMERCIALES Y LOGÍSTICA:
- Pedido mínimo de despacho: $250.000 COP por envío.
- Pago: 100% anticipado previo al despacho ("pago hecho, repuesto enviado") mediante Código QR empresarial Davivienda o Llave empresarial Bre-B: 0088008647. No manejamos pagos contra entrega.
- Tiempo de envío desde frontera: 1 día hábil a Bogotá y 3 días hábiles al resto del país.

5. ESCALAMIENTO AL JEFE DE BODEGA HUGO VÉLEZ:
- Únicamente cuando el cliente acepte la cotización y pida datos para pagar/despachar, pida un repuesto exótico fuera de catálogo, insista en exigir NIT/Cámara de Comercio o sea un cliente conflictivo, debes responder ÚNICAMENTE:
"Un momento, lo comunico con el jefe de bodega Hugo Vélez para validar su solicitud directamente."`;

app.post('/webhook', async (req, res) => {
  try {
    // Detectar si el mensaje viene de AutoResponder WA o de Meta API
    const esAutoResponder = Boolean(req.body.query && req.body.query.message);
    
    let remitente = '';
    let mensajeCliente = '';

    if (esAutoResponder) {
      remitente = req.body.query.sender || 'cliente_ar';
      mensajeCliente = req.body.query.message.trim();
    } else if (req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msgObj = req.body.entry[0].changes[0].value.messages[0];
      remitente = msgObj.from;
      mensajeCliente = msgObj.text?.body?.trim() || '';
    } else {
      return res.sendStatus(200);
    }

    if (!mensajeCliente) {
      return esAutoResponder ? res.json({ replies: [] }) : res.sendStatus(200);
    }

    // Si el chat ya fue transferido a Hugo Vélez en las últimas 2 horas, el bot guarda silencio
    const tiempoBloqueo = bloqueados.get(remitente);
    if (tiempoBloqueo && Date.now() - tiempoBloqueo < 2 * 60 * 60 * 1000) {
      return esAutoResponder ? res.json({ replies: [] }) : res.sendStatus(200);
    }

    // Recuperar o iniciar historial del cliente
    if (!sesiones.has(remitente)) {
      sesiones.set(remitente, []);
    }
    const historial = sesiones.get(remitente);
    historial.push({ role: 'user', content: mensajeCliente });

    // Mantener solo los últimos 8 mensajes para evitar saturar tokens
    if (historial.length > 8) {
      historial.splice(0, historial.length - 8);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...historial
        ],
        temperature: 0.3,
        max_tokens: 450
      })
    });

    const data = await response.json();

    if (!response.ok || !data.choices?.[0]?.message?.content) {
      console.error('Error OpenAI:', JSON.stringify(data));
      throw new Error('Fallo en respuesta de OpenAI');
    }

    const respuestaBot = data.choices[0].message.content.trim();
    historial.push({ role: 'assistant', content: respuestaBot });

    // Si el bot escala el caso a Hugo Vélez, activar bloqueo automático
    if (respuestaBot.includes('Hugo Vélez')) {
      bloqueados.set(remitente, Date.now());
    }

           
