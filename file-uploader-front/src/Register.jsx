import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "./AuthProvider";
import styled from "styled-components";
import { LoginRegisterToggle } from "./LoginRegisterToggle";
import logo from "./assets/images/logo.png";

const LoginContainer = styled.div`
    background-color: ${props => (props.displayMode ? "#252424" : "#dedede")};
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
`
const LoginInnerBox = styled.div`
    display: flex;
    align-items: center;
    flex-direction: column;
    position: relative;
    width: 100%;
    height: 100%;
`
const LoginBoxContainer = styled.div`
    position: relative;
  ${props => props.displayMode && `
    background-color: #0000004a;
    color: white;
  `}
  ${props => !props.displayMode && `
    background-color: #ffffff;
    color: black;
  `}
    width: 30vw;
    height: 50vh;
    border-radius: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
`
const StyledLogo = styled.img`
    width: 3vw;
    position: absolute;
    top: 0;
    left: 0;
    margin: 20px;
`

const StyledInput = styled.input`
    outline: none;
    padding: 0.5vw 2vw 0.5vw 3vw;
    border: 1px solid transparent; 
    border-radius: 34px;
    width: 70%;
    margin: 0.5vw;
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
`
const InputDiv = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    width: 100%;
    height: 100%;
`
const StyledButton = styled.button`
    width: 4vw;
    padding: 0.5vw;
    border-radius: 34px;
    border: none;
    outline: none;
    background-color: #9028f9;
    font-size: 0.7vw;
    color: white;

    &:hover {
        cursor: pointer;
    }

`
const StyledP = styled.p`
    position: absolute;
    bottom: 0;
    margin: 20px;
    font-size: 0.8vw;
`
const StyledLink = styled(Link)`
    text-decoration: none;
    color: #9028f9;
`
const StyledHeader = styled.h3`
    font-size: 1vw;
`
export default function Register() {

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [matchingPassword, setMatchingPassword] = useState("");
    const [errors, setErrors] = useState([]);
    const { displayMode } = useAuth();

    const navigate = useNavigate();

    const handleUsername = (e) => {
        setUsername(e.target.value);
    };

    const handlePassword = (e) => {
        setPassword(e.target.value);
    };

    const handleMatchingPassword = (e) => {
        setMatchingPassword(e.target.value);
    };

    const loginRedirect = () => {
        navigate("/login");
    };

    const handleRegister = async (e) => {

        const request = await fetch("http://localhost:3000/register", {
            method: "POST",
            headers: { "Content-Type" : "application/json" },
            credentials: "include",
            body: JSON.stringify({username, password, matchingPassword}),
        });

        const response = await request.json();
        
        if (response.errors.length > 0 ) {
            setErrors(response.errors);
        } else {
            navigate("/login");
        }
    };

    return (
        <>  
            <ul>
            {
                errors.map((e) => {
                    return <li>{e["msg"]}</li>
                })
            }
            </ul>
            <LoginContainer displayMode={displayMode}>
                <LoginRegisterToggle></LoginRegisterToggle>
                <LoginBoxContainer displayMode={displayMode}>
                    <StyledLogo src={logo}></StyledLogo>
                    <LoginInnerBox>
                        <InputDiv>
                            <StyledHeader>Sign up</StyledHeader>
                            <StyledInput displayMode={displayMode} type="text" name="username" onChange={(e) => handleUsername(e)} value={username} placeholder="Username"/>
                            <StyledInput displayMode={displayMode} type="password" name="password" onChange={(e) => handlePassword(e)} value={password} placeholder="Password"/>
                            <StyledInput displayMode={displayMode} type="password" name="matchingPassword" onChange={(e) => handleMatchingPassword(e)} value={matchingPassword} placeholder="Matching Password"/>
                            <StyledButton displayMode={displayMode} onClick={(e) => handleRegister(e)}>Register</StyledButton>
                        </InputDiv>
                        <StyledP>Already have an account? <StyledLink to={"/login"}>Sign in</StyledLink> </StyledP>
                    </LoginInnerBox>
                </LoginBoxContainer>
            </LoginContainer>
        </>
    );
}