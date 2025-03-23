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
  const [fileOptions, setFileOptions] = useState(false);

  return (
    <StyledAppContainer onClick={() => setFileOptions(false)}>
      <Header />
      <Content 
        fileOptions={fileOptions} 
        setFileOptions={setFileOptions}
      />
    </StyledAppContainer>
  );
}

export default App;
