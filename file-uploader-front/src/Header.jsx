import { useAuth } from "./AuthProvider";
import toggle_image from "./assets/images/toggle_image.svg"
import logoutImg from "./assets/images/logout.svg";
import search from "./assets/images/search.svg"
import logo from "./assets/images/logo.png";
import styled, { keyframes } from "styled-components";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { BST } from '../util/BST';
import LinkedList from "../util/LinkedList";

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
    nextCursor, lazyLoadState, totalSearchPreviewCount, hasMore, isLoadingMoreRef,
    searchValue, setSearchValue, previewableItemsRef, continueSearch
}) {

    const { folderId } = useParams();
    const { logout, toggle, displayMode } = useAuth();

    
    useEffect(() => {
        setSearchValue("");
    }, [folderId, updateFiles]);
    
    const executeSearch = useCallback(async (query) => {
        
        if (!calculatedInitialTake.current || isLoading || isLoadingMoreRef.current) return;

        lazyLoadState.current = "search";
        hasMore.current = true; 
        nextCursor.current = null;

        dispatch({type: 'init-load', payload: {folders: new BST(0), files: new BST(0)}});
        if (!query.trim()) {
            setIsLoading(false); 
            isLoadingMoreRef.current = false;
            setUpdateFiles(prev => !prev);
            lazyLoadState.current = "list";
            return;
        }

        setIsLoading(true);
        isLoadingMoreRef.current = true;
        
        try {       
            
            const req = await fetch(`${apiUrl}/search`, {
                method: "POST",
                headers: {"Content-Type":"application/json"},
                credentials: "include",
                body: JSON.stringify({ searchTerm: query, take: calculatedInitialTake.current, searchType: "init" })
            });
            if (!req.ok) {
                throw new Error(`HTTP error! status: ${req.status}`);
            }
            const res = await req.json();
            
            totalSearchPreviewCount.current = res.totalPreviews;

            const { files: initialFiles, nextCursor: initialNextCursor } = res.result;
            

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
            
            dispatch({type: 'init-load', payload: {folders: newFolders, files: newFiles}});

        } catch (error) {
            console.error("Error fetching initial search files:", error);
            dispatch({type: 'init-load', payload: {folders: new BST(0), files: new BST(0)}});
        } finally {
            setIsLoading(false);
            isLoadingMoreRef.current = false;
        }


    }, [
        dispatch,
        setIsLoading,
        setUpdateFiles,
        lazyLoadState,
        calculatedInitialTake,
        nextCursor,
    ]);

    const debouncedExecuteSearch = useMemo(() => {
        return debounce(executeSearch, 500);
    }, [executeSearch]);

   
    

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

        if (!confirm("Are you sure you want to logout?")) {
            return;
        }
        
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

        if (!isLoading && currentFileContainer && !isLoadingMoreRef.current && hasMore.current && lazyLoadState.current === "search") { 

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