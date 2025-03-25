import { useAuth } from "./AuthProvider";
import styled from "styled-components";

const StyledContainer = styled.div`
    width: 100%;
    position: fixed;
    top: 0;
    left: 0;
    height: 3vw;
    background-color: #252424;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: white;
    z-index: 1000;
    

    .shadow {
        position: absolute;
        bottom: 0;
        left: 5%;
        height: 100%;
        width: 100%;
        box-shadow: rgba(17, 17, 26, 0.5) 0px 3px 0px;
    }
`;



const CommonStyledDiv = styled.div`
    padding: 1vh;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const StyledInputContainer = styled(CommonStyledDiv)`
    width: 100%;
`;

const StyledInput = styled.input`
    outline: none;
    background-color: white;
    padding: 5px 10px;
    border: none;
    width: 25%;
    z-index: 999;
`
const StyledSearchButton = styled.button`
    background-color: rgba(102, 51, 153, 0.6);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 5px 10px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.3s;
    z-index: 999;
    &:hover {
        background-color: rgba(102, 51, 153, 0.9);
    }
`
const StyledClear = styled.button`
    padding: 4px 10px;
    font-size: 15px;
    background-color: white;
    border: none;
    outline: none;
    z-index: 999;
    &:hover {
        cursor: pointer;
        color: teal;
    }
`
const StyledLogoutButton = styled(CommonStyledDiv)`
    background-color: rgba(102, 51, 153, 0.6);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 10px 15px;
    font-size: 14px;
    cursor: pointer;
    margin-right: 10px;
    transition: background-color 0.3s;
    z-index: 999;
    
    &:hover {
        background-color: rgba(102, 51, 153, 0.9);
    }
`;

export default function Header() {
    const { logout } = useAuth();

    const handleLogout = async () => {
        await logout();
    };

    const clearInput = () => {

    };

    return (
        <StyledContainer>
            <div className="shadow"></div>
            <div>

            </div>
            <StyledInputContainer>
                <StyledSearchButton>Search</StyledSearchButton>
                <StyledInput type="text" placeholder="Find file" />
                <StyledClear onClick={clearInput}>X</StyledClear>
            </StyledInputContainer>
            <StyledLogoutButton onClick={handleLogout}>Logout</StyledLogoutButton>
        </StyledContainer>
    );

};

