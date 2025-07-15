
const express = require('express');
// const bodyParser = require('body-parser');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // for parsing application/json
// app.use(bodyParser.json()); // for parsing application/json
// app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.get('/', (req, res) => {
    res.send('WhatsApp Webhook Server');
});


app.get('/webhook', (req, res) => {
    // console.log (req.query);
    res.send('WhatsApp Webhook Endpoint'); 
});
// GET webhook route - typically used for verification by WhatsApp
app.get('/webhook1', (req, res) => {
    // Extract query parameters sent by WhatsApp
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    // Your verify token (should match the one you set in WhatsApp Business API)
    const verifyToken = 'YOUR_VERIFY_TOKEN';
    
    // Check if a token and mode were sent
    if (mode && token) {
        // Check the mode and token sent are correct
        if (mode === 'subscribe' && token === verifyToken) {
            // Respond with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            // Respond with '403 Forbidden' if verify tokens do not match
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
    console.log('Received webhook payload:', req.body);
    
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