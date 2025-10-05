import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { AttendanceSection } from '../components/AttendanceSection';
import { PerformanceSection } from '../components/PerformanceSection';
import { PersonalCabinet } from '../components/PersonalCabinet';
import { DocumentsSection } from '../components/DocumentsSection';
import { useUser } from '../context/UserContext';
import './StudentStyle.css';
import { ScheduleSection } from '../components/ScheduleSection';
import { useNavigate } from 'react-router-dom';

export const StudentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('attendance');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      console.log('No user data, redirecting to login');
      navigate('/login');
    } else {
      console.log('User data in StudentPage:', user);
    }
  }, [user, navigate]);

  const renderContent = () => {
    switch (activeTab) {
      case 'attendance':
        return <AttendanceSection />;
      case 'performance':
        return <PerformanceSection />;
      case 'personal':
        return <PersonalCabinet />;
      case 'schedule':
        return <ScheduleSection />;
      case 'documents':
        return <DocumentsSection />;
      default:
        return <AttendanceSection />;
    }
  };

  const getTabIcon = (tabName: string) => {
    switch (tabName) {
      case 'attendance':
        return <img src="attendance_icon.svg" alt="" className="nav-svg-icon" />;
      case 'performance':
        return <img src="grade_icon.svg" alt="" className="nav-svg-icon" />;
      case 'personal':
        return <img src="cabinet_icon.svg" alt="" className="nav-svg-icon" />;
      case 'schedule':
        return <img src="schedule_icon.svg" alt="" className="nav-svg-icon" />;
      case 'documents':
        return <img src="documents_icon.svg" alt="" className="nav-svg-icon" />;
      default:
        return '';
    }
  };

  const getIcon = (tabName: string) => {
    switch (tabName) {
      case 'attendance':
        return <img src="white_attendance_icon.svg" alt="" className="nav-svg-white-icon" />;
      case 'performance':
        return <img src="white_grade_icon.svg" alt="" className="nav-svg-white-icon" />;
      case 'personal':
        return <img src="white_cabinet_icon.svg" alt="" className="nav-svg-white-icon" />;
      case 'schedule':
        return <img src="white_schedule_icon.svg" alt="" className="nav-svg-white-icon" />;
      case 'documents':
        return <img src="white_documents_icon.svg" alt="" className="nav-svg-white-icon" />;
      default:
        return '';
    }
  };

  const getTabTitle = (tabName: string) => {
    switch (tabName) {
      case 'attendance':
        return 'Посещаемость';
      case 'performance':
        return 'Успеваемость';
      case 'personal':
        return 'Личный кабинет';
      case 'schedule':
        return 'Расписание';
      case 'documents':
        return 'Мои документы';
      default:
        return 'Посещаемость';
    }
  };

  const getTabSubTitle = (tabName: string) => {
    switch (tabName) {
      case 'attendance':
        return 'Мониторинг вашего присутствия на занятиях';
      case 'performance':
        return 'Ваши академические достижения и оценки';
      case 'personal':
        return 'Управление вашими персональными данными';
      case 'schedule':
        return 'Просмотр расписания ваших занятий';
      case 'documents':
        return 'Управление вашими документами и заявлениями';
      default:
        return 'Мониторинг вашего присутствия на занятиях';
    }
  };

  const handleSidebarToggle = () => {
    setSidebarCollapsed(prev => !prev);
  };
  

  if (!user) {
    return (
      <div className="student-container">
        <div className="student-content">
          <div>Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-container">
      <div className="background-animation">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="student-content">
        <Header />

        <div className={`student-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            <button
              className="sidebar-toggle"
              onClick={handleSidebarToggle}
              aria-label={sidebarCollapsed ? 'Развернуть панель' : 'Свернуть панель'}
            >
              {sidebarCollapsed ? <img src="toggle_back.svg" alt="" className="nav-toggle-icon" /> : <img src="toggle_back.svg" alt="" className="nav-toggle-icon" />}
            </button>

            <div className="sidebar-header">
              <div className="user-info">
                <p className="user-name">{user.lastName} {user.name}</p>
                <p className="user-patronymic">{user.surname}</p>
                <p className="user-role">Студент</p>
                <p className="user-group">Группа: {user.numberGroup}</p>
                <p className="user-speciality">Специальность: -</p>
              </div>
            </div>

            <nav className="sidebar-nav">
              {['attendance', 'performance', 'personal', 'schedule', 'documents'].map((tab) => (
                <button
                  key={tab}
                  className={`nav-item ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                  data-tooltip={sidebarCollapsed ? getTabTitle(tab) : ''}
                >
                  <span className="nav-icon">{getTabIcon(tab)}</span>
                  <span className="nav-text">{getTabTitle(tab)}</span>
                  {activeTab === tab && !sidebarCollapsed && <div className="nav-indicator"></div>}
                </button>
              ))}
            </nav>

            <div className="sidebar-footer">
              <div className="quick-stats">
                <div className="stat-item">
                  <p className="stat-value">85%</p>
                  <p className="stat-label">Процент посещаемости</p>
                </div>
                <div className="stat-item">
                  <p className="stat-value">4.5</p>
                  <p className="stat-label">Средний балл</p>
                </div>
              </div>
            </div>
          </aside>

          <main className="content-area">
            <div className="content-header">
              <h1 className="content-title">
                <span className="title-icon">{getIcon(activeTab)}</span>
                <p className="content-title">{getTabTitle(activeTab)}</p>
                <p className="content-subtitle">{getTabSubTitle(activeTab)}</p>
              </h1>
            </div>

            <div className="content-card">{renderContent()}</div>
          </main>
        </div>
      </div>
    </div>
  );
};