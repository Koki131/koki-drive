const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { findUserById, findUserByUsername, registerUser, saveFile, queryFilesByParent, saveFolderStructure } = require("../prisma/queries");
const path = require('path');
const { randomFillSync } = require('crypto');
const os = require("os");
const fs = require("fs");
const busboy = require("busboy");
const { pipeline } = require("stream");



const savePath = async (req, res) => {

    // console.log(req.body);
    
    const parentId = await saveFolderStructure(req.body.relativePath, res.locals.currentUser);

            
    res.status(200).json({ parentId: parentId });
};

const saveFiles = async (req, res) => {

  await saveFile(req.body, res.locals.currentUser);
  res.status(200).json({ success: true });
};


const uploadFolder = async (req, res) => {

    let bb = busboy({ headers: req.headers, limits: {files: 100}});
    
    
    let baseUploadDir = `/home/koki/Downloads/Uploads/${res.locals.currentUser.id}/`;
  
    bb.on("field", (name, value) => {
      if (name === "relative_path") {
        baseUploadDir = `/home/koki/Downloads/Uploads/${res.locals.currentUser.id}/` + value;
      }
    });
    
    bb.on("file", (fieldname, file, info) => {
      const { filename } = info;

      const fileUploadPath = path.join(baseUploadDir, filename);
      
      fs.mkdirSync(path.dirname(fileUploadPath), { recursive: true });
  
      const writeStream = fs.createWriteStream(fileUploadPath);
      file.pipe(writeStream);


      
      // file.on("data", (chunk) => {
        //   console.log("Started processing file " + fileUploadPath);
        
        // });
        
      file.on("end", () => {
        console.log("Finished file " + fileUploadPath);
      });

      writeStream.on("finish", () => {
        console.log(`Finished writing ${filename}`);
      });
      
      writeStream.on("error", (err) => {
        console.error("Write stream error:", err);
        file.resume();
      });

      file.on("error", (err) => {
        console.error("File stream error:", err);
        file.resume();
      });
      
    });

    bb.on("finish", () => {
      console.log("Upload Complete");
      res.status(200).json({ success: true });
    });
  
    bb.on("error", (err) => {
      res.status(500).json({ error: "Upload failed" });
      console.error("Busboy error:", err);
    });
  

  
    req.pipe(bb);
};
// const uploadFile = [upload.single('file_upload'), async (req, res) => {

// }];


const validateRegister = [
    body("username")
        .trim()
        .notEmpty().withMessage("Username cannot be empty")
        .isLength({max: 15}).withMessage("Username must contain at most 15 characters"),
    body("password")
        .trim()
        .notEmpty().withMessage("Password cannot be empty")
];

const isAuth = (req, res) => {
    
    if (req.isAuthenticated()) {
        return res.json({ user: req.user });
    } else {
        return res.json({ user: null });
    }
}


const getFilesByParent = async (req, res) => {
    const parent = req.query.parent;
    const files = await queryFilesByParent(req.user.id, parent);

    res.status(200).json({files: files});
};



const register = [validateRegister, async (req, res) => {

    const errors = validationResult(req);
    const errorsArray = errors.array();
    
    if (req.body.password !== req.body.matchingPassword) errorsArray.push({msg: "Passwords must match"});
    
    const rows = await findUserByUsername(req.body.username);
    
    if (rows && rows.length > 0) {
        errorsArray.push({msg: "Username already exists"});    
    }
    
    if (errorsArray.length > 0) {
        return res.status(400).json({
            user: null,
            errors: errorsArray
        });
    }
    

    const password = await bcrypt.hash(req.body.password, 10);
    const user = {username: req.body.username, password: password};
    await registerUser(user);

    return res.status(200).json({
        user: user,
        errors: errorsArray
    });

}];

const logout = (req, res) => {
    
    req.logout((err) => {
        if (err) return res.status(400).json({message: err});
        req.session.destroy((err) => {
            if (err) {
                return res.status(400).json({message: err});
            }

            return res.status(200).json({message: "Logout successful"});
        })
    })
    

};

module.exports = {
    register,
    logout,
    uploadFolder,
    savePath,
    isAuth,
    getFilesByParent,
    saveFiles
}