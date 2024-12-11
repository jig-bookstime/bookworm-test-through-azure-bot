// const path = require("path");
// const ENV_FILE = path.join(__dirname, ".env");
// require("dotenv").config({path: ENV_FILE});

const restify = require("restify");

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const {
    CloudAdapter,
    ConfigurationServiceClientCredentialFactory,
    createBotFrameworkAuthenticationFromConfiguration,
} = require("botbuilder");

// This bot's main dialog.
// const {EchoBot} = require("./bot");
const {OpenAIBot} = require("./bot");

// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.listen(process.env.PORT || 3978, () => {
    console.log(`\n${server.name} listening to ${server.url}`);
    // console.log(
    //     "\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator"
    // );
    // console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: process.env.MicrosoftAppId,
    MicrosoftAppPassword: process.env.MicrosoftAppPassword,
    MicrosoftAppType: process.env.MicrosoftAppType,
    MicrosoftAppTenantId: process.env.MicrosoftAppTenantId,
});

const botFrameworkAuthentication =
    createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about adapters.
const adapter = new CloudAdapter(botFrameworkAuthentication);

// Catch-all for errors.
const onTurnErrorHandler = async (context, error) => {
    console.error(`\n [onTurnError] unhandled error: ${error}`);

    await context.sendTraceActivity(
        "OnTurnError Trace",
        `${error}`,
        "https://www.botframework.com/schemas/error",
        "TurnError"
    );

    // Send a message to the user
    await context.sendActivity("The bot encountered an error or bug.");
    await context.sendActivity(
        "To continue to run this bot, please fix the bot source code."
    );
};

// Set the onTurnError for the singleton CloudAdapter.
adapter.onTurnError = onTurnErrorHandler;

// const myBot = new EchoBot();
const myBot = new OpenAIBot();

// Listen for incoming requests.
server.post("/api/messages", async (req, res) => {
    await adapter.process(req, res, (context) => myBot.run(context));
});

// Health check endpoint
server.get("/health", async (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
    });
});

// Listen for Upgrade requests for Streaming.
server.on("upgrade", async (req, socket, head) => {
    // Create an adapter scoped to this WebSocket connection to allow storing session data.
    const streamingAdapter = new CloudAdapter(botFrameworkAuthentication);

    // Set onTurnError for the CloudAdapter created for each connection.
    streamingAdapter.onTurnError = onTurnErrorHandler;

    await streamingAdapter.process(req, socket, head, (context) =>
        myBot.run(context)
    );
});
