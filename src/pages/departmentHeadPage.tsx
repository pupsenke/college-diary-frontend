import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { HeaderDepartmentHead } from '../dh-components/HeaderDepartmentHead';
import { DepartmentManagementSection } from '../dh-components/DepartmentManagementSection';
import { AcademicWorkSection } from '../dh-components/AcademicWorkSection';
import { ReportsSection } from '../dh-components/ReportsSection';
import { PersonalCabinetSection } from '../dh-components/PersonalCabinetSection';
import './DepartmentHeadPageStyle.css';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const DepartmentHeadPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('management');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['management', 'academic', 'reports', 'personal'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
    setSearchParams({ tab: tabName });
  };

  const getTabIcon = (tabName: string) => {
    const icons = {
      management: '/dh-icons/management_icon.svg',
      academic: '/dh-icons/academic_icon.svg',
      reports: '/dh-icons/reports_icon.svg',
      personal: '/dh-icons/personal_icon.svg'
    };
    return <img src={icons[tabName as keyof typeof icons]} alt="" className="dh-nav-svg-icon" />;
  };

  const getTabTitle = (tabName: string) => {
    const titles = {
      management: 'Отделение',
      academic: 'Сводные ведомости',
      reports: 'Документы и отчеты',
      personal: 'Личный кабинет'
    };
    return titles[tabName as keyof typeof titles] || 'Отделение';
  };

  const handleSidebarToggle = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const renderActiveSection = () => {
    switch (activeTab) {
      case 'management':
        return <DepartmentManagementSection />;
      case 'academic':
        return <AcademicWorkSection />;
      case 'reports':
        return <ReportsSection />;
      case 'personal':
        return <PersonalCabinetSection />;
      default:
        return <DepartmentManagementSection />;
    }
  };

  return (
    <div className="dh-container">
      <div className="dh-background-animation">
        <div className="dh-shape dh-shape-1"></div>
        <div className="dh-shape dh-shape-2"></div>
        <div className="dh-shape dh-shape-3"></div>
      </div>

      <div className="dh-content">
        <HeaderDepartmentHead />

        <div className={`dh-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <aside className={`dh-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            <button
              className="dh-sidebar-toggle"
              onClick={handleSidebarToggle}
              aria-label={sidebarCollapsed ? 'Развернуть панель' : 'Свернуть панель'}
            >
              <img 
                src="/toggle_back.svg" 
                alt="" 
                className={`dh-nav-toggle-icon ${sidebarCollapsed ? 'rotated' : ''}`}
              />
            </button>

            <div className="dh-sidebar-header">
              <div className="dh-user-info">
                <div className="dh-user-details">
                  <h3 className="dh-user-name">{user?.lastName} {user?.name} {user?.patronymic}</h3>
                  <p className="dh-user-role">Заведующий отделением</p>
                </div>
              </div>
            </div>

            <nav className="dh-sidebar-nav">
              {['management', 'academic', 'reports', 'personal'].map((tab) => (
                <button
                  key={tab}
                  className={`dh-nav-item ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => handleTabChange(tab)}
                  data-tooltip={sidebarCollapsed ? getTabTitle(tab) : ''}
                >
                  <span className="dh-nav-icon">{getTabIcon(tab)}</span>
                  <span className="dh-nav-text">{getTabTitle(tab)}</span>
                  {activeTab === tab && !sidebarCollapsed && <div className="dh-nav-indicator"></div>}
                </button>
              ))}
            </nav>

            <div className="dh-sidebar-footer">
              <div className="dh-quick-stats">
                <div className="dh-stat-item">
                  <p className="dh-stat-value">24</p>
                  <p className="dh-stat-label">Преподавателя</p>
                </div>
                <div className="dh-stat-item">
                  <p className="dh-stat-value">8</p>
                  <p className="dh-stat-label">Групп</p>
                </div>
              </div>
            </div>
          </aside>

          <main className="dh-main-content">
            {renderActiveSection()}
          </main>
        </div>
      </div>
    </div>
  );
};