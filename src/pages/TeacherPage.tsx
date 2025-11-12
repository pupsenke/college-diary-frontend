import React, { useState, useEffect } from 'react';
import { Header } from '../th-components/Header';
import { DisciplinesSection } from '../th-components/DisciplinesSection';
import { GroupsSection } from '../th-components/GroupsSection';
import { PersonalCabinet } from '../th-components/PersonalCabinet';
import { ScheduleSection } from '../th-components/ScheduleSection';
import { useUser } from '../context/UserContext';
import { getNextLesson, getScheduleData, Lesson } from '../utils/scheduleUtils';
import './TeacherStyle.css';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const TeacherPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('personal');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>();
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null);
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Синхронизация активной вкладки с URL параметрами
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['personal', 'disciplines', 'groups', 'schedule'].includes(tab)) {
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

  // Добавляем/убираем класс на body при сворачивании меню
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
      console.log('User data in TeacherPage:', user);
    }
  }, [user, navigate]);

  // Загружаем следующую пару при монтировании компонента
  useEffect(() => {
    const loadNextLesson = () => {
      const scheduleData = getScheduleData();
      const next = getNextLesson(scheduleData.upper);
      setNextLesson(next);
    };

    loadNextLesson();
    const interval = setInterval(loadNextLesson, 60000);
    return () => clearInterval(interval);
  }, []);

  // Функция для перехода к дисциплинам с выбранной дисциплиной
  const handleNavigateToDisciplines = (disciplineName?: string) => {
    if (disciplineName) {
      setSelectedDiscipline(disciplineName);
    }
    handleTabChange('disciplines');
  };

  // Функция для перехода к группам с выбранной дисциплиной
  const handleNavigateToGroups = (disciplineName?: string) => {
    if (disciplineName) {
      setSelectedDiscipline(disciplineName);
    }
    handleTabChange('groups');
  };

  // Обработчик выбора дисциплины (из любого компонента)
  const handleDisciplineSelect = (disciplineName: string | undefined) => {
    setSelectedDiscipline(disciplineName);
    // Автоматически переходим к группам при выборе дисциплины
    if (disciplineName) {
      handleTabChange('groups');
    }
  };

  const handleClearDiscipline = () => {
    setSelectedDiscipline(undefined);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'disciplines':
        return (
          <DisciplinesSection 
            onDisciplineSelect={handleDisciplineSelect}
            selectedDiscipline={selectedDiscipline}
          />
        );
      case 'groups':
        return (
          <GroupsSection 
            selectedDiscipline={selectedDiscipline}
            onDisciplineClear={handleClearDiscipline}
          />
        );
      case 'personal':
        return (
          <PersonalCabinet 
            onNavigateToDisciplines={handleNavigateToDisciplines}
            onNavigateToGroups={handleNavigateToGroups}
            onDisciplineSelect={handleDisciplineSelect}
          />
        );
      case 'schedule':
        return <ScheduleSection />;
      default:
        return (
          <PersonalCabinet 
            onNavigateToDisciplines={handleNavigateToDisciplines}
            onNavigateToGroups={handleNavigateToGroups}
            onDisciplineSelect={handleDisciplineSelect}
          />
        );
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
                <h1 className="user-fullname-small">{user.lastName} {user.name} {user.patronymic}</h1>
                <div className="user-role-container">
                  <strong className="user-role">Преподаватель</strong>
                  <p className="user-department">Политехнический колледж НовГУ</p>
                </div>
              </div>
            </div>

            <nav className="sidebar-nav">
              {['personal', 'disciplines', 'groups', 'schedule'].map((tab) => (
                <button
                  key={tab}
                  className={`nav-item ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => handleTabChange(tab)}
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
                  {nextLesson ? (
                    <>
                      <div className="next-class-time">{nextLesson.startTime} - {nextLesson.endTime}</div>
                      <div className="next-class-subject">{nextLesson.subject}</div>
                      <div className="next-class-group">{nextLesson.group}</div>
                    </>
                  ) : (
                    <div className="no-next-class">Пар на сегодня нет</div>
                  )}
                </div>
              </div>
            </div>
          </aside>

          <main className="content-area">
            <div className="content-header">
              <h1 className="content-title">
                <span className="content-title-text">{getTabTitle(activeTab)}</span>
                {selectedDiscipline && (activeTab === 'groups' || activeTab === 'disciplines') }
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