import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "./AuthProvider";


export default function Login() {

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleUsername = (e) => {
        setUsername(e.target.value);
    };

    const handlePassword = (e) => {
        setPassword(e.target.value);
    };

    const handleLogin = async (e) => {
        const request = await fetch("http://localhost:3000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({username, password}),
        });

        const response = await request.json();

        if (response.user) {
            login(response.user);
            navigate("/");
        } 
        

    };

    const registerRedirect = () => {
        navigate("/register")
    };

    return (
        <>
            <div>
                <input type="text" name="username" onChange={(e) => handleUsername(e)} value={username}/>
                <input type="password" name="password" onChange={(e) => handlePassword(e)} value={password}/>
                <button onClick={(e) => handleLogin(e)}>Login</button>
                <p>Don't have an account? <a onClick={registerRedirect} href="">Sign up</a> </p>
            </div>
        </>
    );

}
