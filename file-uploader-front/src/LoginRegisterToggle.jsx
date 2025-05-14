
import styled from "styled-components";
import toggle_image from "./assets/images/toggle_image.svg";
import { useAuth } from "./AuthProvider";

const ToggleModeContainer = styled.div`
    top: 0;
    right: 0;
    margin-top: 1.5vw;
    position: absolute;
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

export function LoginRegisterToggle() {
    
    const { toggle, displayMode } = useAuth();

    const handleToggle = () => {
        toggle();
    };

    return (
        <ToggleModeContainer displayMode={displayMode} onClick={handleToggle} title="Toggle Light/Dark mode">
            <StyledToggleImage displayMode={displayMode} src={toggle_image}>

            </StyledToggleImage>
            <StyledToggleBar displayMode={displayMode}>
                <Slider displayMode={displayMode}></Slider>
            </StyledToggleBar>
        </ToggleModeContainer>
    );
}