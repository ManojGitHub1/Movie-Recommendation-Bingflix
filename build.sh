#!/bin/bash

# This script contains the logic for the unified build process.
# It will be executed by CodeBuild.

set -e # Exit immediately if any command fails

echo "--- Build Script Started ---"

echo "Detecting changed files..."
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD)
echo "Changed files: $CHANGED_FILES"

# --- Change Detection Logic ---
DEPLOY_NODE_API=false
if echo "$CHANGED_FILES" | grep -qE "api/index.js|api/controllers/|api/routes/|api/middleware/|api/lambda.js|api/package.json"; then
  echo "Node.js API changes detected."
  DEPLOY_NODE_API=true
else
  echo "No Node.js API changes detected."
fi

DEPLOY_PYTHON_WORKER=false
if echo "$CHANGED_FILES" | grep -q "api/recommendation_worker/"; then
  echo "Python worker changes detected."
  DEPLOY_PYTHON_WORKER=true
else
  echo "No Python worker changes detected."
fi

# --- Conditional Build: Node.js API ---
if [ "$DEPLOY_NODE_API" = "true" ]; then
  echo "--- Building Node.js API ---"
  cd api
  npm install --production
  zip -r ../node_api_package.zip .
  cd ..
  echo "Node.js API build complete."
fi

# --- Conditional Build: Python Worker ---
if [ "$DEPLOY_PYTHON_WORKER" = "true" ]; then
  echo "--- Building Python Worker ---"
  echo "Logging in to Amazon ECR..."
  aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
  echo "Building and tagging the Docker image..."
  docker build -t $PYTHON_WORKER_IMAGE_REPO_NAME:$PYTHON_WORKER_IMAGE_TAG -f api/recommendation_worker/Dockerfile ./api/recommendation_worker
  docker tag $PYTHON_WORKER_IMAGE_REPO_NAME:$PYTHON_WORKER_IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$PYTHON_WORKER_IMAGE_REPO_NAME:$PYTHON_WORKER_IMAGE_TAG
  echo "Pushing Docker image to ECR..."
  docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$PYTHON_WORKER_IMAGE_REPO_NAME:$PYTHON_WORKER_IMAGE_TAG
  
  echo "Creating imagedefinitions.json file for CodePipeline deployment..."
  printf '[{"name":"%s","imageUri":"%s"}]' "$PYTHON_WORKER_LAMBDA_FUNCTION_NAME" "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$PYTHON_WORKER_IMAGE_REPO_NAME:$IMAGE_TAG" > imagedefinitions.json
  
  echo "Python Worker build complete."
fi

# --- Final Check ---
if [ "$DEPLOY_NODE_API" = "false" ] && [ "$DEPLOY_PYTHON_WORKER" = "false" ]; then
  echo "No relevant changes detected. Skipping build."
fi

echo "--- Build Script Finished ---"