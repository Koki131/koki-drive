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
import close from './assets/images/close.svg';
import copyImg from "./assets/images/copy.svg";
import cutImg from "./assets/images/cut.svg";
import renameImg from "./assets/images/rename.svg";
import downloadImg from "./assets/images/download.svg";
import pasteImg from "./assets/images/paste.svg";
import deleteImg from "./assets/images/delete.svg";
import newImg from "./assets/images/new.svg";
import { useAuth } from './AuthProvider';


const ContentContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: 100vw;
`;

const Files = styled.div`
  flex: 1;
  margin-left: 10vw;
  margin-top: 3vw;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  height: calc(100vh - 3vw);
  position: relative;
  ${props => props.displayMode && `
    background-color: #0000004a;
    color: white;
  `}
  ${props => !props.displayMode && `
    background-color: #ffffff;
    color: black;
  `}
  -webkit-user-select: none;
  -ms-user-select: none;
  user-select: none; 
`;
const FolderContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, 100px);
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
const ProgressContainer = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20%;
  display: flex;
  align-items: center;
  flex-direction: column;
  max-height: calc(100vh - 5vw);
  overflow-y: auto;
  box-shadow: rgba(0, 0, 0, 0.16) 0px 1px 4px;
`
const MinimizeContainer = styled.div`
  ${props => props.displayMode && `
    background-color: #2b2b2b;
  `};
  ${props => !props.displayMode && `
    background-color: #dedede;
  `};
  width: 100%;
`
const Progress = styled.div`
  width: 100%;
  ${props => props.displayMode && `
    background-color: #2b2b2b;
    color: white;
  `};
  ${props => !props.displayMode && `
    background-color: #ffffff;
    color: black;
  `};
  display: flex;
  flex-direction: column;
`
const ProgressHeader = styled.div`
  border-top: 1px solid rgba(254, 254, 254, 0.2);
  width: 100%;
  height: 30px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75vw;
`

const ProgressBar = styled.div`
  border-bottom: 1px solid rgba(0,0,0,0.2);
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 1vw;
`
const RightContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
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
const Pause = styled.svg`
  width: 15px;
  height: 15px;
  margin-right: 5px;
  ${props => props.displayMode && `
    fill: #a0ea1a;
  `};
  ${props => !props.displayMode && `
    fill: #9028f9;
  `};
  cursor: pointer;
`
const Close = styled.svg`
  width: 15px;
  height: 15px;
  margin-right: 5px;
  ${props => props.displayMode && `
    fill: #a0ea1a;
  `};
  ${props => !props.displayMode && `
    fill: #9028f9;
  `};
  cursor: pointer;
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

const ContentSize = styled.div`
  margin-left: 5px;
`

const bounceAnimation = keyframes`
  0% { left: 0; }
  50% { left: 70%; }
  100% { left: 0; }
`;

const StyledBar = styled.div`
  width: 80%;
  height: 10%;
  ${props => props.displayMode ? `
    background-color: grey;
  ` : `
    background-color: #dedede;
  `}
  position: relative;
  margin-left: 2%;

  .styled-bar-fill {
    position: absolute;
    background-color: #7F00FF;
    height: 100%;
    transition: 0.1s ease;
  }
  
  .styled-bar-fill-bounce {
    position: absolute;
    background-color: #7F00FF;
    height: 100%;
    transition: 0.3s ease;
    width: 30%;
    animation: ${bounceAnimation} 2s infinite;
  }
  
  .styled-upload-header {
    position: absolute;
    top: 0;
  }
`;
const StyledFileCount = styled.div`
  font-size: 0.7vw;
  margin-right: 2%;
`
const TextArea = styled.textarea`
  width: 70px;
  resize: none;
  background: none;
  color: white;
  border: none;
  overflow: hidden;
  font-size: 11px;
  
  &:focus {
    outline: none;
  }
`
const NewFolderWindow = styled.div`
  display: grid;
  grid-template-rows: repeat(1fr, auto);
  position: absolute;
  top: 50%;
  left: 50%;
  margin: 0;
  transform: translate(-50%, -50%);
  width: 20vw;
  height: 30vh;
  background-color: ${props => !props.displayMode ? "#f5f5f5" : "#252424"};
  border-radius: 34px;
  padding: 1vw;
  z-index: 1;
