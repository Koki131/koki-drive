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

  return (
    <StyledAppContainer>
      <Header files={files} setFiles={setFiles} isLoading={isLoading} setIsLoading={setIsLoading} setUpdateFiles={setUpdateFiles} />
      <Content 
        files={files}
        setFiles={setFiles}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        updateFiles={updateFiles}
        setUpdateFiles={setUpdateFiles}
      />
    </StyledAppContainer>
  );
}

export default App;
