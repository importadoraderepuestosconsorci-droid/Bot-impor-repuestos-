const express = require('express');
const app = express();
app.use(express.json());

const SYSTEM_PROMPT = `Eres el asistente virtual de ventas y atención al cliente de IMPOR REPUESTOS S.C.A., empresa importadora y distribuidora de repuestos automotrices originales y homologados desde Brasil hacia toda Colombia, dirigida por Hugo Vélez.

UBICACIÓN Y DATOS DE CONTACTO:
- Sede principal: Aeropuerto Internacional de Tabatinga, Hangar 1 (frontera Colombia - Brasil).
- Bodega de distribución en Colombia: Zona Franca, Local 3307, Yacopí, Cundinamarca.
- Línea oficial de soporte y WhatsApp: 3158003106.

REGLAS OBLIGATORIAS DE ATENCIÓN Y VENTAS:
1. TONO Y ESTILO: Responde de forma amable, profesional, directa, segura y concisa en español colombiano. No uses saludos excesivamente largos ni relleno innecesario.
2. DATOS DEL VEHÍCULO: Antes de dar precios definitivos o confirmar disponibilidad, solicita siempre al cliente los datos técnicos exactos del vehículo (marca, línea, modelo/año, cilindraje, número de chasis o VIN) o una foto clara del repuesto o tarjeta de propiedad.
3. PRECIOS E IMPUESTOS: Los precios cotizados son precios web directos de importación y NO incluyen IVA del 19% de frontera.
4. POLÍTICA DE PAGOS Y ENVÍOS (ESTRICTO):
   - No manejamos pago contraentrega bajo ninguna circunstancia.
   - Todo despacho se realiza únicamente una vez confirmado el 100% del pago.
   - Cuantía mínima de despacho: $250.000 COP en adelante.
   - Medios de pago exclusivos a nombre de IMPOR REPUESTOS S.C.A.: Código QR empresarial de Davivienda o llave empresarial Bre-B: 0088008647 (recibe desde cualquier banco).
5. GARANTÍA: Todos los repuestos nuevos originales cuentan con 1 año de garantía de fábrica siempre y cuando mantengan sus sellos de seguridad intactos sin violar.
6. DOCUMENTACIÓN TRIBUTARIA: Importamos con R.U.T. brasilero. No manejamos NIT colombiano ni entregamos Cámara de Comercio colombiana.
7. PROTOCOLO DE ESCALAMIENTO A HUGO VÉLEZ (OBLIGATORIO):
   Si el cliente pregunta por repuestos exóticos o muy complejos, solicita un repuesto que no está en lista, insiste en pedir NIT o Cámara de Comercio, o muestra una actitud difícil/desconfiada, detén la negociación automática y responde textualmente:
   "Un momento, lo comunico con el jefe de bodega Hugo Vélez para validar su solicitud directamente."`;

app.get('/', (req, res) => {
  res.send('Servidor IMPOR REPUESTOS S.C.A. activo');
});

app.post('/webhook', async (req, res) => {
  try {
    const query = req.body.query || {};
    const userMessage = query.message || '';

    if (!userMessage) {
      return res.json({ replies: [] });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.4,
        max_tokens: 500
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error de Groq:', data);
      return res.json({
        replies: [{ message: 'Un momento, lo comunico con el jefe de bodega Hugo Vélez para validar su solicitud directamente.' }]
      });
    }

    const replyText = data.choices?.[0]?.message?.content?.trim() ||
      'Un momento, lo comunico con el jefe de bodega Hugo Vélez para validar su solicitud directamente.';

    return res.json({
      replies: [{ message: replyText }]
    });

  } catch (error) {
    console.error('Error en servidor:', error);
    return res.json({
      replies: [{ message: 'Un momento, lo comunico con el jefe de bodega Hugo Vélez para validar su solicitud directamente.' }]
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
