const { PrismaClient } = require('@prisma/client')

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

const getFileById = async (id) => {

    const res = await prisma.file.findFirst({
        where: {
            id: id
        }
    });

    return res;

};

const queryFilesByParent = async (userId, parent) => {
    const parentId = parent ? Number.parseInt(parent) : null;

    const res = await prisma.file.findMany({
        where: {
            userId: userId,
            parentId: parentId,
        }
    });
    
    return res;

};

const saveFolderStructure = async (filePath, user) => {
    
    let parentId = null;
    
    const folders = filePath.split("/");
    
    for (const segment of folders) {

        if (segment === '') continue;

        let folder = await prisma.file.findFirst({
            where: {
                userId: user.id,
                name: segment,
                parentId: parentId,
                type: "FOLDER",
            }
        });

        if (!folder) {         
            folder = await prisma.file.create({
                data: {
                    user: {connect: {id: user.id}},
                    name: segment,
                    parent: parentId ? {connect: {id: parentId}} : {},
                    type: "FOLDER",
                }
            });
        }

        parentId = folder.id;
    }
    return parentId;
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


const saveOrUpdateChunkedFileToDb = async (obj, chunkData, user) => {

    const parentId = obj.parentId;
    const fileName = obj.fileName;

    
    const file = await fileExists(fileName, parentId, user.id);

    if (!file) {
        // console.log(fileName);
        
        await prisma.file.create({
            data: {
                name: fileName,
                type: "FILE",
                user: {connect:{id: user.id}},
                parent: parentId ? {connect: {id: parentId}} : {},
                chunkStart: chunkData.start,
                chunkEnd: chunkData.end,
            }
        });
    } else {
        
        await prisma.file.update({

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

};

const getFullPaths = async (fileIds, orgPath) => {
    
    const res = [];

    for (let id of fileIds) {
        const temp = await getPath(id, 0);
        
        const path = `${orgPath}${temp.path}`;
        const type = temp.type;

        res.push({path: path, type: type});
    }
    
    return res;

};

const getPath = async (fileId, idx) => {

    const file = await getFileById(Number.parseInt(fileId));

    if (!file.parentId) {
        return {path: "/" + file.name + "/", type: file.type};
    }
    const name = file ? file.name : "";
    const slash = idx === 0 ? "" : "/";

    const tempPath = await getPath(file.parentId, idx + 1).path + name + slash;

    return {path: tempPath, type: file.type};
};



module.exports = {
    findUserById,
    findUserByUsername,
    registerUser,
    getFiles,
    fileStatus,
    saveOrUpdateChunkedFileToDb,
    saveRegularFileToDb,
    queryFilesByParent,
    saveFolderStructure,
    getFullPaths
}