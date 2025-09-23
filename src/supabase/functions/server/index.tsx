import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["*"],
    allowMethods: ["*"],
  }),
);
app.use("*", logger(console.log));

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "https://boagxkdkcpqwhnawyvrj.supabase.co",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvYWd4a2RrY3Bxd2huYXd5dnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjUzMTg0NCwiZXhwIjoyMDcyMTA3ODQ0fQ.JJkBbeFZZtLrGzd39TiRmpLZt9cYPv0DmfmvBblRDOs",
);

// Bucket initialization removed - buckets already exist

// Helper function to get user from token
async function getUserFromToken(request: Request) {
  const authHeader = request.headers.get("Authorization");
  console.log("Auth header:", authHeader ? authHeader.substring(0, 30) + "..." : "None");
  
  const accessToken = authHeader?.split(" ")[1];
  if (!accessToken) {
    console.log("No access token found in header");
    return { user: null, error: "No token provided" };
  }

  console.log("Attempting to get user with token:", accessToken.substring(0, 20) + "...");

  try {
    const { data, error } = await supabase.auth.getUser(accessToken);
    
    if (error) {
      console.log("Supabase auth error:", error);
      return { user: null, error: error.message };
    }

    if (data.user) {
      console.log("User authenticated successfully:", data.user.id, data.user.email);
    } else {
      console.log("No user data returned from Supabase");
    }

    return { user: data.user, error };
  } catch (err) {
    console.log("Exception in getUserFromToken:", err);
    return { user: null, error: "Authentication failed" };
  }
}

// Assignment Management Routes
app.post("/make-server-cfac176d/assignments", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    if (!userProfile || (userProfile.role !== "instructor" && userProfile.role !== "admin")) {
      return c.json({ error: "Only instructors and admins can create assignments" }, 403);
    }

    const assignment = await c.req.json();
    const assignmentId = crypto.randomUUID();

    const newAssignment = {
      id: assignmentId,
      ...assignment,
      instructor_id: user.id,
      instructor_name: userProfile.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await kv.set(`assignment:${assignmentId}`, newAssignment);

    return c.json({ assignment: newAssignment });
  } catch (error) {
    console.log("Create assignment error:", error);
    return c.json({ error: "Internal server error creating assignment" }, 500);
  }
});

app.get("/make-server-cfac176d/assignments", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      console.log("No user found, error:", error);
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    console.log("User authenticated for assignments:", user.id);

    // Check if user profile exists in KV store
    const userProfile = await kv.get(`user:${user.id}`);
    if (!userProfile) {
      console.log("User profile not found, creating one for:", user.id);
      // Create a basic profile if it doesn't exist
      const basicProfile = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        role: user.user_metadata?.role || 'student',
        created_at: new Date().toISOString(),
        profile_complete: false,
      };
      await kv.set(`user:${user.id}`, basicProfile);
    }

    const assignments = await kv.getByPrefix("assignment:");
    console.log("Found assignments:", assignments.length);
    return c.json({ assignments });
  } catch (error) {
    console.log("Get assignments error:", error);
    return c.json({ error: "Internal server error fetching assignments" }, 500);
  }
});

app.get("/make-server-cfac176d/assignments/instructor/:instructorId", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const instructorId = c.req.param("instructorId");
    const assignments = await kv.getByPrefix("assignment:");
    const instructorAssignments = assignments.filter(a => a.instructor_id === instructorId);

    return c.json({ assignments: instructorAssignments });
  } catch (error) {
    console.log("Get instructor assignments error:", error);
    return c.json({ error: "Internal server error fetching instructor assignments" }, 500);
  }
});

app.put("/make-server-cfac176d/assignments/:id", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const assignmentId = c.req.param("id");
    const updates = await c.req.json();
    const assignment = await kv.get(`assignment:${assignmentId}`);

    if (!assignment) {
      return c.json({ error: "Assignment not found" }, 404);
    }

    if (assignment.instructor_id !== user.id) {
      return c.json({ error: "Unauthorized to update this assignment" }, 403);
    }

    const updatedAssignment = {
      ...assignment,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`assignment:${assignmentId}`, updatedAssignment);
    return c.json({ assignment: updatedAssignment });
  } catch (error) {
    console.log("Update assignment error:", error);
    return c.json({ error: "Internal server error updating assignment" }, 500);
  }
});

