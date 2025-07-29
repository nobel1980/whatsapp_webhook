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
        }else if (buttonId === 'btrc_complain_form') {
            const lang = userLanguagePreference[from] || 'english';
            // sendComplainFormButton(from, lang);
            const reply = (lang === 'bangla') 
                ? "অভিযোগ ফর্ম লিংক:\n\nhttps://crm.btrc.gov.bd"
                : "Complain Form Link:\n\nhttps://crm.btrc.gov.bd";
            sendMessage(from, reply);
        }else if (buttonId === 'btrc_helpline') {
            const lang = userLanguagePreference[from] || 'english';
            sendBtrcHelplineReplyButton(from, lang);
            // const reply = (lang === 'bangla')
            //     ? "বিটিআরসি হেল্পলাইন: ১০০ নম্বরে যোগাযোগ করুন।"
            //     : "BTRC Helpline: Please call 100.";
            // sendMessage(from, reply);
        }   else if (buttonId === 'mobile_operator_complain_form') {
            const lang = userLanguagePreference[from] || 'english';
            const reply = (lang === 'bangla')
                ? "মোবাইল অপারেটর অভিযোগ ফর্ম: \nhttps://btrc.gov.bd/mobile-operator-complaint-form"
                : "Mobile Operator Complain Form: \nhttps://btrc.gov.bd/mobile-operator-complaint-form";
            sendMessage(from, reply);
        } else if (buttonId === 'mobile_operator_helpline') {
            const lang = userLanguagePreference[from] || 'english';
            // const reply = (lang === 'bangla')
            //     ? "মোবাইল অপারেটর হেল্পলাইন: আপনার মোবাইল অপারেটরের হেল্পলাইন নম্বরে যোগাযোগ করুন।"
            //     : "Mobile Operator Helpline: Please contact your mobile operator's helpline.";
            // sendMessage(from, reply);
            mobileOperatorHelpline(from, lang);
        }  else if (buttonId === 'mnp_complain_form') {
            const lang = userLanguagePreference[from] || 'english';
            const reply = (lang === 'bangla')
                ? "এমএনপি অভিযোগ ফর্ম: \nhttps://btrc.gov.bd/mnp-complaint-form"
                : "MNP Complain Form: \nhttps://btrc.gov.bd/mnp-complaint-form";
            sendMessage(from, reply);
        } else if (buttonId === 'mnp_helpline') {
            const lang = userLanguagePreference[from] || 'english';
            const reply = (lang === 'bangla')
                ? "এমএনপি হেল্পলাইন: ১৬২৪৫ নম্বরে যোগাযোগ করুন।"
                : "MNP Helpline: Please call 16245.";
            sendMessage(from, reply);
        }  else if (buttonId === 'gp_helpline') {
            const lang = userLanguagePreference[from] || 'english';
            const reply = (lang === 'bangla')
                ? "গ্রামীণফোন হেল্পলাইন: 121 নম্বরে যোগাযোগ করুন।"
                : "Grameenphone Helpline: Please call 121.";
            sendMessage(from, reply);
        } else if (buttonId === 'robi_helpline') {
            const lang = userLanguagePreference[from] || 'english';
            const reply = (lang === 'bangla')
                ? "রবির হেল্পলাইন: 123 অথবা 01819-400400 নম্বরে যোগাযোগ করুন।"
                : "Robi Helpline: Please call 123 or 01819-400400.";
            sendMessage(from, reply);
        } else if (buttonId === 'banglalink_helpline') {
            const lang = userLanguagePreference[from] || 'english';
            const reply = (lang === 'bangla')
                ? "বাংলালিংক হেল্পলাইন: 121 নম্বরে যোগাযোগ করুন।"
                : "Banglalink Helpline: Please call 121.";
            sendMessage(from, reply);
        } else if (buttonId === 'teletalk_helpline') {
            const lang = userLanguagePreference[from] || 'english';
            const reply = (lang === 'bangla')
                ? "টেলিটক হেল্পলাইন: 121 নম্বরে যোগাযোগ করুন।"
                : "Teletalk Helpline: Please call 121.";
            sendMessage(from, reply);
        }   
    } else if (messages.type === 'interactive' && messages.interactive.type === 'list_reply') {
        const listId = messages.interactive.list_reply.id;
            if (listId === 'gp_helpline') {
                const lang = userLanguagePreference[from] || 'english';
                const reply = (lang === 'bangla')
                    ? "গ্রামীণফোন হেল্পলাইন: 121 নম্বরে যোগাযোগ করুন।"
                    : "Grameenphone Helpline: Please call 121.";
                sendMessage(from, reply);
            } else if(listId === 'robi_helpline') {
                const lang = userLanguagePreference[from] || 'english';
                const reply = (lang === 'bangla')
                    ? "রবির হেল্পলাইন: 123 অথবা 01819-400400 নম্বরে যোগাযোগ করুন।"
                    : "Robi Helpline: Please call 123 or 01819-400400.";
                sendMessage(from, reply);
            } else if (listId === 'OptionBtrc') {
                const lang = userLanguagePreference[from] || 'english';
                btrcOptions(from, lang);
            } else if (listId === 'optionMobileOperator') { 
                const lang = userLanguagePreference[from] || 'english';
                mobileOperatorOptions(from, lang);
            } else if (listId === 'optionHelpline') {
                const lang = userLanguagePreference[from] || 'english';
                helplineOptions(from, lang);
            }else if (listId === 'optionMnp') {
                const lang = userLanguagePreference[from] || 'english';
                mnpOptions(from, lang);
            } else if (listId === 'optionOther') {
                const lang = userLanguagePreference[from] || 'english';
                if (lang === 'bangla') {
                    sendMessage(from, 'অনুগ্রহ করে আপনার প্রশ্নটি লিখুন।');
                } else {
                    sendMessage(from, 'Please type your query.');
                }
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
                    Authorization: `Bearer ${pageAccessToken}`,
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

async function serviceList(to, language = 'english') {
    const rows = (language === 'bangla') ? [
        { id: "OptionBtrc", title: "বিটিআরসি", description: "বাংলাদেশ টেলিযোগাযোগ নিয়ন্ত্রণ কমিশন সম্পর্কিত তথ্য।" },
        { id: "optionMobileOperator", title: "মোবাইল অপারেটর", description: "মোবাইল অপারেটর সম্পর্কিত তথ্য।" },
        { id: "optionHelpline", title: "হেল্পলাইন", description: "হেল্পলাইন সম্পর্কিত তথ্য।" },
        { id: "optionMnp", title: "প্রমোশনাল এসএমএস/কল বন্ধ", description: "প্রমোশনাল এসএমএস/কল বন্ধ সম্পর্কিত তথ্য।" },
        { id: "optionOther", title: "অন্যান্য", description: "অন্যান্য সেবা সম্পর্কিত তথ্য।" }
    ] : [
        { id: "OptionBtrc", title: "BTRC", description: "Information related to BTRC." },
        { id: "optionMobileOperator", title: "Mobile Operator", description: "Information about Mobile Operators." },
        { id: "optionHelpline", title: "Helpline", description: "Information about Helpline." },
        { id: "optionMnp", title: "SMS/Call Block", description: "Information about blocking promotional SMS/Calls." },
        { id: "optionOther", title: "Other", description: "Information about other services." }
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

function btrcOptions(to, language = 'english') {
    const buttons = (language === 'bangla') ? [
        {
            type: "reply",
            reply: {
                id: "btrc_complain_form",
                title: "অভিযোগ ফর্ম"
            }
        },
        {
            type: "reply",
            reply: {
                id: "btrc_helpline",
                title: "বিটিআরসি হেল্পলাইন"
            }
        }
    ] : [
        {
            type: "reply",
            reply: {
                id: "btrc_complain_form",
                title: "Complain Form"
            }
        },
        {
            type: "reply",
            reply: {
                id: "btrc_helpline",
                title: "BTRC Helpline"
            }
        }
    ];

    const params = {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "button",
            body: {
                text: (language === 'bangla') 
                    ? "বিটিআরসি সম্পর্কিত তথ্যের জন্য একটি অপশন নির্বাচন করুনঃ" 
                    : "Please select an option for BTRC information:"
            },
            action: {
                buttons
            }
        }
    };

    sendWhatsAppMessage(params);
}
function mobileOperatorOptions(to, language = 'english') {
    const buttons = (language === 'bangla') ? [
        {
            type: "reply",
            reply: {
                id: "mobile_operator_complain_form",
                title: "মোবাইল অপারেটর অভিযোগ ফর্ম"
            }
        },
        {
            type: "reply",
            reply: {
                id: "mobile_operator_helpline",
                title: "মোবাইল অপারেটর হেল্পলাইন"
            }
        }
    ] : [
        {
            type: "reply",
            reply: {
                id: "mobile_operator_complain_form",
                title: "Mobile Operator Complain Form"
            }
        },
        {
            type: "reply",
            reply: {
                id: "mobile_operator_helpline",
                title: "Mobile Operator Helpline"
            }
        }
    ];

    const params = {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "button",
            body: {
                text: (language === 'bangla') 
                    ? "মোবাইল অপারেটর সম্পর্কিত তথ্যের জন্য একটি অপশন নির্বাচন করুনঃ" 
                    : "Please select an option for Mobile Operator information:"
            },
            action: {
                buttons
            }
        }
    };

    sendWhatsAppMessage(params);
}   

function sendComplainFormButton(to, language = 'english') {
    const text = (language === 'bangla')
        ? "অভিযোগ ফর্ম দেখতে নিচের বাটনে ক্লিক করুন:"
        : "Click the button below to access the Complain Form:";

    const params = {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "button",
            body: { text },
            action: {
                buttons: [
                    {
                        type: "url",
                        url: "https://crm.btrc.gov.bd/cms/",
                        title: (language === 'bangla') ? "অভিযোগ ফর্ম" : "Complain Form"
                    }
                ]
            }
        }
    };

    sendWhatsAppMessage(params);
}

function sendBtrcHelplineReplyButton(to, language = 'english') {
    const params = {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "button",
            body: {
                text: (language === 'bangla') 
                    ? "বিটিআরসি হেল্পলাইনে কল করতে নিচের বোতাম চাপুন।" 
                    : "Tap the button below to get BTRC Helpline number."
            },
            action: {
                buttons: [
                    {
                        type: "reply",
                        reply: {
                            id: "CALL_BTRC",
                            title: (language === 'bangla') ? "১০০ কল করুন" : "Call 100"
                        }
                    }
                ]
            }
        }
    };

    sendWhatsAppMessage(params);
}

