// api/lambda.js
const serverless = require('serverless-http');
const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');
const app = require('./index');

// This function fetches secrets from SSM Parameter Store
const loadSecrets = async () => {
    const ssmClient = new SSMClient({ region: process.env.AWS_REGION });
    const command = new GetParametersCommand({
        Names: ['/bingflix/prod/JWT_SECRET', '/bingflix/prod/TMDB_API_KEY'],
        WithDecryption: true,
    });

    try {
        const { Parameters } = await ssmClient.send(command);
        if (!Parameters || Parameters.length === 0) {
            throw new Error("Could not retrieve secrets from Parameter Store.");
        }
        
        Parameters.forEach((p) => {
            // Set the environment variables for the application to use
            if (p.Name === '/bingflix/prod/JWT_SECRET') {
                process.env.JWT_SECRET = p.Value;
            } else if (p.Name === '/bingflix/prod/TMDB_API_KEY') {
                process.env.TMDB_API_KEY = p.Value;
            }
        });
        console.log("Successfully loaded secrets.");
    } catch (error) {
        console.error("Failed to load secrets from SSM:", error);
        // In a real app, you might want to handle this more gracefully, but for now, we'll let it fail hard.
        process.exit(1); 
    }
};

const serverlessOptions = {
    // This tells the wrapper that the base path for our Express app
    // is everything AFTER the stage name in the URL.
    base: 'default' 
};

// Create a wrapper handler
const handler = async (event, context) => {
    // You can keep this for debugging your first few requests
    console.log("RECEIVED EVENT:", JSON.stringify(event, null, 2));

    if (!process.env.JWT_SECRET) {
        await loadSecrets();
    }
    
    // NO MORE OPTIONS NEEDED. The {proxy+} route handles everything.
    const expressHandler = serverless(app);

    return expressHandler(event, context);
};

module.exports.handler = handler;