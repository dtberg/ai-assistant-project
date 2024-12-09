const { OpenAI } = require('openai');

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Store threads in memory (for development purposes)
const threads = new Map();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, userId } = req.body;
        const threadId = threads.get(userId) || (await openai.beta.threads.create()).id;
        threads.set(userId, threadId);

        // Add the user's message to the thread
        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: message
        });

        // Run the assistant
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: 'asst_CDZBQ7HD8CqwIT0Fp61vcUhD'
        });

        // Wait for the assistant to complete its response
        let runStatus;
        do {
            runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
            if (runStatus.status === 'failed') {
                throw new Error('Assistant run failed');
            }
            if (runStatus.status !== 'completed') {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } while (runStatus.status !== 'completed');

        // Get the messages
        const messages = await openai.beta.threads.messages.list(threadId);
        const response = messages.data[0].content[0].text.value;

        res.status(200).json({ response });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
}
