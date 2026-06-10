const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary configuration error: Missing environment variables');
} else {
  console.log('✅ Cloudinary configured for:', process.env.CLOUDINARY_CLOUD_NAME);
}

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'varta_chat',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }], // Optimization
  },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
