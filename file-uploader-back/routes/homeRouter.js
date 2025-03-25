const Router = require("express");
const { register, logout, uploadFolder, savePath, isAuth, getFilesByParent } = require("../controllers/homeController");
const passport = require("passport");
const bodyParser = require("body-parser");

const homeRouter = Router();

homeRouter.use(bodyParser.json());
homeRouter.use(bodyParser.urlencoded({ extended: false }));



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
homeRouter.post("/uploadFolder", uploadFolder);
homeRouter.get("/getFilesByParent", getFilesByParent)
homeRouter.get("/isUserAuthenticated", isAuth);

module.exports = homeRouter;