app.delete("/make-server-cfac176d/assignments/:id", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const assignmentId = c.req.param("id");
    const assignment = await kv.get(`assignment:${assignmentId}`);

    if (!assignment) {
      return c.json({ error: "Assignment not found" }, 404);
    }

    if (assignment.instructor_id !== user.id) {
      return c.json({ error: "Unauthorized to delete this assignment" }, 403);
    }

    await kv.del(`assignment:${assignmentId}`);
    return c.json({ success: true });
  } catch (error) {
    console.log("Delete assignment error:", error);
    return c.json({ error: "Internal server error deleting assignment" }, 500);
  }
});

// Student Submissions Routes
app.post("/make-server-cfac176d/submissions", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const submission = await c.req.json();
    const submissionId = crypto.randomUUID();

    const newSubmission = {
      id: submissionId,
      ...submission,
      student_id: user.id,
      status: "pending",
      submitted_at: new Date().toISOString(),
      last_modified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await kv.set(`submission:${submissionId}`, newSubmission);

    // Add to student's submissions list
    const studentSubmissions = (await kv.get(`student_submissions:${user.id}`)) || [];
    studentSubmissions.push(submissionId);
    await kv.set(`student_submissions:${user.id}`, studentSubmissions);

    return c.json({ submission: newSubmission });
  } catch (error) {
    console.log("Create submission error:", error);
    return c.json({ error: "Internal server error creating submission" }, 500);
  }
});

app.get("/make-server-cfac176d/submissions/student/:studentId", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const studentId = c.req.param("studentId");
    
    // Only allow students to view their own submissions or instructors/admins to view any
    const userProfile = await kv.get(`user:${user.id}`);
    if (user.id !== studentId && userProfile?.role !== "instructor" && userProfile?.role !== "admin") {
      return c.json({ error: "Unauthorized to view these submissions" }, 403);
    }

    const submissionIds = (await kv.get(`student_submissions:${studentId}`)) || [];
    const submissions = await Promise.all(
      submissionIds.map(async (id: string) => {
        const submission = await kv.get(`submission:${id}`);
        if (submission) {
          // Get assignment details
          const assignment = await kv.get(`assignment:${submission.assignment_id}`);
          // Get feedback if exists
          const feedback = await kv.get(`feedback:${id}`);
          return {
            ...submission,
            assignment_title: assignment?.title || "Unknown Assignment",
            feedback: feedback || null
          };
        }
        return null;
      })
    );

    return c.json({ submissions: submissions.filter(Boolean) });
  } catch (error) {
    console.log("Get student submissions error:", error);
    return c.json({ error: "Internal server error fetching submissions" }, 500);
  }
});

app.get("/make-server-cfac176d/submissions/instructor/:instructorId", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const instructorId = c.req.param("instructorId");
    const userProfile = await kv.get(`user:${user.id}`);
    
    // Only allow instructors to view their own submissions or admins to view any
    if (user.id !== instructorId && userProfile?.role !== "admin") {
      return c.json({ error: "Unauthorized to view these submissions" }, 403);
    }

    const submissions = await kv.getByPrefix("submission:");
    const instructorSubmissions = [];

    for (const submission of submissions) {
      const assignment = await kv.get(`assignment:${submission.assignment_id}`);
      if (assignment && assignment.instructor_id === instructorId) {
        const studentProfile = await kv.get(`user:${submission.student_id}`);
        const feedback = await kv.get(`feedback:${submission.id}`);
        
        instructorSubmissions.push({
          ...submission,
          assignment_title: assignment.title,
          student_name: studentProfile?.name || "Unknown Student",
          student_avatar: studentProfile?.avatar_url || null,
          feedback: feedback || null
        });
      }
    }

    return c.json({ submissions: instructorSubmissions });
  } catch (error) {
    console.log("Get instructor submissions error:", error);
    return c.json({ error: "Internal server error fetching instructor submissions" }, 500);
  }
});

