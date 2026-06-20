const { Router } = require("express");
const upload = require("../middlewares/upload");
const Blog = require("../models/blog");
const Comment = require("../models/comments");

const router = Router();

// Test route
router.get("/test", (req, res) => {
    console.log("✅ TEST ROUTE HIT");
    res.json({ message: "Blog routes working", user: req.user?.email || "Not logged in" });
});

// View add blog form
router.get("/add-new", (req, res) => {
    if (!req.user) {
        return res.redirect("/user/signin");
    }
    return res.render("addblog", {
        user: req.user,
    });
});

// View specific blog
router.get("/:id", async (req, res) => {
    try {
        console.log(`📖 FETCHING BLOG: ${req.params.id}`);
        
        const blog = await Blog.findById(req.params.id)
            .populate("createdBy");

        if (!blog) {
            console.log(`❌ BLOG NOT FOUND: ${req.params.id}`);
            return res.status(404).send("Blog not found");
        }

        const comments = await Comment.find({
            blogId: req.params.id,
        }).populate("createdBy");

        console.log(`✅ BLOG LOADED: ${blog.title}`);
        console.log(`   Cover Image URL: ${blog.coverImageURL}`);

        return res.render("blog", {
            user: req.user,
            blog,
            comments,
        });
    } catch (error) {
        console.error("❌ ERROR FETCHING BLOG:", error.message);
        return res.status(500).send("Error fetching blog: " + error.message);
    }
});

// Create new blog with image upload
router.post(
    "/add-new",
    upload("coverImage"), // ← Using the fixed upload middleware
    async (req, res) => {
        try {
            console.log("\n" + "=".repeat(60));
            console.log("📝 BLOG CREATION ROUTE HANDLER STARTED");
            console.log("=".repeat(60));
            
            // Check authentication
            if (!req.user) {
                console.log("❌ USER NOT AUTHENTICATED");
                return res.redirect("/user/signin");
            }

            const { title, body } = req.body;

            console.log("📋 BODY DATA:");
            console.log("   Title:", title);
            console.log("   Body:", body.substring(0, 100) + "...");

            // Log file details from Cloudinary
            if (req.file) {
                console.log("✅ CLOUDINARY FILE RECEIVED:");
                console.log("   URL:", req.file.path);
                console.log("   Public ID:", req.file.filename);
                console.log("   Size:", req.file.size);
                console.log("   MIME Type:", req.file.mimetype);
            } else {
                console.log("⚠️  NO FILE UPLOADED - Blog will be created without cover image");
            }

            // Validate required fields
            if (!title || !title.trim()) {
                console.log("❌ VALIDATION ERROR: Title is required");
                return res.status(400).send("Title is required");
            }

            if (!body || !body.trim()) {
                console.log("❌ VALIDATION ERROR: Body is required");
                return res.status(400).send("Body is required");
            }

            const blogData = {
                title: title.trim(),
                body: body.trim(),
                createdBy: req.user._id,
                coverImageURL: req.file ? req.file.path : null,
            };

            console.log("💾 CREATING BLOG WITH DATA:");
            console.log("   Title:", blogData.title);
            console.log("   Cover Image URL:", blogData.coverImageURL);
            console.log("   Created By:", blogData.createdBy);

            const blog = await Blog.create(blogData);

            console.log("✅ BLOG CREATED SUCCESSFULLY");
            console.log("   Blog ID:", blog._id);
            console.log("   Cover Image URL in DB:", blog.coverImageURL);
            console.log("=".repeat(60) + "\n");

            return res.redirect(`/blog/${blog._id}`);

        } catch (error) {
            console.error("❌ BLOG CREATION ERROR:");
            console.error("   Message:", error.message);
            console.error("   Stack:", error.stack);
            console.error("=".repeat(60) + "\n");
            
            return res.status(500).render("addblog", {
                user: req.user,
                error: "Error creating blog: " + error.message,
            });
        }
    }
);

// Add comment to blog
router.post("/comment/:blogId", async (req, res) => {
    try {
        console.log(`💬 ADDING COMMENT TO BLOG: ${req.params.blogId}`);
        
        if (!req.user) {
            return res.redirect("/user/signin");
        }

        const { content } = req.body;

        if (!content || !content.trim()) {
            console.log("❌ COMMENT VALIDATION: Content is empty");
            return res.status(400).send("Comment cannot be empty");
        }

        const comment = await Comment.create({
            content: content.trim(),
            blogId: req.params.blogId,
            createdBy: req.user._id,
        });

        console.log("✅ COMMENT ADDED TO BLOG");
        console.log("   Comment ID:", comment._id);
        console.log("   Blog ID:", req.params.blogId);
        
        return res.redirect(`/blog/${req.params.blogId}`);

    } catch (error) {
        console.error("❌ COMMENT ERROR:", error.message);
        return res.status(500).send("Error adding comment: " + error.message);
    }
});

module.exports = router;
