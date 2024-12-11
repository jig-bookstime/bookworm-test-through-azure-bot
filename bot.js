const {ActivityHandler, MessageFactory} = require("botbuilder");
const {OpenAI} = require("openai");

class OpenAIBot extends ActivityHandler {
    constructor() {
        super();

        // Initialize OpenAI client
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY, // OpenAI API key from .env
        });

        // Initialize an object to track conversation history for each user
        this.conversations = {};

        // Handle incoming messages
        this.onMessage(async (context, next) => {
            const userMessage = context.activity.text;
            const userId = context.activity.from.id; // Get user ID to store their conversation context

            try {
                // Retrieve the conversation history for the user, or initialize it if not exists
                let conversationHistory = this.conversations[userId] || [];

                // If conversation is starting, add a system message to provide context to OpenAI
                if (conversationHistory.length === 0) {
                    const systemMessage = {
                        role: "system",
                        content:
                            "You are an intelligent assistant bot, named BookWorm, at the company BooksTime. You can assist bookkeepers, senior accountants, IT department, Senior Mangers and client service advisors with their queries to the best of your ability. You can provide sales support and management insights. You can advise staffs at BooksTime, a bookkeeping company, and answer their questions, and help them draft emails",
                    };
                    conversationHistory.push(systemMessage); // Add initial system context
                }

                // Append the new user message to the conversation history
                conversationHistory.push({role: "user", content: userMessage});

                // If the length of conversation history exceeds 10, remove the first element
                if (conversationHistory.length > 10) {
                    conversationHistory.shift(); // Removes the first (oldest) message
                }

                // Get the reply from OpenAI
                const replyText = await this.getOpenAIResponse(
                    conversationHistory
                );

                // Save the bot's response in the conversation history
                conversationHistory.push({
                    role: "assistant",
                    content: replyText,
                });

                // Update the conversation history for the user
                this.conversations[userId] = conversationHistory;

                // Send the OpenAI response back to the user
                await context.sendActivity(
                    MessageFactory.text(replyText, replyText)
                );
            } catch (error) {
                console.error(
                    "Error while getting response from OpenAI:",
                    error
                );
                await context.sendActivity(
                    "Sorry, I couldn't process your request at the moment."
                );
            }

            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText =
                "Hello BooksTimer! I am BookWorm, an Intelligent Conversational Chatbot.\nHow can I help you today?";

            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(
                        MessageFactory.text(welcomeText, welcomeText)
                    );
                }
            }

            await next();
        });
    }

    // Function to get response from OpenAI
    async getOpenAIResponse(conversationHistory) {
        try {
            const response = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL,
                messages: conversationHistory, // Pass the entire conversation history
            });

            // console.log(response);

            // Return the bot's response (assistant's message)
            return response.choices[0].message.content;
        } catch (error) {
            throw new Error(`OpenAI API error: ${error.message}`);
        }
    }
}

module.exports.OpenAIBot = OpenAIBot;
