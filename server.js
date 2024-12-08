const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Store threads in memory (for development purposes)
const threads = new Map();

app.post('/chat', async (req, res) => {
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

        // Run the assistant
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: 'asst_CDZBQ7HD8CqwIT0Fp61vcUhD'
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
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
