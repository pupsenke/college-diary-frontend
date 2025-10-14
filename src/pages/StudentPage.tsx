import React, { useState, useEffect } from 'react';
import { Header } from '../st-components/HeaderStudent';
import { AttendanceSection } from '../st-components/AttendanceSection';
import { PerformanceSection } from '../st-components/PerformanceSection';
import { PersonalCabinet } from '../st-components/PersonalCabinet';
import { DocumentsSection } from '../st-components/DocumentsSection';
import { useUser } from '../context/UserContext';
import './StudentStyle.css';
import { ScheduleSection } from '../st-components/ScheduleSection';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService, GroupData, TeacherData } from '../services/apiService';

export const StudentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('attendance');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [curatorData, setCuratorData] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isStudent } = useUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Синхронизация активной вкладки с URL параметрами
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['attendance', 'performance', 'personal', 'schedule', 'documents'].includes(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('attendance');
      searchParams.set('tab', 'attendance');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  // Функция для смены вкладки
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    searchParams.set('tab', tab);
    setSearchParams(searchParams);
  };

  // Функция для форматирования ФИО куратора
  const formatCuratorName = (curator: TeacherData) => {
    const lastName = curator.lastName || '';
    const firstName = curator.name ? `${curator.name.charAt(0)}.` : '';
    const middleName = curator.patronymic ? `${curator.patronymic.charAt(0)}.` : '';
    return `${lastName} ${firstName}${middleName}`.trim();
  };

  useEffect(() => {
    const initializeData = async () => {
      if (!user || !isStudent) {
        console.log('No student data, redirecting to login');
        navigate('/login');
        return;
      }

      // Приводим тип к Student для доступа к numberGroup
      const student = user as import('../context/UserContext').Student;
      
      console.log('Student data in StudentPage:', student);
      setLoading(true);
      setError(null);

      try {
        // Получаем данные группы
        if (student.numberGroup) {
          const groupData = await apiService.getGroupData(student.numberGroup);
          console.log('Group data:', groupData);
          setGroupData(groupData);
          
          // Если есть данные группы и id куратора, получаем данные куратора
          if (groupData && groupData.idCurator) {
            console.log('Fetching curator data for ID:', groupData.idCurator);
            const curatorData = await apiService.getTeacherData(groupData.idCurator);
            setCuratorData(curatorData);
          } else {
            console.log('No curator ID found in group data');
          }
        } else {
          console.log('No group number for user');
        }
      } catch (error) {
        console.error('Error initializing data:', error);
        setError('Ошибка инициализации данных');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user, isStudent, navigate]);

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
        return <img src="st-icons/attendance_icon.svg" alt="" className="st-nav-svg-icon" />;
      case 'performance':
        return <img src="st-icons/grade_icon.svg" alt="" className="st-nav-svg-icon" />;
      case 'personal':
        return <img src="st-icons/cabinet_icon.svg" alt="" className="st-nav-svg-icon" />;
      case 'schedule':
        return <img src="st-icons/schedule_icon.svg" alt="" className="st-nav-svg-icon" />;
      case 'documents':
        return <img src="st-icons/documents_icon.svg" alt="" className="st-nav-svg-icon" />;
      default:
        return '';
    }
  };

  const getIcon = (tabName: string) => {
    switch (tabName) {
      case 'attendance':
        return <img src="st-icons/white_attendance_icon.svg" alt="" className="st-nav-svg-white-icon" />;
      case 'performance':
        return <img src="st-icons/white_grade_icon.svg" alt="" className="st-nav-svg-white-icon" />;
      case 'personal':
        return <img src="st-icons/white_cabinet_icon.svg" alt="" className="st-nav-svg-white-icon" />;
      case 'schedule':
        return <img src="st-icons/white_schedule_icon.svg" alt="" className="st-nav-svg-white-icon" />;
      case 'documents':
        return <img src="st-icons/white_documents_icon.svg" alt="" className="st-nav-svg-white-icon" />;
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

  if (!user || !isStudent) {
    return (
      <div className="st-container">
        <div className="st-content">
          <div>Загрузка...</div>
        </div>
      </div>
    );
  }

  // Приводим тип к Student для доступа к numberGroup
  const student = user as import('../context/UserContext').Student;

  return (
    <div className="st-container">
      <div className="st-background-animation">
        <div className="st-shape st-shape-1"></div>
        <div className="st-shape st-shape-2"></div>
        <div className="st-shape st-shape-3"></div>
      </div>

      <div className="st-content">
        <Header />

        <div className={`st-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <aside className={`st-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            <button
              className="st-sidebar-toggle"
              onClick={handleSidebarToggle}
              aria-label={sidebarCollapsed ? 'Развернуть панель' : 'Свернуть панель'}
            >
              {sidebarCollapsed ? <img src="toggle_back.svg" alt="" className="st-nav-toggle-icon" /> : <img src="toggle_back.svg" alt="" className="st-nav-toggle-icon" />}
            </button>

            <div className="st-sidebar-header">
              <div className="st-user-info">
                <p className="st-user-name">{student.lastName} {student.name}</p>
                <p className="st-user-patronymic">{student.patronymic}</p>
                <p className="st-user-role">Студент</p>
                <p className="st-user-group">Группа: {student.numberGroup}</p>
                
                {/* Специальность из данных группы */}
                <p className="st-user-speciality">
                  Специальность: {loading ? 'Загрузка...' : (groupData?.specialty || 'Не указана')}
                </p>
                
                {/* Куратор из данных учителя */}
                <p className="st-user-curator">
                  Куратор: {loading ? 'Загрузка...' : 
                    (curatorData ? formatCuratorName(curatorData) : 'Не назначен')
                  }
                </p>
              </div>
            </div>

            <nav className="st-sidebar-nav">
              {['attendance', 'performance', 'personal', 'schedule', 'documents'].map((tab) => (
                <button
                  key={tab}
                  className={`st-nav-item ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => handleTabChange(tab)}
                  data-tooltip={sidebarCollapsed ? getTabTitle(tab) : ''}
                >
                  <span className="st-nav-icon">{getTabIcon(tab)}</span>
                  <span className="st-nav-text">{getTabTitle(tab)}</span>
                  {activeTab === tab && !sidebarCollapsed && <div className="st-nav-indicator"></div>}
                </button>
              ))}
            </nav>

            <div className="st-sidebar-footer">
              <div className="st-quick-stats">
                <div className="st-stat-item">
                  <p className="st-stat-value">85%</p>
                  <p className="st-stat-label">Процент посещаемости</p>
                </div>
                <div className="st-stat-item">
                  <p className="st-stat-value">4.5</p>
                  <p className="st-stat-label">Средний балл</p>
                </div>
              </div>
            </div>
          </aside>

          <main className="st-content-area">
            <div className="st-content-header">
              <h1 className="st-content-title">
                <span className="st-title-icon">{getIcon(activeTab)}</span>
                <p className="st-content-title">{getTabTitle(activeTab)}</p>
                <p className="st-content-subtitle">{getTabSubTitle(activeTab)}</p>
              </h1>
            </div>

            <div className="st-content-card">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  Загрузка данных...
                </div>
              ) : (
                renderContent()
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};