app.put("/make-server-cfac176d/submissions/:id", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const submissionId = c.req.param("id");
    const updates = await c.req.json();
    const submission = await kv.get(`submission:${submissionId}`);

    if (!submission) {
      return c.json({ error: "Submission not found" }, 404);
    }

    if (submission.student_id !== user.id) {
      return c.json({ error: "Unauthorized to update this submission" }, 403);
    }

    const updatedSubmission = {
      ...submission,
      ...updates,
      last_modified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await kv.set(`submission:${submissionId}`, updatedSubmission);
    return c.json({ submission: updatedSubmission });
  } catch (error) {
    console.log("Update submission error:", error);
    return c.json({ error: "Internal server error updating submission" }, 500);
  }
});

// Feedback Routes
app.post("/make-server-cfac176d/feedback", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    if (!userProfile || (userProfile.role !== "instructor" && userProfile.role !== "admin")) {
      return c.json({ error: "Only instructors and admins can provide feedback" }, 403);
    }

    const feedback = await c.req.json();
    const feedbackId = crypto.randomUUID();

    const newFeedback = {
      id: feedbackId,
      ...feedback,
      instructor_id: user.id,
      instructor_name: userProfile.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await kv.set(`feedback:${feedback.submission_id}`, newFeedback);

    // Update submission status
    const submission = await kv.get(`submission:${feedback.submission_id}`);
    if (submission) {
      submission.status = newFeedback.is_draft ? "in_review" : "reviewed";
      submission.updated_at = new Date().toISOString();
      await kv.set(`submission:${feedback.submission_id}`, submission);
    }

    return c.json({ feedback: newFeedback });
  } catch (error) {
    console.log("Create feedback error:", error);
    return c.json({ error: "Internal server error creating feedback" }, 500);
  }
});

app.put("/make-server-cfac176d/feedback/:submissionId", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const submissionId = c.req.param("submissionId");
    const updates = await c.req.json();
    const feedback = await kv.get(`feedback:${submissionId}`);

    if (!feedback) {
      return c.json({ error: "Feedback not found" }, 404);
    }

    if (feedback.instructor_id !== user.id) {
      return c.json({ error: "Unauthorized to update this feedback" }, 403);
    }

    const updatedFeedback = {
      ...feedback,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (!updates.is_draft && feedback.is_draft) {
      updatedFeedback.published_at = new Date().toISOString();
    }

    await kv.set(`feedback:${submissionId}`, updatedFeedback);

    // Update submission status if feedback is published
    if (!updatedFeedback.is_draft) {
      const submission = await kv.get(`submission:${submissionId}`);
      if (submission) {
        submission.status = "reviewed";
        submission.updated_at = new Date().toISOString();
        await kv.set(`submission:${submissionId}`, submission);
      }
    }

    return c.json({ feedback: updatedFeedback });
  } catch (error) {
    console.log("Update feedback error:", error);
    return c.json({ error: "Internal server error updating feedback" }, 500);
  }
});

// Auth routes
app.post("/make-server-cfac176d/auth/signup", async (c) => {
  try {
    const {
      email,
      password,
      name,
      role = "student",
    } = await c.req.json();

    if (!email || !password || !name) {
      return c.json(
        { error: "Email, password, and name are required" },
        400,
      );
    }

    // Validate role
    if (!["student", "instructor", "admin"].includes(role)) {
      return c.json(
        {
          error:
            "Invalid role. Must be student, instructor, or admin",
        },
        400,
      );
    }

    const { data, error } =
      await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { name, role },
        // Automatically confirm the user's email since an email server hasn't been configured.
        email_confirm: true,
      });

    if (error) {
      console.log("Signup error:", error);
      return c.json({ error: error.message }, 400);
    }

    // Store user profile in KV store
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email: data.user.email,
      name,
      role,
      created_at: new Date().toISOString(),
      profile_complete: false,
    });

    return c.json({ user: data.user, success: true });
  } catch (error) {
    console.log("Signup server error:", error);
    return c.json(
      { error: "Internal server error during signup" },
      500,
    );
  }
});

// Get user profile
app.get("/make-server-cfac176d/profile", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json({ profile });
  } catch (error) {
    console.log("Get profile error:", error);
    return c.json(
      { error: "Internal server error fetching profile" },
      500,
    );
  }
});

