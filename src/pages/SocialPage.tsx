import React, { useState, useEffect } from 'react';
import { SocialHeader } from '../social-components/SocialHeader';
import { PersonalCabinet } from '../social-components/PersonalCabinet';
import { GroupsSection } from '../social-components/SocialGroupsSection';
import { ReportsSection } from '../social-components/ReportsSection';
import { DocumentsSection } from '../social-components/DocumentsSection';
import { useUser } from '../context/UserContext';
import './SocialPage.css';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const SocialPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('personal');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Получаем текущий день недели для подсветки
  const getCurrentDay = () => {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const today = new Date().getDay();
    return days[today];
  };

  // Синхронизация активной вкладки с URL параметрами
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['personal', 'groups', 'reports', 'documents'].includes(tab)) {
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
      case 'documents':
        return <DocumentsSection />;
      case 'personal':
      default:
        return <PersonalCabinet />;
    }
  };

  const getTabIcon = (tabName: string) => {
    switch (tabName) {
      case 'groups':
        return <img src="th-icons/groups_icon.svg" alt="Группы" className="social-nav-svg-icon" />;
      case 'reports':
        return <img src="social-icons/reports_icon.svg" alt="Отчеты" className="social-nav-svg-icon" />;
      case 'documents':
        return <img src="social-icons/documents_icon.svg" alt="Документы" className="social-nav-svg-icon" />;
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
      case 'documents':
        return 'Документы';
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
      case 'documents':
        return 'Информация о необходимых документах для различных категорий социальной поддержки';
      case 'personal':
        return 'Профиль социального педагога';
      default:
        return 'Профиль социального педагога';
    }
  };
  
  const handleSidebarToggle = () => {
    setSidebarCollapsed(prev => !prev);
  };

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
              className="s-sidebar-toggle"
              onClick={handleSidebarToggle}
              aria-label={sidebarCollapsed ? 'Развернуть панель' : 'Свернуть панель'}
            >
              <img 
                src="th-icons/arrow_icon.svg" 
                alt="" 
                className={`nav-toggle-icon ${sidebarCollapsed ? 'rotated' : ''}`} 
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
              {['personal', 'groups', 'reports', 'documents'].map((tab) => (
                <button
                  key={tab}
                  className={`social-nav-item ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => handleTabChange(tab)}
                  data-tooltip={sidebarCollapsed ? getTabTitle(tab) : ''}
                >
                  <span className="social-nav-icon">{getTabIcon(tab)}</span>
                  <span className="social-nav-text">{getTabTitle(tab)}</span>
                  {activeTab === tab && !sidebarCollapsed && <div className="social-nav-indicator"></div>}
                </button>
              ))}
            </nav>

            <div className="social-sidebar-footer">
              <div className="social-schedule-mini">
                <div className="social-schedule-row">
                  <span className="social-schedule-row-label">
                    <span className={`social-schedule-day ${getCurrentDay() === 'Понедельник' || getCurrentDay() === 'Вторник' || getCurrentDay() === 'Четверг' || getCurrentDay() === 'Пятница' ? 'today' : ''}`}>пн-вт чт-пт</span>
                    <span className={`social-schedule-day ${getCurrentDay() === 'Среда' ? 'today' : ''}`}>ср</span>
                  </span>
                  <span className="social-schedule-row-divider">|</span>
                  <span className="social-schedule-row-rooms">
                    <span className={`social-schedule-room-mini ${getCurrentDay() === 'Понедельник' || getCurrentDay() === 'Вторник' || getCurrentDay() === 'Четверг' || getCurrentDay() === 'Пятница' ? 'today' : ''}`}>405</span>
                    <span className={`social-schedule-room-mini ${getCurrentDay() === 'Среда' ? 'today' : ''}`}>216А</span>
                  </span>
                </div>
              </div>
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