`
const NewFolderHeaderContainer = styled.div`
  display: flex;
  align-items: center;
  color: ${props => !props.displayMode ? "black" : "white"};
`
const NewFolderInputContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`
const NewFolderSaveContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: end;
`
const StyledFolderInput = styled.input`
  outline: none;
  padding: 0.5vw 0vw 0.5vw 1vw;
  border: 1px solid transparent; 
  border-radius: 15px;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  font-size: 0.7vw;
  z-index: 0;

  &:focus {
    border: 1px solid #9028f9;
  }


  ${props => !props.displayMode && `
      background-color: #ffffff;
      color: black;
      border-color: #ccc;
      &::placeholder {
          color: #888;
      }
  `}

  ${props => props.displayMode && `
      background-color: #3a3a3a;
      color: white;
      border-color: #555;
      &::placeholder {
          color: #bbb;
      }
  `}
`
const StyledFolderSaveButton = styled.p`

  color: #9028f9;
  transition: 0.3s ease;
  &:hover {
    cursor: pointer;
    transform: scale(1.07);
  }

`


let grid = {};
let width = 100;
let height = 100;
let fileCoords = {};
const apiUrl = import.meta.env.VITE_API_URL;

export default function Content({ fileOptions, setFileOptions }) {

  const navigate = useNavigate();
  const { folderId } = useParams();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [highlight, setHighlight] = useState({fileId: -2, highlight: false});
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [rightClickSelectedFile, setRightClickSelectedFile] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);
  const [selectionStart, setSelectionStart] = useState({startPoint: null, isSelecting: false});
  const [containerRect, setContainerRect] = useState(null);
  const [minimize, setMinimize] = useState(false);
  const [fileContextWindow, setFileContextWindow] = useState({visible: false, x: 0, y: 0});
  const [jobs, setJobs] = useState({});
  const [updateFiles, setUpdateFiles] = useState(false);
  const [shouldRename, setShouldRename] = useState(-1);
  const [newName, setNewName] = useState("");
  const [filesCopied, setFilesCopied] = useState([]);
  const [filesCut, setFilesCut] = useState([]);
  const [newFolder, setNewFolder] = useState(false);
  const [typeClicked, setTypeClicked] = useState("");
  const { displayMode } = useAuth();
  const fileContainerRef = useRef(null);
  const jobsRef = useRef(jobs);
  const folderIdRef = useRef(folderId);
  const folderNameRef = useRef(null);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    folderIdRef.current = folderId
  }, [folderId]);

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
    
  }, [folderId, newFolder, updateFiles]);


  const handleClick = (file) => {

    if (file.type === "FOLDER") {
      navigate(`/folders/${file.id}`);
    }

  };


  const handleSelected = (e, fileId) => {
    e.preventDefault();
    e.stopPropagation();

    const temp = {};
    if (fileId) {
      temp[fileId] = {fileId: fileId};
    }
    setSelectedFiles(temp);
    setFileContextWindow({visible: false, x: 0, y: 0});
  };

  const handleRightClick = async (e, fileId) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target.closest("[data-file-id]");

    const clickedFileType = target ? target.getAttribute("data-file-type") : null;
    
    
    setRightClickSelectedFile(fileId);
  
    if (shouldRename !== -1) {
      if (newName.trim() !== "") {
        await fetch(`${apiUrl}/rename`, {
          method: "PUT",
          headers: {"Content-Type":"application/json"},
          credentials: "include",
          body: JSON.stringify({
            fileId: shouldRename,
            name: newName.trim()
          })
        });
        setFiles(prevFiles =>
          prevFiles.map(file =>
            file.id === shouldRename ? { ...file, name: newName.trim() } : file
          )
        );
      }
    }
    
    setShouldRename(-1);

    
    setTypeClicked({type: clickedFileType, id: fileId});

    const x = e.clientX;
    const y = e.clientY;
    
    if (!fileContextWindow.visible) {
      if (!selectedFiles || Object.keys(selectedFiles).length === 0) {
        const temp = {};
        if (fileId) {
          temp[fileId] = {fileId: fileId};
        }
        setSelectedFiles(temp);
      }
    }
    
    if (!fileId || (selectedFiles && !selectedFiles[fileId])) {   
      setTypeClicked(null);
      setSelectedFiles(null);
    }

    setFileContextWindow((prev) => {
      
      return {
        visible: !prev.visible,
        x: x,
        y: y
      };

    });
  };

  const handleHighlight = (fileId, shouldHighlight) => {
    setHighlight({fileId, shouldHighlight});
  };

  const handleMouseDown = async (e) => {
    const target = e.target;

    setNewFolder(false);

    if (!target.closest('[data-context-window="true"]') && target.closest('[file-image-id]') === null && target.closest('[file-name-id]') === null) {
      setRightClickSelectedFile(null);
    }

    if (e.button !== 0) return;
    if (!fileContainerRef.current) return;
    if (target.closest('[data-context-window="true"]')) return;
    
    
    if (shouldRename !== -1 && !target.closest('[text-area-id]') && newName.trim() !== "") {

      await fetch(`${apiUrl}/rename`, {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        credentials: "include",
        body: JSON.stringify({
          fileId: shouldRename,
          name: newName.trim()
        })
      });

      setFiles(prevFiles =>
        prevFiles.map(file =>
          file.id === shouldRename ? { ...file, name: newName.trim() } : file
        )
      );

      setShouldRename(-1);
      
    }
    
    
    if (target.closest('[file-image-id]') || target.closest('[file-name-id]')) {
      return;
    }
    
    setSelectedFiles(null);
    setFileOptions(false);    
    setFileContextWindow({visible: false, x: 0, y: 0});

    
    const containerRect = fileContainerRef.current.getBoundingClientRect();

    const startX = Math.round(e.clientX - containerRect.left);
    const startY = Math.round((e.clientY + fileContainerRef.current.scrollTop) - containerRect.top);
    
    
    if (shouldRename === -1) {
      setContainerRect(containerRect);
      setFileSize();
      setSelectionStart({startPoint: { x: startX, y: startY }, isSelecting: true});
    } 
    
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
        // let valX = (Math.floor((rect.left - containerRect.left) / 100)) * (100 + Math.floor(rect.width) % 100);
        
        return {
          fileId,
          x: Math.round((rect.left - containerRect.left)),
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
    
    // console.log(selectionBox);
    // console.log(grid);
    
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
    
    
  };
  
  const rectanglesIntersect = (rectA, rectB) => {
    // console.log(rectA, rectB);
    
    return (
      rectA.x < rectB.x + rectB.width &&         
      rectA.x + rectA.width > rectB.x &&           
      rectA.y < rectB.y + rectB.height &&          
      rectA.y + rectA.height > rectB.y            
    );
  };

  const handleMinimize = (e) => {
    setMinimize(!minimize);
  };

  const handleNewFolder = () => {
    setFileContextWindow({visible: false, x: 0, y:0});
    setNewFolder(true);    
  };
    
  const uploadFile = (e) => {

      console.log(e.target)
  };

  let rollingSpeed = 1;

  const updateRollingSpeed = (chunkSizeBytes, durationMs, cameFrom) => {
    const minDurationMs = 100;
    const effectiveDurationMs = Math.max(durationMs, minDurationMs);
    const currentSpeed = (chunkSizeBytes / (effectiveDurationMs / 1000)) / (1024 * 1024); // MBs
    const smoothingFactor = 0.7;
    
    if (rollingSpeed) {
      rollingSpeed = smoothingFactor * rollingSpeed + (1 - smoothingFactor) * currentSpeed;
    } else {
      rollingSpeed = currentSpeed;
    }
    
    return Math.max(rollingSpeed, 1);
  };

  const determineDynamicChunkSize = (currentSpeedMbps) => {
    if (currentSpeedMbps <= 2) {
      return 1 * 1024 * 1024;
    } else if (currentSpeedMbps <= 5) {
      return 2 * 1024 * 1024; 
    } else if (currentSpeedMbps <= 10) {
      return 5 * 1024 * 1024; 
    } else if (currentSpeedMbps <= 20) {
      return 10 * 1024 * 1024;
    } else {
      return 20 * 1024 * 1024;
    }
  };

  const fetchWithTimeout = async (url, options = {}, timeout, jobId) => {
      const controller = new AbortController();
      const signal = controller.signal;
      options.signal = signal;
      
      const timer = setTimeout(() => controller.abort(), timeout);

      const monitorInterval = setInterval(() => {
        const job = jobsRef.current[jobId];
        if (job) {

          if (job.pause || job.close) {
            controller.abort();
          }
        }
      }, 100);
      
      try {
          const response = await fetch(url, options);

          clearTimeout(timer); 
          clearInterval(monitorInterval);
          return response;
      } catch (error) {
          clearTimeout(timer);
          clearInterval(monitorInterval);
          throw error;
      }
  };

  const retryFetch = async (url, options = {}, timeout = 15000, backoff = 500, jobId, waitForResume) => {

    let currentBackoff = backoff;
    let currentTimeout = timeout;

    while (true) {

      let res = await waitForResume();
      

      if (res === 'closed') {
        deleteJob(jobId);
        throw new Error("Upload cancelled by user");
      }
      try {


        const response = await fetchWithTimeout(url, options, currentTimeout, jobId);
        
                  
        if (!response.ok) {
          throw new Error(`Server responded with status ${response.status}`);
        }

        
        return response;

      } catch (error) {
          console.error(`Fetch failed: ${error.message}`);
          
          res = await waitForResume();

          if (res === 'closed') {
            
            deleteJob(jobId);
            throw new Error("Upload cancelled by user");
          }

          await new Promise(resolve => setTimeout(resolve, currentBackoff));
          currentBackoff *= 2;
          currentTimeout *= 1.2;
      }
    }
  };

  const waitForResume = async (jobId) => {

    let currJob = jobsRef.current[jobId];

    if (!currJob) return;

    return new Promise((resolve) => {
      const checkStatus = () => {
        currJob = jobsRef.current[jobId];
        
        if (currJob.close) {
          resolve('closed');
        } else if (!currJob.pause) {
          resolve('resumed');
        } else {
          setTimeout(checkStatus, 100);
        }
      };
      checkStatus();
    });
  };

  const getUploadSize = (payload) => {
    let totalSize = 0;
    for (let file of payload) {
      totalSize += file.size;
    }
    return totalSize;
  };

  const getParentName = (tempName) => {
    let parentName = "";

    for (let i = 0; i < tempName.length && i < 10; i++) {
        parentName += tempName.charAt(i);
    }

    return parentName;
  };

  const uploadFolder = async (e) => {
      e.preventDefault();
      
      const form = e.target;
      
      if (form[0].files.length <= 0) return;

      let pathToId = {};
      let idToPath = {};
      let currSize = [0];

      // setFileOptions((prev) => !prev);

      const jobId = Date.now();

      const tempName = form[0].files[0].webkitRelativePath.split("/")[0];

      const parentName = getParentName(tempName);

      const totalSize = getUploadSize(form[0].files);
      
      addJob({jobId: jobId, action: "upload", name: parentName, data: {percentage: 0}, pause: false, cancel: false});

      const parentPathReq = await fetch(`${apiUrl}/getParentPath`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        credentials: "include",
        body: JSON.stringify({folderId: folderId})
      }); 
      
      const tempParentPath = await parentPathReq.json();

      const parentPath = tempParentPath.parentPath ? tempParentPath.parentPath : "";
      

      for (let file of form[0].files) {
        
        
        const pathArr = file.webkitRelativePath.split("/");
        const len = pathArr.length;
        
        let path = [];
        path.push(parentPath);
        for (let i = 0; i < len-1; i++) {
          const p = pathArr[i];
          path.push(p);
          path.push("/");
        }

        let relativePath = path.join("");
          
          
        // ******* IMPORTANT ***********
        if (!pathToId[relativePath]) {

            const req = await fetch(`${apiUrl}/savePath`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ relativePath: relativePath }),
            });
            const res = await req.json();
            setUpdateFiles((prev) => !prev);
            idToPath[res.parentId] = relativePath;
            pathToId[relativePath] = res.parentId;

        }

        // const req = await fetch(`${apiUrl}/checkFileStatus`, {
        //   method: "POST",
        //   credentials: "include",
        //   headers: {
        //     "Content-Type" : "application/json"
        //   },
        //   body: JSON.stringify({parentId: pathToId[relativePath], fileName: file.name})
        // });  

        // const fileStatus = await req.json();
        
        const metaData = {parentId: pathToId[relativePath], fileName: pathArr[len-1]};
        await uploadInChunks(file, relativePath, jobId, currSize, totalSize, metaData);
          
        // console.log(pathToId[relativePath]);
        if (folderId && idToPath[folderId]) {
          setUpdateFiles((prev) => !prev);
        }
        

        updateJob({
            jobId: jobId,
            data: {percentage: Math.round(currSize[0] * 100 / totalSize)}
        });
        
        file = null;
      }

      removeJob(jobId);
  };

  const uploadInChunks = async (file, relativePath, jobId, currSize, totalSize, metaData) => {
    

    let currChunkSize = 1 * 1024 * 1024; 
    let prevEnd = 0;

    // if (fileStatus !== null) {
    //   if (Number.parseInt(fileStatus.chunkEnd) === file.size ) {
    //     currSize[0] += file.size;
    //     return;
    //   }
    //   prevEnd = fileStatus.chunkStart === "" ? 0 : Number.parseInt(fileStatus.chunkStart);
    // }
  
    while (prevEnd < file.size) {

      const start = prevEnd;
      const end = Math.min(file.size, start + currChunkSize);
      const chunk = file.slice(start, end);
      prevEnd = end;
  

      currSize[0] += chunk.size;
  
      const formData = new FormData();
      
      formData.append("relative_path", relativePath);
      formData.append("filename", file.name);
      formData.append("meta_data", JSON.stringify(metaData));
      formData.append("chunk_data", JSON.stringify({start: `${start}`, end: `${end}`}));
      formData.append("chunk", chunk);      
      
  
      const startTime = performance.now();

      const response = await retryFetch(`${apiUrl}/uploadChunk`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      }, 10000, 500, jobId, () => waitForResume(jobId));
      
  
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const currentSpeed = updateRollingSpeed(currChunkSize, duration, "CHUNK");
      currChunkSize = determineDynamicChunkSize(currentSpeed);
      

      if (!response.ok) {
        // Handle error (could retry or abort)
        return;
      }
  

      updateJob({
        jobId: jobId,
        data: { percentage: Math.round(currSize[0] * 100 / totalSize) },
      });

    }
  };

  const addJob = (job) => {
    setJobs(prevJobs => ({
      ...prevJobs,
      [job.jobId]: job
    }));
  };

  const deleteJob = (jobId) => {
    setJobs(prevJobs => {

      const updatedJobs = { ...prevJobs };
      delete updatedJobs[jobId];

      return updatedJobs;
    });
  };
  
  const updateJob = (job) => {
    setJobs(prevJobs => {
      if (!prevJobs[job.jobId]) {
        return prevJobs;
      }
      return {
        ...prevJobs,
        [job.jobId]: {
          ...prevJobs[job.jobId],
          data: {
            ...prevJobs[job.jobId].data,
            percentage: job.data.percentage,
            pause: job.pause,
            cancel: job.cancel
          }
        }
      };
    });
  };
  
  const removeJob = (jobId) => {
    setJobs(prevJobs => {
      const newJobs = { ...prevJobs };
      delete newJobs[jobId];
      return newJobs; 
    });

  };

  const handlePause = (job) => {

    setJobs(prevJobs => {
      if (!prevJobs[job.jobId]) {
        return prevJobs;
      }
  
      return {
        ...prevJobs,
        [job.jobId]: { ...prevJobs[job.jobId], pause: !prevJobs[job.jobId].pause }
      };
    });


  };

  const handleClose = (job) => {
    setJobs(prevJobs => {
      if (!prevJobs[job.jobId]) {
        return prevJobs;
      }
  
      return {
        ...prevJobs,
        [job.jobId]: { ...prevJobs[job.jobId], close: true }
      };
    });
  };

  const handleDownload = () => {

    let fileIds = null;

    if (selectedFiles && Object.keys(selectedFiles).length > 0) {
      fileIds = Object.keys(selectedFiles);
    } else {
      console.warn("No files selected for download.");
      alert("Please select at least one file to download.");
      return;
    }

    console.log("Initiating download via form submission for IDs:", fileIds);

    const form = document.createElement('form');
    form.style.display = 'none';
    form.method = 'POST';
    form.action = `${apiUrl}/download`;



    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'fileIdsJson';
    input.value = JSON.stringify(fileIds);
    form.appendChild(input);


    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    console.log("Form submitted to trigger download.");


  };

  const handleRename = () => {

    let fileId = null;
    const selFiles = selectedFiles ? Object.keys(selectedFiles) : null;

    if (selFiles) {
      fileId = selFiles[0];
    }
    
    const file = files.find((f) => f.id === Number.parseInt(fileId));
    
    setFileContextWindow({visible: false, x:0, y:0});
    if (file) setNewName(file.name);
    setShouldRename(Number.parseInt(fileId));

  };

  const handleNameChange = (e) => {
    setNewName(e.target.value);
  };

  const handleDelete = async () => {

    let filesToDelete = [];
    
    if (selectedFiles) {
      for (const key of Object.keys(selectedFiles)) {
        filesToDelete.push(Number.parseInt(key));
      }
    }
    
    const req = await fetch(`${apiUrl}/delete`, {
      method: "POST",
      headers: { "Content-Type" : "application/json" },
      credentials: 'include',
      body: JSON.stringify(filesToDelete)
    });
    
    const res = await req.json();
    
    setFiles((prev) => 
      prev.filter((file) => !filesToDelete.includes(file.id))
    );

    setFileContextWindow({visible: false, x: 0, y: 0});
    
  };

  const handleCut = () => {
    let filesToCut = null;
    if (selectedFiles) {
      filesToCut = Object.keys(selectedFiles)
    }
    setFilesCut(filesToCut);
    
    setFilesCopied([]);
    setSelectedFiles(null);
    setFileContextWindow({visible: false, x:0, y:0});
    
  };
  
  const handleCopy = () => {

    let filesToCopy = null;
    if (selectedFiles) {
      filesToCopy = Object.keys(selectedFiles)
    }
    setFilesCopied(filesToCopy);
    
    setFilesCut([]);
    setSelectedFiles(null);
    setFileContextWindow({visible: false, x:0, y:0});
    
  };
  
  const handlePaste = async () => {
    
    let pathId = null;
    const jobId = Date.now();
    
    
    if (rightClickSelectedFile) {
      pathId = rightClickSelectedFile;
    } else if (folderId) {
      pathId = folderId;
    }
    
    let type = null;
    let totalFiles = 0;
    
    if (filesCopied.length > 0) {
      type = "copy";
      totalFiles = filesCopied.length;
    }  else if (filesCut.length > 0) {
      type = "cut";
      totalFiles = filesCut.length;

    }

    addJob({jobId: jobId, action: type, data: {totalFiles: totalFiles}});
    
    setFileContextWindow({visible: false, x:0, y:0});

    const req = await fetch(`${apiUrl}/paste`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      credentials: "include",
      body: JSON.stringify({files: type && type === "copy" ? filesCopied : filesCut, path: pathId, operationType: type})
    });
    
    setUpdateFiles(prev => !prev);

    if (!req.ok) {
      const error = await req.json();
      alert(error.message);
    }
    
    removeJob(jobId);
    
  };

  const createNewFolder = async () => {

    const tempFolderId = (typeClicked && typeClicked.type === "FOLDER") ? typeClicked.id : folderId;
    
    const folderName = folderNameRef.current ? folderNameRef.current.value : "";

    const req = await fetch(`${apiUrl}/createNewFolder`, {
      method: "POST",
      headers: {"Content-type":"application/json"},
      credentials: "include",
      body: JSON.stringify({parentId: tempFolderId, folderName: folderName})
    });

    if (!req.ok) {
      const error = await req.json();
      alert(error.message);
    } else {
      setNewFolder(false);
    }
  };

  return (
    <ContentContainer>
      {newFolder && <NewFolderWindow displayMode={displayMode}>
        <NewFolderHeaderContainer displayMode={displayMode}>
          <h4>Create Folder</h4>
        </NewFolderHeaderContainer>
        <NewFolderInputContainer>
          <StyledFolderInput ref={folderNameRef} placeholder='Folder name' displayMode={displayMode}>

          </StyledFolderInput>
        </NewFolderInputContainer>
        <NewFolderSaveContainer>
          <StyledFolderSaveButton onClick={createNewFolder}>
            Create
          </StyledFolderSaveButton>
        </NewFolderSaveContainer>
      </NewFolderWindow>}
      <Sidebar 
        fileOptions={fileOptions} setFileOptions={setFileOptions} uploadFile={uploadFile} uploadFolder={uploadFolder} handleNewFolder={handleNewFolder}
      />
      <Files files-context-window="true" displayMode={displayMode} ref={fileContainerRef} onContextMenu={(e) => handleRightClick(e, null)} onMouseDownCapture={(e) => handleMouseDown(e)}>
        {loading ? (
          <p>Loading files...</p>
        ) : 
          <FolderContainer>
            {files.map((file) => (
              <FileContainer
                key={file.id}
                data-file-id={file.id}
                data-file-type={file.type}
              >

                <FileTempContainer>
                  <FileImage file-image-id={file.id} src={file.type === "FOLDER" ? folderImage : fileImage} 
                  alt="file or folder image"
                  onClick={(e) => handleSelected(e, file.id)} 
                  onContextMenu={(e) => handleRightClick(e, file.id)}
                  onDoubleClick={() => handleClick(file)}
                  onMouseEnter={() => handleHighlight(file.id, true)} onMouseLeave={() => handleHighlight(file.id, false)}  
                  />
                  {shouldRename !== file.id ? 
                    <FileName 
                    file-name-id={file.id} 
                    style={
                    {backgroundColor: ((selectedFiles && selectedFiles[file.id])) ? "rgba(102, 51, 153, 0.4)" : 
                    (file.id === highlight.fileId && highlight.shouldHighlight) ? "rgba(102, 51, 153, 0.2)" : "transparent"}
                    }
                    onClick={(e) => handleSelected(e, file.id)} 
                    onContextMenu={(e) => handleRightClick(e, file.id)}
                    onDoubleClick={() => handleClick(file)}
                    onMouseEnter={() => handleHighlight(file.id, true)} onMouseLeave={() => handleHighlight(file.id, false)}  
                    >
                    {file.name}
                    </FileName>
                    :
                    <TextArea 
                    text-area-id={file.id}
                    onMouseDownCapture={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()} 
                    onDoubleClick={(e) => e.stopPropagation()}
                    onContextMenu={(e) => e.stopPropagation()}
                    value={newName} onChange={(e) => handleNameChange(e)}
                    autoFocus={true}/>
                  }
                </FileTempContainer>
              </FileContainer>
          ))}
          {fileContextWindow.visible && 
          <ContextWindow
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseDownCapture={(e) => e.stopPropagation()}
            fileContextWindow={fileContextWindow} 
            handleNewFolder={handleNewFolder}
            handleDownload={handleDownload}
            handleRename={handleRename}
            handleDelete={handleDelete}
            selectedFiles={selectedFiles}
            handleCut={handleCut}
            handleCopy={handleCopy}
            handlePaste={handlePaste}
            filesCopied={filesCopied}
            filesCut={filesCut}
            displayMode={displayMode}
            typeClicked={typeClicked}
          />
          }
          </FolderContainer>
        }
        <SelectionBox selectionBox={selectionBox}/>
      
      </Files>
      {Object.keys(jobs).length > 0 && <ProgressComp 
          displayMode={displayMode} minimize={minimize} menuUp={menuUp} menuDown={menuDown} handleMinimize={handleMinimize} jobs={jobs} handleClose={handleClose} handlePause={handlePause}
      />
      }
    </ContentContainer>
  );
}


function ProgressComp({ displayMode, minimize, menuUp, menuDown, handleMinimize, jobs, handleClose, handlePause }) {


  
  return (
    <ProgressContainer>
      <MinimizeContainer displayMode={displayMode}>
        <Minimize displayMode={displayMode} onClick={handleMinimize}>{minimize ? <StyledMenuArrow src={menuUp}></StyledMenuArrow> : <StyledMenuArrow src={menuDown}></StyledMenuArrow>}</Minimize>
      </MinimizeContainer>
      {
        Object.keys(jobs).map((jobId) => {
          
          const job = jobs[jobId];

          if (job.action === "cut" || job.action === "copy") {
            return (
              !minimize && <Progress displayMode={displayMode} key={jobId}>
              <ProgressHeader>
                <ContentSize>{job.action !== "cut" ? "Copying " : "Moving "}{`(${job.data.totalFiles})`}</ContentSize>
                <RightContainer>
                  <Loader displayMode={displayMode}></Loader>
                </RightContainer>
              </ProgressHeader>
              <ProgressBar>
                <StyledBar displayMode={displayMode}>
                  <div className='styled-bar-fill-bounce'></div>
                </StyledBar>
              </ProgressBar>
            </Progress>
            );
          }

          return (
          !minimize && <Progress displayMode={displayMode} key={jobId}>
            <ProgressHeader>
              <ContentSize>{job.action !== "download" ? "Uploading " : "Downloading "}{`(${job.name})`}</ContentSize>
              <RightContainer>
                <Loader displayMode={displayMode}></Loader>
                <Pause xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#a0ea1a" displayMode={displayMode} onClick={() => handlePause(job)}>
                  {
                  !job.pause ?
                  <path d="M14,19H18V5H14M6,19H10V5H6V19Z" />
                  :
                  <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
                  }
                </Pause>
                <Close xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#a0ea1a" displayMode={displayMode} onClick={() => handleClose(job)} src={close}>
                  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </Close>
              </RightContainer>
            </ProgressHeader>
            <ProgressBar>
              {(job.action !== "download") && <StyledBar displayMode={displayMode}>
                <div className='styled-bar-fill' style={{width: `${job.data.percentage}%`}}></div>
              </StyledBar>}
              <StyledFileCount>
                {job.action === "download" ? "Zipping file" :`${job.data.percentage}%`}
              </StyledFileCount>
            </ProgressBar>
          </Progress>
          );
        })
      }
    </ProgressContainer>
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

const FileContextWindow = styled.div`
  position: fixed; 
  top: ${props => props.y}px;
  left: ${props => props.x}px;
  background-color: ${props => props.displayMode ? "#252424" : "#dedede"};
  color: ${props => props.displayMode ? "white" : "black"};
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  display: flex;
  padding: 0.3vw;
  flex-direction: column;
  border-radius: 15px;
  font-size: 0.7vw;
