const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");
const { auth } = require("../middleware/auth");

const router = express.Router();
const uploadDir = path.join(__dirname, "../../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const allowedTypes = new Map([
  [".jpg", ["image/jpeg"]], [".jpeg", ["image/jpeg"]], [".png", ["image/png"]],
  [".gif", ["image/gif"]], [".webp", ["image/webp"]], [".pdf", ["application/pdf"]],
  [".doc", ["application/msword", "application/octet-stream"]],
  [".docx", ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/octet-stream"]],
  [".xls", ["application/vnd.ms-excel", "application/octet-stream"]],
  [".xlsx", ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip", "application/octet-stream"]],
  [".ppt", ["application/vnd.ms-powerpoint", "application/octet-stream"]],
  [".pptx", ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/zip", "application/octet-stream"]],
  [".txt", ["text/plain"]], [".csv", ["text/csv", "text/plain", "application/vnd.ms-excel"]],
  [".md", ["text/markdown", "text/plain"]], [".rtf", ["application/rtf", "text/rtf"]],
  [".odt", ["application/vnd.oasis.opendocument.text", "application/zip"]],
  [".ods", ["application/vnd.oasis.opendocument.spreadsheet", "application/zip"]],
  [".odp", ["application/vnd.oasis.opendocument.presentation", "application/zip"]],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, randomUUID() + path.extname(file.originalname).toLowerCase()),
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const mimes = allowedTypes.get(path.extname(file.originalname).toLowerCase());
    const valid = Boolean(mimes?.includes(file.mimetype));
    cb(valid ? null : new Error("Unsupported or mismatched file type"), valid);
  },
});

router.post("/", auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Choose a file to upload" });
  res.status(201).json({
    fileUrl: "/uploads/" + req.file.filename,
    fileName: path.basename(req.file.originalname).slice(0, 180),
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    type: req.file.mimetype.startsWith("image/") ? "image" : "file",
  });
});

router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File is larger than the 25 MB limit" });
  }
  res.status(400).json({ message: err.message || "Upload failed" });
});

module.exports = router;
