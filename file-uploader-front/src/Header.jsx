import { useAuth } from "./AuthProvider";
import toggle_image from "./assets/images/toggle_image.svg"
import logoutImg from "./assets/images/logout.svg";
import search from "./assets/images/search.svg"
import logo from "./assets/images/logo.png";
import styled, { keyframes } from "styled-components";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { BST } from '../util/BST';

const apiUrl = import.meta.env.VITE_API_URL;

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

  export default function Header({ 
    files, dispatch, isLoading, setIsLoading, updateFiles, setUpdateFiles, 
    fileContainerRef, calculatedInitialTake,
    nextCursor, lazyLoadState
}) {

    const { folderId } = useParams();
    const { logout, toggle, displayMode } = useAuth();
    const [searchValue, setSearchValue] = useState("");
    const hasMore = useRef(true);

    const isLoadingMoreRef = useRef(false);
    
    useEffect(() => {
        setSearchValue("");
    }, [folderId, updateFiles]);
    
    const executeSearch = async (query) => {
        
        if (!calculatedInitialTake.current) return;

        lazyLoadState.current = "search";
        hasMore.current = true; 
        nextCursor.current = null;

        if (!query.trim()) {
            setFiles(new BST(0));
            setIsLoading(false); 
            isLoadingMoreRef.current = false;
            setUpdateFiles(prev => !prev);
            lazyLoadState.current = "list";
            return;
        }

        setFiles(new BST(0));
        setIsLoading(true);
        isLoadingMoreRef.current = true;


        try {            
            const req = await fetch(`${apiUrl}/search`, {
                method: "POST",
                headers: {"Content-Type":"application/json"},
                credentials: "include",

                body: JSON.stringify({ searchTerm: query, take: calculatedInitialTake.current })
            });
            if (!req.ok) {
                throw new Error(`HTTP error! status: ${request.status}`);
              }
            const res = await req.json();
            const { files: initialFiles, nextCursor: initialNextCursor } = res.result;

            nextCursor.current = initialNextCursor;
            
            hasMore.current = !!initialNextCursor;

            const bst = new BST(calculatedInitialTake.current);
            
            for (const file of initialFiles) {
              bst.add(file);
            }
            
            setFiles(bst);

        } catch (error) {
            console.error("Error fetching initial search files:", e);
            setFiles(new BST(0));
        } finally {
            setIsLoading(false);
            isLoadingMoreRef.current = false;
        }


    };

    const debouncedExecuteSearch = useMemo(() => {
        return debounce(executeSearch, 500);
    }, [executeSearch]);

    const continueSearch = useCallback(async () => {
        

        if (!hasMore.current || isLoadingMoreRef.current || isLoading || lazyLoadState.current === "list") {
            return;
        }


        const container = fileContainerRef.current;
        const { scrollTop, scrollHeight, clientHeight } = container;
        const buffer = 5;
        
        if (scrollTop + clientHeight >= scrollHeight - buffer) {
            
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
                        cursor: nextCursor.current // Send the cursor for the next page
                    })
                });

                if (!req.ok) {
                    throw new Error(`HTTP error! status: ${req.status}`);
                }
                const res = await req.json();
                
                const { files: newFiles, nextCursor: newNextCursor } = res.result;

                if (newFiles && newFiles.length > 0) {
                    setFiles(currentBst => {
                        const newBst = currentBst.clone();
                        
                        for (const file of newFiles) {
                            const fileNode = newBst.find(file);
                            if (!fileNode) {
                                newBst.add(file);
                            }
                        }
                        return newBst;
                    });
                }
                
                nextCursor.current = newNextCursor;
                hasMore.current = !!newNextCursor;

            } catch (error) {
                console.error("Error continuing search:", error);
            } finally {
                setIsLoading(false);
                isLoadingMoreRef.current = false;
            }
            

        }
    }, [searchValue, setIsLoading, isLoading]); 

    

    const handleSearchInputChange = (e) => {
        const newQuery = e.target.value;
        setSearchValue(newQuery);

        if (!newQuery.trim()) {
            debouncedExecuteSearch(""); 
        } else {
            debouncedExecuteSearch(newQuery);
        }
    };


    const handleLogout = async () => {
        await logout();
    };

    const handleToggle = () => {
        toggle();
    };

    const clearInput = () => {
        setSearchValue("");
        lazyLoadState.current = "list";
        executeSearch("");
    };


    useEffect(() => {
        const currentFileContainer = fileContainerRef.current;

        if (currentFileContainer && !isLoadingMoreRef.current && hasMore.current && lazyLoadState.current === "search") { 

            currentFileContainer.addEventListener("scroll", continueSearch);
            
            return () => {
                console.log("Removing scrollend listener.");
                currentFileContainer.removeEventListener("scroll", continueSearch);
            };
        } else {
            //  console.log("Scrollend listener not added (no currentFileContainer or searchRange is null).");
        }
    }, [continueSearch, fileContainerRef, isLoadingMoreRef, hasMore.current, lazyLoadState.current]);




   

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