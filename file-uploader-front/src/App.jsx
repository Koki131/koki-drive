import { useEffect, useRef, useState } from 'react'
import './App.css'
import styled from 'styled-components'
import Header from './Header'
import Content from './Content'
import { BST } from '../util/BST'
import { useParams } from 'react-router'

const StyledAppContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #252424;
  overflow: hidden;
`;

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState({folders: new BST(0), files: new BST(0)});
  const [updateFiles, setUpdateFiles] = useState(false);
  const nextCursor = useRef(null);
  const calculatedInitialTake = useRef(null);
  const lazyLoadStateRef = useRef("list");
  const fileContainerRef = useRef(null);


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

  return (
    <StyledAppContainer>
      <Header files={files} setFiles={setFiles} isLoading={isLoading}
       setIsLoading={setIsLoading} updateFiles={updateFiles} setUpdateFiles={setUpdateFiles} 
       fileContainerRef={fileContainerRef}
       calculatedInitialTake={calculatedInitialTake}
       nextCursor={nextCursor}
      //  setNextCursor={setNextCursor}
       lazyLoadState={lazyLoadStateRef}
       />
      <Content 
        files={files}
        setFiles={setFiles}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        updateFiles={updateFiles}
        setUpdateFiles={setUpdateFiles}
        fileContainerRef={fileContainerRef}
        calculatedInitialTake={calculatedInitialTake}
        nextCursor={nextCursor}
        // setNextCursor={setNextCursor}
        lazyLoadState={lazyLoadStateRef}
      />
    </StyledAppContainer>
  );
}

export default App;
