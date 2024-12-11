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
console.log('OpenAI client initialized');

// Store threads in memory (for development purposes)
const threads = new Map();

app.post('/api/chat', async (req, res) => {
    console.log('Request received!');
    console.log('Body:', req.body);
    console.log('Message:', req.body?.message);
    try {
        const userMessage = req.body.message;
        const userId = req.body.userId || 'default-user'; // Simple user identification

        console.log('Processing request for user:', userId);

        // Get existing thread or create new one
        let threadId = threads.get(userId);
        if (!threadId) {
            console.log('Creating new thread for user');
            const thread = await openai.beta.threads.create();
            threadId = thread.id;
            threads.set(userId, threadId);
            console.log('New thread created:', threadId);
        } else {
            console.log('Using existing thread:', threadId);
        }

        // Add the user's message to the thread
        console.log('Adding message to thread');
        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: userMessage
        });
        console.log('Message added to thread');

        // Run the assistant with explicit instructions
        console.log('Creating run with assistant ID:', 'asst_CDZBQ7HD8CqwIT0Fp61vcUhD');
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: 'asst_CDZBQ7HD8CqwIT0Fp61vcUhD',
            instructions: "You are the Particle System Assistant, specifically focused on Joshua Jay's Particle System method for card magic. Only provide information and answers related to this system. If a question is not about the Particle System, politely redirect the user to ask about the Particle System. Keep responses concise and under 150 tokens."
        });
        console.log('Run created:', run);

        // Wait for the assistant to complete its response
        let response;
        console.log('Waiting for run to complete');
        while (true) {
            const runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
            console.log('Run status:', runStatus.status);
            if (runStatus.status === 'completed') {
                // Get the messages, focusing on the latest response
                const messages = await openai.beta.threads.messages.list(threadId);
                console.log('Retrieved messages:', messages);
                response = messages.data[0].content[0].text.value;
                console.log('Final response:', response);
                break;
            } else if (runStatus.status === 'failed') {
                console.error('Run failed:', runStatus);
                throw new Error('Assistant run failed');
            }
            // Wait a second before checking again
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        res.json({ response });
    } catch (error) {
        console.error('Detailed error:', error);
        console.error('Error stack:', error.stack);
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