import { useState } from "react";
import { useNavigate } from "react-router";


export default function Register() {

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [matchingPassword, setMatchingPassword] = useState("");
    const [errors, setErrors] = useState([]);

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
            <div>
                <ul>
                    {
                        errors.map((e) => {
                            return <li>{e["msg"]}</li>
                        })
                    }
                </ul>
                <input type="text" name="username" onChange={(e) => handleUsername(e)} value={username}/>
                <input type="password" name="password" onChange={(e) => handlePassword(e)} value={password}/>
                <input type="password" name="matchingPassword" onChange={(e) => handleMatchingPassword(e)} value={matchingPassword}/>
                <button onClick={(e) => handleRegister(e)}>Login</button>
                <p>Don't have an account? <a onClick={loginRedirect} href="">Sign in</a> </p>
            </div>
        </>
    );
}