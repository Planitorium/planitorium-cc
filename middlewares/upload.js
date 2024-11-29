// const multer = require('multer');
// const GridFsStorage = require('multer-gridfs-storage');
// const mongoose = require('mongoose');

// // Ensure the MongoDB connection is ready before defining the storage
// const storage = new GridFsStorage({
//   db: mongoose.connection, // Reuse the mongoose connection
//   file: (req, file) => {
//     return {
//       bucketName: 'uploads',  // Specify the bucket name
//       filename: `${Date.now()}_${file.originalname}`  // Generate a unique file name
//     };
//   }
// });

// // Create the multer instance with the storage engine
// const upload = multer({ storage });

// module.exports = upload;
