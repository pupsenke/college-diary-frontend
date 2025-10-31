import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: 'student' | 'teacher' | 'metodist' | 'departmentHead';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredUserType 
}) => {
  const { user, isLoading, isStudent, isTeacher, isMetodist, isDepartmentHead } = useUser();

  console.log('ProtectedRoute debug:', {
    user,
    isLoading,
    isStudent,
    isTeacher,
    isMetodist,
    isDepartmentHead,
    requiredUserType
  });

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Проверка авторизации...</p>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (requiredUserType) {
    const hasAccess = 
      (requiredUserType === 'student' && isStudent) ||
      (requiredUserType === 'teacher' && isTeacher) ||
      (requiredUserType === 'metodist' && isMetodist) ||
      (requiredUserType === 'departmentHead' && isDepartmentHead);

    console.log('ProtectedRoute access check:', {
      requiredUserType,
      hasAccess,
      userType: user.userType
    });

    if (!hasAccess) {
      console.log('ProtectedRoute: Access denied, redirecting to unauthorized');
      return <Navigate to="/unauthorized" replace />;
    }
  }

  console.log('ProtectedRoute: Access granted');
  return <>{children}</>;
};