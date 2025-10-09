const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { findUserById, findUserByUsername, registerUser,
  queryFilesByParent, saveFolderStructure, saveOrUpdateChunkedFileToDb, fileStatus, getFullPaths,
  renameFile, deleteFile, getFileById, saveRegularFileToDb, saveCopyToDb,
  saveFolder,
  getPath,
  saveCutToDb,
  getSearchResult,
  getSize,
  getPreviewPaths,
  getFolderPath,
  getRootSize,
  updateStatus,
  folderExists,
  duplicateExists,
  fileExists
} = require("../prisma/queries");
const path = require('path');
const fs = require("fs");
const busboy = require("busboy");
const archiver = require('archiver');
const { previewQueue, videoQueue } = require('../queues/queue');
const IORedis = require('ioredis');
require('dotenv').config()

const redisPublisher = new IORedis({ host: 'localhost', port: 6379 });

const uploadPath = process.env.UPLOAD_PATH;


const generateNewName = async (req, res) => {
  
  const user = res.locals.currentUser;
  const { folderName, folderId, parentId } = req.query;

  
  let inc = 1;
  
  let newName = `${folderName} (${inc})`;
  
  while (await folderExists(newName, parentId === 'null' ? null : parentId, user.id)) {
    inc++;
    newName = `${folderName} (${inc})`;
  }

  
  return res.status(200).json({changedName: newName});
};


const checkFolderExists = async (req, res) => {

    const folderName = req.query.folderName;
    const parentId = req.query.parentId === 'null' ? null : req.query.parentId;
    const user = res.locals.currentUser;

    const exists = await folderExists(folderName, parentId, user.id);
  
    if (exists) {
      return res.status(200).json({ folderName: exists.name, folderId: exists.id, parentId: exists.parentId });
    }
    return res.status(200).json({success: true});
};

const savePath = async (req, res) => {

  const folderName = req.body.folder;
  const parentId = req.body.parentIdToSend;
  const user = res.locals.currentUser;
  const destFolder = req.body.currentFolderId;

  const folderData = await saveFolderStructure(folderName, parentId, user, destFolder);


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


    return res.status(200).json({ parentPath: finalParentPath });
  }

  return res.status(200).json({ message: "Success" });

};

const checkFileStatus = async (req, res) => {

  const data = req.body;

  const status = await fileStatus(data.parentId, res.locals.currentUser, data.fileName);
  return res.status(200).json(status);


};


const uploadChunk = async (req, res) => {

  const bb = busboy({ headers: req.headers });
  let metaData, videoConfirmData;

  bb.on('field', (name, value) => {
    if (name === 'meta_data') metaData = value;
    if (name === 'video_confirm_data') videoConfirmData = value;

  });

  bb.on('file', (fieldname, file, info) => {

    const { relativePath, fileName, chunkMetaData, chunkData, lastChunk, mimeType } = JSON.parse(metaData);
    const parsedVideoConfirmData = JSON.parse(videoConfirmData);


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
        return res.status(400).json({ message: 'Chunk incomplete, please retry.', flag: true });
      }

      // Open the final file in read/write mode.
      // We try 'r+' (read and update) first; if the file does not exist, create it with 'w+'.
      fs.open(finalFilePath, 'r+', (openErr, fd) => {
        if (openErr) {
          if (openErr.code === 'ENOENT') {

            fs.open(finalFilePath, 'w+', (createErr, fdCreated) => {
              if (createErr) {
                console.error('Error creating final file:', createErr);
                return res.status(500).json({ message: 'Error opening final file.', flag: true });
              }
              writeChunk(
                fdCreated, chunkBuffer, startOffset, chunkMetaData, chunkData, res.locals.currentUser,
                res, finalFilePath, previewPath, finalPreviewPath, lastChunk, mimeType, finalBasePreviewPath,
                path.join("/fullPreviews", `${res.locals.currentUser.id}`, relativePath, fileName), parsedVideoConfirmData
              );
            });
          } else {
            console.error('Error opening final file:', openErr);
            return res.status(500).json({ message: 'Error opening final file.', flag: true });
          }
        } else {
          writeChunk(
            fd, chunkBuffer, startOffset, chunkMetaData, chunkData, res.locals.currentUser,
            res, finalFilePath, previewPath, finalPreviewPath, lastChunk, mimeType, finalBasePreviewPath,
            path.join("/fullPreviews", `${res.locals.currentUser.id}`, relativePath, fileName), parsedVideoConfirmData
          );
        }
      });
    });


    file.on('error', (err) => {
      console.error('Error processing file stream:', err);
      res.status(500).json({ message: 'File stream processing error.', flag: true });
    });
  });

  bb.on('error', (err) => {
    console.error('Busboy error:', err);
    res.status(500).json({ message: 'Upload failed', flag: true });
  });

  req.pipe(bb);
};


