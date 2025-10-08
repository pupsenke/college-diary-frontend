import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import './TeacherStyle.css';
import { useNavigate } from 'react-router-dom';

// Временные компоненты-заглушки
const Header: React.FC = () => {
  return (
    <header className="teacher-header">
      <div className="header-content">
        <div className="header-logo">
          <h1>Цифровой дневник</h1>
          <p>Политехнический колледж Hoary</p>
        </div>
        <div className="header-actions">
          <button className="notification-btn">
            <span>🔔</span>
          </button>
          <button className="logout-btn">
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
};

const DisciplinesSection: React.FC = () => {
  return (
    <div className="disciplines-section">
      <h2>Мои дисциплины</h2>
      <p>Раздел в разработке</p>
    </div>
  );
};

const GroupsSection: React.FC = () => {
  return (
    <div className="groups-section">
      <h2>Мои группы</h2>
      <p>Раздел в разработке</p>
    </div>
  );
};

const PersonalCabinet: React.FC = () => {
  const { user } = useUser();
  
  return (
    <div className="personal-cabinet">
      <h2>Личный кабинет преподавателя</h2>
      <div className="personal-info">
        <div className="info-row">
          <label>Фамилия:</label>
          <span>{user?.lastName || 'Фамилия'}</span>
        </div>
        <div className="info-row">
          <label>Имя:</label>
          <span>{user?.name || 'Имя'}</span>
        </div>
        <div className="info-row">
          <label>Отчество:</label>
          <span>{user?.surname || 'Отчество'}</span>
        </div>
        <div className="info-row">
          <label>Эл. почта:</label>
          <span>teacher@college.ru</span>
        </div>
        <div className="info-row">
          <label>Специальность:</label>
          <span>Математика и информатика</span>
        </div>
        <div className="info-row">
          <label>Общий стаж:</label>
          <span>27 лет</span>
        </div>
      </div>
    </div>
  );
};

const ScheduleSection: React.FC = () => {
  return (
    <div className="schedule-section">
      <h2>Расписание занятий</h2>
      <p>Раздел в разработке</p>
    </div>
  );
};

export const TeacherPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('disciplines');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      console.log('No user data, redirecting to login');
      navigate('/login');
    } else {
      console.log('User data in TeacherPage:', user);
    }
  }, [user, navigate]);

  const renderContent = () => {
    switch (activeTab) {
      case 'disciplines':
        return <DisciplinesSection />;
      case 'groups':
        return <GroupsSection />;
      case 'personal':
        return <PersonalCabinet />;
      case 'schedule':
        return <ScheduleSection />;
      default:
        return <DisciplinesSection />;
    }
  };

  const getTabIcon = (tabName: string) => {
    switch (tabName) {
      case 'disciplines':
        return <span className="nav-icon-placeholder">📚</span>;
      case 'groups':
        return <span className="nav-icon-placeholder">👥</span>;
      case 'personal':
        return <span className="nav-icon-placeholder">👤</span>;
      case 'schedule':
        return <span className="nav-icon-placeholder">📅</span>;
      default:
        return <span className="nav-icon-placeholder">📚</span>;
    }
  };

  const getIcon = (tabName: string) => {
    switch (tabName) {
      case 'disciplines':
        return <span className="nav-white-icon-placeholder">📚</span>;
      case 'groups':
        return <span className="nav-white-icon-placeholder">👥</span>;
      case 'personal':
        return <span className="nav-white-icon-placeholder">👤</span>;
      case 'schedule':
        return <span className="nav-white-icon-placeholder">📅</span>;
      default:
        return <span className="nav-white-icon-placeholder">📚</span>;
    }
  };

  const getTabTitle = (tabName: string) => {
    switch (tabName) {
      case 'disciplines':
        return 'Дисциплины';
      case 'groups':
        return 'Группы';
      case 'personal':
        return 'Личный кабинет';
      case 'schedule':
        return 'Расписание';
      default:
        return 'Дисциплины';
    }
  };

  const getTabSubTitle = (tabName: string) => {
    switch (tabName) {
      case 'disciplines':
        return 'Управление учебными дисциплинами';
      case 'groups':
        return 'Мои учебные группы';
      case 'personal':
        return 'Управление персональными данными';
      case 'schedule':
        return 'Просмотр расписания занятий';
      default:
        return 'Управление учебными дисциплинами';
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
          <aside className={`t-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            <button
              className="sidebar-toggle"
              onClick={handleSidebarToggle}
              aria-label={sidebarCollapsed ? 'Развернуть панель' : 'Свернуть панель'}
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>

            <div className="sidebar-header">
              <div className="user-info">
                <p className="user-name">{user.lastName} {user.name}</p>
                <p className="user-patronymic">{user.surname}</p>
                <p className="user-role">Преподаватель</p>
                <p className="user-department">Политехнический колледж Hoary</p>
              </div>
            </div>

            <nav className="sidebar-nav">
              {['disciplines', 'groups', 'personal', 'schedule'].map((tab) => (
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
                  <p className="stat-value">{user.disciplinesCount || '5'}</p>
                  <p className="stat-label">Дисциплин</p>
                </div>
                <div className="stat-item">
                  <p className="stat-value">{user.groupsCount || '3'}</p>
                  <p className="stat-label">Групп</p>
                </div>
              </div>
            </div>
          </aside>

          <main className="content-area">
            <div className="content-header">
              <h1 className="content-title">
                <span className="title-icon">{getIcon(activeTab)}</span>
                <p className="content-title-text">{getTabTitle(activeTab)}</p>
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