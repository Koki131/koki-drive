import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { includes, isEqual } from 'lodash';
import styled, { keyframes } from 'styled-components';
import Sidebar from './Sidebar';
import fileImage from './assets/images/file.svg';
import folderImage from './assets/images/folder.svg';
import zipImage from './assets/images/folder-zip.svg';
import zoomIn from './assets/images/plus.svg';
import zoomOut from './assets/images/minus.svg';
import zoomIcon from './assets/images/zoom.svg';
import menuUp from './assets/images/menu-up.svg';
import menuDown from './assets/images/menu-down.svg';
import close from './assets/images/close.svg';
import closeWindow from './assets/images/close-thick.svg';
import leftArrow from './assets/images/menu-left.svg';
import rightArrow from './assets/images/menu-right.svg';
import copyImg from "./assets/images/copy.svg";
import cutImg from "./assets/images/cut.svg";
import renameImg from "./assets/images/rename.svg";
import downloadImg from "./assets/images/download.svg";
import pasteImg from "./assets/images/paste.svg";
import deleteImg from "./assets/images/delete.svg";
import newImg from "./assets/images/new.svg";
import sortBy from "./assets/images/sort.svg";
import sortAsc from "./assets/images/sort_asc.svg";
import sortDesc from "./assets/images/sort_desc.svg";
import nameSort from "./assets/images/name_sort.svg";
import { useAuth } from './AuthProvider';
import useSseListener from '../hooks/useEventSource';
import { BST } from '../util/BST';
import LinkedList from '../util/LinkedList';


const ContentContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: 100vw;
  position: relative;
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
  position: relative;
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
  color: ${props => props.displayMode ? "white" : "black"};
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

// let grid = {};
let width = 100;
let height = 100;
let fileCoords = {};
const apiUrl = import.meta.env.VITE_API_URL;

