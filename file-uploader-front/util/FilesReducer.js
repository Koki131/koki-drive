import LinkedList from "./LinkedList";

const filesReducer = (state, action) => {
    
    switch (action.type) {
      case 'file-transfer': {

        const fileData = action.payload;


        const newFolders = state.folders.clone();
        const newFiles = state.files.clone();

        let fileExists = null;
        if (fileData.type === 'FOLDER') {
          fileExists = newFolders.find(fileData);
        } else {
          fileExists = newFiles.find(fileData);
        }

        if (fileExists) {
          return state;
        }

        if (fileData.type === 'FOLDER') {
          newFolders.add(fileData);
        } else {
          newFiles.add(fileData);
        }

        return { folders: newFolders, files: newFiles };
      }

      case 'preview-complete': {

        const fileData = action.payload.file;

        const newFolders = state.folders.clone();
        const newFiles = state.files.clone();
        
        let fileNode = newFiles.find(fileData);;

        if (fileNode) {
            fileNode["previewUrl"] = action.payload.previewUrl;
        } else return state;

        return { folders: newFolders, files: newFiles };
      }

      case 'init-load': {
        return action.payload;
      }
      
      case 'lazy-load': {

        const filesToAdd = action.payload;
        // console.log(state, action);
        
        if (!filesToAdd || filesToAdd.length === 0) {
            return state;
        }

        let folderCount = 0;
        filesToAdd.forEach(file => {
            if (file.type === 'FOLDER') folderCount++;
        });
        const fileCount = filesToAdd.length - folderCount;

        const newFoldersBst = state.folders.clone(state.folders.size + folderCount);
        const newFilesBst = state.files.clone(state.files.size + fileCount);

        for (const file of filesToAdd) {
            if (file.type === 'FOLDER') {
            if (!newFoldersBst.find(file)) {
                newFoldersBst.add(file);
            }
            } else {
            if (!newFilesBst.find(file)) {
                newFilesBst.add(file);
            }
            }
        }
        
        return { folders: newFoldersBst, files: newFilesBst };
      }

      case 'rename-file': {
            
        const newFolders = state.folders.clone();
        const newFiles = state.files.clone();

        let {newFile, oldFile, name, conflictedFile} = action.payload;
        
        
        
        if (oldFile.type === "FOLDER") {
          if (conflictedFile) newFolders.delete(conflictedFile);
          newFolders.delete(oldFile);
          newFolders.add(newFile);
        } else {
          if (conflictedFile) newFiles.delete(conflictedFile);
          newFiles.delete(oldFile);
          newFiles.add(newFile);
        }

        return {folders: newFolders, files: newFiles};
      }

      default:
        return state;
    }
  };

  export default filesReducer;