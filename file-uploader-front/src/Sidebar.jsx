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
  z-index: 999;

  &:hover {
    background-color: rgba(102, 51, 153, 0.9);
  }

`

export default function Sidebar({ fileOptions, setFileOptions, files, setFiles, folderId, status, setStatus}) {


    const handleNew = (e) => {
        e.stopPropagation()
        setFileOptions((fileOptions) => !fileOptions);
    };

    return (
        <StyledNewButtonContainer >
            {
                !fileOptions ? <StyledNewButton onClick={handleNew}>New</StyledNewButton> :
                 <UploadOptions files={files} setFiles={setFiles} folderId={folderId} status={status} setStatus={setStatus}/>
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
    left: 10%;
    z-index: 999;
`

function UploadOptions({ files, setFiles, folderId, status, setStatus }) {

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

        setStatus({action: "upload", data: {currentCount: 0, totalCount: form[0].files.length}});

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
                    let len = batch.length;
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

                    setStatus(prevStatus => ({action: "upload", data: {currentCount: prevStatus.data.currentCount + len, totalCount: form[0].files.length}}));

                }
            } else {
                formData.append("relative_path", relativePath);
                formData.append("folder_upload", file);
        
                await fetch("http://localhost:3000/uploadFolder", {
                    method: "POST",
                    credentials: "include",
                    body: formData
                });
                setStatus(prevStatus => ({action: "upload", data: {currentCount: prevStatus.data.currentCount + 1, totalCount: form[0].files.length}}));
            }

            file = null;
        }

        if (batch.length > 0) {
            const formData = new FormData();
            let len = batch.length;
            let size = 0;
            while (batch.length > 0) {
                let popped = batch.pop();
                size += popped[0].size;
                formData.append("relative_path", popped[1]);
                formData.append("folder_upload", popped[0]);
            }
            await fetch("http://localhost:3000/uploadFolder", {
                method: "POST",
                credentials: "include",
                body: formData
            });
            
            setStatus(prevStatus => ({action: "upload", data: {currentCount: prevStatus.data.currentCount + len, totalCount: form[0].files.length}}));
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
        setStatus({action: "", data: {currentCount: 0, totalCount: 0}});
    };

    return (
        <StyledUploadOptionsContainer  onClick={(e) => e.stopPropagation()}>
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