function mnpOptions(to, language = 'english') {
    const buttons = (language === 'bangla') ? [
        {
            type: "reply",
            reply: {
                id: "mnp_complain_form",
                title: "এমএনপি অভিযোগ ফর্ম"
            }
        },
        {
            type: "reply",
            reply: {
                id: "mnp_helpline",
                title: "এমএনপি হেল্পলাইন"
            }
        }
    ] : [
        {
            type: "reply",
            reply: {
                id: "mnp_complain_form",
                title: "MNP Complain Form"
            }
        },
        {
            type: "reply",
            reply: {
                id: "mnp_helpline",
                title: "MNP Helpline"
            }
        }
    ];

    const params = {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "button",
            body: {
                text: (language === 'bangla') 
                    ? "এমএনপি সম্পর্কিত তথ্যের জন্য একটি অপশন নির্বাচন করুনঃ" 
                    : "Please select an option for MNP information:"
            },
            action: {
                buttons
            }
        }
    };

    sendWhatsAppMessage(params);
}

function helplineOptions(to, language = 'english') {
    const buttons = (language === 'bangla') ? [
        {
            type: "reply",
            reply: {
                id: "btrc_helpline",
                title: "বিটিআরসি হেল্পলাইন"
            }
        },
        {
            type: "reply",
            reply: {
                id: "mobile_operator_helpline",
                title: "মোবাইল অপারেটর হেল্পলাইন"
            }
        }
    ] : [
        {
            type: "reply",
            reply: {
                id: "btrc_helpline",
                title: "BTRC Helpline"
            }
        },
        {
            type: "reply",
            reply: {
                id: "mobile_operator_helpline",
                title: "Mobile Operator Helpline"
            }
        }
    ];

    const params = {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "button",
            body: {
                text: (language === 'bangla') 
                    ? "হেল্পলাইন সম্পর্কিত তথ্যের জন্য অপশন নির্বাচন করুনঃ" 
                    : "Please select an option for Helpline:"
            },
            action: {
                buttons
            }
        }
    };

    sendWhatsAppMessage(params);
}

