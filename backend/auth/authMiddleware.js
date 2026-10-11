const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access denied. No token provided."
    });
  }

  const token = authHeader.slice(7);

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY
    );

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        message: "Invalid or expired token"
      });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email
    };

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