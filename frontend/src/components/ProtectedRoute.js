import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                  height:'100vh', background:'#080b12' }}>
      <p style={{ color:'#00d4aa' }}>Loading...</p>
    </div>
  );

  if (!isAuthenticated)
    return <Navigate to="/login" state={{ from: location }} replace />;

  return children;
};

export default ProtectedRoute;