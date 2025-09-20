const { PrismaClient } = require('@prisma/client');
const path = require('path');
const prisma = new PrismaClient();


const findUserByUsername = async (username) => {

    const res = await prisma.user.findMany({
        where: {
            username: username
        }
    });

    return res;

};

const findUserById = async (id) => {

    const res = await prisma.user.findMany({
        where: {
            id: id
        }
    });

    return res;
};

const registerUser = async (user) => {

    await prisma.user.create({
        data: {
            username: user.username,
            password: user.password
        }
    });

};

const getFiles = async (id) => {

    const res = await prisma.file.findMany({
        where: {
            userId: id
        }
    });

    return res;

};

const getFileById = async (fileId) => {

    const res = await prisma.file.findFirst({
        where: {
            id: fileId
        }
    });

    return res;

};

const queryFilesByParent = async (userId, parent, cursor, take) => {
    const parentId = parent ? Number.parseInt(parent) : null;
    const takeVal = take ? Number.parseInt(take) : 30;
    
    
    const where = {
        userId: userId,
        parentId: parentId,
    };

    if (cursor) {
        where.OR = [

            {
                AND: [
                    { type: 'FILE' },
                    { type: { not: cursor.type } } 
                ]
            },

            {
                AND: [
                    { type: cursor.type },
                    { name: { gt: cursor.name } }
                ]
            },

            {
                AND: [
                    { type: cursor.type },
                    { name: cursor.name },
                    { id: { gt: cursor.id } }
                ]
            }
        ];
    }

    const files = await prisma.file.findMany({
        where: where,
        take: takeVal,

        orderBy: [
            { type: 'desc' }, 
            { name: 'asc' },  
            { id: 'asc' },  
        ],
    });

    let nextCursor = null;

    const lastFile = files[files.length - 1];
    if (lastFile) {
        nextCursor = {
            type: lastFile.type,
            name: lastFile.name,
            id: lastFile.id,
        };
    }
    

    return {
        files,
        nextCursor,
    };
};

const saveFolder = async (parentId, folderName, user) => {

    if (folderName.trim() === "") {
        throw new Error("Folder name cannot be empty");
    }
    if (await folderExists(folderName, parentId, user.id)) {
        throw new Error("Folder with that name already exists");
    }

    return await prisma.file.create({
        data: {
            userId: user.id,
            name: folderName,
            parentId: parentId,
            type: "FOLDER"
        }
    });

};

const saveFolderStructure = async (folderName, parentId, user, destFolderId) => {
    
    let newFolder = await prisma.file.findFirst({
        where: {
            userId: user.id,
            name: folderName,
            parentId: parentId,
            type: "FOLDER",
        }
    });

    if (!newFolder) {         
        newFolder = await prisma.file.create({
            data: {
                user: {connect: {id: user.id}},
                name: folderName,
                parent: parentId ? {connect: {id: parentId}} : {},
                type: "FOLDER",
            }
        });

        // add conditional for search value
        if (parentId === destFolderId) {
            return {newParentId: newFolder.id, folder: newFolder};
        }
    }
    
    return {newParentId: newFolder.id, folder: null};

    
};


const saveRegularFileToDb = async (obj, user) => {

    const parentId = obj.parentId;
    const fileName = obj.fileName;
    const file = await fileExists(fileName, parentId, user.id);
    
    if (!file) {

        await prisma.file.create({
            data: {
                name: fileName,
                type: "FILE",
                user: {connect:{id: user.id}},
                parent: parentId ? {connect: {id: parentId}} : {},
            }
        });

    }
    
};

const folderExists = async (folderName, parentId, userId) => {

    const folder = await prisma.file.findFirst({
        where: {
            name: folderName,
            userId: userId,
            parentId: parentId,
            type: "FOLDER"
        }
    });

    return folder;
};

const fileExists = async (fileName, parentId, userId) => {

    const file = await prisma.file.findFirst({
        where: {
            name: fileName,
            userId: userId,
            parentId: parentId,
            type: "FILE"
        }
    });

    return file;

};

