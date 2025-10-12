import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import './App.css'
import './style.css';
import styled from 'styled-components'
import Header from './Header'
import Content from './Content'
import { BST } from '../util/BST'
import { useParams } from 'react-router'
import filesReducer from '../util/FilesReducer'
import LinkedList from '../util/LinkedList'

const apiUrl = import.meta.env.VITE_API_URL;
const StyledAppContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #252424;
  overflow: hidden;
`;

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [files, dispatch] = useReducer(filesReducer, {folders: new BST(0), files: new BST(0)});
  const [updateFiles, setUpdateFiles] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const nextCursor = useRef(null);
  const calculatedInitialTake = useRef(null);
  const lazyLoadStateRef = useRef("list");
  const fileContainerRef = useRef(null);
  const totalSearchPreviewCount = useRef(-1);
  const hasMore = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const previewableItemsRef = useRef(new LinkedList());

  useEffect(() => {
    previewableItemsRef.current = new LinkedList();
    hasMore.current = true;
  }, [lazyLoadStateRef.current]);

  useEffect(() => {

    const handleResize = () => {
        
        if (fileContainerRef.current) {

            const filesDiv = fileContainerRef.current;
            
            const containerWidth = filesDiv.clientWidth;
            const containerHeight = filesDiv.clientHeight;

            const itemApproximateWidth = 100; 
            const itemApproximateHeight = 120; 

            if (containerWidth > 0 && containerHeight > 0 && itemApproximateWidth > 0 && itemApproximateHeight > 0) {
                const itemsPerRow = Math.max(1, Math.floor(containerWidth / itemApproximateWidth));
                const rowsToFill = Math.ceil(containerHeight / itemApproximateHeight);

                const bufferRows = 2;
                const initialTake = itemsPerRow * (rowsToFill + bufferRows);

                console.log(`Calculated initial take: ${initialTake} (Container H:${containerHeight}, W:${containerWidth}, Items/Row:${itemsPerRow}, RowsToFill:${rowsToFill})`);
                calculatedInitialTake.current = initialTake;
            } else {
                console.warn("Could not calculate initial take, dimensions not ready. Using default:", calculatedInitialTake.current);
            }
            
        }
    }

    handleResize();

  }, [fileContainerRef.current]);

  const continueSearch = useCallback(async (carousel) => {
          

      // if (!hasMore.current || isLoadingMoreRef.current || isLoading || lazyLoadState.current === "list") {
      //     return;
      // }
      
      const container = fileContainerRef.current;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const buffer = 5;
      
      if ((scrollTop + clientHeight >= scrollHeight - buffer) || carousel) {
          
          setIsLoading(true);
          isLoadingMoreRef.current = true;

          const itemsPerPage = 30;

          try {                
              const req = await fetch(`${apiUrl}/search`, {
                  method: "POST",
                  headers: {"Content-Type":"application/json"},
                  credentials: "include",

                  body: JSON.stringify({
                      searchTerm: searchValue, 
                      take: itemsPerPage,
                      cursor: nextCursor.current
                  })
              });

              if (!req.ok) {
                  throw new Error(`HTTP error! status: ${req.status}`);
              }
              const res = await req.json();
              totalSearchPreviewCount.current = res.totalPreviews;
              const { files: newFiles, nextCursor: newCursor } = res.result;

              let filesToAdd = null;

              if (newFiles && newFiles.length > 0) {  
                  filesToAdd = newFiles;
              }
      
      
              nextCursor.current = newCursor;
              if (!newCursor) {
                  hasMore.current = false;
              }            

              if (filesToAdd.length > 0) {
              
                  for (const file of filesToAdd) {
                      if (file.mimeType && (file.mimeType.startsWith("image/") || file.mimeType.startsWith("video/") || file.mimeType.startsWith("audio/"))) {
                          previewableItemsRef.current.add(file.id, file.relativePath, file.mimeType, file.status);
                          
                      }
                  }

                  dispatch({ type: 'lazy-load', payload: filesToAdd });
              }

          } catch (error) {
              console.error("Error continuing search:", error);
          } finally {
              setIsLoading(false);
              isLoadingMoreRef.current = false;
          }
          

      }
    }, [searchValue, setIsLoading, isLoading]); 

  return (
    <StyledAppContainer>
      <Header files={files} dispatch={dispatch} isLoading={isLoading}
       setIsLoading={setIsLoading} updateFiles={updateFiles} setUpdateFiles={setUpdateFiles} 
       fileContainerRef={fileContainerRef}
       calculatedInitialTake={calculatedInitialTake}
       nextCursor={nextCursor}
       lazyLoadState={lazyLoadStateRef}
       totalSearchPreviewCount={totalSearchPreviewCount}
       hasMore={hasMore}
       isLoadingMoreRef={isLoadingMoreRef}
       searchValue={searchValue}
       setSearchValue={setSearchValue}
       previewableItemsRef={previewableItemsRef}
       continueSearch={continueSearch}
       />
      <Content 
        files={files}
        dispatch={dispatch}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        updateFiles={updateFiles}
        setUpdateFiles={setUpdateFiles}
        fileContainerRef={fileContainerRef}
        calculatedInitialTake={calculatedInitialTake}
        nextCursor={nextCursor}
        lazyLoadState={lazyLoadStateRef}
        totalSearchPreviewCount={totalSearchPreviewCount}
        hasMore={hasMore}
        isLoadingMoreRef={isLoadingMoreRef}
        previewableItemsRef={previewableItemsRef}
        continueSearch={continueSearch}
      />
    </StyledAppContainer>
  );
}

export default App;
