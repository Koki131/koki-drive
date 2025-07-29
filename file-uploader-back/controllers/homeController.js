const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { findUserById, findUserByUsername, registerUser, 
  queryFilesByParent, saveFolderStructure, saveOrUpdateChunkedFileToDb, fileStatus, getFullPaths, 
  renameFile, deleteFile, getFileById, saveRegularFileToDb, saveCopyToDb, 
  saveFolder,
  getPath,
  saveCutToDb,
  getSearchResult} = require("../prisma/queries");
const path = require('path');
const fs = require("fs");
const busboy = require("busboy");
const archiver = require('archiver');
const previewQueue = require('../queues/queue');
const IORedis = require('ioredis');
require('dotenv').config()

const redisPublisher = new IORedis({ host: 'localhost', port: 6379 });

const uploadPath = process.env.UPLOAD_PATH;

const savePath = async (req, res) => {

  const folderData = await saveFolderStructure(req.body.folder, req.body.parentIdToSend, res.locals.currentUser, req.body.currentFolderId);

  if (folderData && folderData.folder) {
    const channel = `user-notifications:${res.locals.currentUser.id}`;
    const payload = JSON.stringify({
        event: 'file-transfer',
        folder: folderData.folder,
        status: 'success'
    });

    await redisPublisher.publish(channel, payload);
  }
  


  return res.status(200).json({ folderData: folderData });
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


const uploadChunk = async (req, res) => {

  const bb = busboy({ headers: req.headers });
  let metaData;

  bb.on('field', (name, value) => {    
    if (name === 'meta_data') metaData = value;
  });

  bb.on('file', (fieldname, file, info) => {

    const { relativePath, fileName, chunkMetaData, chunkData, lastChunk, mimeType } = JSON.parse(metaData);

    
    const finalPath = `${uploadPath}${res.locals.currentUser.id}/${relativePath}`;
    const basePreviewPath = `/previews/${res.locals.currentUser.id}/${relativePath}`;
    const previewPath = `${uploadPath}previews/${res.locals.currentUser.id}/${relativePath}`;
    
    
    fs.mkdirSync(finalPath, { recursive: true });

    const finalFilePath = path.join(finalPath, fileName);
    const finalBasePreviewPath = path.join(basePreviewPath, fileName);
    const finalPreviewPath = path.join(previewPath, fileName);

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
              writeChunk(
                fdCreated, chunkBuffer, startOffset, chunkMetaData, chunkData, res.locals.currentUser, 
                res, finalFilePath, previewPath, finalPreviewPath, lastChunk, mimeType, finalBasePreviewPath
              );
            });
          } else {
            console.error('Error opening final file:', openErr);
            return res.status(500).json({ error: 'Error opening final file.' });
          }
        } else {
          writeChunk(
            fd, chunkBuffer, startOffset, chunkMetaData, chunkData, res.locals.currentUser,
            res, finalFilePath, previewPath, finalPreviewPath, lastChunk, mimeType, finalBasePreviewPath
            );
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


const writeChunk = (
  fd, chunkBuffer, startOffset, chunkMetaData, chunkData, 
  user, res, finalFilePath, previewPath, finalPreviewPath, lastChunk, mimeType, finalBasePreviewPath
) => {
  fs.write(fd, chunkBuffer, 0, chunkBuffer.length, startOffset, (writeErr, written) => {
    if (writeErr) {
      console.error('Error writing chunk to final file:', writeErr);
      fs.close(fd, () => {});
      return res.status(500).json({ error: 'Error writing chunk.' });
    }
    fs.close(fd, async (closeErr) => {
      if (closeErr) {
        console.error('Error closing final file:', closeErr);
        return res.status(500).json({ error: 'Error closing final file.' });
      }
      
      
      // Update metadata after successfully writing the chunk.
      updateUploadMeta(JSON.parse(chunkMetaData), JSON.parse(chunkData), user, mimeType)
        .then(async (file) => {

          
          if (lastChunk) {
            const channel = `user-notifications:${user.id}`;
            const payload = JSON.stringify({
                event: 'file-transfer',
                file: file,
                status: 'success'
            });
    
            await redisPublisher.publish(channel, payload);
            
            if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
              await previewQueue.add('generate', {
                user: user,
                fileId: file.id,
                filePath: finalFilePath,
                previewPath: previewPath,
                finalPreviewPath: finalPreviewPath,
                mimeType: mimeType,
                basePreviewPath: finalBasePreviewPath
              });
    
            } 
          }
          res.status(200).json({ file: file, success: true })

        })
        .catch((err) => {
          console.error('Error updating metadata:', err);
          res.status(500).json({ error: 'Metadata update failed' });
        });

        
    });
  });
};

const updateUploadMeta = async (chunkMetaData, chunkData, user, mimeType) => {
  
  return await saveOrUpdateChunkedFileToDb(chunkMetaData, chunkData, user, mimeType);
  
};

