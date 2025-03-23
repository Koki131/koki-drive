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

const saveFile = async (file, user) => {

    
    let parentId = null;
    
    const folders = Object.keys(file)[0].split("/");

    
    for (const segment of folders) {

        if (segment === '') continue;

        let folder = await prisma.file.findFirst({
            where: {
                userId: user.id,
                name: segment,
                parentId: parentId,
                type: "FOLDER"
            }
        });

        if (!folder) {
            folder = await prisma.file.create({
                data: {
                    user: {connect: {id: user.id}},
                    name: segment,
                    parent: parentId ? {connect: {id: parentId}} : {},
                    type: "FOLDER"
                }
            });
        }

        parentId = folder.id;
    }

    for (const filename of Object.values(file)[0]) {

        await prisma.file.create({
            data: {
                name: filename,
                type: "FILE",
                user: {connect:{id: user.id}},
                parent: parentId ? {connect: {id: parentId}} : {},
            }
        });
    }




};




module.exports = {
    findUserById,
    findUserByUsername,
    registerUser,
    getFiles,
    saveFile,
    queryFilesByParent
}