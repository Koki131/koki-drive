import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import PreviewComp from './PreviewComp';


const ContentContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: 100vw;
  height: 100vh;
  position: relative;
  bottom: 0;
  left: 0;
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
  height: 100%;
  display: flex;
  align-items: center;
  word-wrap: break-word;
  white-space: normal;
  justify-content: center;
  text-align: center;
  padding: 5px;
  
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
  lazyLoadState,
  totalSearchPreviewCount,
  hasMore,
  isLoadingMoreRef,
  previewableItemsRef,
  continueSearch
}) {

  const navigate = useNavigate();
  const { folderId } = useParams();
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [rightClickSelectedFile, setRightClickSelectedFile] = useState(null); 
  const [selectionStart, setSelectionStart] = useState({startPoint: null, isSelecting: false});  // can be a ref (?)
  const [containerRect, setContainerRect] = useState(null); 
  const [fileContextWindow, setFileContextWindow] = useState({visible: false, x: 0, y: 0, moveLeft: false});
  const [filesCopied, setFilesCopied] = useState([]); 
  const [filesCut, setFilesCut] = useState([]);
  const [newFolder, setNewFolder] = useState(false); // change to ref
  const [typeClicked, setTypeClicked] = useState("");
  const [sortOptions, setSortOptions] = useState({sortBy: "name", sortDir: "asc"});
  const [shouldRename, setShouldRename] = useState(-1);
  const [videoConfirm, setVideoConfirm] = useState({visible: false, fileName: ""});
  const [duplicateConfirm, setDuplicateConfirm] = useState({visible: false, fileName: "", type: "upload"});
  const [isPositioned, setIsPositioned] = useState(false);
  
  const { displayMode, user, authLoading } = useAuth();
  
  
  const sseUrl = !authLoading && user ? `${apiUrl}/events?userId=${user.id}` : null;
  
  const folderIdRef = useRef(folderId); 
  const folderNameRef = useRef(null);
  // Ref to prevent multiple concurrent loads
  // const hasMore = useRef(true); // change to ref
  // const isLoadingMoreRef = useRef(false);
  // const previewableItemsRef = useRef(new LinkedList());
  const loadingVideoData = useRef({ isLoadingVideo: false, applyToAll: false, makeRenditions: false });
  const duplicateNameData = useRef({ replace: false, newFile: false, blockExecution: true, applyToAll: false, cancel: false });
  const lastMousePositionRef = useRef({ x: 0, y: 0 });
  const itemRefs = useRef({});
  const selectionBoxRef = useRef();
  const progressCompRef = useRef();
  const previewRef = useRef();
  const gridRef = useRef({});
  const liveRenderedCount = useRef(0);
  const maxRenderedFiles = useRef(0);
  const uploadQueueRef = useRef([]);
  const contextWindowRef = useRef(null);

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
              
              if (fileData.mimeType.startsWith("video/") || fileData.mimeType.startsWith("image/") || fileData.mimeType.startsWith("video/")) {
                  previewableItemsRef.current.add(fileData.id, fileData.relativePath, fileData.mimeType, fileData.status);
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
    
    const controller = new AbortController();

    const getFiles = async () => {
        if (!calculatedInitialTake.current) {
            return;
        }

        
        setIsLoading(true);
        isLoadingMoreRef.current = true;
        
        hasMore.current = true; 
        nextCursor.current = null;
        
        try {
          const nullableParent = folderIdRef.current ? folderIdRef.current : null;
          const parent = folderIdRef.current ? folderIdRef.current : "";
          
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
              if (file.mimeType.startsWith("image/") || file.mimeType.startsWith("video/") || file.mimeType.startsWith("audio/")) {
                
                previewableItemsRef.current.add(file.id, file.relativePath, file.mimeType, file.status);
                
              }
            }
          }
          
          nextCursor.current = initialNextCursor;
          hasMore.current = !!nextCursor.current;
          

          
          if (folderIdRef.current !== nullableParent) return;

          dispatch({type: 'init-load', payload: {folders: newFolders, files: newFiles}});

          return () => {
            controller.abort();
          };

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

    if (!hasMore.current || isLoadingMoreRef.current || isLoading || lazyLoadState.current === 'search') return;
    
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

          const nullableParent = folderIdRef.current ? folderIdRef.current : null;
          const parent = folderIdRef.current ? folderIdRef.current : "";
  
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
          
          if (folderIdRef.current !== nullableParent) return;

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
              if (file.mimeType && (file.mimeType.startsWith("image/") || file.mimeType.startsWith("video/") || file.mimeType.startsWith("audio/"))) {
                  previewableItemsRef.current.add(file.id, file.relativePath, file.mimeType, file.status);
                  
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
      if (file.mimeType && (file.mimeType.startsWith("image/") || file.mimeType.startsWith("video/")) || file.mimeType.startsWith("audio/")) {
          newPreviewableList.add(file.id, file.relativePath, file.mimeType, file.status);
      }
    }
    previewableItemsRef.current = newPreviewableList;

  }, [memoizedFileValues]);

  const populateGrid = () => {
    
    gridRef.current = {};
    // const currentFilesCount = memoizedFileValues.length; 

    const containerRect = fileContainerRef.current.getBoundingClientRect();
    
    for (const id of Object.keys(itemRefs.current)) {
      const fileElement = itemRefs.current[id].getNode();

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

  useLayoutEffect(() => {

  if (fileContextWindow.visible && !isPositioned) {
    

    if (contextWindowRef.current && fileContainerRef.current) {
      const menuRect = contextWindowRef.current.getBoundingClientRect();
      const containerRect = fileContainerRef.current.getBoundingClientRect();

      let newX = fileContextWindow.x;
      let newY = fileContextWindow.y;
      const optionsWidth = newX + 2 * menuRect.width;
      const optionsHeight = newY + menuRect.height  * 1.5;

      let shouldMoveLeft = false;
      let shouldMoveUp = false;

      if (newX + menuRect.width > containerRect.right) {
        newX = newX - menuRect.width;
      }


      if (newY + menuRect.height > containerRect.bottom) {
        newY = newY - menuRect.height;
      }

      if (optionsHeight > containerRect.bottom) {
        shouldMoveUp = true;
      }

      if (optionsWidth > containerRect.right) {
        shouldMoveLeft = true;
      }
      

      setFileContextWindow(prev => ({
        ...prev,
        x: newX,
        y: newY,
        moveLeft: shouldMoveLeft,
        moveUp: shouldMoveUp
      }));

      setIsPositioned(true);
    }
  }
}, [fileContextWindow, isPositioned, fileContainerRef]);

  const handleClick = (file) => {

      if (file.type === "FOLDER") {
        if (file.id === folderIdRef.current) {
          setUpdateFiles(prev => !prev);
        }
        navigate(`/folders/${file.id}`);
      } else if (file.mimeType.startsWith("image/") || file.mimeType.startsWith("video/") || file.mimeType.startsWith("audio/")) {

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
    
    setFileContextWindow({ visible: false, x: 0, y: 0, moveLeft: false, moveUp: false });

  };

  const handleRightClick = async (e, fileId) => {
    e.preventDefault();
    e.stopPropagation();
    
    
    const target = e.target.closest("[data-file-id]");

    const clickedFileType = target ? target.getAttribute("data-file-type") : null;
    
    
    setRightClickSelectedFile(fileId);
  
    
        

    
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

    setIsPositioned(false);
    setFileContextWindow((prev) => {
      
      return {
        visible: !prev.visible,
        x: x,
        y: y,
        moveLeft: false,
        moveUp: false
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
    
    
    


    if (target.closest('[file-image-id]') || target.closest('[file-name-id]')) {
      return;
    }
    
    
    setSelectedFiles(null);  
    setFileContextWindow({ visible: false, x: 0, y: 0, moveLeft: false, moveUp: false });

    
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
    setFileContextWindow({ visible: false, x: 0, y: 0, moveLeft: false, moveUp: false });
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
          let errorData = null;

          try {
            errorData = await response.json();
          } catch (e) {

          }

          const error = new Error(`Server responded with status ${response.status}`);

          error.data = errorData;

          throw error;
        }

        
        return response;

      } catch (error) {
          console.error(`Fetch failed: ${error.message}`);
          
          if (error.data) {
            throw error;
          }

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

  
  const getParentName = (tempName) => {
    let parentName = "";

    for (let i = 0; i < tempName.length && i < 10; i++) {
        parentName += tempName.charAt(i);
    }

    return parentName;
  };
  const uploadPaths = async (files, pathToId, parentPath) => {
    
    let rootName = null;
    let changeName = false;

    if (files.length > 0) {

      rootName = files[0].webkitRelativePath.split("/")[0];

      
      
      const req = await retryFetch(`${apiUrl}/checkIfFolderExists?folderName=${rootName}&parentId=${folderIdRef.current}`, {
        credentials: "include"
      }, 10000, 500);
      
      if (!req.ok) {
        return;
      }
      
      const res = await req.json();
      
      const folderName = res.folderName;
      const folderId = res.folderId;
      const parentId = res.parentId;

      
      if (folderName && folderId) {
        // open context window and await for new instructions
        setDuplicateConfirm({visible: true, fileName: folderName, type: "upload"});
        
        await conditionalPromiseDuplicate(duplicateNameData);

        if (duplicateNameData.current.newFile) {

          const generateNewName = await retryFetch(`${apiUrl}/generateNewName?folderName=${rootName}&folderId=${folderId}&parentId=${parentId}`, {
            credentials: "include"
          }, 10000, 500);

          const res = await generateNewName.json();

          rootName = res.changedName;
          duplicateNameData.current = { replace: false, newFile: false, blockExecution: true, applyToAll: false, cancel: false };

          changeName = true;

        }

      }

    }
    
    for (let file of files) {
      
        const {relativePath, fileName} = getRelativePath(file, parentPath, rootName, changeName);
        
        if (!pathToId[relativePath]) {

            const relativePathArr = relativePath.split("/");
            
            let parentId = null;

            for (const folderName of relativePathArr) {
              
              if (folderName === '') continue;

              try {

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

                } catch (error) {

                    console.error("An unrecoverable network error occurred:", error.message);

                }

              
            }

            pathToId[relativePath] = parentId;

        }
    }

    return {rootName: rootName, changeName: changeName};
  };
  
  const getRelativePath = (file, parentPath, newName, changeName) => {
      const pathArr = file.webkitRelativePath.split("/");
      const len = pathArr.length;
      
      let path = [];
      path.push(parentPath);

      let s = 0;
      if (changeName) {
        path.push(newName);
        s = 1;
      }

      for (let i = s; i < len-1; i++) {
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
  const conditionalPromiseVideo = (loadingVideoData, pollInterval = 100) => {
    return new Promise(resolve => {
      const checkCondition = () => {
        if (!loadingVideoData.current.isLoadingVideo) {
          resolve();
        } else {
          setTimeout(checkCondition, pollInterval);
        }
      };
      checkCondition();
    });
  };
  const conditionalPromiseDuplicate = (duplicateData, pollInterval = 100) => {
    return new Promise(resolve => {
      const checkCondition = () => {
        if (!duplicateData.current.blockExecution) {
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

      let yesToAll = false;
      let noToAll = false;

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
      
      const { rootName, changeName } = await uploadPaths(form[0].files, pathToId, parentPath);

      for (let file of fileList) {
        
        let makeRenditionsCurrentVideo = false;

        await conditionalPromise(isLoadingMoreRef);

        if (!yesToAll && !noToAll && file.type.startsWith("video/")) {

          loadingVideoData.current = { isLoadingVideo: true, applyToAll: false, makeRenditions: false };
          setVideoConfirm({visible: true, fileName: file.name});
          
          await conditionalPromiseVideo(loadingVideoData);

          const { isLoadingVideo, applyToAll, makeRenditions } = loadingVideoData.current;

          if (applyToAll) {

            if (makeRenditions) {
              yesToAll = true;
            } else {
              noToAll = true;
            }

          } else if (makeRenditions) {

            makeRenditionsCurrentVideo = true;
          
          }
          

        }
        
        
        const fileData = getRelativePath(file, parentPath, rootName, changeName);

        
        const metaData = {parentId: pathToId[fileData.relativePath], fileName: fileData.fileName};
        const videoConfirmData = { yesToAll: yesToAll, noToAll: noToAll, makeRenditionsCurrentVideo: makeRenditionsCurrentVideo };
        
        await uploadInChunks(file, fileData.relativePath, jobId, currSize, totalSize, metaData, videoConfirmData);
      

        

        progressCompRef.current.updateJob({
            jobId: jobId,
            data: {percentage: Math.round(currSize[0] * 100 / totalSize)}
        });
        
        file = null;
      }

      progressCompRef.current.removeJob(jobId);
  };

  const uploadInChunks = async (file, relativePath, jobId, currSize, totalSize, metaData, videoConfirmData) => {

    let currChunkSize = 1 * 1024 * 1024; 
    let prevEnd = 0;


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
      formData.append("video_confirm_data", JSON.stringify(videoConfirmData));     
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

  const handleRenameSubmit = async (fileId, oldName) => {

      const newName = itemRefs.current[fileId].getState();

      if (newName) {
        const trimmedNewName = newName.trim();

        if (trimmedNewName.localeCompare(oldName.trim()) === 0) {
          setShouldRename(-1);
          return;
        }
        let conflictedFile = null;

        try {

          const renameConflictCheck = await retryFetch(`${apiUrl}/renameNameConflict?newName=${trimmedNewName}&fileId=${shouldRename}`, {
            credentials: "include"
          }, 10000, 500);



        } catch (e) {
            
          if (e.data) {
            setDuplicateConfirm({visible: true, fileName: trimmedNewName, type: "rename"});
            
            conflictedFile = e.data.conflictedFile;

            await conditionalPromiseDuplicate(duplicateNameData);
          }       

        } finally {

          try {

            if (duplicateNameData.current.cancel) {
                setShouldRename(-1);
                return;
            }

            const req = await retryFetch(`${apiUrl}/rename`, {
              method: "PUT",
              headers: {"Content-Type":"application/json"},
              credentials: "include",
              body: JSON.stringify({
                fileId: shouldRename,
                name: trimmedNewName,
                replace: duplicateNameData.current.replace,
                addNew: duplicateNameData.current.newFile,
                conflictedFile: conflictedFile
              })
            }, 10000, 500);
    
            const res = await req.json();
            
            const fileToRename = res.oldFile;
            const renamedFile = res.renamedFile;
            const replaced = res.replaced;
    
            console.log(renamedFile);
            
            if (previewableItemsRef.current.idToNode[fileToRename.id]) {
              previewableItemsRef.current.idToNode[fileToRename.id].value = renamedFile.relativePath;
            }
              // itemRefs.current[]updateState: (newState) => setNewName(newState)
            if (itemRefs && itemRefs.current[renamedFile.id]) itemRefs.current[renamedFile.id].updateState(renamedFile.name);
            
            dispatch({type: 'rename-file', payload: {newFile: renamedFile, oldFile: fileToRename, name: trimmedNewName, conflictedFile: replaced ? conflictedFile : null}});
            
          } catch (e) {
            if (e.data) {
              alert(e.data.message);
            }
          } finally {            
            duplicateNameData.current = { replace: false, newFile: false, blockExecution: true, applyToAll: false, cancel: false };
          }
        }
      } 

      setShouldRename(-1);

  };
  
  const handleRename = () => {

    let fileId = null;
    const selFiles = selectedFiles ? Object.keys(selectedFiles) : null;

    if (selFiles) {
      fileId = selFiles[0];
    }

    
    setFileContextWindow({ visible: false, x: 0, y: 0, moveLeft: false, moveUp: false });
    const file = files.files.fileValues[fileId] || files.folders.fileValues[fileId];

    // if (file) {
    //   setNewName(file.name);
    // }
    
    setShouldRename(Number.parseInt(fileId));

  };

  const handleNameChange = (e, fileId) => {
    if (itemRefs.current[fileId].getNode()) {

      itemRefs.current[fileId].updateState(e.target.value);
    }
  };

  const handleDelete = async () => {

    setFileContextWindow({ visible: false, x: 0, y: 0, moveLeft: false, moveUp: false });

    if (!confirm(`Are you sure you want to delete these files?`)) return;

    const jobId = Date.now();

    progressCompRef.current.addJob({jobId: jobId, action: "delete", data: {}});
    
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
      progressCompRef.current.removeJob(jobId);
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
    
    progressCompRef.current.removeJob(jobId);
    dispatch({type: 'init-load', payload: {folders: newFolders, files: newFiles}});
    
  };

  const handleCut = () => {
    let filesToCut = null;
    if (selectedFiles) {
      filesToCut = Object.keys(selectedFiles)
    }
    setFilesCut(filesToCut);
    
    setFilesCopied([]);
    setSelectedFiles(null);
    setFileContextWindow({ visible: false, x: 0, y: 0, moveLeft: false, moveUp: false });
    
  };
  
  const handleCopy = () => {

    let filesToCopy = null;
    if (selectedFiles) {
      filesToCopy = Object.keys(selectedFiles)
    }
    setFilesCopied(filesToCopy);
    
    setFilesCut([]);
    setSelectedFiles(null);
    setFileContextWindow({ visible: false, x: 0, y: 0, moveLeft: false, moveUp: false });
    
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
    
    setFileContextWindow({ visible: false, x: 0, y: 0, moveLeft: false, moveUp: false });
    const filesSelected = type && type === "copy" ? filesCopied : filesCut;

    let globalAdd = false;

    for (const fileId of filesSelected) {
      try {

        let currAdd = false;

        const fileExists = await retryFetch(`${apiUrl}/checkFileExists?fileId=${fileId}&pathId=${pathId}`, {
          credentials: 'include'
        }, 10000, 500);

        const fileExistsRes = await fileExists.json();

        const { fileName, parentId } = fileExistsRes;

        if (fileName) {
          
          if (!duplicateNameData.current.applyToAll) {

            setDuplicateConfirm({visible: true, fileName: fileName, type: "paste"});
    
            await conditionalPromiseDuplicate(duplicateNameData);


            if (duplicateNameData.current.applyToAll) {
              if (duplicateNameData.current.newFile) {
                globalAdd = true;
              } 
            } else {
              if (duplicateNameData.current.newFile) {
                currAdd = true;
              }
            }
          }

        }
        if (duplicateNameData.current.cancel) {
          break;
        }

        const req = await retryFetch(`${apiUrl}/paste`, {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          credentials: "include",
          body: JSON.stringify({file: fileId, path: pathId, operationType: type, fileName: (globalAdd || currAdd) ? fileName : null})
        }, 10000, 500);
        

      } catch (e) {

        if (e.data) {
          alert(e.data.message);
        }
        progressCompRef.current.removeJob(jobId);
        setFilesCopied([]);
        setFilesCut([]);
        return;

      }
      
    }
    
    // setFilesCopied([]);
    setFilesCut([]);
    progressCompRef.current.removeJob(jobId);
    duplicateNameData.current = { replace: false, newFile: false, blockExecution: true, applyToAll: false, cancel: false };
    
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
      <PreviewComp ref={previewRef} previewableItems={previewableItemsRef.current} 
      sortOptions={sortOptions} folderId={folderIdRef.current} 
      lazyLoadFiles={lazyLoadFiles}
      continueSearch={continueSearch}
      totalSearchPreviewCount={totalSearchPreviewCount}
      lazyLoadState={lazyLoadState}
      ></PreviewComp>
      {
      duplicateConfirm.visible && 
      <DuplicateNameConfirm duplicateConfirm={duplicateConfirm} setDuplicateConfirm={setDuplicateConfirm} duplicateNameData={duplicateNameData} displayMode={displayMode}>

      </DuplicateNameConfirm>
      }
      {videoConfirm.visible && <VideoConfirm videoConfirm={videoConfirm} setVideoConfirm={setVideoConfirm} loadingVideoData={loadingVideoData} displayMode={displayMode}>

      </VideoConfirm>}
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
            const cacheBuster = Date.now();
            
            let fileImagePreview = `${apiUrl}${file.previewUrl}?v=${cacheBuster}`
            
            
            return (
              <FileItem
                key={file.id}
                file={file}
                handleRenameSubmit={() => handleRenameSubmit(file.id, file.name)}
                ref={(node) => {
                  if (node) {
                    itemRefs.current[file.id] = node;
                  } else {
                    delete itemRefs.current[file.id];
                  }
                }}
                index={index}
                isSelected={isSelected}
                isBeingRenamed={isBeingRenamed}
                displayMode={displayMode}
                orgName={file.name}
                folderImage={folderImage}
                fileImage={fileImagePreview}
                onFileClick={(e) => handleClick(e)}
                onFileSelect={(e) => handleSelected(e, file.id)}
                onFileContextMenu={(e) => handleRightClick(e, file.id)}
                onNameChange={(e) => handleNameChange(e, file.id)}
                defaultImage={fileImage}
              />
            );
        })}
          {fileContextWindow.visible && <ContextWindow
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
            lazyLoadState={lazyLoadState}
            visibility={isPositioned ? fileContextWindow.visible : !fileContextWindow.visible}
            contextRef={contextWindowRef}
          />}
          </FolderContainer>

        <SelectionBox ref={selectionBoxRef} itemRefs={itemRefs} grid={gridRef} />
      </Files>
      <ProgressComp 
          ref={progressCompRef} displayMode={displayMode} menuUp={menuUp} menuDown={menuDown} 
      />
      
    </ContentContainer>
  );
}

function FileItem({
  file,
  handleRenameSubmit,
  ref,
  index,
  isSelected,
  isBeingRenamed,
  displayMode,
  orgName,
  folderImage,
  fileImage,
  onFileClick, 
  onFileSelect,
  onFileContextMenu,
  onNameChange,
  defaultImage
}) {
  const [shouldHighlight, setShouldHighlight] = useState(false);
  const [newName, setNewName] = useState(orgName);
  const itemRef = useRef(null);
  const textAreaRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getState: () => newName,
    updateState: (newState) => setNewName(newState),
    getNode: () => itemRef.current
  }));

  useEffect(() => {

    if (textAreaRef.current) {
      let lastDot = orgName.length-1;

      while (lastDot > 0 && orgName.charAt(lastDot) !== ".") {
        lastDot--;
      }
      textAreaRef.current.focus();
      textAreaRef.current.setSelectionRange(0, lastDot === 0 ? orgName.length : lastDot);
    }

  }, [isBeingRenamed]);

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

  const handleBlur = (e) => {
    e.preventDefault();
    handleRenameSubmit();
  };
  
  return (
    <FileContainer
      data-file-id={file.id}
      data-file-type={file.type}
      ref={itemRef}
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
            ref={textAreaRef}
            displayMode={displayMode}
            text-area-id={file.id}
            onMouseDownCapture={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
            onBlur={handleBlur}
            value={newName}
            onChange={onNameChange}
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
};
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

          if (job.action === "delete") {
            return (
              !minimize && <Progress displayMode={displayMode} key={jobId}>
              <ProgressHeader>
                <ContentSize>Deleting files</ContentSize>
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
        if (itemRefs.current[fileId].getNode()) {
            itemRefs.current[fileId].getNode().firstChild.style.backgroundColor = ''; 
        }
      }
    });


    currentFrameSelected.forEach(fileId => {
      if (!previouslySelected.has(fileId)) {
        if (itemRefs.current[fileId].getNode()) {
            itemRefs.current[fileId].getNode().firstChild.style.backgroundColor = "rgba(102, 51, 153, 0.4)";
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
  visibility: ${props => props.visibilityProp};
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
  left: ${props => props.moveLeft ? "auto" : "100%"};
  right: ${props => props.moveLeft ? '100%' : 'auto'};
  z-index: 10;
  height: 100%;
`;

const SortOptionsContainer = styled.div`
  position: absolute;
  left: ${props => props.moveLeft ? "auto" : "100%"};
  right: ${props => props.moveLeft ? '100%' : 'auto'};
  background-color: ${props => props.displayMode ? "#252424" : "#dedede"};
  color: ${props => props.displayMode ? "white" : "black"};
  z-index: 20;
  height: 200%;
  bottom: ${props => props.moveUp ? "0" : "auto"};
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

function  ContextWindow({ 
  fileContextWindow, handleNewFolder, handleDownload, handleRename, 
  handleDelete, selectedFiles, handleCut, handleCopy, 
  handlePaste, filesCopied, filesCut, displayMode, typeClicked, handleSort, lazyLoadState, visibility, contextRef
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
    <FileContextWindow ref={contextRef} displayMode={displayMode} x={x} y={y} visibilityProp={visibility ? "visible" : "hidden"} data-context-window="true" >
      {
      (lazyLoadState.current === "list" && (!typeClicked || typeClicked.type === "FOLDER")) && <ContextItemWrapper displayMode={displayMode} onClick={handleNewFolder}>
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
              <SortFieldsContainer moveLeft={fileContextWindow.moveLeft}>
                <SubMenuItem  displayMode={displayMode} onMouseEnter={showSortOptions} onMouseLeave={hideSortOptions}>
                  <StyledContextImg src={nameSort}></StyledContextImg>
                  <ClickableP>Name</ClickableP>
                  <Arrow>{'>'}</Arrow>

                  {sortOptionsState && (
                    <SortOptionsContainer displayMode={displayMode} moveLeft={fileContextWindow.moveLeft} moveUp={fileContextWindow.moveUp}>
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
      ((lazyLoadState.current === "list" && (!typeClicked || typeClicked.type === "FOLDER") )&& ((filesCopied && filesCopied.length > 0) || (filesCut && filesCut.length > 0))) && 
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


const ConfirmWindow = styled.div`
  display: grid;
  grid-template-rows: repeat(1fr, auto);
  position: absolute;
  top: 50%;
  left: 50%;
  margin: 0;
  transform: translate(-50%, -50%);
  width: 20vw;
  height: 15vh;
  background-color: ${props => !props.displayMode ? "#f5f5f5" : "#252424"};
  color: ${props => !props.displayMode ? "#252424" : "#f5f5f5"};
  border-radius: 34px;
  padding: 1vw;
  z-index: 1;
`

const ConfirmButtonContainer = styled.div`
  display: flex;
  justify-content: end;
  gap: 0.5vw;
`

const ConfirmButton = styled.p`
  color: #9028f9;
  &:hover {
    cursor: pointer;
  }
`
const ConfirmInputContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3vw;
`;

function DuplicateNameConfirm({ duplicateConfirm, setDuplicateConfirm, duplicateNameData, displayMode }) {
    const checkboxRef = useRef(null);

    const handleButtons = (e, options) => {
      e.preventDefault();
      
      setDuplicateConfirm({visible: false, fileName: "", type: "upload"});
      duplicateNameData.current = {...options, applyToAll: duplicateConfirm.type === "paste" ? checkboxRef.current.checked : false};

    };

    return (
    <ConfirmWindow displayMode={displayMode}>
      <p>
        Name already exists <span><i><b>{duplicateConfirm.fileName}</b></i></span>
      </p>
      { 
      duplicateConfirm.type === "paste" && <ConfirmInputContainer>
        <input ref={checkboxRef} name="video-input" id='video-input' type="checkbox" />
        <label htmlFor="video-input">
          Apply to all video files?
        </label> 
      </ConfirmInputContainer> 
      }
      <ConfirmButtonContainer>
        <ConfirmButton onClick={(e) => handleButtons(e, { replace: true, newFile: false, blockExecution: false, applyToAll: false, cancel: false })}>Replace</ConfirmButton>
        <ConfirmButton onClick={(e) => handleButtons(e, { replace: false, newFile: true, blockExecution: false, applyToAll: false, cancel: false })}>Rename</ConfirmButton>
        <ConfirmButton onClick={(e) => handleButtons(e, { replace: false, newFile: true, blockExecution: false, applyToAll: false, cancel: true })}>Cancel</ConfirmButton>
      </ConfirmButtonContainer>
    </ConfirmWindow>
  );
}

function VideoConfirm({ videoConfirm, setVideoConfirm, loadingVideoData, displayMode }) {
  const checkboxRef = useRef(null);

  const handleButtons = (e, flag) => {
    e.preventDefault();
    
    setVideoConfirm({visible: false, fileName: ""});
    loadingVideoData.current = { isLoadingVideo: false, applyToAll: checkboxRef.current.checked, makeRenditions: flag };
  };

  return (
    <ConfirmWindow displayMode={displayMode}>
      <p>
        It looks like you're about to transfer a video file. Do you wish to make multiple renditions of the quality? <span><i>({videoConfirm.fileName})</i></span>
      </p>
      <ConfirmInputContainer>
        <input ref={checkboxRef} name="video-input" id='video-input' type="checkbox" />
        <label htmlFor="video-input">
          Apply to all video files?
        </label>
      </ConfirmInputContainer>
      <ConfirmButtonContainer>
        <ConfirmButton onClick={(e) => handleButtons(e, true)}>Yes</ConfirmButton>
        <ConfirmButton onClick={(e) => handleButtons(e, false)}>No</ConfirmButton>
      </ConfirmButtonContainer>
    </ConfirmWindow>
  );

}