`;

const ContextItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5vw;
  padding: 0.5vw;
`
const StyledContextImg = styled.img`
  width: 1.3vw;
`

const ClickableP = styled.p`
  cursor: pointer;
`

function ContextWindow({ fileContextWindow, handleNewFolder, handleDownload, handleRename, handleDelete, selectedFiles, handleCut, handleCopy, handlePaste, filesCopied, filesCut, displayMode, typeClicked }) {

  const { x, y } = fileContextWindow;

  return (
    <FileContextWindow displayMode={displayMode} x={x} y={y} data-context-window="true" >
      {
      (!typeClicked || typeClicked.type === "FOLDER") && <ContextItemWrapper>
        <StyledContextImg src={newImg}></StyledContextImg>
        <ClickableP onClick={handleNewFolder}>New Folder</ClickableP>
      </ContextItemWrapper>
      }

      {
      typeClicked && <ContextItemWrapper>
        <StyledContextImg src={downloadImg}></StyledContextImg>
        <ClickableP onClick={handleDownload}>Download</ClickableP>
      </ContextItemWrapper>
      }

      {
      typeClicked && <ContextItemWrapper>
        <StyledContextImg src={cutImg}></StyledContextImg>
        <ClickableP onClick={handleCut}>Cut</ClickableP>
      </ContextItemWrapper>
      }

      {
      typeClicked && <ContextItemWrapper>
        <StyledContextImg src={copyImg}></StyledContextImg>
        <ClickableP onClick={handleCopy}>Copy</ClickableP>
      </ContextItemWrapper>
      
      }
      {
      ((!typeClicked || typeClicked.type === "FOLDER") && ((filesCopied && filesCopied.length > 0) || (filesCut && filesCut.length > 0))) && 
      <ContextItemWrapper>
        <StyledContextImg src={pasteImg}></StyledContextImg>
        <ClickableP onClick={handlePaste}>Paste</ClickableP>
      </ContextItemWrapper>
      }

      {
      (typeClicked && (selectedFiles && Object.keys(selectedFiles).length === 1)) && 
      <ContextItemWrapper>
        <StyledContextImg src={renameImg}></StyledContextImg>
        <ClickableP onClick={handleRename}>Rename</ClickableP>
      </ContextItemWrapper>
      }

      {
      typeClicked && <ContextItemWrapper>
        <StyledContextImg src={deleteImg}></StyledContextImg>
        <ClickableP onClick={handleDelete}>Delete</ClickableP>
      </ContextItemWrapper>
      }
    </FileContextWindow>
  );
};