function mobileOperatorHelpline(to, language = 'english') {
    const isBangla = (language === 'bangla');

    const params = {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "list",
            header: {
                type: "text",
                text: isBangla ? "মোবাইল অপারেটর হেল্পলাইন" : "Mobile Operator Helpline"
            },
            body: {
                text: isBangla
                    ? "হেল্পলাইন পেতে নিচের অপশন থেকে একটি নির্বাচন করুন:"
                    : "Please select a mobile operator to get its helpline:"
            },
            footer: {
                text: isBangla ? "বিটিআরসি হেল্পডেস্ক" : "BTRC Helpdesk"
            },
            action: {
                button: isBangla ? "অপশন নির্বাচন করুন" : "Choose Option",
                sections: [
                    {
                        title: isBangla ? "মোবাইল অপারেটর" : "Mobile Operators",
                        rows: [
                            {
                                id: "gp_helpline",
                                title: isBangla ? "গ্রামীণফোন হেল্পলাইন" : "Grameenphone Helpline",
                                description: ""
                            },
                            {
                                id: "robi_helpline",
                                title: isBangla ? "রবির হেল্পলাইন" : "Robi Helpline",
                                description: ""
                            },
                            {
                                id: "banglalink_helpline",
                                title: isBangla ? "বাংলালিংক হেল্পলাইন" : "Banglalink Helpline",
                                description: ""
                            },
                            {
                                id: "teletalk_helpline",
                                title: isBangla ? "টেলিটক হেল্পলাইন" : "Teletalk Helpline",
                                description: ""
                            }
                        ]
                    }
                ]
            }
        }
    };

    sendWhatsAppMessage(params);
}

       

// ✅ Start server
app.listen(PORT, () => console.log(`🚀 WhatsApp Webhook server running on port ${PORT}`));
