const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const verifyToken = require("../auth/authMiddleware");

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    // Use the logged-in user's token so Supabase RLS applies.
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${req.accessToken}`
          }
        }
      }
    );

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    return res.json({
      total: data.length,
      customers: data
    });
  } catch (error) {
    console.error("Customer API error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch customers"
    });
  }
});

module.exports = router;