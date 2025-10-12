import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { StudentPage } from './pages/StudentPage';
import { TeacherPage } from './pages/TeacherPage';
import { UserProvider } from './context/UserContext';
import { ForgotPassword } from './pages/ForgotPassword';
import { TeacherDashboard } from './th-components/TeacherDashboard';

function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/student" element={<StudentPage />} />
          <Route path="/teacher" element={<TeacherPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/" element={<LoginPage />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;