import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [displayMode, setDisplayMode] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const req = await fetch("http://localhost:3000/isUserAuthenticated", {
                   credentials: "include" 
                });
                const res = await req.json();
                if (res.user) {
                    setUser(res.user);
                }
            } catch(e) {                
                console.error("Error checking auth status", e);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    const login = (user) => {
        setUser(user);
    };

    const toggle = () => {
        console.log("TEST");
        
        setDisplayMode((displayMode) => !displayMode);
    };

    const logout = async () => {
        try {
            await fetch("http://localhost:3000/logout", {
                method: "POST",
                headers: {"Content-Type":"application/json"},
                credentials: "include"
            });

            setUser(null);

        } catch (e) {
            console.error(e);
            
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <AuthContext.Provider value={{ user, login, logout, toggle, displayMode }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}