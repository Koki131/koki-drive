import { useAuth } from "./AuthProvider";
import toggle_image from "./assets/images/toggle_image.svg"
import logoutImg from "./assets/images/logout.svg";
import search from "./assets/images/search.svg"
import logo from "./assets/images/logo.png";
import styled, { keyframes } from "styled-components";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";


const StyledContainer = styled.div`
    width: 100%;
    position: fixed;
    top: 0;
    left: 0;
    height: 3vw; 
    background-color: ${props => (props.displayMode ? "#252424" : "#f5f5f5")};
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: ${props => (props.displayMode ? "white" : "black")};
    z-index: 999;
    box-sizing: border-box;
    padding-left: 1vw;
    padding-right: 1vw;

    .shadow {
        position: absolute;
        bottom: 0;
        left: 5vw;
        height: 3px; 
        width: 100%;
        /* box-shadow: ${props => (props.displayMode ? 'rgba(17, 17, 26, 0.5) 0px 3px 0px' : 'rgba(100, 100, 100, 0.2) 0px 2px 0px')}; */
        z-index: -1;
    }
`;


const CommonStyledDiv = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
`;


const StyledInputOuterContainer = styled.div`
    ${CommonStyledDiv}
    min-width: 100px;
    flex-grow: 1; 
`;


const InputWithButtonWrapper = styled.div`
    position: relative;
    width: 50%; 
    display: flex;
    align-items: center;
`;

const StyledInput = styled.input`
    outline: none;
    padding: 0.5vw 2vw 0.5vw 3vw;
    border: 1px solid transparent; 
    border-radius: 34px;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    font-size: 0.7vw;
    z-index: 0;


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

    &:focus {
        border-color: #9028f9;
    }
`;

const SharedInputButton = styled.button`
    background-color: transparent;
    border: none;
    padding: 0;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 100%; 
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1; 
    font-size: 8px;


    ${props => !props.displayMode && `
        color: #333;
        &:hover {
            color: rebeccapurple;
        }
    `}

    ${props => props.displayMode && `
        color: #ccc;
        &:hover {
            color: teal;
        }
    `}
`;

const StyledSearchImgContainer = styled(SharedInputButton)`
    left: 0;
    padding: 0.5vw;

`;
const StyledSearchImg = styled.img`
    width: 100%;
    height: 100%;
`

const StyledClear = styled(SharedInputButton)`
    right: 0; 
    padding: 0.5vw; 
`

const StyledClearImg = styled.svg`
    width: 100%;
    height: 100%;
    fill: #9028f9;

    &:hover {
        cursor: pointer;
    }
`

const StyledLogoutImg = styled.img`

    width: 2vw;

    &:hover {
        cursor: pointer;
    }
`;

const ToggleModeContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: max(1.3vw, 20px);
    
    &:hover {
        cursor: pointer;
    }
`

const StyledToggleImage = styled.img`
    width: 1.5vw;
    margin-right: 0.5vw;
`
const StyledToggleBar = styled.div`
    position: relative;

    ${props => !props.displayMode && `
        background-color: #d1d1d1;
        color: black;
        border-color: #ccc;
    `}

    ${props => props.displayMode && `
        background-color: #3a3a3a;
        color: white;
        border-color: #555;
    `}
    
    width: 2vw;
    height: 1vw;
    border-radius: 34px;
    display: flex;
    align-items: center;
`
const Slider = styled.div`
    position: absolute;
    background-color: #9028f9;
    border-radius: 50%;
    ${props => props.displayMode && `left: 0`};
    ${props => !props.displayMode && `right: 0`};
    width: 1.1vw;
    height: 1.1vw;
`
const LogoPlaceholder = styled.div`
    display: flex;
    align-items: center;
    font-weight: bold;
    font-size: 1.2em;
    flex: 1;
`;

const LogoImg = styled.img`
    width: 3vw;
`
const spin = keyframes`
  to {
    transform: rotate(360deg);
  }

`
const FileLoader = styled.div`
    ${props => !props.isLoading && `visibility: hidden;`}
    ${props => props.isLoading && `visibility: visible;`}
    color: black;
    margin-right: 5px;
    width: 1.5vw;
    height: 1.5vw;
    border: 1px solid #ababab;
    border-top: 1px solid #9028f9;
    border-right: 1px solid #9028f9;    
    border-radius: 50%;
    animation: ${spin} 1s linear infinite;
`

function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

