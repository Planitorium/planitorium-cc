const jwt = require("jsonwebtoken");

// Fungsi untuk memverifikasi token
const verifyJWT = (token, callback) => {
  // Memverifikasi token dengan secret dari environment variable
  jwt.verify(token, process.env.JWT_SECRET, callback);
};

const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(401).json({
      error: true,
      message: "Unauthorized, no token provided",
    });
  }

  // Hapus prefix 'Bearer' dari token
  const tokenWithoutBearer = token.split(" ")[1];

  // Verifikasi token
  verifyJWT(tokenWithoutBearer, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        error: true,
        message: "Unauthorized, invalid token",
      });
    }
    req.user = decoded; // Simpan informasi pengguna ke request object
    next(); // Lanjutkan ke route handler berikutnya
  });
};

const optionalVerifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return next(); // Lanjutkan jika tidak ada token
  }

  // Hapus prefix 'Bearer' dari token
  const tokenWithoutBearer = token.split(" ")[1];

  // Verifikasi token
  verifyJWT(tokenWithoutBearer, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        error: true,
        message: "Unauthorized, invalid token",
      });
    }
    req.user = decoded; // Simpan informasi pengguna ke request object
    next(); // Lanjutkan ke route handler berikutnya
  });
};

module.exports = { verifyToken, optionalVerifyToken };
