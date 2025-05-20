import styled from "styled-components";
import fileImg from "./assets/images/file-outline.svg";
import folderImg from "./assets/images/folder-outline.svg";
import { useAuth } from "./AuthProvider";
import { useRef } from "react";

const StyledNewButtonContainer = styled.div`
  width: 10vw;
  display: flex;
  align-items: start;
  /* justify-content: center; */
  flex-direction: column;
  position: fixed;
  ${props => props.displayMode && `
    background-color: #252424;
  `}
  ${props => !props.displayMode && `
    background-color: #f5f5f5;
  `}
  top: 3vw;
  height: calc(100vh - 3vw);
  z-index: 999;

  .shadow {
        position: absolute;
        right: 0;
        top: 0;
        height: calc(100vh - 3vw);
        width: 100%;
        /* box-shadow: ${props => (props.displayMode ? '5px 0px 5px rgba(17, 17, 26, 0.8)' : '0px 10px 2px rgba(100, 100, 100, 0.5)')}; */
    }
`;
const StyledNewButtonImg = styled.img`
  padding-left: 1.5vw;
  margin-top: 1vw;
  width: 2vw;
  z-index: 999;

  &:hover {
    cursor: pointer;
  }

`
const StyledUploadOptionsContainer = styled.div`
    margin-top: 1vw;
    display: flex;
    padding-left: 1vw;
    padding-right: 1vw;
    flex-direction: column;
    left: 0;
    z-index: 1000;
    border-radius: 10px;
    gap: 0.5vw;
`
const CustomUploadInput = styled.input`
    display: none;
`
const CustomUploadLabel = styled.label`
    color: ${props => props.displayMode ? "white" : "black"};
    font-size: 0.8vw;
    &:hover {
        cursor: pointer;
    }
`

const CustomForm = styled.form`
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    font-size: 0.8vw;

`
const CustomFileImg = styled.img`
    width: 1.5vw;
    margin-right: 0.6vw;
`
const CustomFolderImg = styled.img`
    width: 1.5vw;
    margin-right: 0.6vw;
`
const CustomNewFolder = styled.svg`
    width: 1.5vw;
    margin-right: 0.6vw;
`
const NewFolderContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;

`


export default function Sidebar({ fileOptions, setFileOptions, uploadFile, uploadFolder, handleNewFolder }) {

    const { displayMode } = useAuth();

    const handleNew = (e) => {
        e.stopPropagation();        
        setFileOptions((fileOptions) => !fileOptions);
    };

    return (
        <StyledNewButtonContainer displayMode={displayMode}>
            
            {/* <StyledNewButtonImg onClick={handleNew} src={newImg}></StyledNewButtonImg>  */}
            {<UploadOptions 
            displayMode={displayMode} uploadFile={uploadFile} uploadFolder={uploadFolder} handleNewFolder={handleNewFolder}
            />}
            
            <div className="shadow"></div>
        </StyledNewButtonContainer>
    );
};


function UploadOptions({displayMode, uploadFile, uploadFolder, handleNewFolder}) {
    const fileRef = useRef(null);
    const folderRef = useRef(null);

    const handleFileChange = (e) => {
        e.preventDefault();

        fileRef.current.requestSubmit();
    }
    
    const handleFolderChange = (e) => {
        e.preventDefault();

        folderRef.current.requestSubmit();
    };
    
    return (
        <StyledUploadOptionsContainer onClick={(e) => e.stopPropagation()}>
            
            <NewFolderContainer>
                <CustomNewFolder xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9028f9" onClick={handleNewFolder}>
                    <title>folder-plus-outline</title>
                    <path d="M13 19C13 19.34 13.04 19.67 13.09 20H4C2.9 20 2 19.11 2 18V6C2 4.89 2.89 4 4 4H10L12 6H20C21.1 6 22 6.89 22 8V13.81C21.39 13.46 20.72 13.22 20 13.09V8H4V18H13.09C13.04 18.33 13 18.66 13 19M20 18V15H18V18H15V20H18V23H20V20H23V18H20Z" />
                </CustomNewFolder>
                <CustomUploadLabel onClick={handleNewFolder} displayMode={displayMode}>New Folder</CustomUploadLabel>
            </NewFolderContainer>
            <CustomForm ref={fileRef} encType="multipart/form-data" onSubmit={(e) => uploadFile(e)}>
                <CustomFileImg src={fileImg}></CustomFileImg>
                <CustomUploadLabel displayMode={displayMode} htmlFor="file-upload">Upload File</CustomUploadLabel>
                <CustomUploadInput 
                id="file-upload" 
                type="file" 
                onChange={(e) => handleFileChange(e)}
                />
            </CustomForm>
            
            <CustomForm ref={folderRef} method="POST" encType="multipart/form-data" onSubmit={(e) => uploadFolder(e)}>
                <CustomFolderImg src={folderImg}></CustomFolderImg>
                <CustomUploadLabel displayMode={displayMode} htmlFor="folder-upload">Upload Folder</CustomUploadLabel>
                <CustomUploadInput 
                id="folder-upload" 
                type="file" 
                webkitdirectory=""
                onChange={(e) => handleFolderChange(e)}
                />
            </CustomForm>
        </StyledUploadOptionsContainer>
    );
};