// Update user profile
app.put("/make-server-cfac176d/profile", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const updates = await c.req.json();
    const currentProfile = await kv.get(`user:${user.id}`);

    if (!currentProfile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const updatedProfile = {
      ...currentProfile,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    await kv.set(`user:${user.id}`, updatedProfile);

    return c.json({ profile: updatedProfile });
  } catch (error) {
    console.log("Update profile error:", error);
    return c.json(
      { error: "Internal server error updating profile" },
      500,
    );
  }
});

// Recipe routes
app.post("/make-server-cfac176d/recipes", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const recipe = await c.req.json();
    const recipeId = crypto.randomUUID();

    const newRecipe = {
      id: recipeId,
      ...recipe,
      author_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ratings: [],
      comments: [],
    };

    await kv.set(`recipe:${recipeId}`, newRecipe);

    // Add to user's recipes list
    const userRecipes =
      (await kv.get(`user_recipes:${user.id}`)) || [];
    userRecipes.push(recipeId);
    await kv.set(`user_recipes:${user.id}`, userRecipes);

    return c.json({ recipe: newRecipe });
  } catch (error) {
    console.log("Create recipe error:", error);
    return c.json(
      { error: "Internal server error creating recipe" },
      500,
    );
  }
});

// Get all recipes
app.get("/make-server-cfac176d/recipes", async (c) => {
  try {
    const recipes = await kv.getByPrefix("recipe:");
    return c.json({ recipes });
  } catch (error) {
    console.log("Get recipes error:", error);
    return c.json(
      { error: "Internal server error fetching recipes" },
      500,
    );
  }
});

// Get user's recipes
app.get("/make-server-cfac176d/my-recipes", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const recipeIds =
      (await kv.get(`user_recipes:${user.id}`)) || [];
    const recipes = await Promise.all(
      recipeIds.map(
        async (id: string) => await kv.get(`recipe:${id}`),
      ),
    );

    return c.json({ recipes: recipes.filter(Boolean) });
  } catch (error) {
    console.log("Get user recipes error:", error);
    return c.json(
      { error: "Internal server error fetching user recipes" },
      500,
    );
  }
});

// Forum routes
app.post("/make-server-cfac176d/forum/posts", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const post = await c.req.json();
    const postId = crypto.randomUUID();

    const newPost = {
      id: postId,
      ...post,
      author_id: user.id,
      created_at: new Date().toISOString(),
      replies: [],
    };

    await kv.set(`forum_post:${postId}`, newPost);

    return c.json({ post: newPost });
  } catch (error) {
    console.log("Create forum post error:", error);
    return c.json(
      { error: "Internal server error creating forum post" },
      500,
    );
  }
});

// Get forum posts
app.get("/make-server-cfac176d/forum/posts", async (c) => {
  try {
    const posts = await kv.getByPrefix("forum_post:");
    return c.json({ posts });
  } catch (error) {
    console.log("Get forum posts error:", error);
    return c.json(
      { error: "Internal server error fetching forum posts" },
      500,
    );
  }
});

// Learning resources routes
app.post("/make-server-cfac176d/resources", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    if (
      !userProfile ||
      (userProfile.role !== "instructor" &&
        userProfile.role !== "admin")
    ) {
      return c.json(
        {
          error:
            "Only instructors and admins can create resources",
        },
        403,
      );
    }

    const resource = await c.req.json();
    const resourceId = crypto.randomUUID();

    const newResource = {
      id: resourceId,
      ...resource,
      author_id: user.id,
      created_at: new Date().toISOString(),
    };

    await kv.set(`resource:${resourceId}`, newResource);

    return c.json({ resource: newResource });
  } catch (error) {
    console.log("Create resource error:", error);
    return c.json(
      { error: "Internal server error creating resource" },
      500,
    );
  }
});

// Get learning resources
app.get("/make-server-cfac176d/resources", async (c) => {
  try {
    const resources = await kv.getByPrefix("resource:");
    return c.json({ resources });
  } catch (error) {
    console.log("Get resources error:", error);
    return c.json(
      { error: "Internal server error fetching resources" },
      500,
    );
  }
});

