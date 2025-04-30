const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { findUserById, findUserByUsername, registerUser, 
  queryFilesByParent, saveFolderStructure, saveOrUpdateChunkedFileToDb, fileStatus, getFullPaths } = require("../prisma/queries");
const path = require('path');
const fs = require("fs");
const busboy = require("busboy");
const archiver = require('archiver');
require('dotenv').config()


const uploadPath = process.env.UPLOAD_PATH;

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
    const finalPath = `${uploadPath}${res.locals.currentUser.id}/${relativePath}`;

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

const download = async (req, res) => {

  try {
    
    const fileIds = JSON.parse(req.body.fileIdsJson);
    
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({message: 'No file IDs provided'});
    }
    
    const userUploadPath = path.join(uploadPath, String(res.locals.currentUser.id));

    const paths = await getFullPaths(fileIds, userUploadPath);



    const archiveName = `download_${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${archiveName}"`);

    // Prevent potential caching issues
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const archive = archiver("zip", {
      zlib: { level: 0 }
    });

    res.on('close', () => {
      console.log('Response stream closed.');
      // If archive hasn't finalized, it means connection was likely lost.
      // Destroy archive to free resources if it's still active
      if (archive && !archive.pointer() === 0 && !archive._state.finalized) { // Check internal state (use carefully)
          console.warn('Response closed before archive finalized. Destroying archive.');
          archive.destroy();
      }
    });

    archive.on('finish', () => {
      console.log('Archive stream finished writing.');
    });

    archive.on('end', () => {
      console.log('Archive stream ended.');
    });


    archive.pipe(res);

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Archiver warning (file likely missing):', err);
      } else {
        console.warn('Archiver warning:', err);
      }
    });

    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      if (!res.headersSent) {
        return res.status(500).json({ message: 'Failed to create archive.', error: err.message });
      } else {
        res.end();
      }
      archive.destroy();
    });


    for (const item of paths) {

      const filePath = item.path;
      const type = item.type;
      
      if (fs.existsSync(filePath)) {

        const fileNameInZip = path.basename(filePath);

        if (type === "FOLDER") {
          archive.directory(filePath, fileNameInZip);
        } else if (type === "FILE") {
          archive.file(filePath, { name: fileNameInZip });
        }

        console.log(`Adding ${fileNameInZip} to archive from ${filePath}`);  

      } else {
        console.warn(`File not found, skipping: ${filePath}`);
        
      }

    }
    await archive.finalize();

    console.log("Archive finished");
    
  } catch (e) {

    console.error('Error during download preparation:', error);

    if (!res.headersSent) {
      return res.status(500).json({ message: 'An unexpected error occurred during download.', error: error.message });
    }
    
  }
  

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

    return res.status(200).json({files: files});
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
    checkFileStatus,
    download
}