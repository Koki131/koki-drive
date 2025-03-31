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
const apiUrl = import.meta.env.VITE_API_URL;
export default function Sidebar({ fileOptions, setFileOptions, files, setFiles, folderId, updateFiles, setUpdateFiles, status, setStatus}) {


    const handleNew = (e) => {
        e.stopPropagation()
        setFileOptions((fileOptions) => !fileOptions);
    };

    return (
        <StyledNewButtonContainer >
            {
                !fileOptions ? <StyledNewButton onClick={handleNew}>New</StyledNewButton> :
                 <UploadOptions 
                    files={files} setFiles={setFiles} folderId={folderId} 
                    updateFiles={updateFiles} setUpdateFiles={setUpdateFiles} status={status} setStatus={setStatus}
                 />
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

function UploadOptions({ files, setFiles, folderId, updateFiles, setUpdateFiles, status, setStatus }) {

    const handleNewFolder = () => {};
    
    const uploadFile = (e) => {

        console.log(e.target)
    };

    const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
        const controller = new AbortController();
        const signal = controller.signal;
        options.signal = signal;
        
        const timer = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, options);
            clearTimeout(timer); 
            return response;
        } catch (error) {
            clearTimeout(timer);
            throw error;
        }
    }
    const retryFetch = async (url, options = {}, retries = 3, timeout = 10000, backoff = 500) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await fetchWithTimeout(url, options, timeout);
                if (!response.ok) {
                    throw new Error(`Server responded with status ${response.status}`);
                }
                return response;
            } catch (error) {
                console.error(`Attempt ${attempt} failed: ${error.message}`);
                if (attempt === retries) {
                    throw error;
                }

                await new Promise(resolve => setTimeout(resolve, backoff));
                backoff *= 2; // Exponential increase for subsequent retries
            }
        }
    }
    const uploadFolder = async (e) => {
        e.preventDefault();
        const form = e.target;
        const batch = [];
        let pathBatch = [];
        let pathToId = {};
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
            
            // ******* IMPORTANT ***********
            // if (!pathToId[relativePath]) {
    
            //     // send path
            //     const req = await fetch("http://localhost:3000/savePath", {
            //         method: "POST",
            //         headers: {
            //             "Content-Type": "application/json",
            //         },
            //         credentials: "include",
            //         body: JSON.stringify({ relativePath: relativePath }),
            //     });
            //     const res = await req.json();

            //     pathToId[relativePath] = res.parentId;

            // }
            
            
            if (file.size <= (100 * 1024 * 1024)) {
                let formData = new FormData();
                
                size += file.size;

                batch.push([file, relativePath]);
                // pathBatch.push({parentId: pathToId[relativePath], fileName: pathArr[len-1]});

                if (size >= 100 * 1024 * 1024 || batch.length >= 100) {
                    let len = batch.length;
                    while (batch.length > 0) {
                        let popped = batch.pop();
                        formData.append("relative_path", popped[1]);
                        formData.append("file", popped[0]);
                    }
                    
                    size = 0;
                    
                    // await fetch("http://localhost:3000/saveFiles", {
                    //     method: "POST",
                    //     headers: {
                    //         "Content-Type" : "application/json"
                    //     },
                    //     credentials: "include",
                    //     body: JSON.stringify(pathBatch)
                    // });
                    // pathBatch = [];
                    
                    
                    await retryFetch(`${apiUrl}/uploadFolder`, {
                        method: "POST",
                        credentials: "include",
                        body: formData
                    }, 3, 10000, 500);

                    setStatus(prevStatus => ({action: "upload", data: {currentCount: prevStatus.data.currentCount + len, totalCount: form[0].files.length}}));

                }
            } else {
                let formData = new FormData();
                formData.append("relative_path", relativePath);
                formData.append("file", file);

                // await fetch("http://localhost:3000/saveFiles", {
                //     method: "POST",
                //     headers: {
                //         "Content-Type" : "application/json"
                //     },
                //     credentials: "include",
                //     body: JSON.stringify([{parentId: pathToId[relativePath], fileName: pathArr[len-1]}])
                // });
        
                const req = await fetch(`${apiUrl}/uploadFolder`, {
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
            while (batch.length > 0) {
                let popped = batch.pop();

                formData.append("relative_path", popped[1]);
                formData.append("file", popped[0]);
            }

            // await fetch("http://localhost:3000/saveFiles", {
            //     method: "POST",
            //     headers: {
            //         "Content-Type" : "application/json"
            //     },
            //     credentials: "include",
            //     body: JSON.stringify(pathBatch)
            // });
            // pathBatch = [];

            await retryFetch(`${apiUrl}/uploadFolder`, {
                method: "POST",
                credentials: "include",
                body: formData
            }, 3, 10000, 500);
            
            setStatus(prevStatus => ({action: "upload", data: {currentCount: prevStatus.data.currentCount + len, totalCount: form[0].files.length}}));
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
            <form onSubmit={(e) => uploadFolder(e)} method="POST">
                <input type="file" webkitdirectory="" encType="multipart/form-data" />
                <button type="submit">Submit</button>
            </form>
        </StyledUploadOptionsContainer>
    );
};
