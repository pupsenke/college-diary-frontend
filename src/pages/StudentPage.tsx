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
const formatCuratorName = (curator: TeacherData | null) => {
  if (!curator) return '';
  
  const lastName = curator.lastName || '';
  const firstName = curator.name ? `${curator.name.charAt(0)}.` : '';
  const middleName = curator.patronymic ? `${curator.patronymic.charAt(0)}.` : '';
  
  return `${lastName} ${firstName}${middleName}`.trim();
};

  // Загрузка данных группы и куратора
  useEffect(() => {
    const loadGroupData = async () => {
      if (!user || !isStudent) {
        console.log('No student data, redirecting to login');
        navigate('/login');
        return;
      }

      const student = user;
      console.log('Student data:', student);
      
      setLoading(true);
      setError(null);

      try {
        // Получаем ID группы из данных студента
        const groupId = (student as any).idGroup;
        console.log('Loading group data for ID:', groupId);

        if (!groupId) {
          throw new Error('ID группы не найден в данных студента');
        }

        // Загружаем данные группы
        const groupDataResponse = await apiService.getGroupData(groupId);
        console.log('Group data loaded:', groupDataResponse);
        setGroupData(groupDataResponse);

        // Загружаем данные куратора
        if (groupDataResponse.idCurator) {
          console.log('Loading curator data for ID:', groupDataResponse.idCurator);
          try {
            const curatorDataResponse = await apiService.getTeacherData(groupDataResponse.idCurator);
            console.log('Curator data loaded:', curatorDataResponse);
            setCuratorData(curatorDataResponse);
          } catch (curatorError) {
            console.warn('Could not load curator data:', curatorError);
            setCuratorData(null);
          }
        } else {
          console.log('No curator ID in group data');
          setCuratorData(null);
        }

      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    loadGroupData();
  }, [user, isStudent, navigate]);

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '20px', color: '#64748b' }}>Загрузка данных...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
          <h3>Ошибка загрузки данных</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Обновить страницу
          </button>
        </div>
      );
    }

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
    const icons = {
      attendance: '/st-icons/attendance_icon.svg',
      performance: '/st-icons/grade_icon.svg',
      personal: '/st-icons/cabinet_icon.svg',
      schedule: '/st-icons/schedule_icon.svg',
      documents: '/st-icons/documents_icon.svg'
    };
    return <img src={icons[tabName as keyof typeof icons]} alt="" className="st-nav-svg-icon" />;
  };

  const getIcon = (tabName: string) => {
    const icons = {
      attendance: '/st-icons/white_attendance_icon.svg',
      performance: '/st-icons/white_grade_icon.svg',
      personal: '/st-icons/white_cabinet_icon.svg',
      schedule: '/st-icons/white_schedule_icon.svg',
      documents: '/st-icons/white_documents_icon.svg'
    };
    return <img src={icons[tabName as keyof typeof icons]} alt="" className="st-nav-svg-white-icon" />;
  };

  const getTabTitle = (tabName: string) => {
    const titles = {
      attendance: 'Посещаемость',
      performance: 'Успеваемость',
      personal: 'Личный кабинет',
      schedule: 'Расписание',
      documents: 'Мои документы'
    };
    return titles[tabName as keyof typeof titles] || 'Посещаемость';
  };

  const getTabSubTitle = (tabName: string) => {
    const subtitles = {
      attendance: 'Мониторинг вашего присутствия на занятиях',
      performance: 'Ваши академические достижения и оценки',
      personal: 'Управление вашими персональными данными',
      schedule: 'Просмотр расписания ваших занятий',
      documents: 'Управление вашими документами и заявлениями'
    };
    return subtitles[tabName as keyof typeof subtitles] || 'Мониторинг вашего присутствия на занятиях';
  };

  const handleSidebarToggle = () => {
    setSidebarCollapsed(prev => !prev);
  };

  if (!user || !isStudent) {
    return (
      <div className="st-container">
        <div className="st-content">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Загрузка данных пользователя...</p>
          </div>
        </div>
      </div>
    );
  }

  const student = user;

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
              <img 
                src="/toggle_back.svg" 
                alt="" 
                className={`st-nav-toggle-icon ${sidebarCollapsed ? 'rotated' : ''}`}
              />
            </button>

            <div className="st-sidebar-header">
              <div className="st-user-info">
                <p className="st-user-name">{student.lastName} {student.name}</p>
                <p className="st-user-patronymic">{student.patronymic}</p>
                <p className="st-user-role">Студент</p>
                
                {/* Номер группы */}
                <p className="st-user-group">
                  <strong>Группа:</strong>{' '}
                  {loading ? (
                    <span style={{ color: '#64748b' }}>Загрузка...</span>
                  ) : (
                    <span>{groupData?.numberGroup || 'Не указана'}</span>
                  )}
                </p>
                
                {/* Специальность */}
                <p className="st-user-speciality">
                  <strong>Специальность:</strong>{' '}
                  {loading ? (
                    <span style={{ color: '#64748b' }}>Загрузка...</span>
                  ) : (
                    <span>{groupData?.specialty || 'Не указана'}</span>
                  )}
                </p>
                
                {/* Куратор */}
                <p className="st-user-curator">
                  <strong>Куратор:</strong>{' '}
                  {loading ? (
                    <span style={{ color: '#64748b' }}>Загрузка...</span>
                  ) : curatorData ? (
                    <span>{formatCuratorName(curatorData)}</span>
                  ) : (
                    <span>Не назначен</span>
                  )}
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
                  disabled={loading}
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
                  <p className="st-stat-value">
                    {loading ? '...' : '85%'}
                  </p>
                  <p className="st-stat-label">Посещаемость</p>
                </div>
                <div className="st-stat-item">
                  <p className="st-stat-value">
                    {loading ? '...' : '4.5'}
                  </p>
                  <p className="st-stat-label">Средний балл</p>
                </div>
              </div>
            </div>
          </aside>

          <main className="st-content-area">
            <div className="st-content-header">
              <div className="st-content-title-wrapper">
                <span className="st-title-icon">{getIcon(activeTab)}</span>
                <div>
                  <h1 className="st-content-title">{getTabTitle(activeTab)}</h1>
                  <p className="st-content-subtitle">{getTabSubTitle(activeTab)}</p>
                </div>
              </div>
            </div>

            <div className="st-content-card">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};