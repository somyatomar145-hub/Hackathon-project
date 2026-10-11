const express = require("express");

const app = express();

app.use(express.json());

const authRoutes = require("./auth/authRoutes");

app.use("/api/auth", authRoutes);
const customerRoutes = require("./customers/customerRoutes");
app.use("/api/customers", customerRoutes);

app.listen(5001, () => {
    console.log("Server running on port 5001");
});