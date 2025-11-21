# VIN/Chassis Number Scanner API

Node.js API to extract VIN/Chassis numbers from images using Google Cloud Vision API.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Google Cloud Vision API:
   - Enable Cloud Vision API in Google Cloud Console
   - Create Service Account and download JSON key
   - Save credentials as `google-credentials.json`

3. Create `.env` file:
```env
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id
PORT=3000
```

## Usage

Start server:
```bash
npm run dev
```

**POST** `/api/extract-chassis`
- Upload image file (any field name: `image`, `file`, `photo`, etc.)
- Returns chassis number if found, image saved to `uploads/` folder

**GET** `/health`
- Server status check
