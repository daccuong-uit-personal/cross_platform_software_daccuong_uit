FROM python:3.11-slim

# Install system dependencies (ffmpeg)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY apps/media-worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/media-worker/ .

CMD ["python", "main.py"]
