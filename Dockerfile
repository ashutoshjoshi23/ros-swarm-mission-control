# Python image use kar rahe hain
FROM python:3.9-slim

# Working directory set kar rahe hain
WORKDIR /app

# Dependencies copy aur install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pura code copy kar rahe hain
COPY . .

# Railway ka PORT environment variable use karne ke liye
ENV PORT=8000

# App start karne ki command
CMD uvicorn backend.main:app --host 0.0.0.0 --port $PORT