export default function Header({ files, setFiles, isLoading, setIsLoading, setUpdateFiles }) {
    const { folderId } = useParams();
    const { logout, toggle, displayMode } = useAuth(); 
    const [searchValue, setSearchValue] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [isAttemptingConnection, setIsAttemptingConnection] = useState(false);
    const ws = useRef(null);

    const connectWebSocket = useCallback(() => {

        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            console.log('WebSocket already open');
            return;
        }
        if (isAttemptingConnection) {
            console.log('WebSocket connection attempt already in progress.');
            return;
        }

        setIsAttemptingConnection(true);

        const wsUrl = `ws://localhost:3000/search`;
        const socket = new WebSocket(wsUrl);
        ws.current = socket;

        socket.onopen = () => {
            console.log('WebSocket connected to /search');
            setIsConnected(true);
            setIsAttemptingConnection(false);
        };

        socket.onmessage = (event) => {
 
            try {
                console.log("Raw WebSocket data:", event.data);
                const message = JSON.parse(event.data);
                console.log('Received from WebSocket:', message);
                if (message.type === 'SEARCH_RESULTS') {
                    
                    const receivedFiles = message.payload;

                    setFiles(prev => [...prev, ...receivedFiles]);
                } else if (message.type === 'ERROR') {
                    console.error('WebSocket Error from server:', message.payload);
                } else if (message.type === 'SEARCH_COMPLETE') {
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            setIsConnected(false);
            setIsLoading(false);
            setIsAttemptingConnection(false);
        };

        socket.onclose = (event) => {
            console.log('WebSocket disconnected from /search. Code:', event.code, 'Reason:', event.reason);
            setIsConnected(false);
            setIsLoading(false);
            setIsAttemptingConnection(false);

            if (ws.current === socket) {
                ws.current = null;
            }
        };
    }, [isAttemptingConnection]);


    const disconnectWebSocket = useCallback(() => {
        if (ws.current) {
            ws.current.close();
        }
    }, [ws]);

    useEffect(() => {
        return () => {
            disconnectWebSocket();
        };
    }, [disconnectWebSocket]);


    const executeSearch = useCallback((query) => {
        if (!query.trim()) {
            return;
        }

        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            setFiles([]);
            setIsLoading(true);
            ws.current.send(JSON.stringify({ type: 'SEARCH_QUERY', payload: query, folderId: folderId }));
        } else {
            console.warn('WebSocket not connected. Cannot send search query.');
            if (!isAttemptingConnection) {
                connectWebSocket(); 
            }
        }
    }, [folderId, isAttemptingConnection, connectWebSocket]); 

    const debouncedExecuteSearch = useMemo(() => {
        return debounce(executeSearch, 500);
    }, [executeSearch]);

    const handleSearchInputChange = (e) => {
        
        if (!isLoading) {
            const newQuery = e.target.value;
            setSearchValue(newQuery);
    
            if (!newQuery.trim()) {
                setUpdateFiles((prev) => !prev);
            }
    
            debouncedExecuteSearch(newQuery);
        }
    };

    const establishConnection = useCallback(() => {

        if (!isConnected && !isAttemptingConnection) {
            connectWebSocket();
        }
    }, [isConnected, isAttemptingConnection, connectWebSocket]);


    const handleLogout = async () => {
        await logout();
    };

    const handleToggle = () => {
        toggle();
    };

    const clearInput = () => {
        setSearchValue("");
        setUpdateFiles((prev) => !prev);
        debouncedExecuteSearch("");
    };



    return (
        <StyledContainer displayMode={displayMode}>
            <div className="shadow"></div> 
            <LogoPlaceholder>
                <LogoImg src={logo}>

                </LogoImg>
            </LogoPlaceholder>
            <FileLoader isLoading={isLoading}></FileLoader>
            <StyledInputOuterContainer>
                <InputWithButtonWrapper>
                    <StyledSearchImgContainer displayMode={displayMode} src={search}>
                        <StyledSearchImg src={search}></StyledSearchImg>
                    </StyledSearchImgContainer>
                    <StyledInput 
                        type="text" 
                        placeholder="Search" 
                        displayMode={displayMode}
                        value={searchValue} 
                        onChange={(e) => handleSearchInputChange(e)}
                        onFocus={(e) => establishConnection(e)}
                        onBlur={(e) => disconnectWebSocket(e)}
                    />
                    <StyledClear displayMode={displayMode} onClick={clearInput}>
                    {
                    searchValue.trim() !== "" && <StyledClearImg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <title>close</title>
                        <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </StyledClearImg>
                    }
                    </StyledClear>
                </InputWithButtonWrapper>
            </StyledInputOuterContainer>

            <div style={{display: "flex"}}>
                <ToggleModeContainer displayMode={displayMode} onClick={handleToggle} title="Toggle Light/Dark mode">
                    <StyledToggleImage displayMode={displayMode} src={toggle_image}>

                    </StyledToggleImage>
                    <StyledToggleBar displayMode={displayMode}>
                        <Slider displayMode={displayMode}></Slider>
                    </StyledToggleBar>
                </ToggleModeContainer>
                <StyledLogoutImg displayMode={displayMode} onClick={handleLogout} src={logoutImg} alt="Logout" title="Logout">
                    
                </StyledLogoutImg>
            </div>
        </StyledContainer>
    );
};