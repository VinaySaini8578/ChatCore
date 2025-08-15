import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SocketProvider } from './contexts/SocketContext';
import { AuthProvider } from './contexts/AuthContext.jsx';
import './index.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <SocketProvider>
        <App/>
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>
);