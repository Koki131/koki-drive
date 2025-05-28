import { useEffect, useRef, useState } from 'react'
import './App.css'
import styled from 'styled-components'
import Header from './Header'
import Content from './Content'

const StyledAppContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #252424;
  overflow: hidden;
`;

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [updateFiles, setUpdateFiles] = useState(false);
  const [calculatedInitialTake, setCalculatedInitialTake] = useState(0);
  const fileContainerRef = useRef(null);


  useEffect(() => {

    const handleResize = () => {
        
        if (fileContainerRef.current) {

            const filesDiv = fileContainerRef.current;

            const containerWidth = filesDiv.clientWidth;
            const containerHeight = filesDiv.clientHeight;

            const itemApproximateWidth = 100; 
            const itemApproximateHeight = 100; 

            if (containerWidth > 0 && containerHeight > 0 && itemApproximateWidth > 0 && itemApproximateHeight > 0) {
                const itemsPerRow = Math.max(1, Math.floor(containerWidth / itemApproximateWidth));
                const rowsToFill = Math.ceil(containerHeight / itemApproximateHeight);

                const bufferRows = 2;
                const initialTake = itemsPerRow * (rowsToFill + bufferRows);

                console.log(`Calculated initial take: ${initialTake} (Container H:${containerHeight}, W:${containerWidth}, Items/Row:${itemsPerRow}, RowsToFill:${rowsToFill})`);
                setCalculatedInitialTake(initialTake);
            } else {
                console.warn("Could not calculate initial take, dimensions not ready. Using default:", calculatedInitialTake);
            }
            
        }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("resize", handleResize);

    return () => {

    }
}, [calculatedInitialTake, fileContainerRef]);

  return (
    <StyledAppContainer>
      <Header files={files} setFiles={setFiles} isLoading={isLoading}
       setIsLoading={setIsLoading} setUpdateFiles={setUpdateFiles} 
       fileContainerRef={fileContainerRef}
       calculatedInitialTake={calculatedInitialTake} />
      <Content 
        files={files}
        setFiles={setFiles}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        updateFiles={updateFiles}
        setUpdateFiles={setUpdateFiles}
        fileContainerRef={fileContainerRef}
        calculatedInitialTake={calculatedInitialTake}
      />
    </StyledAppContainer>
  );
}

export default App;
