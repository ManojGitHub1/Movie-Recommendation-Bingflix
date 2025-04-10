# Use an official lightweight Python image.
FROM python:3.12-slim

# Set environment variables
# Prevents Python from writing pyc files to disc (optional)
ENV PYTHONDONTWRITEBYTECODE 1
# Ensures Python output is sent straight to terminal (useful for logging)
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY api/python/requirements.txt .

# Install dependencies
# --no-cache-dir reduces image size
# --default-timeout=100 increases timeout for potentially slow downloads
RUN pip install --no-cache-dir --default-timeout=100 -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Expose the port the app runs on.
# Cloud Run expects the container to listen on the port defined by the PORT env var ($PORT), which defaults to 8080.
# Gunicorn will bind to 0.0.0.0:$PORT. Exposing 8080 here is mostly informational.
EXPOSE 8080

# Define the command to run the application
# Gunicorn is a production-ready WSGI server.
# 'update_recommendations:app' means run the 'app' object (our Flask app) from the 'update_recommendations.py' file.
# '0.0.0.0:${PORT}' tells Gunicorn to listen on all available network interfaces inside the container
# on the port specified by the PORT environment variable (provided by Cloud Run).
CMD gunicorn --bind "0.0.0.0:${PORT}" api.python.update_recommendations:app