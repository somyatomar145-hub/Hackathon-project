const jwt = require("jsonwebtoken");
require("dotenv").config();

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Access denied. No token provided."
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

       if (decoded.role !== "manager") {
    return res.status(403).json({
        message: "Access denied. Manager role required."
    });
}

req.user = decoded;
next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

module.exports = verifyToken;