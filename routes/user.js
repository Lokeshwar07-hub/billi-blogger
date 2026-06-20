const { Router } = require("express");
const User = require('../models/user');
const upload = require("../middlewares/upload");

const router = Router();

// Signin page
router.get('/signin', (req, res) => {
    if (req.user) {
        return res.redirect('/');
    }
    return res.render("signin");
});

// Signup page
router.get('/signup', (req, res) => {
    if (req.user) {
        return res.redirect('/');
    }
    return res.render("signup");
});

// Logout
router.get('/logout', (req, res) => {
    console.log("🔓 USER LOGGED OUT");
    res.clearCookie('token').redirect('/');
});

// Signin handler
router.post('/signin', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        console.log("\n" + "=".repeat(60));
        console.log("🔐 SIGNIN ATTEMPT:", email);
        
        // Validate input
        if (!email || !password) {
            console.log("❌ VALIDATION: Email and password required");
            return res.render("signin", {
                error: "Email and Password are required",
            });
        }

        const token = await User.matchPasswordAndGenerateToken(email.toLowerCase(), password);

        console.log("✅ SIGNIN SUCCESSFUL:", email);
        console.log("=".repeat(60) + "\n");
        
        return res.cookie("token", token).redirect("/");
    } catch (error) {
        console.error("❌ SIGNIN ERROR:", error.message);
        console.error("=".repeat(60) + "\n");
        return res.render("signin", {
            error: "Email or Password Incorrect",
        });
    }
});

// Signup handler with profile image upload
router.post(
    "/signup",
    upload("profileImage"), // ← Using the fixed upload middleware
    async (req, res) => {
        try {
            console.log("\n" + "=".repeat(60));
            console.log("📝 SIGNUP ROUTE HANDLER STARTED");
            console.log("=".repeat(60));
            
            const { fullName, email, password, confirmPassword } = req.body;

            console.log("👤 SIGNUP ATTEMPT:");
            console.log("   Full Name:", fullName);
            console.log("   Email:", email);

            // Validate required fields
            if (!fullName || !fullName.trim()) {
                console.log("❌ VALIDATION: Full Name is required");
                return res.status(400).render("signup", {
                    error: "Full Name is required",
                });
            }

            if (!email || !email.trim()) {
                console.log("❌ VALIDATION: Email is required");
                return res.status(400).render("signup", {
                    error: "Email is required",
                });
            }

            if (!password || password.length < 6) {
                console.log("❌ VALIDATION: Password must be at least 6 characters");
                return res.status(400).render("signup", {
                    error: "Password must be at least 6 characters",
                });
            }

            // Check password confirmation (if provided)
            if (confirmPassword && password !== confirmPassword) {
                console.log("❌ VALIDATION: Passwords don't match");
                return res.status(400).render("signup", {
                    error: "Passwords don't match",
                });
            }

            // Check if user already exists
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                console.log("❌ VALIDATION: Email already registered");
                return res.status(400).render("signup", {
                    error: "Email already registered. Please signin.",
                });
            }

            // Log file details from Cloudinary
            if (req.file) {
                console.log("✅ CLOUDINARY FILE RECEIVED:");
                console.log("   URL:", req.file.path);
                console.log("   Public ID:", req.file.filename);
                console.log("   Size:", req.file.size);
            } else {
                console.log("⚠️  NO PROFILE IMAGE UPLOADED - Using default profile image");
            }

            const profileImage = req.file ? req.file.path : null;

            console.log("💾 CREATING USER WITH DATA:");
            console.log("   Full Name:", fullName.trim());
            console.log("   Email:", email.toLowerCase());
            console.log("   Profile Image URL:", profileImage);

            const newUser = await User.create({
                fullName: fullName.trim(),
                email: email.toLowerCase(),
                password,
                profileImage: profileImage,
            });

            console.log("✅ USER CREATED SUCCESSFULLY");
            console.log("   User ID:", newUser._id);
            console.log("   Email:", newUser.email);
            console.log("   Profile Image URL in DB:", newUser.profileImage);
            console.log("=".repeat(60) + "\n");

            // Redirect to signin page
            return res.redirect("/user/signin");

        } catch (error) {
            console.error("❌ SIGNUP ERROR:");
            console.error("   Message:", error.message);
            console.error("   Stack:", error.stack);
            console.error("=".repeat(60) + "\n");
            
            return res.status(500).render("signup", {
                error: "Error during signup: " + error.message,
            });
        }
    }
);

module.exports = router;
