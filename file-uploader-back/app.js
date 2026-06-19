const path = require("node:path");
const express = require("express");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require('passport-local').Strategy;
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const { PrismaClient } = require('@prisma/client');
const process = require("node:process");
const homeRouter = require("./routes/homeRouter");
const flash = require("flash");
const cors = require("cors");

const http = require("http");

const { findUserById, findUserByUsername } = require("./prisma/queries");
const assetsPath = path.join(__dirname, "public");
const prisma = new PrismaClient();
const app = express();

const uploadPath = process.env.UPLOAD_PATH;
const hlsStoragePath = path.join(uploadPath, 'videos');


const server = http.createServer(app);
app.set('trust proxy', 1); 

app.use(cors({
  origin: "https://fine-endlessly-lark.ngrok-free.app",
  credentials: true
}));


const sessionMiddleware = session({
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "none",
    secure: true,
    httpOnly: true
  },
  secret: 'a santa at nasa',
  resave: false,
  saveUninitialized: false,
  store: new PrismaSessionStore(
    new PrismaClient(),
    {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }
  )
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(assetsPath));

app.use('/hls-content', express.static(hlsStoragePath));


app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session()); 
app.use(flash());

passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const rows  = await findUserByUsername(username);
        const user = rows[0];
        
        if (!user) {
         return done(null, false, { message: "Incorrect username or password" }); 
        }
        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (!passwordsMatch) {
         return done(null, false, { message: "Incorrect username or password" }); 
        }

        return done(null, user);
      } catch(err) { return done(err); }
    })
);
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
      const rows = await findUserById(id);
      if (!rows || rows.length === 0) {
        return done(null, false);
      }
      const user = rows[0];
      done(null, user);
    } catch(err) { 
      done(err); 
    }
});


app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});


app.use((req, res, next) => {
    res.locals.currentUser = req.user;    
    next();
});



app.use("/", homeRouter);

process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });
process.on('SIGINT', async () => { await prisma.$disconnect(); process.exit(0); });


server.listen(3000, () => {
  console.log("App running on http://127.0.0.1:3000");
});