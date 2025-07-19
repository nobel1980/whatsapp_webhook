
const express = require('express');
// const bodyParser = require('body-parser');
const axios = require('axios');
// const WEBHOOK_VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'my-verify-token';
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // for parsing application/json
// app.use(bodyParser.json()); // for parsing application/json
// app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.get('/', (req, res) => {
    res.send('WhatsApp Webhook Server');
});


app.get('/webhook1', (req, res) => {
    console.log (req.query);
    res.send(); 
});
// GET webhook route - typically used for verification by WhatsApp
app.get('/webhook', (req, res) => {
    // Extract query parameters sent by WhatsApp
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log(`Received verification request: mode=${mode}, token=${token}, challenge=${challenge}`);
    // const verifyToken = process.env.VERIFY_TOKEN || 'your_verify_token_here';
    const verifyToken = process.env.VERIFY_TOKEN || 'my-verify-token';

    if (mode && token) {
        if (mode === 'subscribe' && token === verifyToken) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            console.log('VERIFICATION_FAILED');
            res.sendStatus(403);
        }
    } else {
        // Respond with '400 Bad Request' if required parameters are missing
        console.log('MISSING_PARAMETERS');
        res.sendStatus(400);
    }
});

// POST webhook route - for receiving messages from WhatsApp
app.post('/webhook', (req, res) => {
    console.log(JSON.stringify(req.body, null, 2)); // Log the entire request body for debugging
    res.status(200).send('Webhook Proceed'); // Acknowledge receipt of the event
    // Check if this is a message (WhatsApp sends different types of updates)
    if (req.body.object) {
        if (req.body.entry && 
            req.body.entry[0].changes && 
            req.body.entry[0].changes[0] && 
            req.body.entry[0].changes[0].value.messages) {
            
            // Extract the message details
            const value = req.body.entry[0].changes[0].value;
            const phoneNumberId = value.metadata.phone_number_id;
            const from = value.messages[0].from; // sender's phone number
            const messageBody = value.messages[0].text.body;
            
            console.log(`Message from ${from}: ${messageBody}`);
            
            // Here you would typically process the message and send a response
            // For now, we'll just log it
        }
        
        // Respond with 200 OK to acknowledge receipt
        res.sendStatus(200);
    } else {
        // Not a WhatsApp API event
        console.log('Not a WhatsApp API event');
        res.sendStatus(404);
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`WhatsApp Webhook server running on port ${PORT}`);
});