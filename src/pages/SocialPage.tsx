import React, { useState, useEffect } from 'react';
import { SocialHeader } from '../social-components/SocialHeader';
import { PersonalCabinet } from '../social-components/PersonalCabinet';
import { GroupsSection } from '../social-components/SocialGroupsSection';
import { ReportsSection } from '../social-components/ReportsSection';
import { useUser } from '../context/UserContext';
import './SocialPage.css';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const SocialPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('personal');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Синхронизация активной вкладки с URL параметрами
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['personal', 'groups', 'reports'].includes(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('personal');
      searchParams.set('tab', 'personal');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    searchParams.set('tab', tab);
    setSearchParams(searchParams);
  };

  useEffect(() => {
    if (sidebarCollapsed) {
      document.body.classList.add('menu-collapsed');
    } else {
      document.body.classList.remove('menu-collapsed');
    }
    
    return () => {
      document.body.classList.remove('menu-collapsed');
    };
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!user) {
      console.log('No user data, redirecting to login');
      navigate('/login');
    } else {
      console.log('User data in SocialPage:', user);
    }
  }, [user, navigate]);

  const renderContent = () => {
    switch (activeTab) {
      case 'groups':
        return <GroupsSection />;
      case 'reports':
        return <ReportsSection />;
      case 'personal':
      default:
        return <PersonalCabinet />;
    }
  };

  // исправить иконки в менюшке
  const getTabIcon = (tabName: string) => {
    switch (tabName) {
      case 'groups':
        return <img src="th-icons/groups_icon.svg" alt="Группы" className="social-nav-svg-icon" />;
      case 'reports':
        return <img src="th-icons/schedule_icon.svg" alt="Отчеты" className="social-nav-svg-icon" />;
      case 'personal':
        return <img src="th-icons/paccount_icon.svg" alt="Личный кабинет" className="social-nav-svg-icon" />;
      default:
        return <img src="th-icons/paccount_icon.svg" alt="Личный кабинет" className="social-nav-svg-icon" />;
    }
  };

  const getTabTitle = (tabName: string) => {
    switch (tabName) {
      case 'groups':
        return 'Группы';
      case 'reports':
        return 'Отчеты';
      case 'personal':
        return 'Личный кабинет';
      default:
        return 'Личный кабинет';
    }
  };

  const getTabSubTitle = (tabName: string) => {
    switch (tabName) {
      case 'groups':
        return 'Просмотр социальных портретов учебных групп';
      case 'reports':
        return 'Создание и управление отчетами';
      case 'personal':
        return 'Профиль социального педагога';
      default:
        return 'Профиль социального педагога';
    }
  };
  
  const handleSidebarToggle = () => {
    setSidebarCollapsed(prev => !prev);
  };

  // Быстрые действия для социального педагога
  const quickActions = [
    { 
      icon: '📊', 
      text: 'Создать отчет', 
      onClick: () => handleTabChange('reports') 
    },
    { 
      icon: '📤', 
      text: 'Экспорт данных', 
      onClick: () => console.log('Экспорт данных') 
    },
  ];

  if (!user) {
    return (
      <div className="social-container">
        <div className="social-content">
          <div>Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="social-container">
      <div className="social-background-animation">
        <div className="social-shape social-shape-1"></div>
        <div className="social-shape social-shape-2"></div>
        <div className="social-shape social-shape-3"></div>
      </div>

      <div className="social-content">
        <SocialHeader />

        <div className={`social-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <aside className={`social-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            <button
              className="social-sidebar-toggle"
              onClick={handleSidebarToggle}
              aria-label={sidebarCollapsed ? 'Развернуть панель' : 'Свернуть панель'}
            >
              <img 
                src="th-icons/arrow_icon.svg" 
                alt="" 
                className={`social-nav-toggle-icon ${sidebarCollapsed ? 'rotated' : ''}`} 
              />
            </button>

            <div className="social-sidebar-header">
              <div className="social-user-info">
                <h1 className="social-user-fullname-small">
                  {user.lastName} {user.name} {user.patronymic}
                </h1>
                <div className="social-user-role-container">
                  <strong className="social-user-role">Социальный педагог</strong>
                  <p className="social-user-department">Политехнический колледж НовГУ</p>
                </div>
              </div>
            </div>

            <nav className="social-sidebar-nav">
              {['personal', 'groups', 'reports'].map((tab) => (
                <button
                  key={tab}
                  className={`social-nav-item ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => handleTabChange(tab)}
                  data-tooltip={sidebarCollapsed ? getTabTitle(tab) : ''}
                >
                  <span className="nav-icon">{getTabIcon(tab)}</span>
                  <span className="social-nav-text">{getTabTitle(tab)}</span>
                  {activeTab === tab && !sidebarCollapsed && <div className="social-nav-indicator"></div>}
                </button>
              ))}
            </nav>

            <div className="social-quick-actions">
              <h4 className="social-quick-actions-title">Быстрый доступ</h4>
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="social-quick-action-btn"
                  onClick={action.onClick}
                >
                  <span className="social-quick-action-icon">{action.icon}</span>
                  <span className="social-quick-action-text">{action.text}</span>
                </button>
              ))}
            </div>

            <div className="social-sidebar-footer">
              <div className="social-system-info">
                <span>Данные обновлены</span>
              </div>
              <div className="social-version">v2.2.0</div>
            </div>
          </aside>

          <main className="social-content-area">
            <div className="social-content-header">
              <h1 className="social-content-title">
                <span className="social-content-title-text">{getTabTitle(activeTab)}</span>
              </h1>
              <p className="social-content-subtitle">{getTabSubTitle(activeTab)}</p>
            </div>

            <div className="social-content-card">{renderContent()}</div>
          </main>
        </div>
      </div>
    </div>
  );
};