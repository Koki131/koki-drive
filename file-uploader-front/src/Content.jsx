import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { isEqual } from 'lodash';
import styled, { keyframes } from 'styled-components';
import Sidebar from './Sidebar';
import fileImage from './assets/images/file.svg';
import folderImage from './assets/images/folder.svg';
import zipImage from './assets/images/folder-zip.svg';
import menuUp from './assets/images/menu-up.svg';
import menuDown from './assets/images/menu-down.svg';

const ContentContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: 100vw;
`;

const Files = styled.div`
  flex: 1;
  margin-left: 5vw;
  margin-top: 3vw;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  height: calc(100vh - 3vw);
  position: relative;
  color: white;
  background-color: #0000004a;
  -webkit-user-select: none;
  -ms-user-select: none;
  user-select: none; 
`;
const FolderContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
`;
const FileContainer = styled.div`
  height: 100px;
  padding: 10px;
`
const FileTempContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100px;
`
const FileImage = styled.img`
  width: 50px;
`
const FileName = styled.p`
  display: flex;
  width: 70px;
  align-items: center;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
  justify-content: center;
  text-align: center;
  display: block;
  font-size: 11px;
  height: 100%;
  overflow: hidden;
  padding: 5px;
`
const Progress = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  margin: 10px;
  width: 25%;
  background-color: #2b2b2b;
  display: flex;
  flex-direction: column;
  color: white;
`
const ProgressHeader = styled.div`
  border: 1px solid rgba(0,0,0,0.2);
  width: 100%;
  height: 30px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75vw;
`

const ProgressBar = styled.div`
  border: 1px solid rgba(0,0,0,0.2);
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row;
`
const spin = keyframes`
  to {
    transform: rotate(360deg);
  }

`

const Loader = styled.div`
  color: black;
  margin-right: 5px;
  width: 15px;
  height: 15px;
  border: 1px solid #5b5b5b;
  border-top: 1px solid #a0ea1a;
  border-right: 1px solid #a0ea1a;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`
const Minimize = styled.p`
  color: black;
  margin-right: 10px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    cursor: pointer;
  }
`
const StyledMenuArrow = styled.img`
`

const RightContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`
const ContentSize = styled.div`
  margin-left: 5px;
`

const StyledBar = styled.div`
  width: 80%;
  height: 10%;
  background-color: grey;
  position: relative;
  margin-left: 2%;

  .styled-bar-fill {
    position: absolute;
    background-color: #7F00FF;
    height: 100%;
    transition: 0.1s ease;
  }
`
const StyledFileCount = styled.div`
  font-size: 0.7vw;
  margin-right: 2%;
