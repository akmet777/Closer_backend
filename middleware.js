const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provioded" });
    }
    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, "my_secret_word_hha");

    req.userId = decoded.userId;

    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

module.exports = { authMiddleware };
