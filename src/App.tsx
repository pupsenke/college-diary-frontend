import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { LoginPage } from './pages/LoginPage';
import { StudentPage } from './pages/StudentPage';
import { TeacherPage } from './pages/TeacherPage';
import { MetodistPage } from './pages/MetodistPage';
import { DepartmentHeadPage } from './pages/departmentHeadPage';
import { ProtectedRoute } from './st-components/ProtectedRoute';

function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route 
            path="/student/*" 
            element={
              <ProtectedRoute requiredUserType="student">
                <StudentPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/teacher/*" 
            element={
              <ProtectedRoute requiredUserType="teacher">
                <TeacherPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/metodist/*" 
            element={
              <ProtectedRoute requiredUserType="metodist">
                <MetodistPage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/departmentHead/*" 
            element={
              <ProtectedRoute requiredUserType="departmentHead">
                <DepartmentHeadPage />
              </ProtectedRoute>
            } 
          />
          
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;