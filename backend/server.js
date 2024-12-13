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

// Store threads and sessions in memory
const threads = new Map();
const newSessions = new Map();

app.post('/api/chat', async (req, res) => {
    console.log('Request received!');
    console.log('Body:', req.body);
    console.log('Message:', req.body?.message);
    try {
        const userMessage = req.body.message;
        const userId = req.body.userId || 'default-user';

        // Check if this is the user's first message
        if (!newSessions.has(userId)) {
            console.log('New session detected for user:', userId);
            newSessions.set(userId, true);

            // Create new thread
            const thread = await openai.beta.threads.create();
            const threadId = thread.id;
            threads.set(userId, threadId);

            // Send welcome message instead of processing user message
const welcomeRun = await openai.beta.threads.runs.create(threadId, {
        assistant_id: 'asst_CDZBQ7HD8CqwIT0Fp61vcUhD',
        instructions: `Provide a welcoming initial message specifically about Joshua Jay's Particle System for card magic.
        Explain that you are an assistant dedicated to helping users learn and master this specific card stack system.

        Include 2-3 example questions like:
        - "What's the first card in the stack?"
        - "Show me the first five cards"
        - "What card is in position 25?"

        Make it clear this is about a memorized deck system for card magic, not about particle physics or computer graphics.
        Format the message with clear line breaks and proper spacing.`
        });

            // Wait for welcome message
            while (true) {
                const runStatus = await openai.beta.threads.runs.retrieve(threadId, welcomeRun.id);
                if (runStatus.status === 'completed') {
                    const messages = await openai.beta.threads.messages.list(threadId);
                    const welcomeResponse = messages.data[0].content[0].text.value;
                    return res.json({ response: welcomeResponse });
                } else if (runStatus.status === 'failed') {
                    throw new Error('Welcome message generation failed');
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

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
            instructions: `You are the Particle System Assistant, specifically focused on Joshua Jay's Particle System method for card magic.

            When listing ANY cards, you MUST:
            1. Put each card on its own line with a line break
            2. Use a numbered list format
            3. Include both shorthand and full name for each card
            4. Format each line exactly as: "1. AH (Ace of Hearts)"
            5. Add a line break between entries

            Example of correct formatting:
            1. AH (Ace of Hearts)
            2. KS (King of Spades)
            3. AD (Ace of Diamonds)

            NEVER list cards horizontally or with commas. Always use vertical formatting with line breaks.

            Keep responses concise and under 150 tokens unless showing a list of cards.
            If a question is not about the Particle System, politely redirect the user to ask about the Particle System.`
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