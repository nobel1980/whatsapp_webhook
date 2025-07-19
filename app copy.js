
const express = require('express');
// const bodyParser = require('body-parser');
const axios = require('axios');
const { useActionState, act } = require('react');
// const WEBHOOK_VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'my-verify-token';
const app = express();
const PORT = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN || 'my-verify-token';

// Middleware
app.use(express.json()); // for parsing application/json

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
    // console.log('Full Payload:', JSON.stringify(req.body, null, 2));

    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) {
        console.error('Invalid Payload: value not found');
        return res.status(400).send('Invalid Payload');
    }

    const statuses = value.statuses?.[0];
    const messages = value.messages?.[0]; 

    if (statuses) {
        console.log(`
        MESSAGE STATUS RECEIVED:
        ID: ${statuses.id}
        Status: ${statuses.status}
        Recipient: ${statuses.recipient_id}
        `);
    } else {
        console.log('No status updates.');
    }

    if (messages) {
        console.log('New Message Received:', messages);
        if (messages.type === 'text') {
            if (messages.text && messages.text.body.toLowerCase() === 'hello') {
                console.log('Received "hello" message, sending response...');
                // sendmessage(messages.from, 'Hello! How can I assist you today?');
                replymessage(messages.from, 'Hello! How can I assist you today?', messages.id);
            }
        }

        if (messages.type === 'list') {
            sendlist(messages.from);
        }
    } else {
        console.log('No incoming messages (status updates only).');
    }

    res.status(200).send('Webhook received');
});


    async function sendmessage(to, body) {
        try {
            const params = {
                messaging_product: "whatsapp",
                to: to,
                type: "text",
                text: {
                    body: body
                }
            };
            const response = await axios.post(
                'https://graph.facebook.com/v22.0/702045652995953/messages',
                params,
                {
                    headers: {
                        'Authorization': `Bearer ${verifyToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Message sent successfully:', response.data);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    async function sendlist(to) {
        try {
            const params = {
                messaging_product: "whatsapp",
                to: to,
                type: "interactive",
                interactive: {
                    type: "list",
                    body: {
                        text: "Please select an option:"
                    },
                    action: {
                        button: "View Options",
                        sections : [
                            {
                                title: "Option 1",
                                rows: [
                                    {
                                        id: "option1",
                                        title: "Option 1",
                                        description: "Description for Option 1"
                                    },
                                    {
                                        id: "option2",
                                        title: "Option 2",
                                        description: "Description for Option 2"
                                    }
                                ]
                            }
                        ]
                    },
                    footer: {
                        text: "Powered by Genex Company"
                    }
                }
            };
            const response = await axios.post(
                'https://graph.facebook.com/v22.0/702045652995953/messages',
                params,
                {
                    headers: {
                        'Authorization': `Bearer ${verifyToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Message sent successfully:', response.data);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    async function replymessage(to, body, messageId) {
    try {
        const params = {
            messaging_product: "whatsapp",
            to: to,
            type: "text",
            text: {
                body: body
            }, 
            context: {
                message_id: messageId
            }
        };
        const response = await axios.post(
            'https://graph.facebook.com/v22.0/702045652995953/messages',
            params,
            {
                headers: {
                    'Authorization': `Bearer ${verifyToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Message sent successfully:', response.data);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}
// Start the server
app.listen(PORT, () => {
    console.log(`WhatsApp Webhook server running on port ${PORT}`);
    // sendmessage('8801844221403', 'Hello');
});