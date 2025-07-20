const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const pageAccessToken = process.env.PAGE_ACCESS_TOKEN;
const webhookVerifyToken = process.env.VERIFY_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

const userLanguagePreference = {};  // { phoneNumber: 'bangla' or 'english' }

app.use(express.json());

// ✅ Health check
app.get('/', (req, res) => res.send('WhatsApp Webhook Server Running'));

// ✅ Configure Get Started Button on server startup
async function setupGetStartedButton() {
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/whatsapp_business_profile`,
            {
                messaging_product: "whatsapp",
                get_started: {
                    payload: "GET_STARTED_PAYLOAD"
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${pageAccessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log("✅ Get Started button configured:", response.data);
    } catch (error) {
        console.error("❌ Get Started button configuration failed:", error.response?.data || error.message);
    }
}

// Call this when your server starts
setupGetStartedButton();

// ✅ Webhook verification
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === webhookVerifyToken) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            console.log('VERIFICATION_FAILED');
            res.sendStatus(403);
        }
    } else {
        console.log('MISSING_PARAMETERS');
        res.sendStatus(400);
    }
});

// ✅ WhatsApp webhook POST
app.post('/webhook', (req, res) => {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages?.[0];

    if (!messages) {
        return res.status(200).send('OK');
    }

    const from = messages.from;

    if (messages.type === 'interactive' && 
        messages.interactive.type === 'button_reply' && 
        messages.interactive.button_reply.payload === "GET_STARTED_PAYLOAD") {
        console.log('Get Started button clicked by:', from);
        languageButtons(from);
        return res.status(200).send('OK');
    }

    if (messages.type === 'interactive' && messages.interactive.type === 'button_reply') {
        const buttonId = messages.interactive.button_reply.id;

        if (buttonId === 'optionBangla') {
            userLanguagePreference[from] = 'bangla';
            replyMessage(from, 'আপনি বাংলা ভাষা নির্বাচন করেছেন। এখন আপনি কোন সেবা নিতে চান?', messages.id);
            serviceList(from, 'bangla');
        } else if (buttonId === 'optionEnglish') {
            userLanguagePreference[from] = 'english';
            replyMessage(from, 'You have selected English. What service do you want next?', messages.id);
            serviceList(from, 'english');
        }
    } else if (messages.type === 'text') {
        const text = messages.text.body.toLowerCase();
        const lang = userLanguagePreference[from] || 'english';

        if (text === 'hello') {
            languageButtons(from);
        } else if (text === 'list') {
            if (lang === 'bangla') sendMessage(from, 'এটি বাংলা সার্ভিস তালিকা।');
            else sendMessage(from, 'This is the English service list.');
        } else {
            if (lang === 'bangla') sendMessage(from, 'আপনার বার্তা বুঝতে পারিনি। দয়া করে সঠিক ইনপুট দিন।');
            else sendMessage(from, 'Sorry, I did not understand your message.');
        }
    }

    res.status(200).send('Webhook received');
});

// ✅ Universal send function
async function sendWhatsAppMessage(params) {
    try {
        const response = await axios.post(
            'https://graph.facebook.com/v22.0/702045652995953/messages',
            params,
            {
                headers: {
                    Authorization: `Bearer ${webhookVerifyToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('✅ Message sent:', JSON.stringify(response.data));
    } catch (error) {
        console.error('❌ WhatsApp API Error:', error.response?.data?.error || error.message);
    }
}

// ✅ Simple text message
function sendMessage(to, body) {
    const params = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body }
    };
    sendWhatsAppMessage(params);
}

// ✅ Reply to message
function replyMessage(to, body, messageId) {
    const params = {
        messaging_product: "whatsapp",
        to,
        context: { message_id: messageId },
        type: "text",
        text: { body }
    };
    sendWhatsAppMessage(params);
}

// ✅ Language buttons
function languageButtons(to) {
    const params = {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "button",
            body: {
                text: "Hello! Welcome to BTRC. Please choose the language:হ্যালো! বিটিআরসিতে স্বাগতম। অনুগ্রহ করে ভাষাটি বেছে নিন:"
            },
            action: {
                buttons: [
                    { type: "reply", reply: { id: "optionBangla", title: "বাংলা" } },
                    { type: "reply", reply: { id: "optionEnglish", title: "English" } }
                ]
            },
            footer: { text: "Powered by Genex Infosys PLC" }
        }
    };
    sendWhatsAppMessage(params);
}

// ✅ Service List (Bangla/English)
async function serviceList(to, language = 'english') {
    const rows = (language === 'bangla') ? [
        { id: "OptoionPromSms", title: "প্রোমোশনাল এসএমএস বন্ধ", description: "এই অপশন নির্বাচন করে প্রোমোশনাল এসএমএস বন্ধ করতে পারেন।" },
        { id: "optionMnp", title: "এমএনপি", description: "নম্বর পোর্টেবিলিটি সম্পর্কিত তথ্য।" }
    ] : [
        { id: "OptoionPromSms", title: "Stop Promotional SMS", description: "You can stop promotional SMS by selecting this option." },
        { id: "optionMnp", title: "MNP", description: "Get information about Mobile Number Portability." }
    ];

    const params = {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "list",
            body: {
                text: language === 'bangla'
                    ? "আপনার প্রয়োজনীয় সেবা নির্বাচন করুনঃ"
                    : "Please select the service you want:"
            },
            action: {
                button: language === 'bangla' ? "সেবা তালিকা" : "Service List",
                sections: [
                    {
                        title: language === 'bangla' ? "সেবা তালিকা" : "Service List",
                        rows
                    }
                ]
            }
        }
    };

    sendWhatsAppMessage(params);
}

// ✅ Start server
app.listen(PORT, () => console.log(`🚀 WhatsApp Webhook server running on port ${PORT}`));
