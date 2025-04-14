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
import pause from './assets/images/pause.svg';
import play from './assets/images/play.svg';


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
`
const MinimizeContainer = styled.div`
  background-color: #2b2b2b;
  width: 100%;
`
const Progress = styled.div`
  width: 100%;
  background-color: #252424;
  display: flex;
  flex-direction: column;
  color: white;
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
const Pause = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 5px;
  cursor: pointer;
`
const Close = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 5px;
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
  .styled-upload-header {
    position: absolute;
    top: 0;
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
const apiUrl = import.meta.env.VITE_API_URL;

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
  const [updateFiles, setUpdateFiles] = useState(false);
  const [jobs, setJobs] = useState({});
  const jobsRef = useRef(jobs);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

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

  const handleNewFolder = () => {};
    
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
            console.log("FIRST");
            
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
      let currSize = [0];

      setFileOptions((prev) => !prev);

      const jobId = Date.now();

      const tempName = form[0].files[0].webkitRelativePath.split("/")[0];

      const parentName = getParentName(tempName);

      const totalSize = getUploadSize(form[0].files);
      
      addJob({jobId: jobId, action: "upload", name: parentName, data: {percentage: 0}, pause: false, cancel: false});


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

              pathToId[relativePath] = res.parentId;

          }

          const req = await fetch(`${apiUrl}/checkFileStatus`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type" : "application/json"
            },
            body: JSON.stringify({parentId: pathToId[relativePath], fileName: file.name})
          });

          const fileStatus = await req.json();
          
          let currChunkSize = 1 * 1024 * 1024;
          
          if (fileStatus === null && file.size <= currChunkSize) {

            const formData = new FormData();
            

            const start = performance.now();
            formData.append("relative_path", relativePath);
            formData.append("file", file);
            formData.append("meta_data", JSON.stringify({parentId: pathToId[relativePath], fileName: pathArr[len-1]}));


            await retryFetch(`${apiUrl}/uploadFile`, {
              method: "POST",
              credentials: "include",
              body: formData
            }, 10000, 500, jobId,
            () => waitForResume(jobId));
            
            const end = performance.now();
            const duration = end - start;
            
            const currentSpeed = updateRollingSpeed(file.size, duration, "BATCH");
            currChunkSize = determineDynamicChunkSize(currentSpeed);

            currSize[0] += file.size;

            updateJob({
                jobId: jobId,
                data: {percentage: Math.round(currSize[0] * 100 / totalSize)}
            });

          } else {
            
            const metaData = {parentId: pathToId[relativePath], fileName: pathArr[len-1]};
            await uploadInChunks(file, relativePath, jobId, fileStatus, currSize, totalSize, metaData);
            

          }
          
          file = null;
      }

      
      removeJob(jobId);
  };


  const uploadInChunks = async (file, relativePath, jobId, fileStatus, currSize, totalSize, metaData) => {
    

    let currChunkSize = 1 * 1024 * 1024; 
    let prevEnd = 0;
    console.log(fileStatus);
    console.log(relativePath);
    console.log(file.name);
    
    console.log(file.size);
    if (fileStatus !== null) {
      if (Number.parseInt(fileStatus.chunkEnd) === file.size || fileStatus.chunkEnd === "") return;
      prevEnd = fileStatus.chunkStart === "" ? 0 : Number.parseInt(fileStatus.chunkStart);
    }
  
    while (prevEnd < file.size) {

      const start = prevEnd;
      const end = Math.min(file.size, start + currChunkSize);
      const chunk = file.slice(start, end);
      prevEnd = end;
  

      currSize[0] += chunk.size;
  
      const formData = new FormData();
      formData.append("relative_path", relativePath);
      formData.append("filename", file.name);
      
      formData.append("chunk_data", JSON.stringify({start: `${start}`, end: `${end}`}));
      formData.append("meta_data", JSON.stringify(metaData));

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

  return (
    <ContentContainer>
      <Sidebar 
        fileOptions={fileOptions} setFileOptions={setFileOptions} uploadFile={uploadFile} uploadFolder={uploadFolder} handleNewFolder={handleNewFolder}
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
      {Object.keys(jobs).length > 0 && <ProgressComp 
          minimize={minimize} menuUp={menuUp} menuDown={menuDown} handleMinimize={handleMinimize} jobs={jobs} handleClose={handleClose} handlePause={handlePause}
      />
      }
    </ContentContainer>
  );
}

function ProgressComp({ minimize, menuUp, menuDown, handleMinimize, jobs, handleClose, handlePause }) {


  
  return (
    <ProgressContainer>
      <MinimizeContainer>
        <Minimize onClick={handleMinimize}>{minimize ? <StyledMenuArrow src={menuUp}></StyledMenuArrow> : <StyledMenuArrow src={menuDown}></StyledMenuArrow>}</Minimize>
      </MinimizeContainer>
      {
        Object.keys(jobs).map((jobId) => {
          
          const job = jobs[jobId];

          return (
          !minimize && <Progress key={jobId}>
            <ProgressHeader>
              <ContentSize>{job.action !== "download" ? "Uploading " : "Downloading "}{`(${job.name})`}</ContentSize>
              <RightContainer>
                <Loader></Loader>
                <Pause onClick={() => handlePause(job)} src={job.pause ? play : pause}></Pause>
                <Close onClick={() => handleClose(job)} src={close}></Close>
              </RightContainer>
            </ProgressHeader>
            <ProgressBar>
              {(job.action !== "download") && <StyledBar>
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
