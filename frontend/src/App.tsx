import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Header } from './components/common/Header';
import { ConnectionStatus } from './components/common/ConnectionStatus';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { SchemeList } from './components/schemes/SchemeList';
import { ChatInterface } from './components/chat/ChatInterface';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';

function App() {
  // State-based routing that updates on navigation
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    // Listen for popstate events (back/forward navigation)
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);

    // Custom event for programmatic navigation
    const handleNavigate = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener('navigate', handleNavigate);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('navigate', handleNavigate);
    };
  }, []);

  const renderPage = () => {
    switch (path) {
      case '/login':
        return <LoginPage />;
      case '/register':
        return <RegisterPage />;
      case '/schemes':
        return <SchemeList />;
      case '/dashboard':
        return (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        );
      case '/chat':
        return (
          <ProtectedRoute>
            <ChatInterface />
          </ProtectedRoute>
        );
      default:
        return (
          <div className="home">
            <h1>Personalized Scheme Recommendation System</h1>
            <p>Find government schemes tailored to your needs</p>
            <a href="/schemes">Browse Schemes</a>
            <a href="/register">Get Started</a>
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
      <div className="app">
        <ConnectionStatus />
        <Header />
        <main>{renderPage()}</main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
