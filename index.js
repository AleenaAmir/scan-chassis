require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { ImageAnnotatorClient } = require("@google-cloud/vision");


const app = express();
const PORT = process.env.PORT || 3000;

/* -------------------------------------------------------------
   Ensure upload directory exists
------------------------------------------------------------- */
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/* -------------------------------------------------------------
   Multer (Memory Storage)
------------------------------------------------------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const valid =
      allowed.test(path.extname(file.originalname).toLowerCase()) &&
      allowed.test(file.mimetype);
    valid ? cb(null, true) : cb(new Error("Only image files allowed!"));
  },
});

/* -------------------------------------------------------------
   Load Google Vision Client
------------------------------------------------------------- */
function loadVisionClient() {
  try {
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentials) throw new Error("GOOGLE_APPLICATION_CREDENTIALS missing");

    let config = { projectId: process.env.GOOGLE_CLOUD_PROJECT_ID };
    let cleaned = credentials.trim().replace(/^"""|"""$/g, "").replace(/^"|"$/g, "");

    if (cleaned.startsWith("{")) {
      config.credentials = JSON.parse(cleaned.replace(/\\n/g, "\n"));
      console.log("Using inline JSON credentials");
    } else {
      const absPath = path.isAbsolute(cleaned)
        ? cleaned
        : path.join(__dirname, cleaned);
      if (!fs.existsSync(absPath)) throw new Error("Credentials file not found");
      config.keyFilename = absPath;
      console.log("Using credentials file:", absPath);
    }

    console.log("Google Vision client initialized");
    return new ImageAnnotatorClient(config);
  } catch (err) {
    console.error("Vision Client Error:", err.message);
    return null;
  }
}

const visionClient = loadVisionClient();

/* -------------------------------------------------------------
   Extract Chassis / VIN Number from text
------------------------------------------------------------- */
function extractChassisNumber(text) {
  if (!text) return null;

  const clean = text.replace(/\s+/g, " ").trim();

  // 17-character VIN
  const vin = clean.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i);
  if (vin) return vin[0].toUpperCase();

  // Chassis with spaces/hyphens
  const spaced = clean.match(/([A-Z0-9]{2,4}[\s-]?){3,6}[A-Z0-9]{2,4}/i);
  if (spaced) {
    const compact = spaced[0].replace(/[\s-]/g, "").toUpperCase();
    if (compact.length >= 8 && compact.length <= 17) return compact;
  }

  // General 8–17 alphanumeric pattern
  const generalMatches = clean.match(/\b[A-Z0-9]{8,17}\b/gi) || [];
  for (const match of generalMatches) {
    const m = match.toUpperCase();
    if (/^\d+$/.test(m)) continue; // reject pure numbers
    if (!/[A-Z]/.test(m)) continue; // must include a letter
    if (/^\d{8}$/.test(m)) continue; // reject YYYYMMDD
    return m;
  }

  return null;
}

/* -------------------------------------------------------------
   Multer Error Handler
------------------------------------------------------------- */
function multerErrorHandler(err, req, res, next) {
  if (!err) return next();
  
  let msg = "Upload error";
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      msg = "File too large. Max 10MB.";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      msg = `Unexpected field: ${err.field}. You can use any field name (image, file, photo, etc.)`;
    } else {
      msg = err.message || "Upload error";
    }
  } else {
    msg = err.message || "Upload error";
  }

  return res.status(400).json({ success: false, error: msg });
}

/* -------------------------------------------------------------
    OCR Route
 ------------------------------------------------------------- */
 app.post(
   "/api/extract-chassis",
   upload.any(),
   multerErrorHandler,
   async (req, res) => {
     try {
       if (!req.files || req.files.length === 0)
         return res.status(400).json({
           success: false,
           error: "No image uploaded",
         });

       const file = req.files[0];

      if (!visionClient)
        return res.status(500).json({
          success: false,
          error: "Vision API not configured",
        });

       console.log("Running OCR...");

       const [result] = await visionClient.textDetection(file.buffer);
       const text = result?.textAnnotations?.[0]?.description || "";

       if (!text)
         return res.status(400).json({
           success: false,
           error: "No text detected in image",
         });

       console.log("OCR Text:", text.substring(0, 150), "...");

      const chassis = extractChassisNumber(text);

      if (!chassis) {
        return res.status(200).json({
          success: false,
          message: "Chassis number not found",
          extractedText: text.substring(0, 400),
        });
      }

      // Save image only when chassis number is successfully extracted
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(
        file.originalname
      )}`;
      const savePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(savePath, file.buffer);
    

      return res.json({
        success: true,
        chassisNumber: chassis,
        imageName: fileName,
        message: "Chassis number extracted successfully and image saved",
      });
    } catch (err) {
      console.error("Processing Error:", err.message);
      res.status(500).json({
        success: false,
        error: "Failed to process image: " + err.message,
      });
    }
  }
);

/* -------------------------------------------------------------
   Health Route
------------------------------------------------------------- */
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

/* -------------------------------------------------------------
   Start Server
------------------------------------------------------------- */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Server accessible from external IP`);
});
