import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: 'student' | 'teacher' | 'metodist';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredUserType 
}) => {
  const { user, isLoading, isStudent, isTeacher, isMetodist } = useUser();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Проверка авторизации...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredUserType) {
    const hasAccess = 
      (requiredUserType === 'student' && isStudent) ||
      (requiredUserType === 'teacher' && isTeacher) ||
      (requiredUserType === 'metodist' && isMetodist);

    if (!hasAccess) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};