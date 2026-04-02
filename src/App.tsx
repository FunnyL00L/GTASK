import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthState, User, UserConfig } from './types';
import Login from './pages/Login';
import Register from './pages/Register';
import ConfigPage from './pages/Config';
import Dashboard from './pages/Dashboard';
import Finance from './pages/Finance';
import Tasks from './pages/Tasks';
import Bills from './pages/Bills';
import Analysis from './pages/Analysis';
import OptionScreen from './pages/OptionScreen';
import Layout from './components/Layout';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './contexts/NotificationContext';

const MASTER_GAS_URL = 'https://script.google.com/macros/s/AKfycbyKhXfZDkVTMH47eKWV2XuMjuFNX-sfpHo99YfFF9Fh05BxBL8F0cSPS2PSzWYKQ8XE/exec';

export default function App() {
  const [auth, setAuth] = useState<AuthState>({
    isLoggedIn: false,
    user: null,
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('fintask_user');
    if (savedUser) {
      setAuth({
        isLoggedIn: true,
        user: JSON.parse(savedUser),
      });
    }
  }, []);

  const handleLogin = (user: User) => {
    localStorage.setItem('fintask_user', JSON.stringify(user));
    setAuth({
      isLoggedIn: true,
      user,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('fintask_user');
    setAuth({
      isLoggedIn: false,
      user: null,
    });
  };

  const handleUpdateConfig = (config: UserConfig) => {
    if (auth.user) {
      const updatedUser = { ...auth.user, config };
      setAuth({ ...auth, user: updatedUser });
      localStorage.setItem('fintask_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <NotificationProvider>
      <DataProvider user={auth.user}>
        <Router>
          <Routes>
            <Route 
              path="/login" 
              element={!auth.isLoggedIn ? <Login onLogin={handleLogin} gasUrl={MASTER_GAS_URL} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/register" 
              element={!auth.isLoggedIn ? <Register gasUrl={MASTER_GAS_URL} /> : <Navigate to="/" />} 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/" 
              element={
                auth.isLoggedIn ? (
                  <OptionScreen user={auth.user!} onLogout={handleLogout} />
                ) : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                auth.isLoggedIn ? (
                  <Layout onLogout={handleLogout} user={auth.user!}><Dashboard config={auth.user!.config} user={auth.user!} /></Layout>
                ) : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/finance" 
              element={
                auth.isLoggedIn ? (
                  <Layout onLogout={handleLogout} user={auth.user!}><Finance config={auth.user!.config} user={auth.user!} /></Layout>
                ) : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/tasks" 
              element={
                auth.isLoggedIn ? (
                  <Layout onLogout={handleLogout} user={auth.user!}><Tasks config={auth.user!.config} user={auth.user!} /></Layout>
                ) : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/bills" 
              element={
                auth.isLoggedIn ? (
                  <Layout onLogout={handleLogout} user={auth.user!}><Bills /></Layout>
                ) : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/analysis" 
              element={
                auth.isLoggedIn ? (
                  <Layout onLogout={handleLogout} user={auth.user!}><Analysis config={auth.user!.config} user={auth.user!} /></Layout>
                ) : <Navigate to="/login" />
              } 
            />
            <Route 
              path="/config" 
              element={
                auth.isLoggedIn ? (
                  <Layout onLogout={handleLogout} user={auth.user!}><ConfigPage user={auth.user!} onUpdate={handleUpdateConfig} masterGasUrl={MASTER_GAS_URL} /></Layout>
                ) : <Navigate to="/login" />
              } 
            />
          </Routes>
        </Router>
      </DataProvider>
    </NotificationProvider>
  );
}
