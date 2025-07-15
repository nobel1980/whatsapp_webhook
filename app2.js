const express = require('express');
const axios = require('axios');
const WEBHOOK_VERIFY_TOKEN = my-verify-token;
const app = express();
app.use(express.json());
app.get('/', (req, res) => {
  res.send("whatsapp with Node.js and Webhooks");
});
app.get("/webhook", (req, res) => {
  const mode = req.query['hub.mode'];
  const challenge = req.query['hub.challenge'];
  const token = req.query['hub.verify_token'];
  if (mode && token === WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Start the server
app.listen(3000, () => {
    console.log(`WhatsApp Webhook server running on port 3000`);
});