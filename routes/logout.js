const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");  // Import the middleware for token verification

// Logout endpoint (no specific logic needed for JWT)
router.post("/logout", verifyToken, (req, res) => {
  // If the user is authenticated, send the logout response
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized, you are not logged in" });
  }

  // Respond with a message about logging out
  res.status(200).json({
    message: "Successfully logged out",
    tip: "Simply remove the token from your local storage or cookies to log out.",
  });
});

module.exports = router;
