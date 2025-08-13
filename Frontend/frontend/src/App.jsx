import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Chat from './pages/Chat.jsx';
import { SocketProvider } from './contexts/SocketContext.jsx';
import ChatWindow from './components/chat/ChatWindow';

function App() {
  return (
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-all duration-300">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/chat" element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              } />
              <Route path="/" element={<Navigate to="/Login" replace />} />
            </Routes>
            <Toaster 
              position="top-center"
              toastOptions={{
                duration: 2000,
                style: {
                  marginLeft:"20rem",
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                },
                // Add dark mode styles for toasts
                className: 'dark:!bg-gray-800/90 dark:!text-white dark:!border-gray-600/20',
              }}
              
            />
          </div>
        </Router>
  );
}

export default App;