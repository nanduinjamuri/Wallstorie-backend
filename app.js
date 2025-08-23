const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

// ---- Routes ----
const authRouter = require("./routes/auth/auth-rotes");
const adminProductsRouter = require("./routes/admin/product-routes");
const shopProductRouter = require("./routes/shop/productroutes");
const shopcartRouter = require("./routes/shop/cartroutes");
const shopAddressRouter = require("./routes/shop/addressroutes");
const paymentRouter = require("./routes/shop/paymentroutes");
const shopOrderRouter = require("./routes/shop/orderroutes");
const adminOrderRouter = require("./routes/admin/orderroutes");
const shopSearchRouter = require("./routes/shop/searchroutes");
const reviewRouter = require("./routes/shop/reviewroutes");
const userinforouter = require("./routes/auth/userinfo-routes");

// ---- DB ----
mongoose
  .connect(process.env.DB_URL)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ---- Auth ----
require("./config/passportConfig");

const app = express();
const isProd = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 5000;

// ---- Core middleware ----
app.use(
  cors({
    origin: ["https://www.wallstorie.in", "https://wallstorie.in"],
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Expires",
      "Pragma",
      "X-XSRF-TOKEN",
    ],
    exposedHeaders: ["set-cookie"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

// Sessions (for Passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ---- API routes ----
app.use("/api/auth", authRouter);
app.use("/api/info", userinforouter);
app.use("/api/admin/products", adminProductsRouter);
app.use("/api/shop/products", shopProductRouter);
app.use("/api/shop/cart", shopcartRouter);
app.use("/api/shop/address", shopAddressRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/shop/order", shopOrderRouter);
app.use("/api/admin/orders", adminOrderRouter);
app.use("/api/shop/search", shopSearchRouter);
app.use("/api/shop/review", reviewRouter);

// ---- Static uploads (safe) ----
// • No directory listing (Express doesn't list directories by default)
// • Strong caching for images + explicit Expires header
const ONE_YEAR_MS = 31536000000;
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    index: false, // don't serve index.html automatically
    redirect: false, // no trailing-slash redirects
    setHeaders: (res, filePath) => {
      const lower = filePath.toLowerCase();
      const isImage =
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".png") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".gif") ||
        lower.endsWith(".svg") ||
        lower.endsWith(".avif");

      if (isImage) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader(
          "Expires",
          new Date(Date.now() + ONE_YEAR_MS).toUTCString()
        );
      } else {
        // short cache for non-images (adjust to taste)
        res.setHeader("Cache-Control", "public, max-age=300");
      }
    },
  })
);

// If someone tries to hit the uploads root as a folder path, respond 403 explicitly
app.get("/uploads/", (_req, res) => res.status(403).send("Access Forbidden"));

// ---- Health/root ----
app.get("/", (_req, res) => res.send("API is running"));

// ---- Error handler ----
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).send("Something broke!");
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`🚀 API server on port ${PORT}`);
});
