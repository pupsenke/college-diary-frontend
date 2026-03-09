// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { CacheProvider } from './context/CacheContext';
import { LoginPage } from './pages/LoginPage';
import { StudentPage } from './pages/StudentPage';
import { TeacherPage } from './pages/TeacherPage';
import { MetodistPage } from './pages/MetodistPage';
import { DepartmentHeadPage } from './pages/departmentHeadPage';
import { DepartmentManagementSection } from './dh-components/DepartmentManagementSection';
import { ProtectedRoute } from './st-components/ProtectedRoute';
import { ForgotPassword } from './pages/ForgotPassword';
import { EditSchedulePage } from './md-components/EditScheduleSection';
import { ViewSectionPage } from './md-components/ViewSection';
import { ChangesSchedulePage } from './md-components/ChangesScheduleSection';
import { ViewScheduleSection } from './md-components/ViewScheduleSection';



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
                  <CacheProvider>
                    <TeacherPage />
                  </CacheProvider>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/metodist" 
              element={
                <ProtectedRoute requiredUserType="metodist">
                  <MetodistPage />
                </ProtectedRoute>
              }
            >
              <Route index element={null} />
              <Route path="edit-schedule" element={<EditSchedulePage />} />
              <Route path="view-groups" element={<ViewSectionPage />} />
              <Route path="view-groups/view-schedule" element={<ViewScheduleSection />} />
              <Route path="changes" element={<ChangesSchedulePage />} />
            </Route>

            <Route 
              path="/departmentHead/*" 
              element={
                <ProtectedRoute requiredUserType="departmentHead">
                  <DepartmentHeadPage />
                </ProtectedRoute>
              } 
            />

            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />

            <Route path="/" element={<DepartmentManagementSection />} />
          </Routes>
        </Router>
    </UserProvider>
  );
}

export default App;