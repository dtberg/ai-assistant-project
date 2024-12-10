const express = require('express');
console.log('Starting server...');
console.log('Express loaded');

const cors = require('cors');
console.log('CORS loaded');

const { OpenAI } = require('openai');
console.log('OpenAI loaded');

require('dotenv').config();
console.log('Environment variables loaded');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Store threads in memory (for development purposes)
const threads = new Map();

app.post('/api/chat', async (req, res) => {
    console.log('Request received!');
    console.log('Body:', req.body);
    console.log('Message:', req.body?.message);
    try {
        const userMessage = req.body.message;
        const userId = req.body.userId || 'default-user'; // Simple user identification

        // Get existing thread or create new one
        let threadId = threads.get(userId);
        if (!threadId) {
            const thread = await openai.beta.threads.create();
            threadId = thread.id;
            threads.set(userId, threadId);
        }

        // Add the user's message to the thread
        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: userMessage
        });

        // Run the assistant with max tokens limit
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: 'asst_CDZBQ7HD8CqwIT0Fp61vcUhD',
            instructions: "Please keep responses concise and under 150 tokens. Focus on clear, direct answers."
        });

        // Wait for the assistant to complete its response
        let response;
        while (true) {
            const runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
            if (runStatus.status === 'completed') {
                // Get the messages, focusing on the latest response
                const messages = await openai.beta.threads.messages.list(threadId);
                response = messages.data[0].content[0].text.value;
                break;
            } else if (runStatus.status === 'failed') {
                throw new Error('Assistant run failed');
            }
            // Wait a second before checking again
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        res.json({ response });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
console.log('About to start server on port:', PORT);

app.listen(PORT, () => {
    console.log('---------------------------');
    console.log(`Server is now running`);
    console.log(`Port: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log('---------------------------');
});