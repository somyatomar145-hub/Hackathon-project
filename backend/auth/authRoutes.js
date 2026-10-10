const express = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const router = express.Router();

router.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password required"
        });
    }

    // Temporary test login
    if (
        email === "manager@revops.com" &&
        password === "Test@123"
    ) {
        const token = jwt.sign(
            { email, role: "manager" },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.json({
            message: "Login successful",
            token
        });
    }

    res.status(401).json({
        message: "Invalid credentials"
    });
});


const verifyToken = require("./authMiddleware");

router.get("/dashboard", verifyToken, (req, res) => {
    res.json({
        message: "Welcome to RevOps Dashboard!",
        user: req.user
    });
});

module.exports = router;