// Admin routes
app.get("/make-server-cfac176d/admin/users", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    if (!userProfile || userProfile.role !== "admin") {
      return c.json({ error: "Admin access required" }, 403);
    }

    const users = await kv.getByPrefix("user:");
    return c.json({ users });
  } catch (error) {
    console.log("Get users error:", error);
    return c.json(
      { error: "Internal server error fetching users" },
      500,
    );
  }
});

// Legacy image upload route - redirects to new storage route
app.post("/make-server-cfac176d/upload-image", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    const validImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!validImageTypes.includes(file.type)) {
      return c.json(
        { error: "Invalid file type. Please upload an image." },
        400,
      );
    }

    // Validate file size (10MB max for images)
    if (file.size > 10 * 1024 * 1024) {
      return c.json(
        { error: "File size must be less than 10MB" },
        400,
      );
    }

    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const bucketName = "make-cfac176d-recipes";

    const { data, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.log("Upload error:", uploadError);
      return c.json({ error: "Failed to upload image" }, 500);
    }

    // Get public URL (more reliable for public buckets)
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      return c.json(
        { error: "Failed to create access URL" },
        500,
      );
    }

    return c.json({
      url: urlData.publicUrl,
      fileName,
      bucket: bucketName,
      fileType: "image",
    });
  } catch (error) {
    console.log("Image upload error:", error);
    return c.json(
      { error: "Internal server error during image upload" },
      500,
    );
  }
});

// Enhanced file upload route with validation and proper storage handling
app.post("/make-server-cfac176d/upload/:bucket", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const bucket = c.req.param("bucket");
    const validBuckets = [
      "recipes",
      "profiles",
      "forums",
      "resources",
      "chat-media",
    ];

    if (!validBuckets.includes(bucket)) {
      return c.json({ error: "Invalid bucket" }, 400);
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    const validImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    const validVideoTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
    ];
    const allValidTypes = [
      ...validImageTypes,
      ...validVideoTypes,
    ];

    if (!allValidTypes.includes(file.type)) {
      return c.json(
        {
          error:
            "Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, OGG, MOV).",
        },
        400,
      );
    }

    // Validate file size based on type - reduced limits for optimized uploads
    const isVideo = validVideoTypes.includes(file.type);
    const maxSize = isVideo
      ? 50 * 1024 * 1024
      : 5 * 1024 * 1024; // 50MB for videos, 5MB for images (client-side optimized)

    if (file.size > maxSize) {
      const sizeLimit = isVideo ? "50MB" : "5MB";
      return c.json(
        { error: `File size must be less than ${sizeLimit}` },
        400,
      );
    }

    // Create organized file path with optimization indicators
    const fileExtension = file.name.split(".").pop();
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().substring(0, 8);

    // Use WebP extension for optimized images
    const optimizedExtension =
      file.type === "image/webp" ? "webp" : fileExtension;
    const fileName = `${user.id}/${isVideo ? "videos" : "images"}/${timestamp}-${randomId}.${optimizedExtension}`;
    const bucketName = `make-cfac176d-${bucket}`;

    const { data, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: "86400", // 24 hours cache for better performance
        upsert: false,
      });

    if (uploadError) {
      console.log("Upload error:", uploadError);
      return c.json({ error: "Failed to upload file" }, 500);
    }

    // Get public URL (more reliable for public buckets)
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      return c.json(
        { error: "Failed to create access URL" },
        500,
      );
    }

    return c.json({
      fileName,
      url: urlData.publicUrl,
      bucket: bucketName,
      fileType: isVideo ? "video" : "image",
      fileSize: file.size,
      mimeType: file.type,
      isOptimized:
        file.type === "image/webp" &&
        file.size < 2 * 1024 * 1024, // Mark as optimized if WebP and under 2MB
    });
  } catch (error) {
    console.log("File upload error:", error);
    return c.json(
      { error: "Internal server error during file upload" },
      500,
    );
  }
});

