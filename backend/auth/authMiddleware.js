const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Step 1: Check whether token exists
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access denied. No token provided."
    });
  }

  const token = authHeader.slice(7);

  try {
    // Step 2: Connect to Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY
    );

    // Step 3: Verify the logged-in user
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        message: "Invalid or expired token"
      });
    }

    // Step 4: Check Sales Manager role
    if (data.user.app_metadata?.role !== "manager") {
      return res.status(403).json({
        message: "Access denied. Manager role required."
      });
    }

    // Step 5: Allow authorized manager
    req.user = {
      id: data.user.id,
      email: data.user.email,
      role: "manager"
    };

    // Preserve token for Supabase RLS
    req.accessToken = token;

    next();

  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(500).json({
      message: "Authentication verification failed"
    });
  }
};

module.exports = verifyToken;