import React from 'react';
import { useAuth } from '../../hooks/useAuth';

export const Header: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="header">
      <div className="logo">
        <h1>Scheme Finder</h1>
      </div>
      <nav className="nav">
        <a href="/">Home</a>
        <a href="/schemes">Browse Schemes</a>
        {isAuthenticated && (
          <>
            <a href="/dashboard">Dashboard</a>
            <a href="/chat">Chat</a>
            <a href="/profile">Profile</a>
            <a href="/nudges">Notifications</a>
          </>
        )}
      </nav>
      <div className="user-section">
        {isAuthenticated ? (
          <div className="user-dropdown">
            <span>{user?.name}</span>
            <button onClick={logout}>Logout</button>
          </div>
        ) : (
          <>
            <a href="/login">Login</a>
            <a href="/register">Register</a>
          </>
        )}
      </div>
    </header>
  );
};
