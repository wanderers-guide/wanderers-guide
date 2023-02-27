require("dotenv").config();

const express = require("express");
const socket = require("socket.io");
const compression = require("compression");

/*
TODO - Could use again in the future, or delete
- Remove redis-server.exe with it

const expressSession = require('express-session');

let RedisStore = null;
let redisClient = null;
if(process.env.NODE_ENV !== 'production'){
  const redis = require('redis');
  RedisStore = require('connect-redis')(expressSession);
  redisClient = redis.createClient();
}
*/

const cookieSession = require("cookie-session");
const cookieParser = require("cookie-parser");

const exphbs = require("express-handlebars");
const bodyParser = require("body-parser");

const passport = require("passport");
const passportSetup = require("./config/passport-setup");

const favicon = require("serve-favicon");

const authRoutes = require("./routes/auth-routes");
const adminRoutes = require("./routes/admin-routes");
const apiRoutes = require("./routes/api-routes");
const browseRoutes = require("./routes/browse-routes");
const profileRoutes = require("./routes/profile-routes");
const mloadsRoutes = require("./routes/mloads/mloads-routes");
const coreRoutes = require("./routes/core-routes");
const errorRoutes = require("./routes/error-routes");

const SocketConnections = require("./js/SocketConnections");

const keys = require("./config/keys");
const path = require("path");

const fs = require("fs");
const https = require("https");
const http = require("http");

const app = express();

app.use(compression());

const port = process.env.PORT || 80;

// Rate Limiter
const rateLimiterFlexible = require("rate-limiter-flexible");
const rateOptions = {
  points: 30, // X points
  duration: 5, // Per X seconds
  execEvenly: true,
  clearExpiredByTimeout: true,
};
const rateLimiter = new rateLimiterFlexible.RateLimiterMemory(rateOptions);

// Handlebars
app.engine(
  "handlebars",
  exphbs({
    defaultLayout: "main",
    helpers: {
      chooseSelection: function (checkedValue, currentValue) {
        return checkedValue === currentValue ? " selected" : "";
      },
      section: function (name, options) {
        if (!this._sections) this._sections = {};
        this._sections[name] = options.fn(this);
        return null;
      },
      ifEqual: function (a, b, options) {
        if (a == b) {
          return options.fn(this);
        } else {
          return options.inverse(this);
        }
      },
      json: function (content) {
        return JSON.stringify(content);
      },
    },
  }),
);

app.set("view engine", "handlebars");

// Set static folder
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "../../client/dist")));

// Body Parser
app.use(bodyParser.urlencoded({ extended: false }));

// Setup Express Session
/*
TODO - Could use again in the future, or delete

let sessionMiddleware = expressSession({
  // In production use default MemoryStore, in development use RedisStore
  store: (process.env.NODE_ENV === 'production') ? undefined : new RedisStore({ client: redisClient }),
  secret: keys.session.expressSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: (process.env.NODE_ENV === 'production') ? true : false,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
});
app.use(sessionMiddleware);
*/

let sessionMiddleware = cookieSession({
  name: "session",
  keys: [keys.session.expressSecret],

  // Cookie Options
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
});

app.use(cookieParser(keys.session.expressSecret, {}), sessionMiddleware);

// Server Setup
let server = null;

if (process.env.NODE_ENV === "production") {
  /*
  const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/wanderersguide.app/privkey.pem', 'utf8'),
    cert: fs.readFileSync('/etc/letsencrypt/live/wanderersguide.app/cert.pem', 'utf8'),
    ca: fs.readFileSync('/etc/letsencrypt/live/wanderersguide.app/chain.pem', 'utf8')
  };

  server = https.createServer(options, app).listen(443);
  */

  server = app.listen(port, () => {
    console.log(`<< Wanderer's Guide >> Running on port ${port}`);
  });
} else {
  //server = http.createServer(app).listen(80);

  server = app.listen(port, () => {
    console.log(`<< Wanderer's Guide >> Running on port ${port}`);
  });
}

// Socket IO
const io = socket(server, {
  maxHttpBufferSize: 15e8, // 15 mb
  pingTimeout: 60000, // 60 sec (should be above 30k to fix disconnection issues on Safari)
  upgradeTimeout: 30000, // 20k or more
});

io.use(function (socket, next) {
  sessionMiddleware(socket.request, socket.request.res, next);
});

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Set FavIcon
app.use(favicon("./public/images/favicon.svg"));

// Databases
//const backgroundDB = require('./config/databases/background-database');
const contentDB = require("./config/databases/content-database");

// Testing Database Connections
/*
backgroundDB.authenticate()
  .then(() => console.log('Background Database connected...'))
  .catch(err => console.log('Database Connection Error: ' + err));*/

contentDB
  .authenticate()
  .then(() => console.log("Content Database connected..."))
  .catch((err) => console.log("Database Connection Error: " + err));

// Security Headers
app.use(function (req, res, next) {
  res.header(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  res.header("X-Frame-Options", "SAMEORIGIN");
  res.header("X-Content-Type-Options", "nosniff");
  res.header("Referrer-Policy", "no-referrer-when-downgrade");

  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "POST, PATCH, PUT, DELETE, OPTIONS",
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization, Origin, Content-Type, X-Auth-Token",
  );

  next();
});

app.options("/*", (_, res) => {
  res.sendStatus(200);
});

// Rate Limiter
app.use(function (req, res, next) {
  rateLimiter
    .consume(req.ipAddress, 1) // -> consume 1 point
    .then((rateLimiterRes) => {
      // Points consumed
      return next();
    })
    .catch((rateLimiterRes) => {
      // Not enough points to consume
      return res.sendStatus(429);
    });
});

// Set up Routes
app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/admin", adminRoutes);
app.use("/api", apiRoutes);
app.use("/browse", browseRoutes);
app.use("/mloads", mloadsRoutes);
app.use("/", coreRoutes);
app.use("*", errorRoutes); // 404 Route

io.setMaxListeners(24);
SocketConnections.basicConnection(io);

SocketConnections.sheetItems(io);
SocketConnections.sheetConditions(io);
SocketConnections.sheetCompanions(io);
SocketConnections.sheetGeneral(io);
SocketConnections.sheetSpells(io);

SocketConnections.builderBasics(io);
SocketConnections.builderAncestry(io);
SocketConnections.builderBackground(io);
SocketConnections.builderClass(io);
SocketConnections.builderFinalize(io);
SocketConnections.builderGeneral(io);

SocketConnections.builderGeneralProcessing(io);
SocketConnections.builderWSC(io);

SocketConnections.homebrewGeneral(io);
SocketConnections.homebrewBuilder(io);

SocketConnections.charDataManagement(io);

SocketConnections.homePage(io);
SocketConnections.browse(io);
SocketConnections.gmTools(io);
SocketConnections.remoteUpdate(io);
SocketConnections.buildPlanner(io);
SocketConnections.adminPanel(io);
SocketConnections.appAPI(io);
