const express = require("express");
const router = express.Router();
const { registerUser, loginUser } = require("../controllers/authController");

// Register new user (first user = Admin, others need referral code)
router.post("/register", registerUser);

// Login existing user
router.post("/login", loginUser);

module.exports = router;
