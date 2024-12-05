const multer = require('multer');
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const crypto = require('crypto');
const path = require('path');

// Inisialisasi GridFS
let gfs, gridfsBucket;

mongoose.connection.once("open", () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "photos",  // Ubah bucket name sesuai dengan kebutuhan Anda
  });
  gfs = Grid(mongoose.connection.db, mongoose.mongo);
  gfs.collection("photos");  // Tentukan koleksi GridFS yang digunakan
});

// Konfigurasi Multer untuk menyimpan file di memory buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload;