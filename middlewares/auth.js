const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized, no token provided" });
  }

  // Bearer token format
  const tokenWithoutBearer = token.split(" ")[1];

  jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Unauthorized, invalid token" });
    }
    req.user = decoded;
    next();
  });
};

const optionalVerifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return next();
  }

  const tokenWithoutBearer = token.split(" ")[1];

  jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Unauthorized, invalid token" });
    }
    req.user = decoded;
    next();
  });
};

module.exports = { verifyToken, optionalVerifyToken };
