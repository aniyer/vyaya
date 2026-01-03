# Vyaya

A self-hosted, mobile-first web application for receipt management and expense tracking.

![Vyaya Dashboard](docs/dashboard-preview.png)

## Features

- 📸 **Receipt Capture**: Mobile-friendly camera integration for quick receipt scanning
- 🔍 **OCR Extraction**: Automatic extraction of vendor, date, and amount using Gemma 3 4B QAT (Local LLM)
- 📊 **Expense Dashboard**: Visualize spending trends and category breakdowns
- ✏️ **Manual Override**: Edit extracted data when OCR makes mistakes
- 🏷️ **Auto-Categorization**: Intelligent category assignment based on vendor names
- 🐳 **Self-Hosted**: Run on your own hardware with Docker

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/vyaya.git
   cd vyaya
   ```

2. Create your environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` to match your system:
   ```bash
   # Set your user/group ID for proper file permissions
   PUID=1000
   PGID=1000
   PORT=8080
   ```

4. Start the application:
   ```bash
   docker-compose up -d
   ```

5. Access Vyaya at `http://localhost:8080`

## Directory Structure

```
vyaya/
├── docker-compose.yml
├── .env                  # Your configuration
├── config/               # Database storage (auto-created)
│   └── vyaya.db
├── storage/              # Receipt images (auto-created)
│   └── *.jpg
├── backend/              # FastAPI backend
└── frontend/             # React frontend
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Port to access the web UI |
| `PUID` | `1000` | User ID for file permissions |
| `PGID` | `1000` | Group ID for file permissions |
| `OCR_ENGINE` | `gemma-3-qat` | OCR engine configuration |

### Data Persistence

All data is stored in mounted volumes:

- **Database**: `./config/vyaya.db` - SQLite database with all receipt metadata
- **Images**: `./storage/` - Original receipt images

## Usage

### Capturing Receipts

1. Navigate to the **Capture** tab
2. Use your device camera or upload an image
3. Review the extracted data
4. Make corrections if needed
5. Save the receipt

### Dashboard

The dashboard shows:
- Current month's total spending
- Month-over-month comparison
- Spending trends (last 12 months)
- Category breakdown

### Managing Receipts

- View all receipts in the **History** tab
- Click a receipt to view details
- Edit or delete receipts as needed

## Development

### Running Locally

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/receipts/upload` | Upload and process receipt |
| `GET` | `/api/receipts` | List receipts (paginated) |
| `GET` | `/api/receipts/{id}` | Get receipt details |
| `PUT` | `/api/receipts/{id}` | Update receipt |
| `DELETE` | `/api/receipts/{id}` | Delete receipt |
| `GET` | `/api/dashboard/summary` | Dashboard data |
| `GET` | `/api/dashboard/trends` | Spending trends |

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Recharts
- **Backend**: Python, FastAPI, SQLAlchemy
- **OCR**: Gemma 3 4B QAT (via llama-cpp-python + OpenBLAS)
- **Database**: SQLite
- **Deployment**: Docker, nginx

## License

MIT License - see [LICENSE](LICENSE) for details.
