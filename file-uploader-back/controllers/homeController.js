const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { findUserById, findUserByUsername, registerUser, 
  queryFilesByParent, saveFolderStructure, saveOrUpdateChunkedFileToDb, fileStatus, getFullPaths, 
  renameFile, deleteFile, getFileById, saveRegularFileToDb, saveCopyToDb, 
  saveFolder,
  getPath} = require("../prisma/queries");
const path = require('path');
const fs = require("fs");
const busboy = require("busboy");
const archiver = require('archiver');
require('dotenv').config()


const uploadPath = process.env.UPLOAD_PATH;

const savePath = async (req, res) => {


  const parentId = await saveFolderStructure(req.body.relativePath, res.locals.currentUser);
        
  return res.status(200).json({ parentId: parentId });
};

const getParentPath = async (req, res) => {
  const parentId = req.body.folderId;

  if (parentId) {
    const tempPath = await getPath(parentId, 0);
    const p = tempPath.path.split("/");

    let finalParentPath = "";
    for (const name of p) {
      if (name !== "") {
        finalParentPath += path.join(name, "/");
      }
    }
    
    
    return res.status(200).json({parentPath: finalParentPath});
  }
  
  return res.status(200).json({message: "Success"});

};

const checkFileStatus = async (req, res) => {
  
  const data = req.body;
  
  const status = await fileStatus(data.parentId, res.locals.currentUser, data.fileName);
  return res.status(200).json(status);


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
    console.log(finalPath);
    

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

const createNewFolder = async (req, res) => {

  const payload = req.body;
  const parentId = payload.parentId ? Number.parseInt(payload.parentId) : null;
  const folderName = payload.folderName;
  const user = res.locals.currentUser;

  try {
    await saveFolder(parentId, folderName, user);
  } catch (error) {
    
    return res.status(400).json({message: error.message});
  }
  
  return res.status(200).json({message: "Folder saved successfully"});

};

const rename = async (req, res) => {

  const fileId = req.body.fileId;
  const name = req.body.name;
  const user = res.locals.currentUser;

  const userUploadPath = path.join(uploadPath, String(user.id));

  const orgPath = await getFullPaths([fileId], userUploadPath);
  
  const fullOrgPath = orgPath ? orgPath[0] : null;

  if (!fullOrgPath) return res.status(400).json({ message: "File doesn't exist"});
  
  
  const extension = fullOrgPath && fullOrgPath.type === 'FILE' ? path.extname(fullOrgPath.name) : "";

  const newFilename = name + extension;

  const newPath = await renameFile(fileId, newFilename, userUploadPath);

  const fullNewPath = newPath ? newPath[0] : null;
  
  if (!fullNewPath) return res.status(400).json({ message: 'Name already exists' });


  try {

      
    fs.rename(fullOrgPath.path, fullNewPath.path, () => {});
      
      
  } catch (e) {

    const undoNameChange = await renameFile(fileId, fullOrgPath.name, userUploadPath);
    fs.rename(fullNewPath.path, fullOrgPath.path, () => {});

  }
  

  
  return res.status(200).json({message: 'Rename success'});

};

const deleteFiles = async (req, res) => {

  const filesToDelete = req.body;
  const user = res.locals.currentUser;

  const userUploadPath = path.join(uploadPath, String(user.id));

  const filePaths = await getFullPaths(filesToDelete, userUploadPath);

  const errors = [];

  for (const file of filePaths) {
  
      
    if (file.type === 'FILE') {
      fs.unlink(file.path, (err) => {
        if (err) {
          errors.push(`Unable to delete ${file.name}`);
          console.error(`Error deleting file ${file.path}:`, err);
        }
      });
    } else {
      fs.rm(file.path, {recursive: true}, (err) => {
        if (err) {
          errors.push(`Unable to delete ${file.name}`);
          console.error(`Error deleting file ${file.path}:`, err);
        } 
      });
    }  
    
    
  }

  for (const fileId of filesToDelete) {
    try {
      await deleteFile(Number.parseInt(fileId));
    } catch (e) {
      errors.push(`Unable to delete ${fileId}`);
    }
  }

  return res.status(200).json({message: "Deleted successfully", errors: errors});
  

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

const isDescendantOrSelf = async (potentialDescendantId, potentialAncestorId) => {
  if (potentialDescendantId === potentialAncestorId) {
      return true;
  }

  let currentId = potentialDescendantId;
  const visitedIds = new Set();

  while (currentId !== null && currentId !== undefined) {
      if (visitedIds.has(currentId)) {
          console.error(`Cyclic parentage detected for ID: ${currentId}`);
          return false;
      }
      visitedIds.add(currentId);

      const file = await getFileById(currentId);

      if (!file || file.parentId === null || file.parentId === undefined) {
          return false;
      }

      if (file.parentId === potentialAncestorId) {
          return true;
      }

      currentId = file.parentId;
  }
  return false;
};

const paste = async (req, res) => {
  const body = req.body;
  const user = res.locals.currentUser;
  const operationType = body.operationType;

  
  
  const orgPath = path.join(uploadPath, String(user.id));
  
  const dest = await getFullPaths([body.path], orgPath); 


  if (dest.length === 0) {
      return res.status(400).json({ message: "Destination path doesn't exist or is not accessible." });
  }
  if (dest[0].type === 'FILE') {
      return res.status(400).json({ message: "Cannot paste into a file. Destination must be a folder." });
  }

  let destinationFolderId = null;

  if (body.path) {
    destinationFolderId = Number.parseInt(body.path);
  }

  for (const fileIdStr of body.files) {
      const sourceFileId = Number.parseInt(fileIdStr);
      let fileToCopy = await getFileById(sourceFileId); 
      
      if (!fileToCopy) {
          console.error(`File with ID ${sourceFileId} not found.`);
          return res.status(404).json({ message: `File with ID ${sourceFileId} not found.` }); 
      }


      if (fileToCopy.type === "FOLDER") {
          if (await isDescendantOrSelf(destinationFolderId, sourceFileId)) {
              const errorMessage = `Cannot paste folder '${fileToCopy.name}' into itself or one of its own subfolders.`;
              console.error(errorMessage + ` (Source ID: ${sourceFileId}, Target Parent ID: ${destinationFolderId})`);
              return res.status(400).json({ message: errorMessage });
          }
      }

      try {

          await saveCopyToDb(fileToCopy, destinationFolderId, dest[0].path, user);

          const srcFileFullPaths = await getFullPaths([sourceFileId], orgPath);
          if (srcFileFullPaths.length === 0) {
              console.error(`Could not resolve source path for file ID ${sourceFileId}`);

              return res.status(500).json({message: `Error processing file ${fileToCopy.name}: Source path not found.`});
          }
          const srcItemFileSystemPath = srcFileFullPaths[0].path;
          const destItemFileSystemPath = path.join(dest[0].path, fileToCopy.name);


          fs.cpSync(srcItemFileSystemPath, destItemFileSystemPath, { recursive: true });
          
      } catch (error) {
          console.error(`Error pasting file '${fileToCopy.name}' (ID: ${sourceFileId}):`, error);

          return res.status(500).json({ message: `Failed to paste file '${fileToCopy.name}': ${error.message}` });
      }
  }
  
  return res.status(200).json({ message: "Files pasted successfully." });
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
    getParentPath,
    isAuth,
    getFilesByParent,
    checkFileStatus,
    download,
    rename,
    deleteFiles,
    paste,
    createNewFolder
}