# We specify the platform to ensure consistency between local builds (e.g., on Mac M1) and AWS Lambda (x86_64)
FROM --platform=linux/amd64 public.ecr.aws/lambda/python:3.11

# Copy requirements first to leverage Docker layer caching
COPY requirements.txt ${LAMBDA_TASK_ROOT}/

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the handler code
COPY handler.py ${LAMBDA_TASK_ROOT}/

# Set the command to our handler function
CMD [ "handler.handler" ]