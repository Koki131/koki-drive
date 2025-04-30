const Router = require("express");
const { register, logout, uploadChunk, savePath, isAuth, getFilesByParent, checkFileStatus, download } = require("../controllers/homeController");
const passport = require("passport");
const bodyParser = require("body-parser");

const homeRouter = Router();

homeRouter.use(bodyParser.json({ limit: '200mb' }));
homeRouter.use(bodyParser.urlencoded({ extended: true, limit: '200mb' }));



homeRouter.post(
    "/login",
    passport.authenticate("local"),
    (req, res) => {
      res.json({message: "Logged in successfully", user: req.user})
    }
);
homeRouter.post("/register", register);
homeRouter.post("/logout", logout);
homeRouter.post("/savePath", savePath);
homeRouter.post("/uploadChunk", uploadChunk);
homeRouter.post("/download", download);
homeRouter.post("/checkFileStatus", checkFileStatus);
homeRouter.get("/getFilesByParent", getFilesByParent);
homeRouter.get("/isUserAuthenticated", isAuth);

module.exports = homeRouter;