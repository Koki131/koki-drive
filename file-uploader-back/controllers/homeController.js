const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { findUserById, findUserByUsername, registerUser, 
  queryFilesByParent, saveFolderStructure, saveOrUpdateChunkedFileToDb, saveRegularFileToDb, fileStatus } = require("../prisma/queries");
const path = require('path');
const fs = require("fs");
const busboy = require("busboy");



const savePath = async (req, res) => {

    // console.log(req.body);
    
    const parentId = await saveFolderStructure(req.body.relativePath, res.locals.currentUser);

            
    res.status(200).json({ parentId: parentId });
};

const checkFileStatus = async (req, res) => {
  
  const data = req.body;
  
  const status = await fileStatus(data.parentId, res.locals.currentUser, data.fileName);
  res.status(200).json(status);


};


const uploadFile = async (req, res) => {

    let bb = busboy({ headers: req.headers });
    
    
    let baseUploadDir = `/home/koki/Downloads/Uploads/${res.locals.currentUser.id}/`;
    let metaData;
  
    bb.on("field", (name, value) => {
      if (name === "relative_path") {
        baseUploadDir = `/home/koki/Downloads/Uploads/${res.locals.currentUser.id}/` + value;
      }
      if (name === "meta_data") metaData = value;
    });

    
    
    bb.on("file", (fieldname, file, info) => {

      const { filename } = info;

      const fileUploadPath = path.join(baseUploadDir, filename);
      
      fs.mkdirSync(path.dirname(fileUploadPath), { recursive: true });
  
      const writeStream = fs.createWriteStream(fileUploadPath);
      file.pipe(writeStream);
      

      file.on("end", () => {
        console.log("Finished file " + fileUploadPath);
      });

      writeStream.on("finish", async () => {
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
      saveRegularFileToDb(JSON.parse(metaData), res.locals.currentUser)
      .then(res.status(200).json({ success: true }))
      .catch(err => {
        console.error('Error saving file to db', err);
        res.status(500).json({ error: 'Saving file to DB failed' });
      });
      console.log("Upload Complete");
    });
  
    bb.on("error", (err) => {
      res.status(500).json({ error: "Upload failed" });
      console.error("Busboy error:", err);
    });
  

  
    req.pipe(bb);
};


const uploadChunk = (req, res) => {

  const bb = busboy({ headers: req.headers });
  let fileName, chunkData, relativePath, chunkMetaData;
  
  bb.on('field', (name, value) => {
    if (name === 'relative_path') relativePath = value;
    if (name === 'filename') fileName = value;
    if (name === 'chunk_data') chunkData = value;
    if (name === 'meta_data') chunkMetaData = value;
  });
  
  bb.on('file', (fieldname, file, info) => {
  
    const tempPath = `/home/koki/Downloads/Uploads/temp/${res.locals.currentUser.id}/${relativePath}`;
    const finalPath = `/home/koki/Downloads/Uploads/${res.locals.currentUser.id}/${relativePath}`;
  
    fs.mkdirSync(tempPath, { recursive: true });
    fs.mkdirSync(finalPath, { recursive: true });
  
    const finalFilePath = path.join(finalPath, fileName);
    const tempFilePath = path.join(tempPath, fileName);
  
    const tempStream = fs.createWriteStream(tempFilePath);
    file.pipe(tempStream);
  
    tempStream.on('finish', () => {
      // console.log(`Chunk ${chunkData} for ${fileName} saved to temp.`);

      const readStream = fs.createReadStream(tempFilePath);
      const writeStream = fs.createWriteStream(finalFilePath, { flags: 'a' });
  
      readStream.pipe(writeStream);
  
      writeStream.on('finish', async () => {
        // console.log(`Chunk ${chunkData} appended to ${fileName} in final destination.`);
  
        fs.unlink(tempFilePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error removing temporary chunk file:', unlinkErr);
          }
        });
  
        updateUploadMeta(JSON.parse(chunkMetaData), JSON.parse(chunkData), res.locals.currentUser)
          .then(() => res.status(200).json({ success: true }))
          .catch(err => {
            console.error('Error updating metadata:', err);
            res.status(500).json({ error: 'Metadata update failed' });
          });
      });
  
      readStream.on('error', err => {
        console.error('Error reading from temp file:', err);
        res.status(500).json({ error: 'Error reading from temp file' });
      });
      writeStream.on('error', err => {
        console.error('Error writing to final file:', err);
        res.status(500).json({ error: 'Error writing to final file' });
      });
    });
  
    tempStream.on('error', (err) => {
      console.error('Error writing chunk to temp file:', err);
      res.status(500).json({ error: 'Chunk write error' });
    });
  });
  
  bb.on('error', (err) => {
    console.error('Busboy error:', err);
    res.status(500).json({ error: 'Upload failed' });
  });
  
  req.pipe(bb);

};
const updateUploadMeta = async (chunkMetaData, chunkData, user) => {

  await saveOrUpdateChunkedFileToDb(chunkMetaData, chunkData, user);
  
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
    uploadFile,
    uploadChunk,
    savePath,
    isAuth,
    getFilesByParent,
    checkFileStatus
}