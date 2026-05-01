import express from "express";

const app = express();

app.use(express.json());

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

// Ruta base para comprobar que Railway responde
app.get("/", (req, res) => {
  res.status(200).send("KFD Webhook activo");
});

// Verificación del webhook de Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("Verificación recibida:", { mode, token, challenge });

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado correctamente");
    return res.status(200).send(challenge);
  }

  console.log("Verificación fallida");
  return res.sendStatus(403);
});

// Recepción de mensajes de WhatsApp
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      console.log("Evento recibido sin mensaje");
      return res.sendStatus(200);
    }

    const from = message.from;
    const text = message.text?.body || "";

    console.log("Mensaje recibido:", text);
    console.log("Número origen:", from);

    if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
      console.log("Faltan variables META_ACCESS_TOKEN o META_PHONE_NUMBER_ID");
      return res.sendStatus(200);
    }

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${META_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${META_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: {
            body: "Hola 👋 Soy KFD. ¿Buscás rehabilitación o entrenamiento?",
          },
        }),
      }
    );

    const data = await response.json();

    console.log("Estado respuesta Meta:", response.status);
    console.log("Respuesta de Meta:", JSON.stringify(data, null, 2));

    return res.sendStatus(200);
  } catch (error) {
    console.error("Error en webhook:", error);
    return res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