const writeChunk = (
  fd, chunkBuffer, startOffset, chunkMetaData, chunkData,
  user, res, finalFilePath, previewPath, finalPreviewPath, lastChunk, mimeType, finalBasePreviewPath, relativePath, parsedVideoConfirmData
) => {
  fs.write(fd, chunkBuffer, 0, chunkBuffer.length, startOffset, (writeErr, written) => {
    if (writeErr) {
      console.error('Error writing chunk to final file:', writeErr);
      fs.close(fd, () => { });
      return res.status(500).json({ message: 'Error writing chunk.', flag: true });
    }
    fs.close(fd, async (closeErr) => {
      if (closeErr) {
        console.error('Error closing final file:', closeErr);
        return res.status(500).json({ message: 'Error closing final file.', flag: true });
      }


      // Update metadata after successfully writing the chunk.
      updateUploadMeta(JSON.parse(chunkMetaData), JSON.parse(chunkData), user, mimeType)
        .then(async (file) => {


          // CHANGE THE RELATIVE PATH AND PREVIEW URL HERE INSTEAD OF DB

          if (lastChunk) {

            const tmp = await getFolderPath(file.id, 0);
            const tempRelativePath = path.join(`/fullPreviews/${user.id}/${file.id}`, tmp);

            file["relativePath"] = tempRelativePath;

            const channel = `user-notifications:${user.id}`;
            const payload = JSON.stringify({
              event: 'file-transfer',
              file: file,
              status: 'success'
            });

            await redisPublisher.publish(channel, payload);

            if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {

              if ((parsedVideoConfirmData.yesToAll || parsedVideoConfirmData.makeRenditionsCurrentVideo) && mimeType.startsWith('video/')) {

                const parentPath = await getFolderPath(file.parentId, 0);

                const parsedName = path.parse(file.name);

                const fullPath = path.join(parentPath, file.name);

                const output = path.join(uploadPath, 'videos', `${user.id}`, fullPath);


                fs.mkdirSync(output, { recursive: true });

                await videoQueue.add('generate', {
                  inputPath: finalFilePath,
                  outputPath: output,
                  file: file,
                  userId: user.id
                });
              }

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
          res.status(500).json({ message: 'Metadata update failed', flag: true });
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

    return res.status(400).json({ message: error.message, flag: true });
  }

  return res.status(200).json({ message: "Folder saved successfully", folder: folderToSend });

};

const renameNameConflict = async (req, res) => {

  const user = res.locals.currentUser;

  const { newName, fileId } = req.query;

  const file = await getFileById(Number.parseInt(fileId));

  let conflictedFile = null;

  if (file) {

    if (file.type === "FOLDER") {
      conflictedFile = await folderExists(newName, file.parentId, user.id);
    } else if (file.type === "FILE") {
      conflictedFile = await fileExists(newName, file.parentId, user.id);
    }

  }

  if (conflictedFile) {
    return res.status(400).json({ message: "File/folder with that name already exists", flag: true, conflictedFile: conflictedFile });
  }

  return res.status(200).json({ success: true });

};

const rename = async (req, res) => {

  const fileId = req.body.fileId;
  let name = req.body.name ? req.body.name.trim() : null;
  const user = res.locals.currentUser;
  const replace = req.body.replace;
  const conflictedFile = req.body.conflictedFile;

  console.log(conflictedFile);
  

  const userUploadPath = path.join(uploadPath, String(user.id));

  const oldFile = await getFileById(fileId);

  const orgPath = await getFullPaths([fileId], userUploadPath);
  const orgPathWithoutBase = await getPath([fileId], 0);

  const fullOrgPath = orgPath ? orgPath[0] : null;

  if (!fullOrgPath) return res.status(400).json({ message: "File doesn't exist", flag: true });

  let renamedFile = null;
  let replaced = false;

  // delete the confliced file from db and fs
  
  try {

    if (replace) {
      if (conflictedFile) {
        await deleteFile(conflictedFile.id);
      }
      renamedFile = await renameFile(fileId, name, userUploadPath);
      replaced = true;
  
    } else {
      
      const regex = /\(\d+\)/;
  
      const orgParsedName = path.parse(name);
      
      const orgParsedNameLen = orgParsedName.name.length;
      
      if (orgParsedNameLen >= 3) {
      
        const tmp = orgParsedName.name.substring(orgParsedNameLen - 3);
        const tempName = orgParsedName.name.substring(0, orgParsedNameLen - 3).trim();
  
        if (tmp.match(regex)) {
          name = `${tempName}${orgParsedName.ext}`;
        }
      } else {
        name = `${orgParsedName.name}${orgParsedName.ext}`;
      }
      let inc = 1;
      
      if (oldFile.type === "FOLDER") {
  
        while (await folderExists(name, oldFile.parentId, user.id)) {
          name = `${orgParsedName.name}} (${inc})`;
          inc++;
        }
  
      } else {
        
        while (await fileExists(name, oldFile.parentId, user.id)) {
          name = `${orgParsedName.name} (${inc})${orgParsedName.ext}`;
          inc++;
        }
        
      }
      
      renamedFile = await renameFile(fileId, name, userUploadPath);
    }
  } catch (e) {
    return res.status(500).json({message: "Error while renaming file", flag: true});
  }


  const fullNewPath = renamedFile ? renamedFile.fullPath[0] : null;

  
  
  // rename file preview in file system
  try {
    const newPathWithoutBase = await getPath([fileId], 0);

    

    const oldPreviewPath = path.join(uploadPath, 'previews', `${user.id}`, orgPathWithoutBase.path);
    const newPreviewPath = path.join(uploadPath, 'previews', `${user.id}`, newPathWithoutBase.path);

    

    const previewUrl = path.join('/previews', `${user.id}`, newPathWithoutBase.path);
    const relativePath = path.join('/fullPreviews', `${user.id}`, `${fileId}`, newPathWithoutBase.path);

    const oldParentPath = await getFolderPath(oldFile.parentId, 0);

    const parentPath = await getFolderPath(renamedFile.file.parentId, 0);


    const oldVideoPath = path.join(uploadPath, 'videos', `${user.id}`, path.join(oldParentPath, oldFile.name));
    const newVideoPath = path.join(uploadPath, 'videos', `${user.id}`, path.join(parentPath, renamedFile.file.name));

    const masterRelativePath = path.join(`/hls-content/${user.id}`, path.join(parentPath, renamedFile.file.name), 'master.m3u8');




    fs.renameSync(fullOrgPath.path, fullNewPath.path);

    if (fs.existsSync(oldPreviewPath)) {
      if (replace && fs.existsSync(newPreviewPath)) {
        fs.rmSync(newPreviewPath, { recursive: true }, (err) => {
          if (err) {
            console.error(`Error deleting file ${newPreviewPath}:`, err);
          }
        });
      }
      fs.renameSync(oldPreviewPath, newPreviewPath);
    }
    if (fs.existsSync(oldVideoPath)) {
      if (replace && fs.existsSync(newVideoPath)) {
        fs.rmSync(newVideoPath, { recursive: true }, (err) => {
          if (err) {
            console.error(`Error deleting file ${newVideoPath}:`, err);
          }
        });
      }
      fs.renameSync(oldVideoPath, newVideoPath);
    }
    
    renamedFile.file["previewUrl"] = previewUrl;
    renamedFile.file["relativePath"] = renamedFile.file.status ? masterRelativePath : relativePath;


  } catch (e) {

    const undoNameChange = await renameFile(fileId, oldFile.name, userUploadPath);
    console.error(e);


    return res.status(400).json({ message: 'Cannot rename', flag: true });
  }



  return res.status(200).json({ renamedFile: renamedFile.file, oldFile: oldFile, replaced: replaced });

};

const getPreviewableSize = async (req, res) => {

  const parentId = req.params.folderId;
  const user = res.locals.currentUser;


  let size = null;

  if (parentId && parentId !== "null" && parentId !== "undefined") {
    size = await getSize(Number.parseInt(parentId));
  } else {
    size = await getRootSize(user.id);
  }

  return res.status(200).json(size);

};

const deleteFiles = async (req, res) => {

  const filesToDelete = req.body;
  const user = res.locals.currentUser;

  const userUploadPath = path.join(uploadPath, String(user.id));

  const filePaths = await getFullPaths(filesToDelete, userUploadPath);

  const errors = [];

  for (const file of filePaths) {

    const fullFile = await getFileById(file.fileId);

    const folderPath = await getFolderPath(fullFile.id, 0);
    const parentPath = await getFolderPath(fullFile.parentId, 0);

    const previewPath = path.join(uploadPath, 'previews', `${user.id}`, folderPath);
    const parsedName = path.parse(file.name);
    const videoPath = path.join(uploadPath, 'videos', `${user.id}`, parentPath, file.name);



    if (file.type === 'FILE') {
      if (fs.existsSync(previewPath)) {
        fs.unlink(previewPath, (err) => {
          if (err) {
            errors.push(`Unable to delete ${file.name}`);
            console.error(`Error deleting file ${file.path}:`, err);
          }
        });
      }

      if (fs.existsSync(videoPath)) {
        fs.rm(videoPath, { recursive: true }, (err) => {
          if (err) {
            errors.push(`Unable to delete ${file.name}`);
            console.error(`Error deleting file ${file.path}:`, err);
          }
        });
      }


      fs.unlink(file.path, (err) => {
        if (err) {
          errors.push(`Unable to delete ${file.name}`);
          console.error(`Error deleting file ${file.path}:`, err);
        }
      });
    } else {

      if (fs.existsSync(previewPath)) {
        fs.rm(previewPath, { recursive: true }, (err) => {
          if (err) {
            errors.push(`Unable to delete ${file.name}`);
            console.error(`Error deleting file ${file.path}:`, err);
          }
        });
      }
      if (fs.existsSync(videoPath)) {
        fs.rm(videoPath, { recursive: true }, (err) => {
          if (err) {
            errors.push(`Unable to delete ${file.name}`);
            console.error(`Error deleting file ${file.path}:`, err);
          }
        });
      }
      fs.rm(file.path, { recursive: true }, (err) => {
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

  return res.status(200).json({ message: "Deleted successfully", errors: errors });


};

const download = async (req, res) => {

  try {

    const fileIds = JSON.parse(req.body.fileIdsJson);

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ message: 'No file IDs provided', flag: true });
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
        return res.status(500).json({ message: 'Failed to create archive.', error: err.message, flag: true });
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
      return res.status(500).json({ message: 'An unexpected error occurred during download.', error: error.message, flag: true });
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

const checkFileExists = async (req, res) => {
  const user = res.locals.currentUser;
  const { fileId, pathId } = req.query;
  const file = await getFileById(Number.parseInt(fileId));

  if (file) {
    const duplicate = await duplicateExists(file.name, pathId === 'null' ? null : Number.parseInt(pathId), user.id);

    if (duplicate) {
      return res.status(200).json({fileName: duplicate.name, parentId: pathId })
    }

  }

  return res.status(200).json({success: true});
  
};


const paste = async (req, res) => {
  const { body } = req;
  const user = res.locals.currentUser;
  const { operationType, file: fileIdStr, path: destPathId, fileName: newNameFromClient } = body;

  try {

    const sourceFileId = Number.parseInt(fileIdStr);
    const destinationFolderId = destPathId ? Number.parseInt(destPathId) : null;

    if (!sourceFileId) {
      return res.status(400).json({ message: "Invalid source file ID.", flag: true });
    }

    const orgPath = path.join(uploadPath, String(user.id));
    const [destPathInfo] = await getFullPaths([destinationFolderId], orgPath);

    if (!destPathInfo) {
      return res.status(400).json({ message: "Destination path does not exist.", flag: true });
    }
    if (destPathInfo.type === 'FILE') {
      return res.status(400).json({ message: "Destination must be a folder.", flag: true });
    }

    const fileToMove = await getFileById(sourceFileId);
    if (!fileToMove) {
      return res.status(404).json({ message: `Source file not found.`, flag: true });
    }

    if (fileToMove.type === "FOLDER" && await isDescendantOrSelf(destinationFolderId, sourceFileId)) {
      return res.status(400).json({ message: `Cannot paste a folder into itself or a subfolder.`, flag: true });
    }

    if (operationType === "cut" && fileToMove.parentId === destinationFolderId) {
      return res.status(400).json({ message: `Cannot move file/folder to the same destination as its source`, flag: true });
    }

    const regex = /\(\d+\)/;

    let intendedName = newNameFromClient || fileToMove.name;
    const orgParsedName = path.parse(intendedName);
    
    const orgParsedNameLen = orgParsedName.name.length;

    let nameWithoutCounter = null;

    if (orgParsedNameLen >= 3) {
    
      const tmp = orgParsedName.name.substring(orgParsedNameLen - 3);
      const tempName = orgParsedName.name.substring(0, orgParsedNameLen - 3).trim();

      if (tmp.match(regex)) {
        nameWithoutCounter = `${tempName}${orgParsedName.ext}`;
        
      }
      
    } 

    let finalName = intendedName;
    let finalDestPath = path.join(destPathInfo.path, finalName);

    if (newNameFromClient) {
      intendedName = (nameWithoutCounter && fs.existsSync(finalDestPath)) ? nameWithoutCounter : intendedName;
      let counter = 1;
  
  
  
      while (fs.existsSync(finalDestPath)) {
        const parsedName = path.parse(intendedName);
        finalName = `${parsedName.name} (${counter})${parsedName.ext}`;
        finalDestPath = path.join(destPathInfo.path, finalName);
        counter++;
      }
    }



    const [srcPathInfo] = await getFullPaths([sourceFileId], orgPath);
    if (!srcPathInfo) {
      return res.status(500).json({ message: `Could not resolve source file path.`, flag: true });
    }

    fs.mkdirSync(destPathInfo.path, { recursive: true });

    let filePastedTemp;

    if (operationType === "copy") {

      fs.cpSync(srcPathInfo.path, finalDestPath, { recursive: true });

      filePastedTemp = await saveCopyToDb(fileToMove, destinationFolderId, user, finalName);
    } else if (operationType === "cut") {

      fileToMove.name = finalName;

      fs.renameSync(srcPathInfo.path, finalDestPath);

      filePastedTemp = await saveCutToDb(fileToMove, destinationFolderId, user);
    } else {
      return res.status(400).json({ message: "Invalid operation type specified.", flag: true });
    }
    

    const newPreviewPaths = await getPreviewPaths(destinationFolderId, filePastedTemp.name, filePastedTemp.id, user.id);
    const { previewUrl: newPreviewUrl, relativePath: newRelativePath, previewPathWithoutFileName: newPreviewDirName } = newPreviewPaths;
    

    const oldPreviewPaths = await getPreviewPaths(fileToMove.parentId, intendedName, fileToMove.id, user.id);


    const oldPreviewPath = path.join(uploadPath, oldPreviewPaths.previewUrl);
    const newPreviewPath = path.join(uploadPath, 'previews', String(user.id), newPreviewDirName, filePastedTemp.name);
    
    const oldParsedName = path.parse(intendedName);
    const newParsedName = path.parse(filePastedTemp.name);
    const oldVideoPath = path.join(uploadPath, 'videos', String(user.id), oldPreviewPaths.previewPathWithoutFileName, intendedName);
    const newVideoPath = path.join(uploadPath, 'videos', String(user.id), newPreviewDirName, filePastedTemp.name);


    if (fs.existsSync(oldPreviewPath)) {
      fs.mkdirSync(path.dirname(newPreviewPath), { recursive: true });
      
      operationType === 'cut' ? fs.renameSync(oldPreviewPath, newPreviewPath) : fs.cpSync(oldPreviewPath, newPreviewPath, { recursive: true });
    }
    
    if (fs.existsSync(oldVideoPath)) {
      fs.mkdirSync(path.dirname(newVideoPath), { recursive: true });
      operationType === 'cut' ? fs.renameSync(oldVideoPath, newVideoPath) : fs.cpSync(oldVideoPath, newVideoPath, { recursive: true });
      if (operationType === 'copy') await updateStatus(filePastedTemp.id); 
    }

    const masterRelativePath = path.join(`/hls-content/${user.id}`, newPreviewDirName, filePastedTemp.name, 'master.m3u8');
    filePastedTemp.previewUrl = newPreviewUrl;
    filePastedTemp.relativePath = filePastedTemp.status ? masterRelativePath : newRelativePath;

    const channel = `user-notifications:${user.id}`;
    const payload = JSON.stringify({
      event: 'file-transfer',
      filePasted: filePastedTemp,
      status: 'success'
    });
    await redisPublisher.publish(channel, payload);

    return res.status(200).json({ message: "File pasted successfully.", filePasted: filePastedTemp });

  } catch (error) {
    console.error(`Error during paste operation for file ID ${body.file}:`, error);
    return res.status(500).json({ message: `An unexpected error occurred: ${error.message}`, flag: true });
  }
};

// const uploadFile = [upload.single('file_upload'), async (req, res) => {

// }];


const validateRegister = [
  body("username")
    .trim()
    .notEmpty().withMessage("Username cannot be empty")
    .isLength({ max: 15 }).withMessage("Username must contain at most 15 characters"),
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
  const user = res.locals.currentUser;


  const result = await queryFilesByParent(req.user.id, parent, cursor, take);

  // construct preview paths for all files

  for (const file of result.files) {

    if (file.mimeType.startsWith("video/") || file.mimeType.startsWith("image/") || file.mimeType.startsWith("audio/")) {
      const tempPath = await getFolderPath(file.id, 0);

      const previewUrl = path.join(`/previews/${user.id}`, tempPath);
      const relativePath = path.join(`/fullPreviews/${user.id}/${file.id}`, tempPath);

      const parentPath = await getFolderPath(file.parentId, 0);
      const parsedName = path.parse(file.name);

      const masterRelativePath = path.join(`/hls-content/${user.id}`, path.join(parentPath, file.name), 'master.m3u8');


      file["previewUrl"] = previewUrl;
      file["relativePath"] = file.status ? masterRelativePath : relativePath;

    }

  }

  return res.status(200).json({ result: result });
};


const handleSearchConnection = async (req, res) => {
  try {

    let totalPreviewsPerSearch = 0;

    const parsedMessage = req.body;

    const user = req.user;

    const result = await getSearchResult(parsedMessage, req.user);

    for (const file of result.files) {

      if (file.mimeType.startsWith("video/") || file.mimeType.startsWith("image/") || file.mimeType.startsWith("audio/")) {

        const tempPath = await getFolderPath(file.id, 0);

        const previewUrl = path.join(`/previews/${user.id}`, tempPath);
        const relativePath = path.join(`/fullPreviews/${user.id}/${file.id}`, tempPath);

        const parentPath = await getFolderPath(file.parentId, 0);
        const parsedName = path.parse(file.name);

        const masterRelativePath = path.join(`/hls-content/${user.id}`, path.join(parentPath, file.name), 'master.m3u8');


        file["previewUrl"] = previewUrl;
        file["relativePath"] = file.status ? masterRelativePath : relativePath;
        totalPreviewsPerSearch++;


      }


    }


    return res.status(200).json({ result: result, totalPreviews: totalPreviewsPerSearch });

  } catch (error) {

    return res.status(400).json({ message: "Bad query", flag: true });
  }
};

const getImagePreview = (req, res) => {

  const userId = req.params.userId;


  const filePath = req.params[0];

  if (!userId || !filePath) {
    return res.status(400).send({message: 'Invalid path', flag: true});
  }
  // console.log(filePath);

  const physicalPath = path.join(uploadPath, 'previews', userId, filePath);

  res.sendFile(physicalPath, (err) => {
    if (err) {
      console.error(`Error sending file: ${physicalPath}`, err);
      res.status(404).send({message: 'Preview not found', flag: true});
    }
  });
};

const getFullPreview = async (req, res) => {
  const userId = req.params.userId;
  const fileId = req.params.fileId;

  const filePath = req.params[0];


  if (!userId || !filePath || !fileId) {
    return res.status(400).send({message: 'Invalid path', flag: true});
  }

  if (!res.locals.currentUser || Number.parseInt(res.locals.currentUser.id) !== Number.parseInt(userId)) {
    return res.status(401).send({message: "Authorization required", flag: true});
  }


  const physicalPath = path.join(uploadPath, userId, filePath);
  // const manifestPath = path.join(uploadPath, 'videos', userId, filePath);

  const file = await getFileById(Number.parseInt(fileId));

  const range = req.headers.range;

  if (file) {

    if (range) {

      const size = fs.statSync(physicalPath).size;
      const CHUNK_SIZE = 10 ** 6;
      const start = Number(range.replace(/\D/g, ""));
      const end = Math.min(start + CHUNK_SIZE, size - 1);
      const contentLength = end - start + 1;
      const headers = {
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/mp4",
      };

      res.writeHead(206, headers);
      const videoStream = fs.createReadStream(physicalPath, { start, end });
      videoStream.pipe(res);

    } else {

      res.sendFile(physicalPath, (err) => {
        if (err) {
          console.error(`Error sending file: ${physicalPath}`, err);
          res.status(404).send({message: 'Preview not found', flag: true});
        }
      });

    }

  } else {
    res.status(400).send({message: "File not found", flag: true});
  }


};

const eventsUtil = (req, res) => {


  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json({ message: 'userId is required', flag: true });
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
      // console.log(`Relaying message from Redis to user ${userId}:`, message);
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

  if (req.body.password !== req.body.matchingPassword) errorsArray.push({ msg: "Passwords must match" });

  const rows = await findUserByUsername(req.body.username);

  if (rows && rows.length > 0) {
    errorsArray.push({ msg: "Username already exists" });
  }

  if (errorsArray.length > 0) {
    return res.status(400).json({
      user: null,
      errors: errorsArray,
      flag: true
    });
  }


  const password = await bcrypt.hash(req.body.password, 10);
  const user = { username: req.body.username, password: password };
  await registerUser(user);

  return res.status(200).json({
    user: user,
    errors: errorsArray
  });

}];

const logout = (req, res) => {

  req.logout((err) => {
    if (err) return res.status(400).json({ message: err, flag: true });
    req.session.destroy((err) => {
      if (err) {
        return res.status(400).json({ message: err, flag: true });
      }

      return res.status(200).json({ message: "Logout successful" });
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
  getFullPreview,
  eventsUtil,
  getPreviewableSize,
  checkFolderExists,
  generateNewName,
  checkFileExists,
  renameNameConflict
}