const fileStatus = async (parentId, user, fileName) => {

    const file = await fileExists(fileName, parentId, user.id);
    
    if (!file) return null;

    return {chunkStart: file.chunkStart, chunkEnd: file.chunkEnd};

};
const incrementPreviewCount = async (parentId) => {

    const file = await prisma.file.update({
        where: {
            id: parentId
        },
        data: {
            previewCount: {
                increment: 1,
            }
        }
    });
    
};
const decrementPreviewCount = async (parentId) => {
    await prisma.file.update({
        where: {
            id: parentId
        },
        data: {
            previewCount: {
                decrement: 1,
            }
        }
    });
};

const incrementPreviewCountRoot = async (userId) => {
    const root = await prisma.root.findFirst({
        where: {
            userId: userId,
        }
    });

    if (root) { 
        await prisma.root.update({
            where: {
                userId: userId
            },
            data: {
                previewCount: {
                    increment: 1,
                }
            }
        });
    } else {
        await prisma.root.create({
            data: {
                userId: userId,
                previewCount: 1
            }
        });
    }
};

const decrementPreviewCountRoot = async (userId) => {
    const root = await prisma.root.findFirst({
        where: {
            userId: userId,
        }
    });

    if (root) {
        await prisma.root.update({
            where: {
                userId: userId
            },
            data: {
                previewCount: {
                    decrement: 1,
                }
            }
        });   
    }
};
 
const updateStatus = async (fileId) => {

    return await prisma.file.update({
        where: {
            id: fileId
        },
        data: {
            status: true
        }
    });

};

const saveOrUpdateChunkedFileToDb = async (obj, chunkData, user, mimeType) => {

    const parentId = obj.parentId;
    const fileName = obj.fileName;
    
    
    let file = await fileExists(fileName, parentId, user.id);

    if (!file) {
        
        if (mimeType.startsWith("image/") || mimeType.startsWith("video/")) {
            if (parentId) {
                await incrementPreviewCount(parentId);
            } else {
                await incrementPreviewCountRoot(user.id);
            }
        }

        file = await prisma.file.create({
            data: {
                name: fileName,
                type: "FILE",
                user: {connect:{id: user.id}},
                parent: parentId ? {connect: {id: parentId}} : {},
                chunkStart: chunkData.start,
                chunkEnd: chunkData.end,
                mimeType: mimeType,
            }
        });
    } else {
        
        file = await prisma.file.update({

            where: {
                id: file.id,
                userId: user.id,
                parentId: parentId,
                type: "FILE",
            },
            data: {
                chunkStart: chunkData.start,
                chunkEnd: chunkData.end,
            },

        });

    }
    
    return file;

};

const updateFilePreview = async (fileId, user, fullPreviewPath) => {


    const file = await prisma.file.update({
        where: {
            id: fileId,
            userId: user.id,
            type: "FILE"
        },
        data: {
            previewUrl: ""
        }
    });

    return file;

};
const getPreviewPaths = async (destinationFolderId, fileName, fileId, userId) => {

    const previewPath = await getFolderPath(Number.parseInt(destinationFolderId), 0);
    
    const thumbnailPath = path.join('/previews', `${userId}`, previewPath, fileName);
    const fullPreviewPath = path.join('/fullPreviews', `${userId}`, `${fileId}`, previewPath, fileName);
    

    return {previewUrl: thumbnailPath, relativePath: fullPreviewPath, previewPathWithoutFileName: previewPath};

};

const getVideoPaths = async (destinationFolderId, fileName, fileId, userId) => {

    const previewPath = await getFolderPath(Number.parseInt(destinationFolderId), 0);
    
    const thumbnailPath = path.join('/previews', `${userId}`, previewPath, fileName);
    const fullPreviewPath = path.join('/fullPreviews', `${userId}`, `${fileId}`, previewPath, fileName);
    

    return {previewUrl: thumbnailPath, relativePath: fullPreviewPath, previewPathWithoutFileName: previewPath};

};

