import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "./AuthProvider";
import styled from "styled-components";
import { LoginRegisterToggle } from "./LoginRegisterToggle";
import logo from "./assets/images/logo.png";
import usernameImg from "./assets/images/username.svg";
import passwordImg from "./assets/images/password.svg";

const LoginContainer = styled.div`
    background-color: ${props => (props.displayMode ? "#252424" : "#f5f5f5")};
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
    width: min(3vw, 6vh);
    position: absolute;
    top: 0;
    left: 0;
    margin: 20px;
`

const StyledInputWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    outline: none;
    border: 1px solid transparent; 
    border-radius: 34px;
    width: 70%;
    margin: 0.5vw;
    box-sizing: border-box;
    font-size: min(0.7vw, 1.4vh); 
    z-index: 0;
    padding: 0.5vw 0 0.5vw 2vw;


    ${props => !props.displayMode && `
        background-color: #ffffff;
        color: black;
        border-color: ${props.hasErrors ? 'red' : 'black'};
        &::placeholder {
            color: #888;
        }
    `}

    ${props => props.displayMode && `
        background-color: #3a3a3a;
        color: white;
        border-color: ${props.hasErrors ? 'red' : '#555'};
        &::placeholder {
            color: #bbb;
        }
    `}
`

const StyledInputImg = styled.img`
    width: min(1vw, 2vh);
    position: absolute;
    left: 0;
    margin: 1vw;
`

const StyledInput = styled.input`
    outline: none;
    border: none;
    width: 90%;
    margin: 0.2vw;
    box-sizing: border-box;
    font-size: min(0.7vw, 1.4vh);
    z-index: 0;
`
const StyledForm = styled.form`
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
    font-size: min(0.7vw, 1.4vh);
    color: white;

    &:hover {
        cursor: pointer;
    }

`
const StyledP = styled.p`
    position: absolute;
    bottom: 0;
    margin: 20px;
    font-size: min(0.8vw, 1.6vh);
`
const StyledLink = styled(Link)`
    text-decoration: none;
    color: #9028f9;
`
const StyledHeader = styled.h3`
    font-size: min(1vw, 2vh);
`
const Errors = styled.ul`
    padding: 0.5vw;
    color: red;
`
const apiUrl = import.meta.env.VITE_API_URL;
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
        console.log("TEST");
        
        e.preventDefault();
        
        const request = await fetch(`${apiUrl}/register`, {
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

            <LoginContainer displayMode={displayMode}>
                <LoginRegisterToggle></LoginRegisterToggle>
                <LoginBoxContainer displayMode={displayMode}>
                    <StyledLogo src={logo}></StyledLogo>
                    <LoginInnerBox>
                        <StyledForm onSubmit={(e) => handleRegister(e)}>
                            <StyledHeader>Sign up</StyledHeader>
                            <StyledInputWrapper hasErrors={errors.length > 0}>
                                <StyledInputImg src={usernameImg}></StyledInputImg>
                                <StyledInput displayMode={displayMode} type="text" name="username" onChange={(e) => handleUsername(e)} value={username} placeholder="Username"/>
                            </StyledInputWrapper>
                            <StyledInputWrapper hasErrors={errors.length > 0}>
                                <StyledInputImg src={passwordImg}></StyledInputImg>
                                <StyledInput displayMode={displayMode} type="password" name="password" onChange={(e) => handlePassword(e)} value={password} placeholder="Password"/>
                            </StyledInputWrapper>
                            <StyledInputWrapper hasErrors={errors.length > 0}>
                                <StyledInputImg src={passwordImg}></StyledInputImg>
                                <StyledInput displayMode={displayMode} type="password" name="matchingPassword" onChange={(e) => handleMatchingPassword(e)} value={matchingPassword} placeholder="Matching Password"/>
                            </StyledInputWrapper>
                                <Errors>
                                {
                                    errors.map((e) => {
                                        return <li>{e["msg"]}</li>
                                    })
                                }
                                </Errors>
                            <StyledButton type="submit" displayMode={displayMode}>Register</StyledButton>
                        </StyledForm>
                        <StyledP>Already have an account? <StyledLink to={"/login"}>Sign in</StyledLink> </StyledP>
                    </LoginInnerBox>
                </LoginBoxContainer>
            </LoginContainer>
        </>
    );
}