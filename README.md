# VIN/Chassis Number Scanner API

A Node.js API that extracts Vehicle Identification Number (VIN) or Chassis Number from images using Google Cloud Vision API.

## Features

- POST endpoint to upload images and extract chassis/VIN numbers
- Automatic image storage in local `uploads/` directory
- Google Vision API integration for text extraction
- Smart VIN/chassis number detection from extracted text

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Google Cloud Vision API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Cloud Vision API
4. Create a Service Account:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Grant it the "Cloud Vision API User" role
   - Create and download a JSON key file

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
GOOGLE_APPLICATION_CREDENTIALS=./path/to/your-service-account-key.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id
PORT=3000
```

Replace:
- `./path/to/your-service-account-key.json` with the actual path to your downloaded JSON key file
- `your-project-id` with your Google Cloud project ID

## Usage

### Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### API Endpoint

**POST** `/api/extract-chassis`

Upload an image file to extract the chassis/VIN number.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: Form data with field name `image` containing the image file

**Example using curl:**
```bash
curl -X POST http://localhost:3000/api/extract-chassis \
  -F "image=@/path/to/your/image.jpg"
```

**Example using Postman:**
1. Set method to POST
2. URL: `http://localhost:3000/api/extract-chassis`
3. Body > form-data
4. Key: `image` (type: File)
5. Select your image file

**Success Response:**
```json
{
  "success": true,
  "chassisNumber": "ABC123XYZ45678901",
  "imageName": "image-1234567890-123456789.jpg",
  "message": "Chassis number extracted successfully and image saved"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

## How It Works

1. Image is uploaded via POST request
2. Image is saved to `uploads/` directory with a unique filename
3. Google Vision API extracts all text from the image
4. The API searches for VIN/chassis number patterns (typically 17 alphanumeric characters)
5. If found, returns the chassis number along with the saved image name
6. If not found, the image is still saved but returns an error message

## File Storage

All uploaded images are stored in the `uploads/` directory. The directory is automatically created when the server starts.

## Health Check

**GET** `/health`

Returns server status.

```json
{
  "status": "OK",
  "message": "Server is running"
}
```