// Optimized image serving route with responsive sizing
app.get(
  "/make-server-cfac176d/image/:bucket/:path*",
  async (c) => {
    try {
      const { user, error } = await getUserFromToken(c.req.raw);
      if (!user) {
        return c.json({ error: error || "Unauthorized" }, 401);
      }

      const bucket = c.req.param("bucket");
      const path = c.req.param("path");
      const width = c.req.query("w"); // Width parameter for responsive images
      const quality = c.req.query("q") || "85"; // Quality parameter

      if (!bucket || !path) {
        return c.json({ error: "Invalid parameters" }, 400);
      }

      // Create signed URL with caching headers
      const { data: signedUrlData, error: urlError } =
        await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 24 * 3600); // 24 hours

      if (urlError) {
        console.log("Signed URL error:", urlError);
        return c.json(
          { error: "Failed to create access URL" },
          500,
        );
      }

      // Return optimized image URL with responsive parameters
      return c.json({
        url: signedUrlData?.signedUrl,
        responsive: {
          mobile:
            signedUrlData?.signedUrl + (width ? `&w=400` : ""),
          tablet:
            signedUrlData?.signedUrl + (width ? `&w=800` : ""),
          desktop:
            signedUrlData?.signedUrl + (width ? `&w=1200` : ""),
        },
        cacheExpiry: 24 * 3600,
      });
    } catch (error) {
      console.log("Optimized image serving error:", error);
      return c.json(
        { error: "Internal server error serving image" },
        500,
      );
    }
  },
);

// Get signed URL for existing file
app.post("/make-server-cfac176d/get-signed-url", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const { fileName, bucket } = await c.req.json();

    if (!fileName || !bucket) {
      return c.json(
        { error: "fileName and bucket are required" },
        400,
      );
    }

    const { data: signedUrlData, error: urlError } =
      await supabase.storage
        .from(bucket)
        .createSignedUrl(fileName, 24 * 3600); // 24 hours

    if (urlError) {
      console.log("Signed URL error:", urlError);
      return c.json(
        { error: "Failed to create access URL" },
        500,
      );
    }

    return c.json({
      url: signedUrlData?.signedUrl,
    });
  } catch (error) {
    console.log("Get signed URL error:", error);
    return c.json(
      { error: "Internal server error getting signed URL" },
      500,
    );
  }
});

// Delete file from storage
app.delete("/make-server-cfac176d/delete-file", async (c) => {
  try {
    const { user, error } = await getUserFromToken(c.req.raw);
    if (!user) {
      return c.json({ error: error || "Unauthorized" }, 401);
    }

    const { fileName, bucket } = await c.req.json();

    if (!fileName || !bucket) {
      return c.json(
        { error: "fileName and bucket are required" },
        400,
      );
    }

    // Only allow users to delete their own files
    if (!fileName.startsWith(`${user.id}/`)) {
      return c.json(
        { error: "Unauthorized to delete this file" },
        403,
      );
    }

    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([fileName]);

    if (deleteError) {
      console.log("Delete error:", deleteError);
      return c.json({ error: "Failed to delete file" }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log("Delete file error:", error);
    return c.json(
      { error: "Internal server error deleting file" },
      500,
    );
  }
});

// Debug route to check authentication and buckets
app.get("/make-server-cfac176d/debug/auth", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    console.log("Debug - Auth header:", authHeader ? "Present" : "Missing");

    const { user, error } = await getUserFromToken(c.req.raw);
    
    if (!user) {
      return c.json({ 
        success: false,
        authHeader: !!authHeader,
        error: error || "No user found",
        timestamp: new Date().toISOString()
      });
    }

    // Check bucket access
    const buckets = ["recipes", "profiles", "forums", "resources", "chat-media"];
    const bucketStatus = {};
    
    for (const bucket of buckets) {
      const bucketName = `make-cfac176d-${bucket}`;
      try {
        const { data, error: bucketError } = await supabase.storage
          .from(bucketName)
          .list('', { limit: 1 });
        
        bucketStatus[bucket] = {
          exists: !bucketError,
          accessible: !bucketError,
          error: bucketError?.message
        };
      } catch (err) {
        bucketStatus[bucket] = {
          exists: false,
          accessible: false,
          error: err.message
        };
      }
    }

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role
      },
      buckets: bucketStatus,
      timestamp: new Date().toISOString(),
      supabaseUrl: Deno.env.get("SUPABASE_URL"),
      hasServiceKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    });
  } catch (error) {
    console.log("Debug auth error:", error);
    return c.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

Deno.serve(app.fetch);
