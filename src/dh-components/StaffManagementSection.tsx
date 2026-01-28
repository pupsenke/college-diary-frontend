import React, { useState, useMemo } from 'react';
import './StaffManagementSectionStyle.css';

interface Lesson {
  id: number;
  time: string;
  subject: string;
  group: string;
  room: string;
  type: 'lecture' | 'practice' | 'lab';
}

interface DaySchedule {
  date: string;
  day: string;
  lessons: Lesson[];
}

interface StaffMember {
  id: number;
  name: string;
  position: string;
  avatar: string | null;
  initials: string;
  disciplines: string[];
  groups: string[];
  workload: number;
  maxWorkload: number;
  curatorGroup: string | null;
  email: string;
  phone: string;
  office: string;
  schedule: DaySchedule[];
}

export const StaffManagementSection: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeWeek, setActiveWeek] = useState(0); // 0 - текущая неделя

  const weeks = ['Текущая неделя', 'Следующая неделя', 'Через 2 недели'];

  const generateSchedule = (): DaySchedule[] => {
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
    const times = ['9:00-10:30', '10:45-12:15', '13:00-14:30', '14:45-16:15', '16:30-18:00'];
    const subjects = ['Программирование', 'Базы данных', 'Веб-разработка', 'Сети', 'Математика', 'Алгоритмы'];
    const groups = ['2992', '2991', '2993', '2994', '2995'];
    const rooms = ['А-302', 'А-303', 'А-304', 'А-305', 'Б-201', 'Б-202'];
    const types: ('lecture' | 'practice' | 'lab')[] = ['lecture', 'practice', 'lab'];

    return days.map((day, dayIndex) => {
      // Генерируем 1-3 занятия в день
      const lessonsCount = Math.floor(Math.random() * 3) + 1;
      const lessonIndices = new Set<number>();
      while (lessonIndices.size < lessonsCount) {
        lessonIndices.add(Math.floor(Math.random() * times.length));
      }

      const lessons: Lesson[] = Array.from(lessonIndices).map((timeIndex, i) => ({
        id: dayIndex * 10 + i + 1,
        time: times[timeIndex],
        subject: subjects[Math.floor(Math.random() * subjects.length)],
        group: groups[Math.floor(Math.random() * groups.length)],
        room: rooms[Math.floor(Math.random() * rooms.length)],
        type: types[Math.floor(Math.random() * types.length)]
      }));

      // Сортируем занятия по времени
      lessons.sort((a, b) => {
        const getStartTime = (time: string) => parseInt(time.split(':')[0]);
        return getStartTime(a.time) - getStartTime(b.time);
      });

      // Генерируем дату (текущая неделя + dayIndex дней)
      const today = new Date();
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayIndex + activeWeek * 7);
      const dateStr = currentDate.toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit' 
      });

      return {
        date: dateStr,
        day: day,
        lessons: lessons
      };
    });
  };

  const staffMembers: StaffMember[] = [
    {
      id: 1,
      name: 'Голубева Галина Анатольевна',
      position: 'Заведующий отделения',
      avatar: null,
      initials: 'ГА',
      disciplines: ['Менеджмент', 'Экономика'],
      groups: ['2992', '2991', '2993'],
      workload: 18,
      maxWorkload: 24,
      curatorGroup: '2992',
      email: '-',
      phone: '+7 (999) 123-45-67',
      office: '208',
      schedule: generateSchedule()
    },
    {
      id: 2,
      name: 'Сазонова Наталья Владимировна',
      position: 'Преподаватель',
      avatar: null,
      initials: 'НВ',
      disciplines: ['Базы данных', 'ТРПО'],
      groups: ['2991', '2994'],
      workload: 16,
      maxWorkload: 24,
      curatorGroup: null,
      email: '-',
      phone: '+7 (999) 234-56-78',
      office: '120',
      schedule: generateSchedule()
    },
    {
      id: 3,
      name: 'Цымбалюк Лариса Николаевна',
      position: 'Преподаватель',
      avatar: null,
      initials: 'ЛН',
      disciplines: ['Проектирование ИС', 'ОПБД'],
      groups: ['2992'],
      workload: 12,
      maxWorkload: 18,
      curatorGroup: null,
      email: '-',
      phone: '+7 (999) 345-67-89',
      office: '124',
      schedule: generateSchedule()
    }
  ];

  const filteredStaff = useMemo(() => {
    return staffMembers.filter(staff => {
      const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.disciplines.some(d => d.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesPosition = !selectedPosition || staff.position === selectedPosition;
      return matchesSearch && matchesPosition;
    });
  }, [searchTerm, selectedPosition, selectedStatus]);

  const positions = Array.from(new Set(staffMembers.map(s => s.position)));

  const handleStaffClick = (id: number) => {
    setSelectedStaffId(id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStaffId(null);
  };

  const selectedStaff = staffMembers.find(s => s.id === selectedStaffId);

  // Подсчёт общего количества занятий для предпросмотра в карточке
  const getTotalLessons = (schedule: DaySchedule[]) => {
    return schedule.reduce((total, day) => total + day.lessons.length, 0);
  };

  const getLessonTypeColor = (type: string) => {
    switch(type) {
      case 'lecture': return '#10b981';
      case 'practice': return '#3b82f6';
      case 'lab': return '#8b5cf6';
      default: return '#002FA7';
    }
  };

  return (
    <>
      <div className="dh-sm-container">
        {/* Шапка */}
        <div className="dh-sm-header">
          <div>
            <h1 className="dh-sm-title">Сотрудники отделения</h1>
            <p className="dh-sm-subtitle">Информационные технологии • {staffMembers.length} сотрудников</p>
          </div>
        </div>

        {/* Поиск и фильтры */}
        <div className="dh-sm-controls">
          <div className="dh-sm-search-section">
            <div className="dh-sm-search-wrapper">
              <input
                type="text"
                className="dh-sm-search-input"
                placeholder="Поиск по ФИО, должности, дисциплине..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              className={`dh-sm-filter-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <span>Фильтры</span>
              <span>▼</span>
            </button>
          </div>

          {showFilters && (
            <div className="dh-sm-filters show">
              <div className="dh-sm-filters-header">
                <h3 className="dh-sm-filters-title">Фильтры</h3>
                <button 
                  className="dh-sm-clear-filters"
                  onClick={() => {
                    setSelectedPosition('');
                    setSelectedStatus('');
                  }}
                >
                  Сбросить всё
                </button>
              </div>
              <div className="dh-sm-filters-grid">
                <div className="dh-sm-filter-group">
                  <label className="dh-sm-filter-label">Должность</label>
                  <select 
                    className="dh-sm-select"
                    value={selectedPosition}
                    onChange={(e) => setSelectedPosition(e.target.value)}
                  >
                    <option value="">Все должности</option>
                    {positions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
                <div className="dh-sm-filter-group">
                  <label className="dh-sm-filter-label">Группа</label>
                  <select 
                    className="dh-sm-select"
                    // value={selectedStatus}
                    // onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="">Все группы</option>
                    <option value="active">2992</option>
                    <option value="vacation">2991</option>
                    <option value="remote">2993</option>
                  </select>
                </div>
              </div>
              <div className="dh-sm-apply-filters">
                <button 
                  className="dh-sm-apply-btn"
                  onClick={() => setShowFilters(false)}
                >
                  Применить фильтры
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Основной контент */}
        <div className="dh-sm-main-content">
          {filteredStaff.length === 0 ? (
            <div className="dh-sm-empty-state">
              <h3 className="dh-sm-empty-title">Сотрудники не найдены</h3>
              <p className="dh-sm-empty-text">Попробуйте изменить параметры поиска или фильтры</p>
            </div>
          ) : (
            <div className="dh-sm-staff-grid">
              {filteredStaff.map(staff => (
                <div 
                  key={staff.id} 
                  className="dh-sm-staff-card"
                  onClick={() => handleStaffClick(staff.id)}
                >
                  <div className="dh-sm-staff-header">
                    <div className="dh-sm-avatar">
                      {staff.avatar ? (
                        <img src={staff.avatar} alt={staff.name} className="dh-sm-avatar-img" />
                      ) : (
                        staff.initials
                      )}
                    </div>
                    <div className="dh-sm-staff-info">
                      <h3 className="dh-sm-staff-name">{staff.name}</h3>
                      <p className="dh-sm-staff-position">{staff.position}</p>
                    </div>
                  </div>
                  <div className="dh-sm-staff-body">
                    <div className="dh-sm-staff-stats">
                      <div className="dh-sm-stat-item">
                        <div className="dh-sm-stat-value">{staff.disciplines.length}</div>
                        <div className="dh-sm-stat-label">дисциплин</div>
                      </div>
                      <div className="dh-sm-stat-item">
                        <div className="dh-sm-stat-value">{staff.groups.length}</div>
                        <div className="dh-sm-stat-label">групп</div>
                      </div>
                      <div className="dh-sm-stat-item">
                        <div className="dh-sm-stat-value">{staff.workload}/{staff.maxWorkload}</div>
                        <div className="dh-sm-stat-label">часов</div>
                      </div>
                    </div>
                    
                
                    
                    <div className="dh-sm-staff-details">
                      <div className="dh-sm-detail-row">
                        <span className="dh-sm-detail-label">Куратор</span>
                        <span className="dh-sm-detail-value">
                          {staff.curatorGroup ? `Группа ${staff.curatorGroup}` : 'Не назначен'}
                        </span>
                      </div>
                      <div className="dh-sm-detail-row">
                        <span className="dh-sm-detail-label">Кабинет</span>
                        <span className="dh-sm-detail-value">{staff.office}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно сотрудника */}
      {isModalOpen && selectedStaff && (
        <div className="dh-sm-modal-overlay" onClick={handleCloseModal}>
          <div className="dh-sm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="dh-sm-modal-header">
              <div className="dh-sm-modal-header-content">
                <div className="dh-sm-modal-avatar">
                  {selectedStaff.avatar ? (
                    <img src={selectedStaff.avatar} alt={selectedStaff.name} className="dh-sm-modal-avatar-img" />
                  ) : (
                    selectedStaff.initials
                  )}
                </div>
                <div className="dh-sm-modal-info">
                  <h2 className="dh-sm-modal-name">{selectedStaff.name}</h2>
                  <p className="dh-sm-modal-position">{selectedStaff.position}</p>
                </div>
                <button className="dh-sm-modal-close" onClick={handleCloseModal}>×</button>
              </div>
            </div>
            <div className="dh-sm-modal-body">
              {/* Контактная информация */}
              <div className="dh-sm-modal-section">
                <h3 className="dh-sm-section-title">Контактная информация</h3>
                <div className="dh-sm-contact-grid">
                  <div className="dh-sm-contact-item">
                    <div className="dh-sm-contact-label">Email</div>
                    <div className="dh-sm-contact-value">{selectedStaff.email}</div>
                  </div>
                  <div className="dh-sm-contact-item">
                    <div className="dh-sm-contact-label">Телефон</div>
                    <div className="dh-sm-contact-value">{selectedStaff.phone}</div>
                  </div>
                  <div className="dh-sm-contact-item">
                    <div className="dh-sm-contact-label">Кабинет</div>
                    <div className="dh-sm-contact-value">{selectedStaff.office}</div>
                  </div>
                  <div className="dh-sm-contact-item">
                    <div className="dh-sm-contact-label">Рабочие часы</div>
                    <div className="dh-sm-contact-value">Пн-Пт 9:00-18:00</div>
                  </div>
                </div>
              </div>

              {/* Расписание занятий */}
              <div className="dh-sm-modal-section dh-sm-schedule-container">
                <div className="dh-sm-schedule-header">
                  <h3 className="dh-sm-section-title">Расписание занятий</h3>
                  <div className="dh-sm-schedule-tabs">
                    {weeks.map((week, index) => (
                      <button
                        key={index}
                        className={`dh-sm-schedule-tab ${activeWeek === index ? 'active' : ''}`}
                        onClick={() => setActiveWeek(index)}
                      >
                        {week}
                      </button>
                    ))}
                  </div>
                </div>
                
                <h3>ЗДЕСЬ БУДЕТ РАСПИСАНИЕ</h3>
              </div>

              {/* Дисциплины */}
              <div className="dh-sm-modal-section">
                <h3 className="dh-sm-section-title">Преподаваемые дисциплины</h3>
                <div className="dh-sm-disciplines-list">
                  {selectedStaff.disciplines.map((discipline, index) => (
                    <div key={index} className="dh-sm-discipline-item">
                      <span className="dh-sm-discipline-name">{discipline}</span>
                      <span className="dh-sm-discipline-hours">72 часа</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Закреплённые группы */}
              <div className="dh-sm-modal-section">
                <div className="dh-sm-section-header-small">
                  <h3 className="dh-sm-section-title">Закреплённые группы</h3>
                  <button className="dh-sm-view-all-btn">Все группы →</button>
                </div>
                <div className="dh-sm-groups-grid">
                  {selectedStaff.groups.map((group, index) => (
                    <div key={index} className="dh-sm-group-card">
                      <div className="dh-sm-group-badge">{group}</div>
                      <div className="dh-sm-group-info">
                        <div className="dh-sm-group-name">Группа {group}</div>
                        <div className="dh-sm-group-course">4 курс</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Нагрузка */}
              <div className="dh-sm-modal-section">
                <h3 className="dh-sm-section-title">Нагрузка</h3>
                <div className="dh-sm-workload">
                  <div className="dh-sm-workload-info">
                    <div className="dh-sm-workload-value">
                      {selectedStaff.workload}/{selectedStaff.maxWorkload} ч
                    </div>
                    <div className="dh-sm-workload-label">в неделю</div>
                  </div>
                </div>
              </div>

              {/* Кураторская группа */}
              {selectedStaff.curatorGroup && (
                <div className="dh-sm-modal-section">
                  <h3 className="dh-sm-section-title">Кураторская группа</h3>
                  <div className="dh-sm-group-card" style={{ maxWidth: '300px' }}>
                    <div className="dh-sm-group-badge">{selectedStaff.curatorGroup}</div>
                    <div className="dh-sm-group-info">
                      <div className="dh-sm-group-name">Группа {selectedStaff.curatorGroup}</div>
                      <div className="dh-sm-group-course">4 курс • 24 студента</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};