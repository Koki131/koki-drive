const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { findUserById, findUserByUsername, registerUser, 
  queryFilesByParent, saveFolderStructure, saveOrUpdateChunkedFileToDb, fileStatus } = require("../prisma/queries");
const path = require('path');
const fs = require("fs");
const busboy = require("busboy");



const savePath = async (req, res) => {


  const parentId = await saveFolderStructure(req.body.relativePath, res.locals.currentUser);
        
  res.status(200).json({ parentId: parentId });
};

const checkFileStatus = async (req, res) => {
  
  const data = req.body;
  
  const status = await fileStatus(data.parentId, res.locals.currentUser, data.fileName);
  res.status(200).json(status);


};


const uploadChunk = (req, res) => {
  const bb = busboy({ headers: req.headers });
  let fileName, chunkData, relativePath, chunkMetaData;

  bb.on('field', (name, value) => {
    if (name === 'relative_path') relativePath = value;
    if (name === 'filename') fileName = value;
    if (name === 'meta_data') chunkMetaData = value;
    if (name === 'chunk_data') chunkData = value;
  });

  bb.on('file', (fieldname, file, info) => {
    const finalPath = `/home/koki/Downloads/Uploads/${res.locals.currentUser.id}/${relativePath}`;

    fs.mkdirSync(finalPath, { recursive: true });
    const finalFilePath = path.join(finalPath, fileName);


    const buffers = [];
    file.on('data', (data) => buffers.push(data));
    file.on('end', () => {
      const chunkBuffer = Buffer.concat(buffers);


      const chunkInfo = JSON.parse(chunkData);
      const startOffset = Number(chunkInfo.start);
      const expectedChunkSize = Number(chunkInfo.end) - Number(chunkInfo.start);


      if (chunkBuffer.length !== expectedChunkSize) {
        console.error(
          `Chunk size mismatch for ${fileName}: Expected ${expectedChunkSize} but received ${chunkBuffer.length}`
        );
        return res.status(400).json({ error: 'Chunk incomplete, please retry.' });
      }

      // Open the final file in read/write mode.
      // We try 'r+' (read and update) first; if the file does not exist, create it with 'w+'.
      fs.open(finalFilePath, 'r+', (openErr, fd) => {
        if (openErr) {
          if (openErr.code === 'ENOENT') {

            fs.open(finalFilePath, 'w+', (createErr, fdCreated) => {
              if (createErr) {
                console.error('Error creating final file:', createErr);
                return res.status(500).json({ error: 'Error opening final file.' });
              }
              writeChunk(fdCreated, chunkBuffer, startOffset, chunkMetaData, chunkData, res.locals.currentUser, res);
            });
          } else {
            console.error('Error opening final file:', openErr);
            return res.status(500).json({ error: 'Error opening final file.' });
          }
        } else {
          writeChunk(fd, chunkBuffer, startOffset, chunkMetaData, chunkData, res.locals.currentUser, res);
        }
      });
    });


    file.on('error', (err) => {
      console.error('Error processing file stream:', err);
      res.status(500).json({ error: 'File stream processing error.' });
    });
  });

  bb.on('error', (err) => {
    console.error('Busboy error:', err);
    res.status(500).json({ error: 'Upload failed' });
  });

  req.pipe(bb);
};


const writeChunk = (fd, chunkBuffer, startOffset, chunkMetaData, chunkData, user, res) => {
  fs.write(fd, chunkBuffer, 0, chunkBuffer.length, startOffset, (writeErr, written) => {
    if (writeErr) {
      console.error('Error writing chunk to final file:', writeErr);
      fs.close(fd, () => {});
      return res.status(500).json({ error: 'Error writing chunk.' });
    }
    fs.close(fd, (closeErr) => {
      if (closeErr) {
        console.error('Error closing final file:', closeErr);
        return res.status(500).json({ error: 'Error closing final file.' });
      }
      // Update metadata after successfully writing the chunk.
      updateUploadMeta(JSON.parse(chunkMetaData), JSON.parse(chunkData), user)
        .then(() => res.status(200).json({ success: true }))
        .catch((err) => {
          console.error('Error updating metadata:', err);
          res.status(500).json({ error: 'Metadata update failed' });
        });
    });
  });
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
    uploadChunk,
    savePath,
    isAuth,
    getFilesByParent,
    checkFileStatus
}