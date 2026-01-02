FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV PORT=8000

# Run the application using python -m to ensure the package is recognized
CMD python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT
