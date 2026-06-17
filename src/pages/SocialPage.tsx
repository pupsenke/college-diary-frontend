import React, { useState, useEffect } from 'react';
import { SocialHeader } from '../social-components/SocialHeader';
import { PersonalCabinet } from '../social-components/SocialPersonalCabinet';
import { GroupsSection } from '../social-components/SocialGroupsSection';
import { ReportsSection } from '../social-components/SocialReportsSection';
import { useUser } from '../context/UserContext';
import { socialApiService } from '../services/socialApiService';
import './SocialPage.css';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const SocialPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('personal');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Кабинеты соц. педагога
  const [offices, setOffices] = useState<string[]>([]);
  
  // Расписание: для каждого кабинета - массив дней
  const [roomSchedule, setRoomSchedule] = useState<Record<string, string[]>>({});
  
  // Состояние модального окна
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
  // Временное состояние для редактирования в модальном окне
  const [tempSchedule, setTempSchedule] = useState<Record<string, string[]>>({});

  // Дни недели
  const weekDays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
  const weekDaysShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];

  // Загружаем кабинеты и расписание соц. педагога
  useEffect(() => {
    const loadData = async () => {
      const staffId = user?.id || parseInt(localStorage.getItem('user_id') || '0');
      if (staffId) {
        try {
          const workerData = await socialApiService.getSocialWorkerData(staffId);
          if (workerData && workerData.offices.length > 0) {
            setOffices(workerData.offices);
          }
          
          // Загружаем сохраненное расписание
          const savedSchedule = localStorage.getItem(`room_schedule_${staffId}`);
          if (savedSchedule) {
            setRoomSchedule(JSON.parse(savedSchedule));
          } else {
            // Инициализируем пустое расписание
            const emptySchedule: Record<string, string[]> = {};
            workerData?.offices.forEach(office => {
              emptySchedule[office] = [];
            });
            setRoomSchedule(emptySchedule);
          }
        } catch (error) {
          console.error('Error loading data:', error);
        }
      }
    };
    loadData();
  }, [user]);

  // Получаем текущий день недели для подсветки
  const getCurrentDay = () => {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const today = new Date().getDay();
    return days[today];
  };

  // Получение кабинета для конкретного дня
  const getRoomForDay = (day: string): string => {
    for (const [room, days] of Object.entries(roomSchedule)) {
      if (days.includes(day)) {
        return room;
      }
    }
    return '';
  };

  // Получение сгруппированного расписания для отображения
  const getGroupedSchedule = () => {
    // Группируем дни по кабинетам
    const grouped: Record<string, string[]> = {};
    
    weekDays.forEach(day => {
      const room = getRoomForDay(day);
      if (room) {
        if (!grouped[room]) {
          grouped[room] = [];
        }
        grouped[room].push(day);
      }
    });
    
  // Формируем массив для отображения
    const scheduleParts: { days: string[], room: string }[] = [];
    
    Object.entries(grouped).forEach(([room, days]) => {
      // Сортируем дни в правильном порядке
      const dayOrder = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
      const sortedDays = [...days].sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
      
      // Преобразуем дни в короткие названия
      const shortDays = sortedDays.map(day => {
        if (day === 'Понедельник') return 'пн';
        if (day === 'Вторник') return 'вт';
        if (day === 'Среда') return 'ср';
        if (day === 'Четверг') return 'чт';
        if (day === 'Пятница') return 'пт';
        return '';
      }).filter(Boolean);
      
      scheduleParts.push({ 
        days: shortDays, 
        room 
      });
    });
    
    return scheduleParts;
  };

  // Открыть модальное окно настройки расписания
  const handleOpenScheduleModal = () => {
    setTempSchedule(JSON.parse(JSON.stringify(roomSchedule)));
    setShowScheduleModal(true);
  };

  // Переключить день для кабинета
  const toggleDayForRoom = (room: string, day: string) => {
    setTempSchedule(prev => {
      const currentDays = prev[room] || [];
      if (currentDays.includes(day)) {
        // Удаляем день
        return {
          ...prev,
          [room]: currentDays.filter(d => d !== day)
        };
      } else {
        // Добавляем день, но сначала удаляем этот день из других кабинетов
        const newSchedule = { ...prev };
        // Удаляем день из всех кабинетов
        Object.keys(newSchedule).forEach(r => {
          if (newSchedule[r]?.includes(day)) {
            newSchedule[r] = newSchedule[r].filter(d => d !== day);
          }
        });
        // Добавляем день в выбранный кабинет
        newSchedule[room] = [...(newSchedule[room] || []), day];
        return newSchedule;
      }
    });
  };

  // Сохранить расписание
  const handleSaveSchedule = () => {
    setRoomSchedule(tempSchedule);
    const staffId = user?.id || parseInt(localStorage.getItem('user_id') || '0');
    localStorage.setItem(`room_schedule_${staffId}`, JSON.stringify(tempSchedule));
    setShowScheduleModal(false);
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
      navigate('/login');
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

  const getTabIcon = (tabName: string) => {
    switch (tabName) {
      case 'groups':
        return <img src="th-icons/groups_icon.svg" alt="Группы" className="social-nav-svg-icon" />;
      case 'reports':
        return <img src="social-icons/reports_icon.svg" alt="Отчеты" className="social-nav-svg-icon" />;
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

  if (!user) {
    return (
      <div className="social-container">
        <div className="social-content">
          <div>Загрузка...</div>
        </div>
      </div>
    );
  }

  const currentDay = getCurrentDay();
  const groupedSchedule = getGroupedSchedule();
  
  // Определяем, какой день сегодня для подсветки
  const isToday = (dayName: string): boolean => {
    return currentDay === dayName;
  };

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
              {['personal', 'groups', 'reports'].map((tab) => (
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
              {/* Блок расписания - кликабельный */}
              <div className="social-schedule-mini" onClick={handleOpenScheduleModal}>
                {groupedSchedule.length > 0 ? (
                  groupedSchedule.map((item, idx) => (
                    <div key={idx} className="social-schedule-row">
                      <span className="social-schedule-row-label">
                        <span className={`social-schedule-day ${item.days.some(day => {
                          const dayMap: Record<string, string> = { 'пн': 'Понедельник', 'вт': 'Вторник', 'ср': 'Среда', 'чт': 'Четверг', 'пт': 'Пятница' };
                          return currentDay === dayMap[day];
                        }) ? 'today' : ''}`}>
                          {item.days.join('-')}
                        </span>
                      </span>
                      <span className="social-schedule-row-divider">|</span>
                      <span className="social-schedule-row-rooms">
                        <span className={`social-schedule-room-mini ${item.days.some(day => {
                          const dayMap: Record<string, string> = { 'пн': 'Понедельник', 'вт': 'Вторник', 'ср': 'Среда', 'чт': 'Четверг', 'пт': 'Пятница' };
                          return currentDay === dayMap[day];
                        }) ? 'today' : ''}`}>
                          {item.room}
                        </span>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="social-schedule-row">
                    <span className="social-schedule-row-label">
                      <span className="social-schedule-day">нет расписания</span>
                    </span>
                  </div>
                )}
                <div className="schedule-edit-hint">✎ нажмите для настройки</div>
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

      {/* Модальное окно настройки расписания */}
      {showScheduleModal && (
        <div className="lk-modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="lk-modal schedule-config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pc-modal-header">
              <div className="lk-modal-icon">
                <img src="/social-icons/editing_icon.svg" alt="Настройка расписания" />
              </div>
              <h3>Настройка расписания кабинетов</h3>
              <button 
                className="pc-modal-close"
                onClick={() => setShowScheduleModal(false)}
              >
                ×
              </button>
            </div>

            <div className="pc-modal-content">
              {/* Сверху - дни недели */}
              <div className="schedule-header">
                <div className="schedule-placeholder"></div>
                {weekDays.map((day, idx) => (
                  <div key={day} className="schedule-day-header">
                    {weekDaysShort[idx]}
                  </div>
                ))}
              </div>
              
              {/* Снизу - кабинеты с выбором дней */}
              <div className="schedule-rooms-list">
                {offices.map(room => (
                  <div key={room} className="schedule-room-row">
                    <div className="schedule-room-name">{room}</div>
                    {weekDays.map(day => (
                      <div
                        key={day}
                        className={`schedule-day-checkbox ${tempSchedule[room]?.includes(day) ? 'checked' : ''}`}
                        onClick={() => toggleDayForRoom(room, day)}
                      >
                        {tempSchedule[room]?.includes(day) && <span className="check-mark">✓</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              
              <div className="schedule-note">
                * Каждый день может быть назначен только одному кабинету
              </div>
              
              <div className="pc-modal-actions"> 
                <button
                  className="pc-btn-secondary"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Отмена
                </button>
                <button
                  className="pc-confirm-btn"
                  onClick={handleSaveSchedule}
                >
                  Сохранить расписание
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};