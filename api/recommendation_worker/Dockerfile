# api/recommendation_worker/Dockerfile

# We specify the platform to ensure consistency
FROM --platform=linux/amd64 public.ecr.aws/lambda/python:3.11

# --- NEW STEP ---
# Install the GCC compiler and other build tools needed for numpy/scikit-learn.
# We run this BEFORE pip install.
RUN yum install -y gcc gcc-c++

# Copy requirements first to leverage Docker layer caching
COPY requirements.txt ${LAMBDA_TASK_ROOT}/

# Install Python dependencies (this will now succeed)
RUN pip install --no-cache-dir -r requirements.txt

# Copy the handler code
COPY handler.py ${LAMBDA_TASK_ROOT}/

# Set the command to our handler function
CMD [ "handler.handler" ]