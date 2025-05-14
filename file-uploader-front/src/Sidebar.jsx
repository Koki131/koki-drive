import styled from "styled-components";
import newImg from "./assets/images/new.svg";
import { useAuth } from "./AuthProvider";

const StyledNewButtonContainer = styled.div`
  width: 5vw;
  display: flex;
  align-items: start;
  justify-content: center;
  position: fixed;
  ${props => props.displayMode && `
    background-color: #252424;
  `}
  ${props => !props.displayMode && `
    background-color: #dedede;
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
        box-shadow: ${props => (props.displayMode ? 'rgba(17, 17, 26, 0.8) 0px 0px 3px' : 'rgba(100, 100, 100, 0.5) 0px 0px 3px')};
    }
`;

const StyledNewButtonImg = styled.img`
  margin-top: 1vw;
  width: 2vw;
  z-index: 999;

  &:hover {
    cursor: pointer;
  }

`
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


export default function Sidebar({ fileOptions, setFileOptions, uploadFile, uploadFolder, handleNewFolder }) {

    const { displayMode } = useAuth();

    const handleNew = (e) => {
        e.stopPropagation();        
        setFileOptions((fileOptions) => !fileOptions);
    };

    return (
        <StyledNewButtonContainer displayMode={displayMode}>
            {
                !fileOptions ? <StyledNewButtonImg onClick={handleNew} src={newImg}></StyledNewButtonImg> :
                 <UploadOptions 
                 uploadFile={uploadFile} uploadFolder={uploadFolder} handleNewFolder={handleNewFolder}
                 />
            }
            <div className="shadow"></div>
        </StyledNewButtonContainer>
    );
};


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
