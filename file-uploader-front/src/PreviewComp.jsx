import { useEffect, useImperativeHandle, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import closeWindow from './assets/images/close-thick.svg';
import leftArrow from './assets/images/menu-left.svg';
import rightArrow from './assets/images/menu-right.svg';
import zoomIcon from './assets/images/zoom.svg';
import VideoPlayer from './VideoPlayer';

const StyledAudioPlayer = styled.audio`

  width: 50%;
`;
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
  width: 100%;
  height: 100%;
  position: relative;
`
const PreviewVideo = styled.video`
  object-fit: contain; 
  max-width: 100%;
  max-height: 100%;
  -webkit-user-drag: none;
  user-select: none;
  position: absolute;
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
  visibility: ${props => props.vis ? 'visible' : 'hidden'};
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

const apiUrl = import.meta.env.VITE_API_URL;

const ZOOM_SENSITIVITY = 0.001;
const MAX_ZOOM = 5;
const MIN_ZOOM = 1;

export default function PreviewComp({ 
    ref, previewableItems, 
    sortOptions, folderId, 
    lazyLoadFiles,
    continueSearch,
    totalSearchPreviewCount,
    lazyLoadState
}) {

  const [showPreview, setShowPreview] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(-1);
  
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(null);
  const dragStart = useRef({ x: 0, y: 0 });

  const imageContainerRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    closePreview();
  }, [folderId])
  
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
        console.log(nextNode, previewableItems.tail, previewableItems.len, previewSize);
        if (nextNode && nextNode.id === previewableItems.tail.id) {
            if (lazyLoadState.current === "list" && previewableItems.len < previewSize) {
                await lazyLoadFiles(true);
            } else {
                await continueSearch(totalSearchPreviewCount.current > 0);
            }

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


  const handleLoad = (e) => {
    
    
    if (imageContainerRef.current) {
      
      const width = e.target.naturalWidth || e.target.videoWidth || 1;
      const height = e.target.naturalHeight || e.target.videoHeight || 0;
      
      if (width >= height) {
        imageContainerRef.current.style.width = "100%";
        imageContainerRef.current.style.height = "100%";
      } else {
        imageContainerRef.current.style.width = "50%";
        imageContainerRef.current.style.height = "100%";      
      }
    }
    
    const src = getUrlForId(currentSrc);
    
    if (src === isLoading) {
      
      setIsLoading(null);
    }
  };

  const handleLoadError = (e) => {
    
    const src = getUrlForId(currentSrc);

    if (src === isLoading) {
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

  const renderPreviewAbleContent = (currentUrl, loading) => {

    const currNode = previewableItems.idToNode[currentSrc];

    if (currNode) {

      
      const mimeType = currNode.mimeType;

      if (mimeType.startsWith("image/")) {

        return <PreviewImg 
              key={currentSrc}
              ref={imageRef}
              src={currentUrl}
              onClick={stopPropagation} 
              onWheel={handleScroll}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUpOrLeave}
              onMouseLeave={onMouseUpOrLeave}
              onLoad={handleLoad}
              onError={handleLoadError}

              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transformOrigin: '0 0',
                cursor: getCursorStyle(),
                display: loading ? 'none' : 'block'
              }}
            />
        

      } else if (mimeType.startsWith("video/")) {

        const currStatus = currNode.status;
        
        if (!currStatus) {

          return <PreviewVideo controls key={currentSrc}
                onLoadedData={handleLoad}
                onClick={stopPropagation}
                style={{display: loading ? 'none' : 'block'}}>         
            <source src={currentUrl} type={currNode.mimeType} />
            Your browser does not support the video tag.
          </PreviewVideo>
        }

        return <VideoPlayer style={{display: loading ? 'none' : 'block'}}key={currentSrc} onLoaded={handleLoad} onClick={stopPropagation} file={currNode}></VideoPlayer>
        

      } else if (mimeType.startsWith("audio/")) {
        

        return (
          <StyledAudioPlayer
            key={currentSrc}
            onLoadedData={handleLoad}
            controls  
            onClick={stopPropagation}
            style={{display: loading ? 'none' : 'block'}}
          >
            <source src={currentUrl} type={currNode.mimeType} />
            Your browser does not support the audio element.
          </StyledAudioPlayer>
        );

      }

    }
    
    return null;
    
    
  };
  
  if (!showPreview) return null;
  
  const loading = isLoading !== null;
  const currentUrl = getUrlForId(currentSrc);
  const currNode = previewableItems.idToNode[currentSrc];


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

            {currentUrl && renderPreviewAbleContent(currentUrl, loading)}

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
      
      <ZoomComp vis={(currNode && currNode.mimeType.startsWith("image/"))}>
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