FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libopenblas-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies with OpenBLAS support
COPY requirements.txt .
RUN CMAKE_ARGS="-DGGML_BLAS=ON -DGGML_BLAS_VENDOR=OpenBLAS" pip install --no-cache-dir -r requirements.txt

# Create data directories
RUN mkdir -p /app/data/receipts /app/models

RUN cd /app/models && \
    # Main Model (Gemma 3 4B QAT Q4_0 from Bartowski)
    curl -L -o google_gemma-3-4b-it-qat-Q4_0.gguf "https://huggingface.co/bartowski/google_gemma-3-4b-it-qat-GGUF/resolve/main/google_gemma-3-4b-it-qat-Q4_0.gguf?download=true" && \
    # Vision Projector (mmproj from Bartowski)
    curl -L -o mmproj-google_gemma-3-4b-it-f16.gguf "https://huggingface.co/bartowski/google_gemma-3-4b-it-GGUF/resolve/main/mmproj-google_gemma-3-4b-it-f16.gguf?download=true"

# Copy application code
COPY app ./app

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