const getFolderPath = async (id, idx) => {

    if (!id) return "/";

    const file = await getFileById(id);

    if (idx === 0) return await getFolderPath(file.parentId, idx + 1) + file.name;

    return await getFolderPath(file.parentId, idx + 1) + file.name + "/";
    
};

const saveCopyToDb = async (file, parentId, user, previewPaths) => {

    const fileId = Number.parseInt(file.id);

    if (file.type === "FOLDER") {
        if (await folderExists(file.name, parentId, user.id)) {
            throw new Error("Folder already exists");
        }
    } else {
        if (await fileExists(file.name, parentId, user.id)) {
            throw new Error("File already exists");
        }
    }

    let originalChildren = [];
    if (file.type === "FOLDER") {
        originalChildren = await prisma.file.findMany({
            where: {
                parentId: fileId
            }
        });
    }
    
    
    let copiedFile = null;
    
    if (file.mimeType.startsWith("video/") || file.mimeType.startsWith("image/")) {

        if (parentId) {
            await incrementPreviewCount(Number.parseInt(parentId));
        } else {
            await incrementPreviewCountRoot(user.id);
        }

        copiedFile = await prisma.file.create({
            data: {
                name: file.name,
                type: file.type,
                user: { connect: { id: user.id } },
                ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
                chunkStart: file.chunkStart,
                chunkEnd: file.chunkEnd,
                mimeType: file.mimeType,
                status: file.status
            }
        });
    } else {
        copiedFile = await prisma.file.create({
            data: {
                name: file.name,
                type: file.type,
                user: { connect: { id: user.id } },
                ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
                chunkStart: file.chunkStart,
                chunkEnd: file.chunkEnd,
                mimeType: file.mimeType
            }
        });
    }

    

    if (file.type === "FOLDER") {
        for (const childFile of originalChildren) {
            await saveCopyToDb(childFile, copiedFile.id, user);
        }
    }

    return copiedFile;

};

const saveCutToDb = async (fileToCopy, destinationFolderId, previewPaths) => {

    let file = null;

    if (!fileToCopy) return;

    if (fileToCopy.mimeType.startsWith('image/') || fileToCopy.mimeType.startsWith('video/')) {
        
        if (fileToCopy.parentId) {
            await decrementPreviewCount(Number.parseInt(fileToCopy.parentId));
        } else {
            await decrementPreviewCountRoot(fileToCopy.userId);
        }
        if (destinationFolderId) {
            await incrementPreviewCount(Number.parseInt(destinationFolderId));
        } else {
            await incrementPreviewCountRoot(fileToCopy.userId);
        }

        file = await prisma.file.update({
            where: {
                id: fileToCopy.id
            },
            data: {
                parentId: destinationFolderId,
                status: fileToCopy.status
            }
        });
    } else {
        file = await prisma.file.update({
            where: {
                id: fileToCopy.id
            },
            data: {
                parentId: destinationFolderId,
            }
        });        
    }
   
    return file;
    
};

const conditionalPromise = async (parsedMessage) => {
    console.log("Inside conditionalPromise, parsedMessage.type:", parsedMessage.type); 
    return new Promise((resolve) => {
        if (parsedMessage.type !== "PAUSE_SEARCH") {
            console.log("conditionalPromise: resolving"); 
            resolve();
        } else {
            console.log("conditionalPromise: NOT resolving, will block");
        }
    });
};

const getRootSize = async (userId) => {

    const size = await prisma.file.findFirst({
        where: {
            userId: userId
        },
        select: {
            previewCount: true
        }
    });

    return size;
};

const getSize = async (parentId) => {

    const size = await prisma.file.findFirst({
        where: {
            id: parentId
        },
        select: {
            previewCount: true
        }
    });

    return size;

};

