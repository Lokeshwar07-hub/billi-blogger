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

//to edit blogs
router.get("/:id/edit", async (req, res) => {
    try {
        console.log(`✏️  LOADING EDIT FORM FOR BLOG: ${req.params.id}`);

        // Check authentication
        if (!req.user) {
            console.log("❌ USER NOT AUTHENTICATED");
            return res.redirect("/user/signin");
        }

        // ✅ IMPORTANT: Must use .populate("createdBy") to get author details
        const blog = await Blog.findById(req.params.id).populate("createdBy");

        if (!blog) {
            console.log(`❌ BLOG NOT FOUND: ${req.params.id}`);
            return res.status(404).send("Blog not found");
        }

        // ✅ Check if createdBy exists
        if (!blog.createdBy) {
            console.log(`❌ BLOG AUTHOR NOT FOUND: ${req.params.id}`);
            return res.status(404).send("Blog author not found");
        }

        // ✅ FIXED: Use req.user._id (not req.user.id) and compare with blog.createdBy._id
        if (blog.createdBy._id.toString() !== req.user._id.toString()) {
            console.log("❌ UNAUTHORIZED: User is not the blog author");
            return res.status(403).send("You can only edit your own blogs");
        }

        console.log(`✅ EDIT FORM LOADED FOR: ${blog.title}`);

        // ✅ FIXED: Render "editblog" (not "editblogs")
        res.render("editblog", {
            user: req.user,
            blog
        })
    } catch (error) {
        console.error("Edit Error:", error);
        res.status(500).send("Error: " + error.message);
    }
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
        const blog = await Blog.create(blogData);

        const totalBlogs = await Blog.countDocuments();
        console.log("Database:", Blog.db.name);
        console.log("Total blogs in database:", totalBlogs);

        console.log("✅ BLOG CREATED SUCCESSFULLY");
        console.log("   Blog ID:", blog._id);
        console.log("   Cover Image URL in DB:", blog.coverImageURL);
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

//EDIT//update blogs
router.put("/:id", upload("coverImage"), async (req, res) => {
    try {
        const { title, body, category, tags } = req.body;

        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ error: "Blog not found" });
        }

        // Authorization check
        if (blog.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                error: "Unauthorized - You can only edit your own blogs"
            });
        }

        //updating fields
        if (!title || !title.trim()) {
            return res.status(400).json({ error: "Title is required" });
        }

        if (!body || !body.trim()) {
            return res.status(400).json({ error: "Body is required" });
        }

        blog.title = title.trim();
        blog.body = body.trim();
        blog.category = category || "other";
        blog.tags = tags ? tags.split(',').map(t => t.trim()) : [];

        //image update
        if (req.file) {
            console.log("📸 NEW COVER IMAGE PROVIDED");
            blog.coverImageURL = req.file.path;
        }

        await blog.save();

        console.log(`Blog ${blog._id} updated successfully`);
        res.redirect(`/blog/${blog._id}`);
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ error: error.message });
    }
});


//Delete Route
router.delete("/:id", async (req, res) => {
    try {

        if (!req.user) {
            console.log("❌ USER NOT AUTHENTICATED");
            return res.status(401).json({ success: false, message: "Please login to delete" });
        }

        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ error: "Blog not found" });
        }

        if (blog.createdBy.toString() != req.user._id.toString()) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await Comment.deleteMany({ blogId: req.params.id });
        console.log("COMMENTS DELETED");

        await Blog.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Blog Deleted Successfully" });
    } catch (error) {
        console.error("DELETE ERROR:", error.message);
        return res.status(500).json({ success: false, message: "Error deleting blog: " + error.message });
    }
});


module.exports = router;
