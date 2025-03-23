import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Login from './Login.jsx'
import Register from './Register.jsx'
import RequireAuth from './RequreAuth.jsx'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AuthProvider } from './AuthProvider.jsx'
import Content from './Content.jsx'

const router = createBrowserRouter([
  {
    path: "/",
    element: <RequireAuth />,
    children: [
      { 
        path: "/", 
        element: <App />,
        children: [
          { path: "folders/:folderId", element: <Content /> }
        ]
      }
    ],
  },
  { path: "login", element: <Login /> },
  { path: "register", element: <Register /> }
]);

createRoot(document.getElementById('root')).render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
)