export default function Content({
  files, dispatch, isLoading, setIsLoading,
  updateFiles, setUpdateFiles,
  fileContainerRef,
  calculatedInitialTake,
  nextCursor,
  lazyLoadState
}) {

  const navigate = useNavigate();
  const { folderId } = useParams();
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [rightClickSelectedFile, setRightClickSelectedFile] = useState(null); 
  const [selectionStart, setSelectionStart] = useState({startPoint: null, isSelecting: false});  // can be a ref (?)
  const [containerRect, setContainerRect] = useState(null); 
  const [fileContextWindow, setFileContextWindow] = useState({visible: false, x: 0, y: 0});
  const [shouldRename, setShouldRename] = useState(-1);
  const [newName, setNewName] = useState("");
  const [filesCopied, setFilesCopied] = useState([]); 
  const [filesCut, setFilesCut] = useState([]);
  const [newFolder, setNewFolder] = useState(false); // change to ref
  const [typeClicked, setTypeClicked] = useState("");
  const [sortOptions, setSortOptions] = useState({sortBy: "name", sortDir: "asc"});
  
  const { displayMode, user, authLoading } = useAuth();
  
  const hasMore = useRef(true); // change to ref

  const sseUrl = !authLoading && user ? `${apiUrl}/events?userId=${user.id}` : null;

  const folderIdRef = useRef(folderId); 
  const folderNameRef = useRef(null);
  // Ref to prevent multiple concurrent loads
  const isLoadingMoreRef = useRef(false);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });
  const itemRefs = useRef({});
  const selectionBoxRef = useRef();
  const progressCompRef = useRef();
  const previewRef = useRef();
  const gridRef = useRef({});
  const liveRenderedCount = useRef(0);
  const maxRenderedFiles = useRef(0);
  const uploadQueueRef = useRef([]);
  const previewableItemsRef = useRef(new LinkedList());
  

  // fix uploadQueue
  
  const memoizedFileValues = useMemo(() => {
    if (!files.folders && !files.files) return [];
    
    const sortedFolders = (sortOptions.sortDir === 'asc') ? files.folders.getInOrder() : files.folders.getReverseOrder();
    const sortedFiles = (sortOptions.sortDir === 'asc') ? files.files.getInOrder() : files.files.getReverseOrder();

    return [...sortedFolders, ...sortedFiles];

  }, [files, sortOptions]);
  
  const assignFileRef = (element, fileId) => {
    
    if (element) {
      itemRefs.current[fileId] = element;
    } else {
      delete itemRefs.current[fileId];
    }
  };

  const handleSseMessage = (message) => {

      if (message) {
        switch (message.event) {
          case "file-transfer": {
            
            if (lazyLoadState.current === "search") return;

            const fileData = message.folder || message.file || message.filePasted;

            
            if (fileData.parentId !== folderIdRef.current) return;

            if (liveRenderedCount.current < maxRenderedFiles.current) {
              

              dispatch({ type: 'file-transfer', payload: fileData });
              
              if (fileData.mimeType.startsWith("video/") || fileData.mimeType.startsWith("image/")) {
                  previewableItemsRef.current.add(fileData.id, fileData.relativePath);
              }
                

            } else {

              uploadQueueRef.current.push(fileData);
              
              if (!hasMore.current) {
                  hasMore.current = true;
              }             

            }
            break;
    
          }
          case "preview-complete": {
            
            if (lazyLoadState.current === "search") return;
            
            
            dispatch({ type: 'preview-complete', payload: message });

            break;
          }

        }
      }


  }; 


  useSseListener(sseUrl, handleSseMessage);


  useEffect(() => {
    folderIdRef.current = folderId ? Number.parseInt(folderId) : null;
    gridRef.current = {};
    setShouldRename(-1);
    previewableItemsRef.current = new LinkedList();
  }, [folderId]);


  
  useEffect(() => {
    // Get a reference to the container for use in the cleanup function

    console.log("ADDING EVENTS EFFECT");
    
    const currentFileContainer = fileContainerRef.current;

    const handleMouseUp = (e) => {
      if (selectionStart.isSelecting) {
        setSelectionStart({ startPoint: null, isSelecting: false });
        if (selectionBoxRef.current) {   
          setSelectedFiles(selectionBoxRef.current.getSelectedItems());
          selectionBoxRef.current.updateState(null);
        }
        lastMousePositionRef.current = null;
      }
    };
    
    const handleMouseMove = (e) => {
      if (!selectionStart.isSelecting) return;
      lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
      updateSelection(e.clientX, e.clientY);
    };

    const handleScroll = () => {
      if (selectionStart.isSelecting && lastMousePositionRef.current) {
        updateSelection(lastMousePositionRef.current.x, lastMousePositionRef.current.y);
      }
    };


    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    
    if (currentFileContainer) {
      currentFileContainer.addEventListener("scroll", handleScroll);
    }
    
    return () => {

      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (currentFileContainer) {
        currentFileContainer.removeEventListener("scroll", handleScroll);
      }
    };
    
}, [selectionStart.isSelecting, fileContainerRef.current]);


  useEffect(() => {

    console.log("GETTING FILES");
    
    const getFiles = async () => {
        if (!calculatedInitialTake.current) {
            return;
        }

        setIsLoading(true);
        isLoadingMoreRef.current = true;

        hasMore.current = true; 
        nextCursor.current = null;

        try {
            const parent = folderId ? folderId : "";
          
            const request = await fetch(`${apiUrl}/getFilesByParent?parent=${parent}&take=${calculatedInitialTake.current}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
            });
            if (!request.ok) {
                throw new Error(`HTTP error! status: ${request.status}`);
            }
            const response = await request.json();
            const { files: initialFiles, nextCursor: initialNextCursor } = response.result;
            
            liveRenderedCount.current = initialFiles.length;
            maxRenderedFiles.current = calculatedInitialTake.current; 
            
            uploadQueueRef.current = [];
            
            
            const newFolders = new BST(calculatedInitialTake.current);
            const newFiles = new BST(calculatedInitialTake.current);
            
            for (const file of initialFiles) {
              if (file.type === 'FOLDER') {
                newFolders.add(file);
              } else {
                newFiles.add(file);
                if (file.mimeType.startsWith("image/") || file.mimeType.startsWith("video/")) {
                  previewableItemsRef.current.add(file.id, file.relativePath);
                }
              }
            }
            
            nextCursor.current = initialNextCursor;
            hasMore.current = !!nextCursor.current;
            
            dispatch({type: 'init-load', payload: {folders: newFolders, files: newFiles}});

            

        } catch (e) {
            console.error("Error fetching initial files:", e);
            dispatch({type: 'init-load', payload: {folders: new BST(0), files: new BST(0)}});
        } finally {
            setIsLoading(false);
            isLoadingMoreRef.current = false;
        }
    };

    dispatch({type: 'init-load', payload: {folders: new BST(0), files: new BST(0)}});
    getFiles();

}, [folderId, calculatedInitialTake.current, updateFiles]);

  const lazyLoadFiles = async (imageLoad) => {

    if (!hasMore.current || isLoadingMoreRef.current || isLoading) return;
    
    const container = fileContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const buffer = 20;

    if ((scrollTop + clientHeight >= scrollHeight - buffer) || (imageLoad)) {
      
      isLoadingMoreRef.current = true;
      setIsLoading(true);

      const take = 30;
      maxRenderedFiles.current += take;   

      try {
        
        let filesToAdd = []; 

        if (uploadQueueRef.current.length > 0) {
          // uploadQueueRef.current.sort(compareFiles); if concurrent uploads

          const pageFromQueue = uploadQueueRef.current.splice(0, take);
          filesToAdd = pageFromQueue;
          
          const lastFileInPage = pageFromQueue[pageFromQueue.length - 1];
          nextCursor.current = { type: lastFileInPage.type, name: lastFileInPage.name, id: lastFileInPage.id };

        } else {

          const parent = folderId ? folderId : "";
  
          let url = `${apiUrl}/getFilesByParent?parent=${parent}&take=${take}`;
          if (nextCursor) {
            url += `&cursor=${encodeURIComponent(JSON.stringify(nextCursor.current))}`;
          }
  
          const request = await fetch(url, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
              credentials: 'include',
          });

          if (!request.ok) {
              throw new Error(`HTTP error! status: ${request.status}`);
          }

          const response = await request.json();
          const { files: newFiles, nextCursor: newCursor } = response.result;

          if (newFiles && newFiles.length > 0) {  
            filesToAdd = newFiles;
          }
  
  
          nextCursor.current = newCursor;
          if (!newCursor) {
              hasMore.current = false;
          }            
        }

        if (filesToAdd.length > 0) {
        
          for (const file of filesToAdd) {
              if (file.mimeType && (file.mimeType.startsWith("image/") || file.mimeType.startsWith("video/"))) {
                  previewableItemsRef.current.add(file.id, file.relativePath);
              }
              liveRenderedCount.current++;
          }

        dispatch({ type: 'lazy-load', payload: filesToAdd });
      }

      } catch (e) {
          console.error("Error lazy loading files:", e);
      } finally {
          setIsLoading(false);
          isLoadingMoreRef.current = false;
      }
    }
  };

  useEffect(() => {

    
    setFileSize();
    populateGrid();

    const allFiles = files.files.getInOrder();
    const newPreviewableList = new LinkedList();

    for (const file of allFiles) {
      if (file.mimeType && (file.mimeType.startsWith("image/") || file.mimeType.startsWith("video/"))) {
          newPreviewableList.add(file.id, file.relativePath);
      }
    }
    previewableItemsRef.current = newPreviewableList;

  }, [memoizedFileValues]);

  const populateGrid = () => {
    
    gridRef.current = {};
    // const currentFilesCount = memoizedFileValues.length; 

    const containerRect = fileContainerRef.current.getBoundingClientRect();
    
    for (const id of Object.keys(itemRefs.current)) {
      const fileElement = itemRefs.current[id];

      // const fileData = memoizedFileValues[i];

      if (fileElement) {
        

        const rect = fileElement.getBoundingClientRect();

        const fileId = Number.parseInt(id);

        const fileX = Math.round((rect.left - containerRect.left));
        const fileY = Math.round((rect.top + fileContainerRef.current.scrollTop) - containerRect.top);
        const fileWidth = Math.round(rect.width);
        const fileHeight = Math.round(rect.height);

        const r = Math.floor(fileY / fileHeight);
        const c = Math.floor(fileX / fileWidth);
        
        
        const key = `${r}_${c}`;

        const fileImageX = Math.floor(fileCoords["image"].x + c * rect.width);
        const fileImageY = Math.floor(fileCoords["image"].y + r * rect.height);
        const fileImageWidth = fileCoords["image"].width;
        const fileImageHeight = fileCoords["image"].height;

        const fileNameX = Math.floor(fileCoords["name"].x + c * rect.width);
        const fileNameY = Math.floor(fileCoords["name"].y + r * rect.height);
        const fileNameWidth = fileCoords["name"].width;
        const fileNameHeight = fileCoords["name"].height;

        const file = {
          fileId: fileId, x: fileX, y: fileY, width: fileWidth, height: fileHeight,
          image: {x: fileImageX, y: fileImageY, width: fileImageWidth, height: fileImageHeight},
          name: {x: fileNameX, y: fileNameY, width: fileNameWidth, height: fileNameHeight}
        }
        gridRef.current[key] = file;
        

      } else {
        console.warn(`Ref for newly added item at index ${i} (file: ${fileData.name}) is not available. This might happen if the element did not mount correctly.`);
      }
    }    


  };

  useEffect(() => {

    const currentFileContainer = fileContainerRef.current;
    if (currentFileContainer && !isLoadingMoreRef.current && hasMore.current && lazyLoadState.current === "list") {
      currentFileContainer.addEventListener("scroll", lazyLoadFiles);

      return () => {

        if (currentFileContainer) {
          currentFileContainer.removeEventListener("scroll", lazyLoadFiles);
        }
      };
    } else {
      // console.log("Scroll listener not added (no currentFileContainer).");
    }

  }, [lazyLoadFiles, fileContainerRef, isLoadingMoreRef.current, hasMore.current, lazyLoadState.current]);

  const handleClick = (file) => {

      if (file.type === "FOLDER") {
        if (file.id === folderIdRef.current) {
          setUpdateFiles(prev => !prev);
        }
        navigate(`/folders/${file.id}`);
      } else if (file.mimeType.startsWith("image/")) {

        // console.log(previewableItemsRef.current);
        
        previewRef.current.updateState(true);
        previewRef.current.updateCurrentSrc(file.id);
        
      }
      

  };
  const areSelectedObjectsEqual = (objA, objB) => {
    if (!objA && !objB) return true; 
    if (!objA || !objB) return false;
  
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
  
    if (keysA.length !== keysB.length) return false;
  
    for (const key of keysA) {

      if (!objB.hasOwnProperty(key) || objA[key]?.fileId !== objB[key]?.fileId) {
        return false;
      }
    }
    return true;
  };
  
  const handleSelected = (e, fileId) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedFiles(currentSelected => {
      const temp = {};
      if (fileId) {
        // Your logic for single/multi-select. This is a simple single-select replace:
        temp[fileId] = { fileId: fileId };
      }
  
      if (areSelectedObjectsEqual(currentSelected, temp)) {
        return currentSelected; // Return previous state if no actual change
      }
      return temp;
    });
    
    setFileContextWindow({ visible: false, x: 0, y: 0 });

  };

  const handleRightClick = async (e, fileId) => {
    e.preventDefault();
    e.stopPropagation();
    
    
    const target = e.target.closest("[data-file-id]");

    const clickedFileType = target ? target.getAttribute("data-file-type") : null;
    
    
    setRightClickSelectedFile(fileId);
  
    if (shouldRename !== -1) {
      if (newName.trim() !== "") {
        const req = await fetch(`${apiUrl}/rename`, {
          method: "PUT",
          headers: {"Content-Type":"application/json"},
          credentials: "include",
          body: JSON.stringify({
            fileId: shouldRename,
            name: newName.trim()
          })
        });

        if (!req.ok) {
          alert(req.errors);
          return;
        }
        const res = await req.json();
        const fileToRename = res.oldFile;
        const renamedFile = res.renamedFile;
        

        // if (previewableItemsRef.current.idToNode[fileToRename.id]) {
        //   previewableItemsRef.current.idToNode[fileToRename.id].value = renamedFile.relativePath;
        // }
        
        dispatch({type: 'rename-file', payload: {newFile: renamedFile, oldFile: fileToRename, name: newName}});
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
          temp[fileId] = { fileId: fileId };
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

        const req = await fetch(`${apiUrl}/rename`, {
          method: "PUT",
          headers: {"Content-Type":"application/json"},
          credentials: "include",
          body: JSON.stringify({
            fileId: shouldRename,
            name: newName.trim()
          })
        });

        if (!req.ok) {
          alert(req.errors);
          return;
        }
        const res = await req.json();
        const fileToRename = res.oldFile;
        const renamedFile = res.renamedFile;

        // if (previewableItemsRef.current.idToNode[fileToRename.id]) {
        //   previewableItemsRef.current.idToNode[fileToRename.id].value = renamedFile.relativePath;
        // }

        dispatch({type: 'rename-file', payload: {newFile: renamedFile, oldFile: fileToRename, name: newName}});

    }
    if (!target.closest('[text-area-id]')) {
      setShouldRename(-1);
    }

    if (target.closest('[file-image-id]') || target.closest('[file-name-id]')) {
      return;
    }
    
    
    setSelectedFiles(null);  
    setFileContextWindow({visible: false, x: 0, y: 0});

    
    const containerRect = fileContainerRef.current.getBoundingClientRect();

    const startX = Math.round(e.clientX - containerRect.left);
    const startY = Math.round((e.clientY + fileContainerRef.current.scrollTop) - containerRect.top);
    
    
    if (shouldRename === -1) {
      setContainerRect(containerRect);
      populateGrid();
      setSelectionStart({startPoint: { x: startX, y: startY }, isSelecting: true});
      lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
      
    } 
    
  };

  const setFileSize = () => {

    // NOT NEEDED NOW, MIGHT NEED IN FUTURE (?)

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
    

  };


  const updateSelection = (currentClientX, currentClientY) => {
    if (!selectionStart.isSelecting || !containerRect || !selectionStart.startPoint || !fileContainerRef.current) return;

    let currentXRelativeToContainer = Math.max(0, Math.round(currentClientX - containerRect.left));

    let currentYRelativeToScrollableContent = Math.max(0, Math.round(currentClientY - containerRect.top + fileContainerRef.current.scrollTop));

    const startPointX = selectionStart.startPoint.x;
    const startPointY = selectionStart.startPoint.y;

    const x = Math.min(currentXRelativeToContainer, startPointX);
    const y = Math.min(currentYRelativeToScrollableContent, startPointY);
    const width = Math.abs(currentXRelativeToContainer - startPointX);
    const height = Math.abs(currentYRelativeToScrollableContent - startPointY);

    const selectionData = {
      x, 
      y, 
      width,
      height,
      currentX: currentXRelativeToContainer,
      currentY: currentYRelativeToScrollableContent,
    };

    if (selectionBoxRef.current) {
      // Example of updating the child's state
      selectionBoxRef.current.updateState(selectionData);
    }
    
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
        const currJobs = progressCompRef.current.getCurrentJobs();
        const job = currJobs[jobId];

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

      let res;

      if (waitForResume) {
        res = await waitForResume();
      }
      

      if (jobId && res && res === 'closed') {
        progressCompRef.current.removeJob(jobId);
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
          
          if (waitForResume) {
            res = await waitForResume();
          }

          if (jobId && res && res === 'closed') {
            
            progressCompRef.current.removeJob(jobId);
            throw new Error("Upload cancelled by user");
          }

          await new Promise(resolve => setTimeout(resolve, currentBackoff));
          currentBackoff *= 2;
          currentTimeout *= 1.2;
      }
    }
  };

  const waitForResume = async (jobId) => {

    const currJobs = progressCompRef.current.getCurrentJobs();
    let currJob = currJobs[jobId];

    if (!currJob) return;

    return new Promise((resolve) => {
      const checkStatus = () => {
        const tempJobs = progressCompRef.current.getCurrentJobs();
        currJob = tempJobs[jobId];
        
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

  
  const getParentName =   (tempName) => {
    let parentName = "";

    for (let i = 0; i < tempName.length && i < 10; i++) {
        parentName += tempName.charAt(i);
    }

    return parentName;
  };
  const uploadPaths = async (files, pathToId, parentPath) => {

    for (let file of files) {

        const {relativePath, fileName} = getRelativePath(file, parentPath);

        if (!pathToId[relativePath]) {

            const relativePathArr = relativePath.split("/");
            
            let parentId = null;

            for (const folderName of relativePathArr) {
              
              if (folderName === '') continue;


              const req = await retryFetch(`${apiUrl}/savePath`, {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                  },
                  credentials: "include",
                  body: JSON.stringify({ folder: folderName, parentIdToSend: parentId, currentFolderId: folderIdRef.current }),
              }, 10000, 500);
              
              const res = await req.json();
              
              const { newParentId } = res.folderData;
              

              parentId = newParentId;
              
            }

            pathToId[relativePath] = parentId;

        }
    }
  };
  
  const getRelativePath = (file, parentPath) => {
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

      return {relativePath: relativePath, fileName: pathArr[len-1]};
  }
  const compareFiles = (a, b) => {
    // if (a.type && b.type) {
    //     if (a.type !== b.type) {
    //         return a.type === 'FOLDER' ? -1 : 1;
    //     }
    // }
    
    return a.name.localeCompare(b.name);
  };
  const conditionalPromise = (loadingRef, pollInterval = 100) => {
    return new Promise(resolve => {
      const checkCondition = () => {
        if (!loadingRef.current) {
          resolve();
        } else {
          setTimeout(checkCondition, pollInterval);
        }
      };
      checkCondition();
    });
  };

  const uploadFolder = async (e) => {

      e.preventDefault();
      
      const form = e.target;
      
      if (form[0].files.length <= 0) return;

      let pathToId = {};
      let currSize = [0];
      
      const fileList = Array.from(form[0].files);
      fileList.sort(compareFiles);
      const jobId = Date.now();
      
      const tempName = form[0].files[0].webkitRelativePath.split("/")[0];

      const parentName = getParentName(tempName);

      const totalSize = getUploadSize(form[0].files);
      
      progressCompRef.current.addJob({jobId: jobId, action: "upload", name: parentName, data: {percentage: 0}, pause: false, cancel: false});

      const parentPathReq = await retryFetch(`${apiUrl}/getParentPath`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        credentials: "include",
        body: JSON.stringify({folderId: folderId})
      }, 10000, 500); 

      
      const tempParentPath = await parentPathReq.json();

      const parentPath = tempParentPath.parentPath ? tempParentPath.parentPath : "";
      
      await uploadPaths(form[0].files, pathToId, parentPath);

      for (let file of fileList) {
        
       await conditionalPromise(isLoadingMoreRef);
      
       const fileData = getRelativePath(file, parentPath);

        // const req = await fetch(`${apiUrl}/checkFileStatus`, {
        //   method: "POST",
        //   credentials: "include",
        //   headers: {
        //     "Content-Type" : "application/json"
        //   },
        //   body: JSON.stringify({parentId: pathToId[relativePath], fileName: file.name})
        // });  

        // const fileStatus = await req.json();
        
        const metaData = {parentId: pathToId[fileData.relativePath], fileName: fileData.fileName};
        await uploadInChunks(file, fileData.relativePath, jobId, currSize, totalSize, metaData);
      

        

        progressCompRef.current.updateJob({
            jobId: jobId,
            data: {percentage: Math.round(currSize[0] * 100 / totalSize)}
        });
        
        file = null;
      }

      progressCompRef.current.removeJob(jobId);
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

    let fileRes = null;
  
    while (prevEnd < file.size) {

      const start = prevEnd;
      const end = Math.min(file.size, start + currChunkSize);
      const chunk = file.slice(start, end);
      prevEnd = end;
  

      currSize[0] += chunk.size;
  
      const formData = new FormData();
      
      const chunkData = {
        relativePath: relativePath,
        fileName: file.name,
        chunkMetaData: JSON.stringify(metaData),
        chunkData: JSON.stringify({start: `${start}`, end: `${end}`}),
        lastChunk: end === file.size,
        mimeType: file.type
      };


      formData.append("meta_data", JSON.stringify(chunkData));
      formData.append("chunk", chunk);     
      
  
      const startTime = performance.now();

      const request = await retryFetch(`${apiUrl}/uploadChunk`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      }, 10000, 500, jobId, () => waitForResume(jobId));
      
  
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const currentSpeed = updateRollingSpeed(currChunkSize, duration, "CHUNK");
      currChunkSize = determineDynamicChunkSize(currentSpeed);
      

      if (!request.ok) {
        // Handle error (could retry or abort)
        return;
      }
      const res = await request.json();
      
      fileRes = res.file;
      
      progressCompRef.current.updateJob({
        jobId: jobId,
        data: { percentage: Math.round(currSize[0] * 100 / totalSize) },
      });

    }

    return fileRes;
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

    
    setFileContextWindow({visible: false, x:0, y:0});
    const file = files.files.fileValues[fileId] || files.folders.fileValues[fileId];

    if (file) {
      setNewName(file.name);
    }
    
    setShouldRename(Number.parseInt(fileId));

  };

  const handleNameChange = (e) => {
    setNewName(e.target.value);
  };

  const handleDelete = async () => {

    let filesToDelete = [];
    
    if (selectedFiles) {
      for (const key of Object.keys(selectedFiles)) {
        const numKey = Number.parseInt(key);
        filesToDelete.push(numKey);
      }
    }
    
    const req = await fetch(`${apiUrl}/delete`, {
      method: "POST",
      headers: { "Content-Type" : "application/json" },
      credentials: 'include',
      body: JSON.stringify(filesToDelete)
    });
    
    if (!req.ok) {
      const res = await req.json();
      alert(res.errors);
      return;
    }
    const folderValues = files.folders.fileValues;
    const fileValues = files.files.fileValues;

    const newFolders = files.folders.clone();
    const newFiles = files.files.clone();
    
    for (const fileId of filesToDelete) {
      const file = fileValues[fileId] || folderValues[fileId];

      if (file) {
        
        if (file.type === 'FOLDER') {
          newFolders.delete(file);
        } else {
          newFiles.delete(file);
        }
        delete fileValues[fileId];
      }

    }
    newFolders.fileValues = fileValues;
    newFiles.fileValues = fileValues;
    
    dispatch({type: 'init-load', payload: {folders: newFolders, files: newFiles}});

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

    progressCompRef.current.addJob({jobId: jobId, action: type, data: {totalFiles: totalFiles}});
    
    setFileContextWindow({visible: false, x:0, y:0});
    const filesSelected = type && type === "copy" ? filesCopied : filesCut;


    for (const fileId of filesSelected) {

      const req = await fetch(`${apiUrl}/paste`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        credentials: "include",
        body: JSON.stringify({file: fileId, path: pathId, operationType: type})
      });

      const res = await req.json();

      if (!req.ok) { 
        alert(res.message);
        progressCompRef.current.removeJob(jobId);
        setFilesCopied([]);
        setFilesCut([]);
        return;
      }
      
      
    }
    
    setFilesCopied([]);
    setFilesCut([]);
    progressCompRef.current.removeJob(jobId);
    
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

    const res = await req.json();
    if (!req.ok) {
      alert(res.message);
    } else {
      if (res.folder) {
        const newFolders = files.folders.clone();
        const newFiles = files.files.clone();
        newFolders.add(res.folder);
        dispatch({type: 'init-load', payload: {folders: newFolders, files: newFiles}});
      }
      setNewFolder(false);
    }
  };
  
  const handleSort = (newSortOptions) => {
    setSortOptions(newSortOptions);
  };

  return (
    <ContentContainer>
      <PreviewComp ref={previewRef} previewableItems={previewableItemsRef.current} sortOptions={sortOptions} folderId={folderIdRef.current} lazyLoadFiles={lazyLoadFiles}></PreviewComp>
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
        uploadFile={uploadFile} uploadFolder={uploadFolder} handleNewFolder={handleNewFolder}
      />
      <Files files-context-window="true" displayMode={displayMode} ref={fileContainerRef} onContextMenu={(e) => handleRightClick(e, null)} onMouseDownCapture={(e) => handleMouseDown(e)}>
          <FolderContainer>
          {memoizedFileValues.map((file, index) => {
            // console.log(index);
            const isSelected = !!(selectedFiles && selectedFiles[file.id]);
            const isBeingRenamed = shouldRename === file.id;

            
            let fileImagePreview = `${apiUrl}${file.previewUrl}`;
            

            return (
              <FileItem
                key={file.id}
                file={file}
                assignRef={assignFileRef}
                index={index}
                isSelected={isSelected}
                isBeingRenamed={isBeingRenamed}
                displayMode={displayMode}
                newNameForRename={isBeingRenamed ? newName: ""} // Pass newName, FileItem will use if isBeingRenamed
                folderImage={folderImage}
                fileImage={fileImagePreview}
                onFileClick={(e) => handleClick(e)}
                onFileSelect={(e) => handleSelected(e, file.id)}
                onFileContextMenu={(e) => handleRightClick(e, file.id)}
                onNameChange={handleNameChange}
                defaultImage={fileImage}
              />
            );
        })}
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
            handleSort={handleSort}
          />
          }
          </FolderContainer>

        <SelectionBox ref={selectionBoxRef} itemRefs={itemRefs} grid={gridRef} />
      </Files>
      <ProgressComp 
          ref={progressCompRef} displayMode={displayMode} menuUp={menuUp} menuDown={menuDown} 
      />
      
    </ContentContainer>
  );
}

const FileItem = memo(function FileItem({
  file,
  assignRef,
  index,
  isSelected,
  isBeingRenamed,
  displayMode,
  newNameForRename, // Current value for the rename input
  folderImage,
  fileImage,
  onFileClick, // Handler for double click / open
  onFileSelect, // Handler for single click / selection
  onFileContextMenu, // Handler for right click
  onNameChange, // Handler for textarea change during rename
  defaultImage
}) {
  const [shouldHighlight, setShouldHighlight] = useState(false);
  // console.log(file, fileImage);
  

  const handleSelect = (e) => {
    onFileSelect(e, file.id);
  };

  const handleContextMenu = (e) => {
    onFileContextMenu(e, file.id);
  };

  const handleDoubleClick = () => {
    onFileClick(file);
  };

  const handleMouseEnter = () => {
    setShouldHighlight(true);
  };

  const handleMouseLeave = () => {
    setShouldHighlight(false);
  };

  const handeImageError = (e) => {
    e.target.onerror = null; 
    e.target.src = defaultImage;
  };

  return (
    <FileContainer
      data-file-id={file.id}
      data-file-type={file.type}
      ref={(el) => assignRef(el, file.id)}
    >
      <FileTempContainer>
        <FileImage
          file-image-id={file.id}
          src={file.type === "FOLDER" ? folderImage : fileImage}
          alt="file or folder image"
          onClick={handleSelect}
          onContextMenu={handleContextMenu}
          onDoubleClick={handleDoubleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onError={handeImageError}
        />
        {isBeingRenamed ? (
          <TextArea
            displayMode={displayMode}
            text-area-id={file.id}
            onMouseDownCapture={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
            value={newNameForRename}
            onChange={onNameChange}
            autoFocus={true}
          />
        ) : (
          <FileName
            file-name-id={file.id}
            style={{
              backgroundColor: isSelected
                ? "rgba(102, 51, 153, 0.4)"
                : shouldHighlight
                ? "rgba(102, 51, 153, 0.2)"
                : "transparent",
            }}
            onClick={handleSelect}
            onContextMenu={handleContextMenu}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {file.name}
          </FileName>
        )}
      </FileTempContainer>
    </FileContainer>
  );
});

const PreviewContainer = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 1000;
  background-color: #0000006b;
  display: flex;
  flex-direction: column;
`;
const PreviewClose = styled.div`
  color: white;
  width: 100%;
  display: flex;
  justify-content: right;
`;

const PreviewWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 4fr 1fr;
  flex: 1;
  overflow: hidden;
`;
const Pointer = styled.div`
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
`;
const PointerWrapper = styled.div`
  background-color: #00000082;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  transition: border-color 0.2s ease-in-out;
  &:hover {
    border-color: #9028f9;
  }
`;
const Preview = styled.div`
  width: 100%;
  height: 100%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
`;
const PreviewImgContainer = styled.div`
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`
const PreviewImg = styled.img`
  object-fit: contain; 
  max-width: 100%;
  max-height: 100%;
  -webkit-user-drag: none;
  user-select: none;
`;
const CloseImg = styled.img`
  width: 1.5vw;
  padding: 0.5vw;
`;
const PointerImg = styled.img`
  width: 5vw;
  cursor: pointer;
`;
const ZoomComp = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.5vw;
  padding: 0.5vw;
`
const ZoomWrapper = styled.div`
  background-color: #00000082;
  border-radius: 24px;
  display: grid;
  grid-template-columns: 1fr 4fr 1fr;
  padding: 0.5vw;
  width: 7%;
  justify-items: center;
`;
const Zoom = styled.div`
  width: 1.5vw;
  display: flex;
  align-items: center;
  cursor: pointer;
`;
const ZoomImg = styled.div`
  width: 1.5vw;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const LoadingSpinner = styled.div`
  width: 100%;
  height: 100%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
`
const spinnerKeyframes = keyframes`
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
`;
const Spinner = styled.div`
  border: 10px solid white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border-bottom-color: transparent;
  animation: ${spinnerKeyframes} 1s linear infinite;
`


const ZOOM_SENSITIVITY = 0.001;
const MAX_ZOOM = 5;
const MIN_ZOOM = 1;

function PreviewComp({ ref, previewableItems, sortOptions, folderId, lazyLoadFiles }) {
  const [showPreview, setShowPreview] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(-1);
  
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(null);
  const dragStart = useRef({ x: 0, y: 0 });

  const imageContainerRef = useRef(null);
  const imageRef = useRef(null);


  
  const resetTransform = () => {
    setTransform({ scale: 1, x: 0, y: 0 });
  };

  useImperativeHandle(ref, () => ({
    getState: () => showPreview,
    updateState: (newState) => {
      resetTransform();
      setShowPreview(newState);
    },
    getCurrentSrc: () => currentSrc,
    updateCurrentSrc: (newSrc) => setCurrentSrc(newSrc),
  }));

  const closePreview = () => {
    setShowPreview(false);
  };
  
  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  const getUrlForId = (id) => {
    return previewableItems.idToNode[id]
      ? `${apiUrl}${previewableItems.idToNode[id].value}`
      : null;
  };

  const handleLeftMove = (e) => {
    stopPropagation(e);

    if (isLoading) return;

    const currNode = previewableItems.idToNode[currentSrc];
    let prevNode = null;

    if (currNode) {
      if (sortOptions.sortDir === "desc") {
        prevNode = previewableItems.idToNode[currentSrc].next;      
      } else {
        prevNode = previewableItems.idToNode[currentSrc].prev;
      }
    }
    if (prevNode) {
      resetTransform();
      setCurrentSrc(prevNode.id);
      setIsLoading(getUrlForId(prevNode.id));
    } 
  };

  const handleRightMove = async (e) => {
    stopPropagation(e);

    if (isLoading) return;

    const previewSize = await checkPreviewableItemsSize(folderId);
    
    // if last item and there are more items, load more, only if sort direction is ascending

    const currNode = previewableItems.idToNode[currentSrc];

    let nextNode = null;
    if (currNode) {
      if (sortOptions.sortDir === "desc") {
        nextNode = previewableItems.idToNode[currentSrc].prev;      
      } else {
        nextNode = previewableItems.idToNode[currentSrc].next;
      }
    }
    if (sortOptions.sortDir === 'asc') {
      if (nextNode && nextNode.id === previewableItems.tail.id && previewableItems.len < previewSize) {
        await lazyLoadFiles(true);

      }
    }
    if (nextNode) {
      resetTransform();
      setCurrentSrc(nextNode.id);
      setIsLoading(getUrlForId(nextNode.id));

    }
  };

  const checkPreviewableItemsSize = async (folderId) => {
    
    const req = await fetch(`${apiUrl}/getPreviewableSize/${folderId}`, {
      method: "GET",
      credentials: "include"
    });

    const res = await req.json();

    const size = res.previewCount;


    return size;

  };


  const handleImageLoad = (e) => {
    
    if (imageContainerRef.current) {
      const width = e.target.naturalWidth;
      const height = e.target.naturalHeight;
      
      if (width >= height) {
        imageContainerRef.current.style.width = "100%";
        imageContainerRef.current.style.height = "100%";
      } else {
        imageContainerRef.current.style.width = "50%";
        imageContainerRef.current.style.height = "100%";      
      }
    }
    if (e.target.src === isLoading) {
      
      setIsLoading(null);
    }
  };

  const handleImageError = (e) => {
    if (e.target.src === isLoading) {
      setIsLoading(null);
    }
  };

  const handleScroll = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const delta = e.deltaY * -ZOOM_SENSITIVITY;

    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, transform.scale + delta));

    if (newScale === MIN_ZOOM) {
      setTransform({scale: 1, x: 0, y: 0});
      return;
    }
    
    if (newScale === transform.scale) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;


    const newX = mouseX - ((mouseX - transform.x) / transform.scale) * newScale;
    const newY = mouseY - ((mouseY - transform.y) / transform.scale) * newScale;

    setTransform({
      scale: newScale,
      x: newX,
      y: newY,
    });
  };


  const onMouseDown = (e) => {

    if (transform.scale <= MIN_ZOOM) return;
    e.preventDefault();
    setIsDragging(true);

    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

 const onMouseMove = (e) => {
    if (!isDragging || !imageRef.current || !imageContainerRef.current) return;
    e.preventDefault();

    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;


    const imageRect = imageRef.current.getBoundingClientRect();
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    
    const imageWidth = imageRect.width;
    const imageHeight = imageRect.height;
    
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;


    const maxTranslateX = 0;
    const maxTranslateY = 0;

    const minTranslateX = containerWidth - imageWidth;
    const minTranslateY = containerHeight - imageHeight;
    

    const clampedX = Math.max(Math.min(newX, maxTranslateX), minTranslateX);
    const clampedY = Math.max(Math.min(newY, maxTranslateY), minTranslateY);
    
    setTransform(prev => ({ ...prev, x: clampedX, y: clampedY }));
  };

  const onMouseUpOrLeave = () => {
    setIsDragging(false);
  };
  
  const getCursorStyle = () => {
    if (isDragging) return 'grabbing';
    if (transform.scale > MIN_ZOOM) return 'grab';
    return 'zoom-in';
  };

  const zoomOutHandler = () => {
    if (transform.scale >= MIN_ZOOM) {
      setTransform((prev) => ({scale: Math.max(MIN_ZOOM, prev.scale - 0.5), x: 0, y: 0}));
    }
  };
  const zoomInHandler = () => {
    if (transform.scale <= MAX_ZOOM) {
      setTransform((prev) => ({scale: Math.min(MAX_ZOOM, prev.scale + 0.5), x: 0, y: 0}));
    }    
  };

  if (!showPreview) return null;

  const loading = isLoading !== null;
  const currentImageUrl = getUrlForId(currentSrc);

  return (
    <PreviewContainer onClick={closePreview}>
      <PreviewClose>
        <CloseImg onClick={closePreview} src={closeWindow} alt="Close" />
      </PreviewClose>
      
      <PreviewWrapper>
        <Pointer>
          {
          (previewableItems.head && (sortOptions.sortDir === "asc" ? currentSrc !== previewableItems.head.id : currentSrc !== previewableItems.tail.id)) && <PointerWrapper>
            <PointerImg src={leftArrow} alt="Previous" onClick={handleLeftMove} />
          </PointerWrapper>
          }
        </Pointer>
        <Preview>
          <PreviewImgContainer ref={imageContainerRef}>
            {loading && 
            <LoadingSpinner>
              <Spinner>
              </Spinner>  
            </LoadingSpinner>
            }
            {currentImageUrl && <PreviewImg 
              key={currentSrc}
              ref={imageRef}
              src={currentImageUrl}
              onClick={stopPropagation} 
              onWheel={handleScroll}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUpOrLeave}
              onMouseLeave={onMouseUpOrLeave}
              onLoad={handleImageLoad}
              onError={handleImageError}

              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transformOrigin: '0 0', // set to center
                cursor: getCursorStyle(),
                display: loading ? 'none' : 'block'
              }}
            />}
          </PreviewImgContainer>
        </Preview>
        <Pointer>
          {
          (previewableItems.tail && (sortOptions.sortDir === "asc" ? currentSrc !== previewableItems.tail.id : currentSrc !== previewableItems.head.id)) && <PointerWrapper>
            <PointerImg src={rightArrow} alt="Next" onClick={handleRightMove} />
          </PointerWrapper>
          }
        </Pointer>
      </PreviewWrapper>
      
      <ZoomComp>
        {/* TODO: Make the zoom buttons do something */}
        <ZoomWrapper onClick={stopPropagation}>
          <Zoom onClick={zoomOutHandler}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={transform.scale === MIN_ZOOM ? "#ffffff60" : "#ffffff"}>
            <path d="M19,13H5V11H19V13Z" />
            </svg>
          </Zoom>
          <ZoomImg onClick={resetTransform}><img src={zoomIcon} alt="" /></ZoomImg>
          <Zoom onClick={zoomInHandler}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={transform.scale === MAX_ZOOM ? "#ffffff60" : "#ffffff"}>
            <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
            </svg>
          </Zoom>
        </ZoomWrapper>
      </ZoomComp>
    </PreviewContainer>
  );
}
function ProgressComp({ ref, displayMode, menuUp, menuDown}) {

  const [jobs, setJobs] = useState({});
  const [minimize, setMinimize] = useState();
  const jobsRef = useRef(jobs);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);
  
  const handleMinimize = () => {
    setMinimize(prev => !prev);
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
  const addJob = (job) => {
    setJobs(prevJobs => ({
      ...prevJobs,
      [job.jobId]: job
    }));
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

  useImperativeHandle(ref, () => ({
    getState: () => jobs,
    updateState: (newState) => setJobs(newState),
    addJob: (newJob) => addJob(newJob),
    updateJob: (job) => updateJob(job),
    removeJob: (jobId) => removeJob(jobId),
    getCurrentJobs: () => jobsRef.current
  }));

  if (Object.keys(jobs).length <= 0) return (<></>);

  return (
    <ProgressContainer>
      <MinimizeContainer displayMode={displayMode}>
        <Minimize displayMode={displayMode} onClick={handleMinimize}>{
        minimize ? <StyledMenuArrow src={menuUp}></StyledMenuArrow> : <StyledMenuArrow src={menuDown}></StyledMenuArrow>}</Minimize>
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

function SelectionBox({ ref, itemRefs, grid }) {
  const [selectionBox, setSelectionBox] = useState(null);
  
  const selectedItemsRef = useRef(new Set());

  useEffect(() => {

    const currentFrameSelected = new Set();
    
    if (selectionBox) {

      const startRow = Math.floor(selectionBox.y / height);
      const startCol = Math.floor(selectionBox.x / width);
      const endRow = Math.floor((selectionBox.y + selectionBox.height) / height);
      const endCol = Math.floor((selectionBox.x + selectionBox.width) / width);

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const key = `${r}_${c}`;
          if (grid.current[key]) {
            if (
              rectanglesIntersect(grid.current[key]['image'], selectionBox) ||
              rectanglesIntersect(grid.current[key]['name'], selectionBox)
            ) {
              const fileId = grid.current[key].fileId;
              currentFrameSelected.add(fileId);
            }
          }
        }
      }
    }


    const previouslySelected = selectedItemsRef.current;

    previouslySelected.forEach(fileId => {
      if (!currentFrameSelected.has(fileId)) {
        if (itemRefs.current[fileId]) {
            itemRefs.current[fileId].firstChild.style.backgroundColor = ''; 
        }
      }
    });


    currentFrameSelected.forEach(fileId => {
      if (!previouslySelected.has(fileId)) {
        if (itemRefs.current[fileId]) {
            itemRefs.current[fileId].firstChild.style.backgroundColor = "rgba(102, 51, 153, 0.4)";
        }
      }
    });

    selectedItemsRef.current = currentFrameSelected;

  }, [selectionBox, grid, itemRefs.current]);

  const rectanglesIntersect = (rectA, rectB) => {
    if (!rectA || !rectB) return false;
    return (
      rectA.x < rectB.x + rectB.width &&
      rectA.x + rectA.width > rectB.x &&
      rectA.y < rectB.y + rectB.height &&
      rectA.y + rectA.height > rectB.y
    );
  };

  useImperativeHandle(ref, () => ({
    getState: () => selectionBox,
    updateState: (newState) => setSelectionBox(newState),
    getSelectedItems: () => {
      const temp = {};
      for (const id of selectedItemsRef.current) {
        temp[id] = { fileId: id };
      }
      return temp;
    }
  }));

  return (
    selectionBox && (
      <div
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
    )
  );
}
const FileContextWindow = styled.div`
  position: fixed; 
  top: ${props => props.y}px;
  left: ${props => props.x}px;
  background-color: ${props => props.displayMode ? "#252424" : "#dedede"};
  color: ${props => props.displayMode ? "white" : "black"};
  z-index: 1000;
  display: flex;
  flex-direction: column;
  font-size: 0.7vw;
`;
const ContextItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5vw;
  padding: 0.5vw;
  cursor: pointer;
  position: relative;
  white-space: nowrap; 
  
  &:hover {
    background-color:  ${props => props.displayMode ? "#454444" : "#eee"};
  }
`;


const StyledContextImg = styled.img`
  width: 1.3vw;
`;

const ClickableP = styled.p`
  margin: 0; 
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
`;


const SubMenuItem = styled.div`
  background-color: ${props => props.displayMode ? "#252424" : "#dedede"};
  color: ${props => props.displayMode ? "white" : "black"};
  display: flex;
  gap: 1.5vw;
  position: relative;
  height: 100%;
  padding-left: 0.5vw;
  padding-right: 0.5vw;
  &:hover {
    background-color:  ${props => props.displayMode ? "#454444" : "#eee"};
  }
`;

const SortFieldsContainer = styled.div`
  position: absolute;
  left: 100%;
  z-index: 10;
  height: 100%;
`;

const SortOptionsContainer = styled.div`
  position: absolute;
  left: 100%;
  background-color: ${props => props.displayMode ? "#252424" : "#dedede"};
  color: ${props => props.displayMode ? "white" : "black"};
  z-index: 20;
  height: 200%;
`;

const Arrow = styled.span`
  margin-left: auto;
  padding-left: 1vw;
  color: #555;
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
`;

const SortOptionsWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5vw;
  padding-left: 0.5vw;
  padding-right: 0.5vw;
  cursor: pointer;
  position: relative;
  white-space: nowrap; 
  height: 50%;
  
  &:hover {
    background-color:  ${props => props.displayMode ? "#454444" : "#eee"};
  }
`;

function ContextWindow({ 
  fileContextWindow, handleNewFolder, handleDownload, handleRename, 
  handleDelete, selectedFiles, handleCut, handleCopy, 
  handlePaste, filesCopied, filesCut, displayMode, typeClicked, handleSort 
}) {
  
  const [sortFieldsState, setSortFieldsState] = useState(false);
  const [sortOptionsState, setSortOptionsState] = useState(false);

  const { x, y } = fileContextWindow;

  const showSortFields = () => {
    setSortFieldsState(true);
  };

  const hideSortFields = () => {
    setSortFieldsState(false);
  };

  const showSortOptions = () => {
    setSortOptionsState(true);
  }; 

  const hideSortOptions = () => {
    setSortOptionsState(false);
  };

  return (
    <FileContextWindow displayMode={displayMode} x={x} y={y} data-context-window="true" >
      {
      (!typeClicked || typeClicked.type === "FOLDER") && <ContextItemWrapper displayMode={displayMode} onClick={handleNewFolder}>
        <StyledContextImg src={newImg}></StyledContextImg>
        <ClickableP>New Folder</ClickableP>
      </ContextItemWrapper>
      }      
      {
        (!typeClicked) && (

          <ContextItemWrapper displayMode={displayMode} onMouseEnter={showSortFields} onMouseLeave={hideSortFields}>
            <StyledContextImg src={sortBy}></StyledContextImg>
            <ClickableP>Sort by</ClickableP>
            <Arrow>{'>'}</Arrow>

            {sortFieldsState && (
              <SortFieldsContainer>
                <SubMenuItem  displayMode={displayMode} onMouseEnter={showSortOptions} onMouseLeave={hideSortOptions}>
                  <StyledContextImg src={nameSort}></StyledContextImg>
                  <ClickableP>Name</ClickableP>
                  <Arrow>{'>'}</Arrow>

                  {sortOptionsState && (
                    <SortOptionsContainer displayMode={displayMode}>
                      <SortOptionsWrapper displayMode={displayMode}>
                        <StyledContextImg src={sortAsc}></StyledContextImg>
                        <ClickableP onClick={() => handleSort({sortBy: "name", sortDir: "asc"})}>Ascending</ClickableP>
                      </SortOptionsWrapper>
                       <SortOptionsWrapper displayMode={displayMode}>
                        <StyledContextImg src={sortDesc}></StyledContextImg>
                        <ClickableP onClick={() => handleSort({sortBy: "name", sortDir: "desc"})}>Descending</ClickableP>
                      </SortOptionsWrapper>
                    </SortOptionsContainer>
                  )}
                  
                </SubMenuItem>

              </SortFieldsContainer>
            )}
          </ContextItemWrapper>
        )
      }

      {
      typeClicked && <ContextItemWrapper displayMode={displayMode} onClick={handleDownload}>
        <StyledContextImg src={downloadImg}></StyledContextImg>
        <ClickableP>Download</ClickableP>
      </ContextItemWrapper>
      }

      {
      typeClicked && <ContextItemWrapper displayMode={displayMode} onClick={handleCut}>
        <StyledContextImg src={cutImg}></StyledContextImg>
        <ClickableP>Cut</ClickableP>
      </ContextItemWrapper>
      }

      {
      typeClicked && <ContextItemWrapper displayMode={displayMode} onClick={handleCopy}>
        <StyledContextImg src={copyImg}></StyledContextImg>
        <ClickableP>Copy</ClickableP>
      </ContextItemWrapper>
      
      }
      {
      ((!typeClicked || typeClicked.type === "FOLDER") && ((filesCopied && filesCopied.length > 0) || (filesCut && filesCut.length > 0))) && 
      <ContextItemWrapper displayMode={displayMode} onClick={handlePaste}>
        <StyledContextImg src={pasteImg}></StyledContextImg>
        <ClickableP>Paste</ClickableP>
      </ContextItemWrapper>
      }

      {
      (typeClicked && (selectedFiles && Object.keys(selectedFiles).length === 1)) && 
      <ContextItemWrapper displayMode={displayMode} onClick={handleRename}>
        <StyledContextImg src={renameImg}></StyledContextImg>
        <ClickableP>Rename</ClickableP>
      </ContextItemWrapper>
      }

      {
      typeClicked && <ContextItemWrapper displayMode={displayMode} onClick={handleDelete}>
        <StyledContextImg src={deleteImg}></StyledContextImg>
        <ClickableP>Delete</ClickableP>
      </ContextItemWrapper>
      }
    </FileContextWindow>
  );
};


