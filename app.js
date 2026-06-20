require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const Blog = require('./models/blog');
const userRoute = require('./routes/user');
const blogRoute = require('./routes/blog');
const { checkForAuhtenticationCookie } = require("./middlewares/authentication");

const app = express();
const PORT = process.env.PORT || 8000;

// MongoDB Connection
console.log("🔗 Connecting to MongoDB...");
mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log("MongoDB Connected");

        mongoose.connection.once("open", () => {
            console.log("Connected DB:", mongoose.connection.name);
            console.log("Host:", mongoose.connection.host);
        });
    })
    .catch(err => console.log(err));
// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.resolve('./views'));

// Middleware - ORDER MATTERS!
// 1. Body parsing middlewares (MUST be before routes)
app.use(express.urlencoded({ extended: true })); // ← Added extended: true for nested objects
app.use(express.json()); // ← Added for JSON requests
app.use(cookieParser());

// 2. Authentication middleware
app.use(checkForAuhtenticationCookie("token"));

// 3. Static files
app.use(express.static(path.resolve('./public')));

// Routes
app.get('/', async (req, res) => {
    try {
        const allBlogs = await Blog.find({}).populate("createdBy");
        res.render("home", {
            user: req.user,
            blogs: allBlogs,
        });
    } catch (error) {
        console.error("❌ HOME PAGE ERROR:", error);
        res.status(500).send("Error loading home page");
    }
});

app.use('/user', userRoute);
app.use('/blog', blogRoute);

// 404 Handler
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Global error handler for multer and other errors
app.use((err, req, res, next) => {
    console.error("❌ GLOBAL ERROR:", err.message);
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).send('File size exceeds 5MB limit');
    }
    if (err.message && err.message.includes('image')) {
        return res.status(400).send(err.message);
    }
    res.status(500).send('Server error: ' + err.message);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server Started at PORT: ${PORT}`);
    console.log(`📍 Visit: http://localhost:${PORT}`);
});
