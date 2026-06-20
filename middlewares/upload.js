const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("✅ UPLOAD MIDDLEWARE LOADED");
console.log(`   Cloudinary Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);

// Cloudinary Storage Configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    console.log("📤 CLOUDINARY STORAGE PARAMS CALLED");
    console.log("   File:", file.originalname);
    console.log("   MIME Type:", file.mimetype);
    
    return {
      folder: "billiblogger",
      resource_type: "auto", // Handles images, videos, raw files
      public_id: Date.now() + "_" + file.originalname.split(".")[0],
    };
  },
});

// Multer upload configuration
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    console.log("🔍 FILE FILTER CHECK");
    console.log("   Original Name:", file.originalname);
    console.log("   MIME Type:", file.mimetype);
    
    // Accept images only
    if (file.mimetype.startsWith("image/")) {
      console.log("✅ File accepted - is an image");
      cb(null, true);
    } else {
      console.log("❌ File rejected - not an image");
      cb(new Error("Only image files are allowed. Received: " + file.mimetype), false);
    }
  },
});

// Wrapper to catch multer errors properly
const uploadWithErrorHandling = (fieldName) => {
  return (req, res, next) => {
    console.log(`\n📤 UPLOAD MIDDLEWARE INVOKED FOR FIELD: ${fieldName}`);
    
    const singleUpload = upload.single(fieldName);
    
    singleUpload(req, res, (err) => {
      if (err) {
        console.error(`❌ UPLOAD ERROR for ${fieldName}:`, err.message);
        return res.status(400).json({ 
          error: err.message || "File upload failed" 
        });
      }
      
      if (req.file) {
        console.log(`✅ FILE UPLOADED SUCCESSFULLY to Cloudinary`);
        console.log("   File Details:");
        console.log("     - Filename:", req.file.filename);
        console.log("     - Secure URL:", req.file.secure_url);
        console.log("     - Public ID:", req.file.public_id);
        console.log("     - Size:", req.file.size, "bytes");
      } else {
        console.log(`⚠️  No file uploaded for field: ${fieldName}`);
      }
      
      next();
    });
  };
};

module.exports = uploadWithErrorHandling;
