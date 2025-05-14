import { useAuth } from "./AuthProvider";
import toggle_image from "./assets/images/toggle_image.svg"
import logoutImg from "./assets/images/logout.svg";
import search from "./assets/images/search.svg"
import logo from "./assets/images/logo.png";
import styled from "styled-components";


const StyledContainer = styled.div`
    width: 100%;
    position: fixed;
    top: 0;
    left: 0;
    height: 3vw; 
    background-color: ${props => (props.displayMode ? "#252424" : "#dedede")};
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: ${props => (props.displayMode ? "white" : "black")};
    z-index: 1000;
    box-sizing: border-box;
    padding-left: 1vw;
    padding-right: 1vw;

    .shadow {
        position: absolute;
        bottom: 0;
        left: 5vw;
        height: 3px; 
        width: 100%;
        box-shadow: ${props => (props.displayMode ? 'rgba(17, 17, 26, 0.5) 0px 3px 0px' : 'rgba(100, 100, 100, 0.2) 0px 2px 0px')};
        z-index: -1;
    }
`;


const CommonStyledDiv = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
`;


const StyledInputOuterContainer = styled(CommonStyledDiv)`
    flex-grow: 6; 
`;


const InputWithButtonWrapper = styled.div`
    position: relative;
    width: 30%; 
    min-width: 100px; 
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
`;

const SharedInputButton = styled.button`
    background-color: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 100%; 
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1; 
    font-size: 14px;


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


export default function Header() {
    const { logout, toggle, displayMode } = useAuth();

    const handleLogout = async () => {
        await logout();
    };

    const handleToggle = () => {
        toggle();
    };
    const clearInput = () => {
    };

    return (
        <StyledContainer displayMode={displayMode}>
            <div className="shadow"></div> 
            <LogoPlaceholder>
                <LogoImg src={logo}>

                </LogoImg>
            </LogoPlaceholder>

            <StyledInputOuterContainer>
                <InputWithButtonWrapper>
                    <StyledSearchImgContainer displayMode={displayMode} src={search}>
                        <StyledSearchImg src={search}></StyledSearchImg>
                    </StyledSearchImgContainer>
                    <StyledInput 
                        type="text" 
                        placeholder="Find file" 
                        displayMode={displayMode} 
                    />
                    <StyledClear displayMode={displayMode} onClick={clearInput}>
                    <StyledClearImg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <title>close</title>
                        <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </StyledClearImg>
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