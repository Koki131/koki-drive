import styled from "styled-components";


const StyledNewButtonContainer = styled.div`
  width: 5vw;
  display: flex;
  align-items: start;
  justify-content: center;
  position: fixed;
  background-color: #252424;
  top: 3vw;
  height: calc(100vh - 3vw);
  z-index: 999;
  
  .shadow {
        position: absolute;
        right: 0;
        top: 0;
        height: calc(100vh - 3vw);
        width: 100%;
        box-shadow: rgba(17, 17, 26, 0.5) 3px 0px 0px;
    }
`;

const StyledNewButton = styled.button`
  background-color: rgba(102, 51, 153, 0.6);
  color: white;
  border: none;
  margin-top: 10px;
  border-radius: 4px;
  padding: 10px 15px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: rgba(102, 51, 153, 0.9);
  }

`

export default function Sidebar({ fileOptions, setFileOptions, files, setFiles, folderId }) {


    const handleNew = (e) => {
        e.stopPropagation()
        setFileOptions((fileOptions) => !fileOptions);
    };

    return (
        <StyledNewButtonContainer>
            {
                !fileOptions ? <StyledNewButton onClick={handleNew}>New</StyledNewButton> : <UploadOptions onClick={(e) => e.stopPropagation()} files={files} setFiles={setFiles} folderId={folderId}/>
            }
            <div className="shadow"></div>
        </StyledNewButtonContainer>
    );
};

const StyledUploadOptionsContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    position: absolute;
    background-color: white;
`

function UploadOptions({ files, setFiles, folderId }) {

    const handleNewFolder = () => {};
    const uploadFile = (e) => {

        console.log(e.target)
    };
    const uploadFolder = async (e) => {
        e.preventDefault();
        const form = e.target;
        const batch = [];
        const paths = {};
        let size = 0;

        for (let file of form[0].files) {

            const pathArr = file.webkitRelativePath.split("/");
            const len = pathArr.length;
            let path = [];
            for (let i = 0; i < len-1; i++) {
                const p = pathArr[i];
                path.push(p);
                path.push("/");
            }

            
            let relativePath = path.join("");
            if (!paths[relativePath]) {
                paths[relativePath] = [];
            }
            paths[relativePath].push(pathArr[len-1]);
            
            
            let formData = new FormData();

            if (file.size <= (100 * 1024 * 1024)) {
                
                size += file.size;

                batch.push([file, relativePath]);

                if (size >= 1000 * 1024 * 1024) {
                    while (batch.length > 0) {
                        let popped = batch.pop();
                        formData.append("relative_path", popped[1]);
                        formData.append("folder_upload", popped[0]);
                    }
                    
                    size = 0;
                    await fetch("http://localhost:3000/uploadFolder", {
                        method: "POST",
                        credentials: "include",
                        body: formData
                    });

                }
            } else {
                formData.append("relative_path", relativePath);
                formData.append("folder_upload", file);
        
                await fetch("http://localhost:3000/uploadFolder", {
                    method: "POST",
                    credentials: "include",
                    body: formData
                });
            }

            file = null;
        }

        if (batch.length > 0) {
            const formData = new FormData();

            while (batch.length > 0) {
                let popped = batch.pop();
                formData.append("relative_path", popped[1]);
                formData.append("folder_upload", popped[0]);
            }
            await fetch("http://localhost:3000/uploadFolder", {
                method: "POST",
                credentials: "include",
                body: formData
            });
        }

        for (const path of Object.keys(paths)) {
            const obj = {};
            obj[path] = paths[path];

            await fetch("http://localhost:3000/savePath", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(obj),
            });

        }

    };

    return (
        <StyledUploadOptionsContainer>
            <button onClick={handleNewFolder}>New Folder</button>
            <form onSubmit={(e) => uploadFile(e)} encType="multipart/form-data">
                <input type="file"/>
                <button type="submit">Submit</button>
            </form>
            <form onSubmit={(e) => uploadFolder(e)}>
                <input type="file" webkitdirectory="" multiple encType="multipart/form-data" />
                <button type="submit">Submit</button>
            </form>
        </StyledUploadOptionsContainer>
    );
};
