// api/lambda.js
const serverless = require('serverless-http');
const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');
const app = require('./index'); // This imports your main express app from index.js

// This function fetches all necessary configuration from SSM Parameter Store.
const loadSecrets = async () => {
    const ssmClient = new SSMClient({ region: process.env.AWS_REGION });
    
    // Create the command to fetch all three parameters.
    const command = new GetParametersCommand({
        Names: [
            '/bingflix/prod/JWT_SECRET', 
            '/bingflix/prod/TMDB_API_KEY', 
            '/bingflix/prod/SQS_QUEUE_URL' // Added the new SQS queue URL parameter
        ],
        WithDecryption: true, // This is required to decrypt SecureString parameters
    });

    try {
        const { Parameters } = await ssmClient.send(command);
        
        // Basic validation to ensure we received parameters.
        if (!Parameters || Parameters.length === 0) {
            throw new Error("Could not retrieve any secrets from Parameter Store.");
        }
        
        // Loop through the returned parameters and set them as environment variables.
        // The rest of our application (controllers, etc.) can then access them via process.env.
        Parameters.forEach((p) => {
            if (p.Name === '/bingflix/prod/JWT_SECRET') {
                process.env.JWT_SECRET = p.Value;
            } else if (p.Name === '/bingflix/prod/TMDB_API_KEY') {
                process.env.TMDB_API_KEY = p.Value;
            } else if (p.Name === '/bingflix/prod/SQS_QUEUE_URL') {
                process.env.SQS_QUEUE_URL = p.Value;
            }
        });
        
        console.log("Successfully loaded secrets from SSM Parameter Store.");

    } catch (error) {
        console.error("FATAL: Failed to load secrets from SSM:", error);
        // If we can't load secrets, the application cannot run. Exit the process.
        // Lambda will see this as a failed invocation.
        process.exit(1); 
    }
};

// This is the main handler function that AWS Lambda will invoke.
const handler = async (event, context) => {
    // For debugging: Log the incoming event from API Gateway.
    // console.log("RECEIVED EVENT:", JSON.stringify(event, null, 2));

    // Lambda can reuse execution environments ("warm starts").
    // We check if the secrets are already loaded. If not (a "cold start"), we load them.
    // This prevents making unnecessary API calls to SSM on every single invocation.
    if (!process.env.JWT_SECRET || !process.env.SQS_QUEUE_URL) {
        await loadSecrets();
    }
    
    // The serverless-http library wraps our Express app, making it compatible with Lambda events.
    // Because we use the {proxy+} integration in API Gateway, we don't need any special base path options.
    const expressHandler = serverless(app);

    // Pass the event and context to the wrapped Express app and return its response.
    return expressHandler(event, context);
};

// Export the handler for AWS Lambda to use.
module.exports.handler = handler;