const createNewFolder = async (req, res) => {

  const payload = req.body;
  const parentId = payload.parentId ? Number.parseInt(payload.parentId) : null;
  const folderName = payload.folderName;
  const user = res.locals.currentUser;
  
  let folderToSend = null;

  try {
    folderToSend = await saveFolder(parentId, folderName, user);
  } catch (error) {
    
    return res.status(400).json({message: error.message});
  }
  
  return res.status(200).json({message: "Folder saved successfully", folder: folderToSend});

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

  const renamedFile = await renameFile(fileId, newFilename, userUploadPath);

  const fullNewPath = renamedFile ? renamedFile.fullPath[0] : null;
  
  if (!fullNewPath) return res.status(400).json({ message: 'Name already exists' });


  try {

      
    fs.rename(fullOrgPath.path, fullNewPath.path, () => {});
      
      
  } catch (e) {

    const undoNameChange = await renameFile(fileId, fullOrgPath.name, userUploadPath);
    fs.rename(fullNewPath.path, fullOrgPath.path, () => {});

  }
  

  
  return res.status(200).json({renamedFile: renamedFile.file});

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
  const fileIdStr = body.file;

  const sourceFileId = Number.parseInt(fileIdStr);
  let fileToCopy = await getFileById(sourceFileId); 
  let filePastedTemp = null;

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

      // strategy for copy or cut
      const srcFileFullPaths = await getFullPaths([sourceFileId], orgPath);
      
      if (srcFileFullPaths.length === 0) {
          console.error(`Could not resolve source path for file ID ${sourceFileId}`);

          return res.status(500).json({message: `Error processing file ${fileToCopy.name}: Source path not found.`});
      }

      if (operationType === "copy") {
        filePastedTemp = await saveCopyToDb(fileToCopy, destinationFolderId, dest[0].path, user);
      } else if (operationType === "cut") {
        filePastedTemp = await saveCutToDb(fileToCopy, destinationFolderId);
      } else {
        return res.status(500).json({message: "Either copy or cut allowed"});
      }

      const srcItemFileSystemPath = srcFileFullPaths[0].path;
      const destItemFileSystemPath = path.join(dest[0].path, fileToCopy.name);

      // rename instead of cpSync for cut

      if (operationType === "copy") {
        fs.cpSync(srcItemFileSystemPath, destItemFileSystemPath, { recursive: true });
      } else {
        fs.rename(srcItemFileSystemPath, destItemFileSystemPath, () => {});
      }
      
  } catch (error) {
      console.error(`Error pasting file '${fileToCopy.name}' (ID: ${sourceFileId}):`, error);

      return res.status(500).json({ message: `Failed to paste file '${fileToCopy.name}': ${error.message}` });
  }
  
  const channel = `user-notifications:${res.locals.currentUser.id}`;
  const payload = JSON.stringify({
      event: 'file-transfer',
      filePasted: filePastedTemp,
      status: 'success'
  });

  await redisPublisher.publish(channel, payload);


  return res.status(200).json({ message: "File pasted successfully.", filePasted: filePastedTemp });
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

  const { parent, take, cursor: cursorStr } = req.query;
  const cursor = cursorStr ? JSON.parse(cursorStr) : null;

  
  const result = await queryFilesByParent(req.user.id, parent, cursor, take);
  
  return res.status(200).json({result: result});
};


const handleSearchConnection = async (req, res) => {
  try {    

    const parsedMessage = req.body;

    const result = await getSearchResult(parsedMessage, req.user);

    return res.status(200).json({ result: result });

  } catch (error) {

    return res.status(400).json({ message: "Bad query" });
  }
};

const getImagePreview = (req, res) => {

  const userId = req.params.userId;


  const filePath = req.params[0];

  if (!userId || !filePath) {
      return res.status(400).send('Invalid path');
  }

  const physicalPath = path.join(uploadPath, 'previews', userId, filePath);

  
  res.sendFile(physicalPath, (err) => {
    if (err) {
      console.error(`Error sending file: ${physicalPath}`, err);
      res.status(404).send('Preview not found');
    }
  });
};

const eventsUtil = (req, res) => {

    
    const userId = req.query.userId;
    
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    console.log(`SSE client connected for user ${userId}`);

    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Create a NEW Redis client for this specific connection to act as a subscriber.
    // This is crucial because a subscriber client cannot run other commands.
    const subscriber = new IORedis({ host: 'localhost', port: 6379 });
    const channel = `user-notifications:${userId}`;

    subscriber.subscribe(channel, (err, count) => {
        if (err) {
          console.error(`Failed to subscribe to Redis channel ${channel}`, err);
          res.end();
          return;
        }
        console.log(`Subscribed to ${count} channel(s). Listening for messages on ${channel}...`);
    });

    // When a message is received on the subscribed channel, send it to the client.
    subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          console.log(`Relaying message from Redis to user ${userId}:`, message);
          res.write(`data: ${message}\n\n`);
        }
    });

    // Send a heartbeat comment every 20 seconds to keep the connection alive
    const heartbeatInterval = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 20000);

    req.on('close', () => {
        console.log(`SSE client disconnected for user ${userId}. Cleaning up.`);
        clearInterval(heartbeatInterval);
        subscriber.unsubscribe(channel);
        subscriber.quit();
    });
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
    createNewFolder,
    handleSearchConnection,
    getImagePreview,
    eventsUtil
}