import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import './TeacherStyle.css';

export const TeacherPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('attendance');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.userType !== 'teacher') {
      console.log('No teacher data, redirecting to login');
      navigate('/login');
    }
  }, [user, navigate]);

  const renderContent = () => {
    switch (activeTab) {
      case 'attendance':
        return <div>Журнал посещаемости (для преподавателя)</div>;
      case 'grades':
        return <div>Журнал оценок</div>;
      case 'schedule':
        return <div>Расписание занятий</div>;
      case 'students':
        return <div>Список студентов</div>;
      case 'reports':
        return <div>Отчеты и аналитика</div>;
      default:
        return <div>Журнал посещаемости</div>;
    }
  };

  const getTabIcon = (tabName: string) => {
    // Добавьте SVG иконки для преподавателя
    switch (tabName) {
      case 'attendance': return '📊';
      case 'grades': return '📈';
      case 'schedule': return '📅';
      case 'students': return '👥';
      case 'reports': return '📋';
      default: return '';
    }
  };

  const getTabTitle = (tabName: string) => {
    switch (tabName) {
      case 'attendance': return 'Журнал посещаемости';
      case 'grades': return 'Журнал оценок';
      case 'schedule': return 'Расписание';
      case 'students': return 'Студенты';
      case 'reports': return 'Отчеты';
      default: return 'Журнал посещаемости';
    }
  };

  const handleSidebarToggle = () => {
    setSidebarCollapsed(prev => !prev);
  };

  if (!user) {
    return (
      <div className="teacher-container">
        <div className="teacher-content">
          <div>Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-container">
      <div className="background-animation">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="teacher-content">
        <Header />

        <div className={`teacher-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            <button
              className="sidebar-toggle"
              onClick={handleSidebarToggle}
              aria-label={sidebarCollapsed ? 'Развернуть панель' : 'Свернуть панель'}
            >
              {sidebarCollapsed ? '▶' : '◀'}
            </button>

            <div className="sidebar-header">
              <div className="user-info">
                <p className="user-name">{user.lastName} {user.name}</p>
                <p className="user-patronymic">{user.surname}</p>
                <p className="user-role">Преподаватель</p>
                <p className="user-department">Кафедра: -</p>
              </div>
            </div>

            <nav className="sidebar-nav">
              {['attendance', 'grades', 'schedule', 'students', 'reports'].map((tab) => (
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
                  <span className="stat-value">5</span>
                  <span className="stat-label">Групп</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">120</span>
                  <span className="stat-label">Студентов</span>
                </div>
              </div>
            </div>
          </aside>

          <main className="content-area">
            <div className="content-header">
              <h1 className="content-title">
                <span className="title-icon">{getTabIcon(activeTab)}</span>
                {getTabTitle(activeTab)}
              </h1>
            </div>

            <div className="content-card">{renderContent()}</div>
          </main>
        </div>
      </div>
    </div>
  );
};