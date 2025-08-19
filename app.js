const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const mongoose = require("mongoose");
require("dotenv").config();
const path = require("path");

// Routes imports
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

// Connect MongoDB
mongoose
  .connect(process.env.DB_URL)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((error) => console.log("❌ MongoDB connection error:", error));

// Passport config
require("./config/passportConfig");

const isProd = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 5000;

async function createServer() {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: isProd ? "https://www.wallstorie.in" : "http://localhost:5173",
      methods: ["GET", "POST", "DELETE", "PUT"],
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

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your_secret_key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProd,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // API routes
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

  if (!isProd) {
    // Development: use Vite as middleware
    const { createServer: createViteServer } = require("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    // SSR route handler
    app.use("*", async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const template = await vite.transformIndexHtml(url, "");
        const { render } = await vite.ssrLoadModule("/src/entry-server.jsx");
        const appHtml = await render(url);

        const html = template.replace(`<!--ssr-outlet-->`, appHtml);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    // Production: serve built client
    app.use(
      require("serve-static")(path.resolve(__dirname, "dist/client"), {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html")) {
            // Don't cache HTML (so users always get fresh pages)
            res.setHeader("Cache-Control", "no-cache");
          } else {
            // Cache other static assets for 1 year
            res.setHeader(
              "Cache-Control",
              "public, max-age=31536000, immutable"
            );
          }
        },
      })
    );

    // SSR handler in production
    app.use("*", async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const template = require("fs").readFileSync(
          path.resolve(__dirname, "dist/client/index.html"),
          "utf-8"
        );
        const { render } = require("./dist/server/entry-server.js");
        const appHtml = await render(url);

        const html = template.replace(`<!--ssr-outlet-->`, appHtml);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        next(e);
      }
    });
  }

  app.use("/uploads", (req, res) => {
    res.status(403).send("Access Forbidden");
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something broke!");
  });

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

createServer();
