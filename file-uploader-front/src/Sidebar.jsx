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

export default function Sidebar({ fileOptions, setFileOptions, uploadFile, uploadFolder, handleNewFolder }) {


    const handleNew = (e) => {
        e.stopPropagation()
        setFileOptions((fileOptions) => !fileOptions);
    };

    return (
        <StyledNewButtonContainer >
            {
                !fileOptions ? <StyledNewButton onClick={handleNew}>New</StyledNewButton> :
                 <UploadOptions 
                 uploadFile={uploadFile} uploadFolder={uploadFolder} handleNewFolder={handleNewFolder}
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

function UploadOptions({uploadFile, uploadFolder, handleNewFolder}) {


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
