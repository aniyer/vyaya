FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create data directories
RUN mkdir -p /app/data/receipts /app/models

# Download MiniCPM-V models (GGUF format)
RUN cd /app/models && \
    # Main Model (Q4_K_M) - approx 5.4GB
    curl -L -o MiniCPM-V-2_6-Q4_K_M.gguf "https://huggingface.co/bartowski/MiniCPM-V-2_6-GGUF/resolve/main/MiniCPM-V-2_6-Q4_K_M.gguf?download=true" && \
    # Vision Projector (mmproj) - required for multimodal
    curl -L -o mmproj-model-f16.gguf "https://huggingface.co/openbmb/MiniCPM-V-2_6-gguf/resolve/main/mmproj-model-f16.gguf?download=true"

# Copy application code
COPY app ./app

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
