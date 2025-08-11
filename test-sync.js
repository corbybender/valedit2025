const express = require("express");
const path = require("path");
const session = require("express-session");

const app = express();

// Set up EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Session middleware
app.use(
  session({
    secret: "test-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// Mock authentication middleware
app.use((req, res, next) => {
  req.session.authorID = 5;
  req.session.userInfo = { authorID: 5, username: "testuser" };
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Express Error:", err);
  res.status(500).json({ error: err.message, stack: err.stack });
});

// Use sync routes
const syncRouter = require("./routes/sync");
app.use("/sync", syncRouter);

const server = app.listen(3015, () => {
  console.log("Test server running on port 3015");
  console.log("Testing sync page at: http://localhost:3015/sync");

  // Make a test request
  const http = require("http");
  const options = {
    hostname: "localhost",
    port: 3015,
    path: "/sync",
    method: "GET",
  };

  setTimeout(() => {
    const req = http.request(options, (res) => {
      console.log("Status:", res.statusCode);
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode === 200) {
          console.log("✅ Sync page loads successfully!");
          console.log(
            "✅ Page contains search input:",
            data.includes("website-search-input")
          );
          console.log(
            "✅ Page contains sync functionality:",
            data.includes("loadSyncQueue")
          );
          console.log(
            "✅ Page contains clear filter button:",
            data.includes("clearWebsiteFilter")
          );
        } else {
          console.log("❌ Error response status:", res.statusCode);
          console.log("Response preview:", data.substring(0, 500));
        }
        server.close();
        process.exit(0);
      });
    });

    req.on("error", (e) => {
      console.error("❌ Request failed:", e.message);
      server.close();
      process.exit(1);
    });

    req.end();
  }, 2000);
});
