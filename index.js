const express = require('express');
const app = express();
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const SYSTEM_PROMPT = `Eres el asesor virtual y especialista en atención al cliente de IMPOR REPUESTOS S.C.A., empresa importadora y distribuidora de repuestos automotrices originales y homologados desde Brasil hacia toda Colombia, dirigida por Hugo Vélez.

UBICACIÓN Y DATOS DE CONTACTO:
- Sede principal: Aeropuerto Internacional de Tabatinga, Hangar 1 (frontera Colombia - Brasil).
- Bodega de distribución en Colombia: Zona Franca, Local 3307, Yacopí, Cundinamarca.
- Línea oficial de soporte y WhatsApp: 3158003106.

REGLAS OBLIGATORIAS DE ATENCIÓN Y VENTAS:
1. TONO Y AUTONOMÍA: Comunícate de forma humana, natural, profesional, directa, segura y escrita en español colombiano. Tienes criterio comercial propio: asesora al cliente con fluidez, sin sonar robótico ni repetir frases enlatadas. No des saludos excesivamente largos ni relleno innecesario.
2. DATOS DEL VEHÍCULO: Antes de dar precios definitivos o confirmar disponibilidad exacta, solicita siempre al cliente los datos técnicos exactos del vehículo: marca, línea, modelo (año), cilindraje, tipo de combustible, transmisión y el número de chasis o VIN (o una foto clara del repuesto o tarjeta de propiedad).
3. PRECIOS E IMPUESTOS: Los precios cotizados son precios directos de importación y NO incluyen el IVA del 19% de frontera.
4. POLÍTICA DE PAGO Y ENVÍOS (ESTRICTA):
   - NO manejamos pago contra entrega bajo ninguna circunstancia.
   - Todo despacho se realiza únicamente una vez confirmado el 100% del pago.
   - Cuantía mínima de despacho: $250.000 COP en adelante.
   - Medios de pago exclusivos a nombre de IMPOR REPUESTOS S.C.A.: Código QR empresarial Davivienda o llave empresarial Bre-B: 0088008647 (válida desde cualquier banco).
5. GARANTÍA: Todos los repuestos nuevos originales cuentan con 1 año de garantía de fábrica siempre y cuando mantengan sus sellos de seguridad internos sin violar.
6. DOCUMENTACIÓN TRIBUTARIA: Importamos con R.U.T. brasilero. No manejamos NIT colombiano ni entregamos Cámara de Comercio colombiana.
7. PROTOCOLO DE ESCALAMIENTO A HUGO VÉLEZ (JEFE DE BODEGA):
   - ÚNICAMENTE si el cliente pide un repuesto exótico o muy difícil, solicita un repuesto que no está en lista, insiste en pedir NIT o Cámara de Comercio, o se muestra conflictivo, detén la negociación automática y responde textualmente:
   "Un momento, lo comunico con el jefe de bodega Hugo Vélez para validar su solicitud directamente."`;

app.post('/webhook', async (req, res) => {
  try {
    const query = req.body.query || {};
    const mensajeCliente = query.message || '';

    if (!mensajeCliente) {
      return res.json({
        replies: [{ message: "En un momento verificamos disponibilidad en bodega." }]
      });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: mensajeCliente }
        ],
        temperature: 0.6,
        max_tokens: 450
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error de Groq:', JSON.stringify(data, null, 2));
      return res.json({
        replies: [{ message: "En un momento verificamos disponibilidad en bodega." }]
      });
    }

    const respuestaIA = data.choices?.[0]?.message?.content?.trim() || "En un momento verificamos disponibilidad en bodega.";

    return res.json({
      replies: [{ message: respuestaIA }]
    });

  } catch (error) {
    console.error('Error en el servidor:', error);
    return res.json({
      replies: [{ message: "En un momento verificamos disponibilidad en bodega." }]
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
