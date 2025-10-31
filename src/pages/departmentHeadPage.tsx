import React, { useState, useEffect } from 'react';
import { useUser, Student } from '../context/UserContext';
import { HeaderDepartmentHead } from '../dh-components/HeaderDepartmentHead'
import './DepartmentHeadPageStyle.css';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const DepartmentHeadPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('attendance');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
//   const getTabIcon = (tabName: string) => {
//     const icons = {
//       attendance: '/st-icons/attendance_icon.svg',
//       performance: '/st-icons/grade_icon.svg',
//       personal: '/st-icons/cabinet_icon.svg',
//       schedule: '/st-icons/schedule_icon.svg',
//       documents: '/st-icons/documents_icon.svg'
//     };
//     return <img src={icons[tabName as keyof typeof icons]} alt="" className="st-nav-svg-icon" />;
//   };

//   const getIcon = (tabName: string) => {
//     const icons = {
//       attendance: '/st-icons/white_attendance_icon.svg',
//       performance: '/st-icons/white_grade_icon.svg',
//       personal: '/st-icons/white_cabinet_icon.svg',
//       schedule: '/st-icons/white_schedule_icon.svg',
//       documents: '/st-icons/white_documents_icon.svg'
//     };
//     return <img src={icons[tabName as keyof typeof icons]} alt="" className="st-nav-svg-white-icon" />;
//   };

//   const getTabTitle = (tabName: string) => {
//     const titles = {
//       attendance: 'Посещаемость',
//       performance: 'Успеваемость',
//       personal: 'Личный кабинет',
//       schedule: 'Расписание',
//       documents: 'Мои документы'
//     };
//     return titles[tabName as keyof typeof titles] || 'Посещаемость';
//   };

//   const getTabSubTitle = (tabName: string) => {
//     const subtitles = {
//       attendance: 'Мониторинг вашего присутствия на занятиях',
//       performance: 'Ваши академические достижения и оценки',
//       personal: 'Управление вашими персональными данными',
//       schedule: 'Просмотр расписания ваших занятий',
//       documents: 'Управление вашими документами и заявлениями'
//     };
//     return subtitles[tabName as keyof typeof subtitles] || 'Мониторинг вашего присутствия на занятиях';
//   };

  const handleSidebarToggle = () => {
    setSidebarCollapsed(prev => !prev);
  };



  return (
    <div className="st-container">
      <div className="st-background-animation">
        <div className="st-shape st-shape-1"></div>
        <div className="st-shape st-shape-2"></div>
        <div className="st-shape st-shape-3"></div>
      </div>

      <div className="st-content">
        <HeaderDepartmentHead />

        <div className={`st-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <aside className={`st-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            <button
              className="st-sidebar-toggle"
              onClick={handleSidebarToggle}
              aria-label={sidebarCollapsed ? 'Развернуть панель' : 'Свернуть панель'}
            >
              <img 
                src="/toggle_back.svg" 
                alt="" 
                className={`st-nav-toggle-icon ${sidebarCollapsed ? 'rotated' : ''}`}
              />
            </button>

            <div className="st-sidebar-header">
              <div className="st-user-info">
                
              </div>
            </div>

            <nav className="st-sidebar-nav">
              {/* {['attendance', 'performance', 'personal', 'schedule', 'documents'].map((tab) => (
                <button
                  key={tab}
                  className={`st-nav-item ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => handleTabChange(tab)}
                  data-tooltip={sidebarCollapsed ? getTabTitle(tab) : ''}
                  disabled={loading}
                >
                  <span className="st-nav-icon">{getTabIcon(tab)}</span>
                  <span className="st-nav-text">{getTabTitle(tab)}</span>
                  {activeTab === tab && !sidebarCollapsed && <div className="st-nav-indicator"></div>}
                </button>
              ))} */}
            </nav>

            <div className="st-sidebar-footer">
              {/* <div className="st-quick-stats">
                <div className="st-stat-item">
                  <p className="st-stat-value">
                    {loading ? '...' : `${attendancePercentage}%`}
                  </p>
                  <p className="st-stat-label">Посещаемость</p>
                </div>
                <div className="st-stat-item">
                  <p className="st-stat-value">
                    {loading ? '...' : (averageGrade > 0 ? averageGrade.toFixed(1) : '0.0')}
                  </p>
                  <p className="st-stat-label">Средний балл</p>
                </div>
              </div> */}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};