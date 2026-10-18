const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage engine configuration (stores temporarily in backend/uploads/)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Generic file filter validation
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.docx', '.csv', '.xlsx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file extension'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Property Photos & Videos Filter
const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

const ALLOWED_VIDEO_EXTS = ['.mp4', '.webm', '.mov'];
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];

const propertyMediaFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  const isImage = ALLOWED_IMAGE_EXTS.includes(ext) && (ALLOWED_IMAGE_MIMES.includes(mime) || mime.startsWith('image/'));
  const isVideo = ALLOWED_VIDEO_EXTS.includes(ext) && (ALLOWED_VIDEO_MIMES.includes(mime) || mime.startsWith('video/'));

  if (isImage || isVideo) {
    file.mediaType = isVideo ? 'video' : 'image';
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type '${ext}'. Allowed formats: JPG, PNG, WEBP for photos, and MP4, WEBM, MOV for videos.`), false);
  }
};

// Property Media Upload Middleware (Max 100MB ceiling for video; images verified to <= 10MB in controller)
const propertyMediaUpload = multer({
  storage: storage,
  fileFilter: propertyMediaFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB ceiling
  }
});

upload.propertyMediaUpload = propertyMediaUpload;
module.exports = upload;
module.exports.upload = upload;
module.exports.propertyMediaUpload = propertyMediaUpload;