`

let grid = {};
let width = 100;
let height = 100;
let fileCoords = {};

export default function Content({ fileOptions, setFileOptions }) {

  const navigate = useNavigate();
  const fileContainerRef = useRef(null);
  const { folderId } = useParams();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(-1);
  const [highlight, setHighlight] = useState({fileId: -2, highlight: false});
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);
  const [selectionStart, setSelectionStart] = useState({startPoint: null, isSelecting: false});
  const [containerRect, setContainerRect] = useState(null);
  const [minimize, setMinimize] = useState(false);
  const [status, setStatus] = useState({action: "", data: {currentCount: 0, totalCount: 0}});
  const [updateFiles, setUpdateFiles] = useState(false);


  useEffect(() => {
    const handleMouseUp = (e) => {
      if (selectionStart.isSelecting) {
        setSelectionStart({startPoint: null, isSelecting: false});
        setSelectionBox(null);
      }
    };

    const handleMouseMove = (e) => {
      if (!selectionStart.isSelecting || !containerRect) return;
      
      
      let currentX = Math.max(0, Math.round(e.clientX - containerRect.left));
      let currentY = Math.max(0, Math.round(e.clientY - containerRect.top + fileContainerRef.current.scrollTop));
    
      
      const x = Math.min(currentX, selectionStart.startPoint.x);
      const y = Math.min(currentY, selectionStart.startPoint.y);
      const width = Math.abs(currentX - selectionStart.startPoint.x);
      const height = Math.abs(currentY - selectionStart.startPoint.y);
      getFilesInSelection({ x, y, currentX, currentY, width, height });
      setSelectionBox({ x, y, currentX, currentY, width, height });
    };
    

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [selectionStart.isSelecting]);


  useEffect(() => {

    const getFiles = async () => {
        try {
          const parent = folderId ? folderId : "";
          const request = await fetch("http://localhost:3000/getFilesByParent?parent=" + parent, {
              method: "GET",
              headers: { "Content-Type" : "text/plain"},
              credentials: 'include'
          });
          const response = await request.json();
          if (!isEqual(response.files, files)) {
            setLoading(true);
            setFiles(response.files);
          } 
          
        } catch (e) {
          console.error(e);
          
        } finally {
          setLoading(false);
        }
    };

    getFiles();
    
  }, [folderId, updateFiles]);


  const handleClick = (file) => {

    if (file.type === "FOLDER") {
      navigate(`/folders/${file.id}`);
    }

  };


  const handleSelected = (e, fileId) => {
    e.stopPropagation();
    setSelectedFile(fileId);
  };

  const handleHighlight = (fileId, shouldHighlight) => {
    setHighlight({fileId, shouldHighlight});
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (!fileContainerRef.current) return;
  
    setSelectedFiles(null);
    setFileOptions(false);

    const containerRect = fileContainerRef.current.getBoundingClientRect();

    const startX = Math.round(e.clientX - containerRect.left);
    const startY = Math.round((e.clientY + fileContainerRef.current.scrollTop) - containerRect.top);
    
    setContainerRect(containerRect);
    setFileSize();
    setSelectionStart({startPoint: { x: startX, y: startY }, isSelecting: true});
    
  };

  const setFileSize = () => {
    const file = fileContainerRef.current.querySelector('[data-file-id]');
    
    if (!file) return;

    const rect = file.getBoundingClientRect();
    

    width = Math.round(rect.width);
    height = Math.round(rect.height);

    const fileImage = file.querySelector('[file-image-id]');
    const fileName = file.querySelector('[file-name-id]');
    const fileImageRect = fileImage.getBoundingClientRect();
    const fileNameRect = fileName.getBoundingClientRect();
    
    const xImage = Math.round(fileImageRect.left - rect.left);
    const yImage = Math.round(fileImageRect.top - rect.top);
    const xName = Math.round(fileNameRect.left - rect.left);
    const yName = Math.round(fileNameRect.top - rect.top);
    
    fileCoords["image"] = {x: xImage, y: yImage, width: fileImageRect.width, height: fileImageRect.height};
    fileCoords["name"] = {x: xName, y: yName, width: fileNameRect.width, height: fileNameRect.height};
    
    getFileRects();
  };

  const getFileRects = () => {
    if (!loading && fileContainerRef.current) {
      
      const containerRect = fileContainerRef.current.getBoundingClientRect();
      const fileElements = fileContainerRef.current.querySelectorAll('[data-file-id]');

      let rect = null;
      grid = {};

      const coords = Array.from(fileElements).map((el, index) => {
        const fileId = el.getAttribute('data-file-id');
        rect = el.getBoundingClientRect();
        let valX = (Math.floor((rect.left - containerRect.left) / 100)) * (100 + Math.floor(rect.width) % 100);

        
        return {
          fileId,
          x: valX,
          y: Math.round((rect.top + fileContainerRef.current.scrollTop) - containerRect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });

      coords.forEach((file) => {
        const r = Math.floor(file.y / file.height);
        const c = Math.floor(file.x / file.width);

        const key = `${r}_${c}`;
        
        file["image"] = {
          x: Math.floor(fileCoords["image"].x + c * rect.width), 
          y: Math.floor(fileCoords["image"].y + r * rect.height), 
          width: fileCoords["image"].width, height: fileCoords["image"].height
        };
        file["name"] = {
          x: Math.floor(fileCoords["name"].x + c * rect.width), 
          y: Math.floor(fileCoords["name"].y + r * rect.height), 
          width: fileCoords["name"].width , height: fileCoords["name"].height
        };
        grid[key] = file;

      });
      
    }
  };

  const getFilesInSelection = (selectionBox) => {    
    
    
    const startRow = Math.floor(selectionBox.y / height);
    const startCol = Math.floor(selectionBox.x / width);
    const endRow = Math.floor((selectionBox.y + selectionBox.height) / height);
    const endCol = Math.floor((selectionBox.x + selectionBox.width) / width);
    
    const tempFiles = {};
    
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const key = `${r}_${c}`;
        if (grid[key]) {
          if (rectanglesIntersect(grid[key]["image"], selectionBox) || rectanglesIntersect(grid[key]["name"], selectionBox)) {
            tempFiles[grid[key]["fileId"]] = grid[key];
          }
        }
      }
    }
    
    
    
    setSelectedFiles(tempFiles);
    
    
  }
  
  const rectanglesIntersect = (rectA, rectB) => {
    // console.log(rectA, rectB);
    
    return (
      rectA.x < rectB.x + rectB.width &&         
      rectA.x + rectA.width > rectB.x &&           
      rectA.y < rectB.y + rectB.height &&          
      rectA.y + rectA.height > rectB.y            
    );
  }

  const handleMinimize = (e) => {
    setMinimize(!minimize);
  }

  return (
    <ContentContainer>
      <Sidebar 
        fileOptions={fileOptions} setFileOptions={setFileOptions} files={files} setFiles={setFiles} 
        folderId={folderId} updateFiles={updateFiles} 
        setUpdateFiles={setUpdateFiles} status={status} setStatus={setStatus} 
      />
      <Files ref={fileContainerRef} onClick={(e) => handleSelected(e, null)} onMouseDownCapture={(e) => handleMouseDown(e)}>
        {loading ? (
          <p>Loading files...</p>
        ) : 
          <FolderContainer>
            {files.map((file) => (
              <FileContainer
                key={file.id}
                data-file-id={file.id}
              >
                <FileTempContainer
                  onClick={(e) => handleSelected(e, file.id)} 
                  onDoubleClick={() => handleClick(file)}
                  onMouseEnter={() => handleHighlight(file.id, true)} onMouseLeave={() => handleHighlight(file.id, false)}  
                >
                  <FileImage file-image-id={file.id} src={file.type === "FOLDER" ? folderImage : fileImage} 
                  alt="file or folder image"/>
                  <FileName file-name-id={file.id} style={
                  {backgroundColor: (file.id === selectedFile || (selectedFiles && selectedFiles[file.id])) ? "rgba(102, 51, 153, 0.4)" : 
                  (file.id === highlight.fileId && highlight.shouldHighlight) ? "rgba(102, 51, 153, 0.2)" : "transparent"}
                }>
                  {file.name}
                  </FileName>
                </FileTempContainer>
              </FileContainer>
          ))}
          </FolderContainer>
        }
        <SelectionBox selectionBox={selectionBox}/>
      
      </Files>
      {status.action !== "" && <Progress>
        <ProgressHeader>
          <ContentSize>{status.action === "download" ? "Downloading" : "Uploading"}</ContentSize>
          <RightContainer>
            <Loader></Loader>
            <Minimize onClick={handleMinimize}>{minimize ? <StyledMenuArrow src={menuUp}></StyledMenuArrow> : <StyledMenuArrow src={menuDown}></StyledMenuArrow>}</Minimize>
          </RightContainer>
        </ProgressHeader>
        {!minimize && <ProgressBar style={{justifyContent: status.action === "final" ? "center" : "space-between"}}>
          {(status.action !== "download" && status.action !== "final") && <StyledBar>
            <div className='styled-bar-fill' style={{width: `${(status.data.currentCount * 100) / status.data.totalCount}%`}}></div>
          </StyledBar>}
          <StyledFileCount>
            {status.action === "download" ? "Zipping file" : status.action === "upload" ? `${status.data.currentCount} of ${status.data.totalCount} files` : "Finalizing"}
          </StyledFileCount>
        </ProgressBar>}
      </Progress>}
    </ContentContainer>
  );
}

function SelectionBox({ selectionBox }) {
  return (
    selectionBox && <div
    style={{
      position: 'absolute',
      left: selectionBox.x,
      top: selectionBox.y,
      width: selectionBox.width,
      height: selectionBox.height,
      border: '1px solid rgba(255,255,255,0.2)',
      backgroundColor: 'rgba(134, 69, 199, 0.2)',
    }}
  />
  );
};