const getSearchResult = async (message, user) => {
    const { searchTerm, cursor, take } = message;
    const takeVal = take ? Number.parseInt(take) : 30;


    const where = {
        userId: user.id,
        name: {
            startsWith: searchTerm,
            mode: 'insensitive'
        },
    };


    if (cursor) {

        const orConditions = [];

        orConditions.push({
            AND: [
                { type: cursor.type },
                {
                    OR: [
                        { name: { gt: cursor.name } },
                        { name: cursor.name, id: { gt: cursor.id } }
                    ]
                }
            ]
        });

        if (cursor.type === 'FOLDER') {
            orConditions.push({ type: 'FILE' });
        }
        

        where.AND = [
             ...(where.AND || []),
             { OR: orConditions }
        ];
    }

    const matchingFiles = await prisma.file.findMany({
        where: where,
        take: takeVal,
        orderBy: [
            { type: "desc" },
            { name: "asc" },
            { id: "asc" }
        ]
    });

    let nextCursor = null;
    if (matchingFiles.length === takeVal) {
        const lastFile = matchingFiles[takeVal - 1];
        nextCursor = {
            type: lastFile.type,
            name: lastFile.name,
            id: lastFile.id,
        };
    }
   
    return {
        files: matchingFiles,
        nextCursor: nextCursor,
    };
};


const getFullPaths = async (fileIds, orgPath) => {
    
    const res = [];

    for (let id of fileIds) {
        const temp = id ? await getPath(id, 0) : {path: "/", type: "FOLDER", name: ""};
        
        const path = `${orgPath}${temp.path}`;
        const type = temp.type;
        const name = temp.name;
        
        res.push({path: path, type: type, name: name, fileId: id});
    }
    
    return res;

};

const getFullPreviewPaths = async () => {};

const getPath = async (fileId, idx) => {

    const file = await getFileById(Number.parseInt(fileId));

    if (!file.parentId) {
        return {path: String("/" + file.name + (idx === 0 ? "" : "/")), type: file.type, name: file.name};
    }
    const name = file ? file.name : "";
    const slash = idx === 0 ? "" : "/";
    
    
    const temp = await getPath(file.parentId, idx + 1);

    const tempPath = temp.path + name + slash;
    
    return {path: tempPath, type: file.type, name: file.name};
};

const renameFile = async (fileId, newName, orgPath) => {

    
    const file = await prisma.file.findUnique({
        where: {
            id: fileId
        }
    });


    const res = await prisma.file.findFirst({
        where: {
            parentId: file.parentId,
            name: newName
        }
    });
    
    if (res) {
        return null;
    }

    // const { previewUrl, relativePath, previewPathWithoutFileName } = await getPreviewPaths(file.parentId, newName, file.userId);
    
    let updateName = null;

    if (file.mimeType.startsWith("video/") || file.mimeType.startsWith("image/")) {
       updateName = await prisma.file.update({
            where: {
                id: fileId
            },
            data: {
                name: newName,
                status: file.status
            }
        });
    } else {
       updateName = await prisma.file.update({
            where: {
                id: fileId
            },
            data: {
                name: newName,
            }
        });        
    }
    

    return updateName ? {fullPath: await getFullPaths([fileId], orgPath), file: updateName} : null;

};

const deleteFile = async (fileId) => {

    const file = await prisma.file.delete({
        where: {
            id: fileId
        }
    });

    if ((file.mimeType.startsWith("video/") || file.mimeType.startsWith("image/"))) {
        if (file) {
            if (file.parentId) {
                await decrementPreviewCount(Number.parseInt(file.parentId));
            } else {
                await decrementPreviewCountRoot(file.userId);
            }
        } 
    }

};


module.exports = {
    findUserById,
    findUserByUsername,
    registerUser,
    getFiles,
    fileStatus,
    getFileById,
    saveOrUpdateChunkedFileToDb,
    saveCopyToDb,
    saveCutToDb,
    saveRegularFileToDb,
    queryFilesByParent,
    saveFolderStructure,
    saveFolder,
    getPath,
    getFullPaths,
    renameFile,
    deleteFile,
    getSearchResult,
    updateFilePreview,
    getPreviewPaths,
    getFolderPath,
    getSize,
    getRootSize,
    updateStatus
}