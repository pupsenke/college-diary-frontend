import React, { useState, useEffect } from 'react';
import { Header } from '../th-components/Header';
import { DisciplinesSection } from '../th-components/DisciplinesSection';
import { GroupsSection } from '../th-components/GroupsSection';
import { PersonalCabinet } from '../th-components/PersonalCabinet';
import { ScheduleSection } from '../th-components/ScheduleSection';
import { useUser } from '../context/UserContext';
import './TeacherStyle.css';
import { useNavigate } from 'react-router-dom';

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
        return <img src="th-icons/disciplines_icon.svg" alt="Дисциплины" className="nav-svg-icon" />;
      case 'groups':
        return <img src="th-icons/groups_icon.svg" alt="Группы" className="nav-svg-icon" />;
      case 'personal':
        return <img src="th-icons/paccount_icon.svg" alt="Личный кабинет" className="nav-svg-icon" />;
      case 'schedule':
        return <img src="th-icons/schedule_icon.svg" alt="Расписание" className="nav-svg-icon" />;
      default:
        return <img src="th-icons/disciplines_icon.svg" alt="Дисциплины" className="nav-svg-icon" />;
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
              <img 
                src="th-icons/arrow_icon.svg" 
                alt="" 
                className={`nav-toggle-icon ${sidebarCollapsed ? 'rotated' : ''}`} 
              />
            </button>

            <div className="sidebar-header">
              <div className="user-info">
                <h1 className="user-fullname-small">{user.lastName} {user.name} {user.surname}</h1>
                <div className="user-role-container">
                  <strong className="user-role">Преподаватель</strong>
                  <p className="user-department">Политехнический колледж НовГУ</p>
                </div>
              </div>
            </div>

            <nav className="sidebar-nav">
              {['disciplines', 'personal', 'groups', 'schedule'].map((tab) => (
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
              <h4 className="next-class-title">Следующая пара:</h4>
              <div className="next-class-sidebar">
                <div className="next-class-info">
                  <div className="next-class-time">10:20 - 12:00</div>
                  <div className="next-class-subject">Разработка программных модулей</div>
                  <div className="next-class-group">2992</div>
                </div>
              </div>
            </div>
          </aside>

          <main className="content-area">
            <div className="content-header">
              <h1 className="content-title">
                <span className="content-title-text">{getTabTitle(activeTab)}</span>
              </h1>
              <p className="content-subtitle">{getTabSubTitle(activeTab)}</p>
            </div>

            <div className="content-card">{renderContent()}</div>
          </main>
        </div>
      </div>
    </div>
  );
};