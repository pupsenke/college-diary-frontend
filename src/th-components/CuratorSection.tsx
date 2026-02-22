import React, { useState, useMemo } from 'react';
import './CuratorSection.css';
import { CuratorGroupDetails } from './CuratorGroupDetails';

interface Student {
  id: number;
  name: string;
  attendance: number;
  math: number;
  programming: number;
  databases: number;
  average: number;
  status: string;
  category?: string;
  childrenBirthYears?: string;
  address?: string;
  education?: string;
  phone?: string;
  email?: string;
}

interface SocialPortraitItem {
  category: string;
  students: {
    id: number;
    name: string;
  }[];
}

interface Group {
  id: number;
  number: string;
  specialty: string;
  course: number;
  studentsCount: number;
  averageAttendance: number;
  averageGrade: number;
  monitor: {
    name: string;
    appointedDate: string;
    phone: string;
    email: string;
  };
  students: Student[];
  socialPortrait: SocialPortraitItem[];
}

export const CuratorSection: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [sortBy, setSortBy] = useState('group');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCacheWarning, setShowCacheWarning] = useState(false);
  
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showMonitorModal, setShowMonitorModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [selectedStudentForSocial, setSelectedStudentForSocial] = useState<Student | null>(null);
  const [socialFormData, setSocialFormData] = useState({
    category: '',
    childrenBirthYears: '',
    address: '',
    education: ''
  });

  const [groups] = useState<Group[]>([
    {
      id: 1,
      number: "2992",
      specialty: "Информационные системы и программирование",
      course: 4,
      studentsCount: 25,
      averageAttendance: 94,
      averageGrade: 4.3,
      monitor: {
        name: 'Шевякова Алина Ильинична',
        appointedDate: '01.09.2023',
        phone: '+7 (999) 123-45-67',
        email: 'a.shew@edu.ru'
      },
      students: [
        { id: 1, name: 'Шевякова Алина Ильинична', attendance: 98, math: 5.0, programming: 4.8, databases: 4.9, average: 4.9, status: 'active', address: 'ул. Мира, д. 15', education: 'Бюджет' },
        { id: 2, name: 'Иванова Мария Сергеевна', attendance: 95, math: 4.7, programming: 4.9, databases: 4.8, average: 4.8, status: 'active', category: 'Многодетная семья', childrenBirthYears: '2018,2020', address: 'ул. Ленина, д. 5', education: 'Бюджет' },
        { id: 3, name: 'Петров Дмитрий Иванович', attendance: 85, math: 3.8, programming: 4.2, databases: 3.9, average: 4.0, status: 'active', address: 'пр. Кочетова, д. 42', education: 'Платная' },
        { id: 4, name: 'Сидорова Анна Владимировна', attendance: 92, math: 4.5, programming: 4.6, databases: 4.4, average: 4.5, status: 'academic', category: 'Дети-сироты', address: 'ул. Пушкина, д. 10', education: 'Бюджет' },
        { id: 5, name: 'Козлов Игорь Николаевич', attendance: 78, math: 3.5, programming: 3.8, databases: 3.2, average: 3.5, status: 'inactive', category: 'Студенты с ОВЗ', address: 'ул. Гагарина, д. 8', education: 'Бюджет' }
      ],
      socialPortrait: [
        { 
          category: 'Дети-сироты', 
          students: [{ id: 4, name: 'Сидорова Анна Владимировна' }] 
        },
        { 
          category: 'Студенты с ОВЗ', 
          students: [{ id: 5, name: 'Козлов Игорь Николаевич' }] 
        },
        { 
          category: 'Из многодетных семей', 
          students: [{ id: 2, name: 'Иванова Мария Сергеевна' }] 
        }
      ]
    },
    {
      id: 2,
      number: "4992",
      specialty: "Информационные системы и программирование",
      course: 2,
      studentsCount: 26,
      averageAttendance: 89,
      averageGrade: 3.9,
      monitor: {
        name: 'Иванова Мария Сергеевна',
        appointedDate: '01.09.2022',
        phone: '+7 (999) 234-56-78',
        email: 'm.ivanova@edu.ru'
      },
      students: [
        { id: 6, name: 'Иванова Мария Сергеевна', attendance: 96, math: 4.9, programming: 4.8, databases: 4.7, average: 4.8, status: 'active', address: 'ул. Ленина, д. 5', education: 'Бюджет' },
        { id: 7, name: 'Петров Дмитрий Иванович', attendance: 88, math: 4.0, programming: 4.3, databases: 4.1, average: 4.1, status: 'active', address: 'пр. Кочетова, д. 42', education: 'Платная' },
        { id: 8, name: 'Сидорова Анна Владимировна', attendance: 90, math: 4.4, programming: 4.5, databases: 4.2, average: 4.4, status: 'active', address: 'ул. Пушкина, д. 10', education: 'Бюджет' }
      ],
      socialPortrait: []
    }
  ]);

  const filteredGroups = useMemo(() => {
    let result = [...groups];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(group =>
        group.number.toLowerCase().includes(term) ||
        group.specialty.toLowerCase().includes(term) ||
        group.monitor.name.toLowerCase().includes(term)
      );
    }

    if (courseFilter !== 'all') {
      result = result.filter(group => group.course.toString() === courseFilter);
    }

    result.sort((a, b) => {
      let valueA: string | number, valueB: string | number;
      
      switch(sortBy) {
        case 'group':
          valueA = a.number;
          valueB = b.number;
          break;
        case 'course':
          valueA = a.course;
          valueB = b.course;
          break;
        case 'specialty':
          valueA = a.specialty;
          valueB = b.specialty;
          break;
        case 'students':
          valueA = a.studentsCount;
          valueB = b.studentsCount;
          break;
        case 'attendance':
          valueA = a.averageAttendance;
          valueB = b.averageAttendance;
          break;
        case 'performance':
          valueA = a.averageGrade;
          valueB = b.averageGrade;
          break;
        default:
          valueA = a.number;
          valueB = b.number;
      }

      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    return result;
  }, [groups, searchTerm, courseFilter, sortBy, sortOrder]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleGroupClick = (group: Group) => {
    setSelectedGroup(group);
  };

  const handleBackToGroups = () => {
    setSelectedGroup(null);
  };

  const handleChangeMonitor = (newMonitorName: string) => {
    if (selectedGroup) {
      const newMonitor = selectedGroup.students.find(s => s.name === newMonitorName);
      if (newMonitor) {
        setSelectedGroup({
          ...selectedGroup,
          monitor: {
            ...selectedGroup.monitor,
            name: newMonitor.name,
            appointedDate: new Date().toLocaleDateString('ru-RU'),
            phone: selectedGroup.monitor.phone,
            email: selectedGroup.monitor.email
          }
        });
      }
    }
  };

  const handleOpenSocialModal = (student: Student) => {
    setSelectedStudentForSocial(student);
    setSocialFormData({
      category: student.category || '',
      childrenBirthYears: student.childrenBirthYears || '',
      address: student.address || '',
      education: student.education || ''
    });
    setShowSocialModal(true);
  };

  const handleSaveSocialData = () => {
    if (selectedGroup && selectedStudentForSocial) {
      const updatedStudents = selectedGroup.students.map(s => 
        s.id === selectedStudentForSocial.id 
          ? { 
              ...s, 
              category: socialFormData.category,
              childrenBirthYears: socialFormData.childrenBirthYears,
              address: socialFormData.address,
              education: socialFormData.education
            }
          : s
      );
      
      setSelectedGroup({
        ...selectedGroup,
        students: updatedStudents
      });
      
      setShowSocialModal(false);
    }
  };

  const InfoIcon = ({ title, description }: { title: string; description: string }) => (
    <div className="info-icon-btn" tabIndex={0}>
      <button className="header-btn" type="button">
        <span className="info-icon-text">i</span>
        <span>Информация</span>
      </button>
      <div className="info-tooltip small">
        <div className="info-tooltip-content">
          <div className="info-header">
            <div className="info-title">
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          </div>
          
          <div className="info-section">
            <h4>Основные возможности</h4>
            <div className="features-grid">
              {title.includes('Кураторские') ? (
                <>
                  <div className="feature-item">
                    <span className="feature-icon"></span>
                    <span>Просмотр списка кураторских групп</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon"></span>
                    <span>Фильтрация по курсам</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon"></span>
                    <span>Сортировка по различным параметрам</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon"></span>
                    <span>Информация о старостах групп</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="feature-item">
                    <span className="feature-icon"></span>
                    <span>Просмотр списка студентов</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon"></span>
                    <span>Смена старосты группы</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon"></span>
                    <span>Заполнение социальных данных студентов</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon"></span>
                    <span>Управление социальным портретом группы</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="info-section">
            <h4>Как использовать</h4>
            <div className="usage-steps">
              {title.includes('Кураторские') ? (
                <>
                  <div className="steps">
                    <span className="steps-number">1</span>
                    <span>Используйте фильтры для поиска нужных групп</span>
                  </div>
                  <div className="steps">
                    <span className="steps-number">2</span>
                    <span>Нажмите на группу для просмотра детальной информации</span>
                  </div>
                  <div className="steps">
                    <span className="steps-number">3</span>
                    <span>Обновляйте данные при необходимости</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="step">
                    <span className="step-number">1</span>
                    <span>Для смены старосты нажмите "Сменить старосту"</span>
                  </div>
                  <div className="step">
                    <span className="step-number">2</span>
                    <span>Для заполнения социальных данных нажмите кнопку с карандашом</span>
                  </div>
                  <div className="step">
                    <span className="step-number">3</span>
                    <span>Для управления социальным портретом нажмите "Заполнить данные"</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const RefreshButton = () => (
    <button 
      className={`header-btn pc-refresh-btn ${refreshing ? 'pc-refreshing' : ''}`}
      onClick={handleRefresh}
      disabled={refreshing || loading}
    >
      <img 
        src="/st-icons/upload_icon.svg" 
        className={`pc-refresh-icon ${refreshing ? 'pc-refresh-spin' : ''}`}
        alt="Обновить"
      />
      <span>{refreshing ? 'Обновление...' : loading ? 'Загрузка...' : 'Обновить данные'}</span>
    </button>
  );

  const renderGroupCard = (group: Group) => {
    return (
      <div key={group.id} className="curator-group-card" onClick={() => handleGroupClick(group)}>
        <div className="curator-card-top">
          <div className="curator-card-group-header">
            <div className="curator-card-group-number">
              <span className="curator-group-number-label">Группа</span>
              <span className="curator-group-number-value">{group.number}</span>
            </div>
            <div className="curator-card-course">
              <span className="curator-course-label">{group.course} курс</span>
            </div>
          </div>
          
          <div className="curator-card-specialty">
            <h4>{group.specialty}</h4>
          </div>
        </div>
        
        <div className="curator-card-students-compact">
          <span className="curator-students-icon"><img src="/social-icons/filter_icon.svg" alt="студенты"/></span>
          <span className="curator-students-count">{group.studentsCount} студентов</span>
        </div>
        
        <div className="curator-card-metrics">
          <div className="curator-card-metric">
            <div className="curator-metric-header">
              <span className="curator-metric-label">Посещаемость</span>
              <span className="curator-metric-value">{group.averageAttendance}%</span>
            </div>
            <div className="curator-metric-progress">
              <div 
                className="curator-metric-progress-fill" 
                style={{ width: `${group.averageAttendance}%`, background: '#002FA7' }}
              ></div>
            </div>
          </div>
          
          <div className="curator-card-metric">
            <div className="curator-metric-header">
              <span className="curator-metric-label">Успеваемость</span>
              <span className="curator-metric-value">{group.averageGrade}</span>
            </div>
            <div className="curator-metric-progress">
              <div 
                className="curator-metric-progress-fill" 
                style={{ width: `${group.averageGrade * 20}%`, background: '#002FA7' }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="curator-card-headman">
          <div className="curator-headman-item">
            <span className="curator-headman-label">Староста</span>
            <span className="curator-headman-value">{group.monitor.name}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderGroupListItem = (group: Group, index: number) => {
    return (
      <div key={group.id} className="curator-group-list-item" onClick={() => handleGroupClick(group)}>        
        <div className="curator-list-main">
          <div className="curator-list-header">
            <div className="curator-list-group-info">
              <span className="curator-list-group-number">{group.number}</span>
              <span className="curator-list-course-badge">{group.course} курс</span>
            </div>
            <div className="curator-list-specialty">{group.specialty}</div>
          </div>
          
          <div className="curator-list-details">
            <div className="curator-list-detail compact">
              <span className="curator-students-icon"><img src="/social-icons/filter_icon.svg" alt="студенты"/></span>
              <span className="curator-detail-value">{group.studentsCount}</span>
            </div>
            <div className="curator-list-detail">
              <span className="curator-detail-label">Староста:</span>
              <span className="curator-detail-value">{group.monitor.name}</span>
            </div>
          </div>
        </div>
        
        <div className="curator-list-metrics">
          <div className="curator-list-metric">
            <div className="curator-list-metric-header">
              <span>Посещаемость</span>
              <span>{group.averageAttendance}%</span>
            </div>
            <div className="curator-list-progress">
              <div 
                className="curator-list-progress-fill" 
                style={{ width: `${group.averageAttendance}%`, background: '#002FA7' }}
              ></div>
            </div>
          </div>
          
          <div className="curator-list-metric">
            <div className="curator-list-metric-header">
              <span>Успеваемость</span>
              <span>{group.averageGrade}</span>
            </div>
            <div className="curator-list-progress">
              <div 
                className="curator-list-progress-fill" 
                style={{ width: `${group.averageGrade * 20}%`, background: '#002FA7' }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="curator-groups-section">
      {/* Шапка отображается ТОЛЬКО когда нет выбранной группы */}
      {!selectedGroup && (
        <div className="curator-cabinet-header">
          <InfoIcon 
            title="Кураторские группы"
            description="Здесь отображаются все группы, закрепленные за вами как за куратором."
          />
          <div className="curator-header-actions">
            <RefreshButton />
          </div>
        </div>
      )}

      {showCacheWarning && (
        <div className="curator-cache-warning">
          <span>Используются кэшированные данные. Обновите данные для получения актуальной информации.</span>
        </div>
      )}

      {error && (
        <div className="curator-error-message">
          <span>{error}</span>
        </div>
      )}

      {selectedGroup ? (
        <CuratorGroupDetails
          group={selectedGroup}
          onBack={handleBackToGroups}
          onChangeMonitor={handleChangeMonitor}
          onOpenSocialModal={handleOpenSocialModal}
        />
      ) : (
        <>
          <div className="curator-control-panel-enhanced">
            <div className="curator-controls-top-row">
              <div className="curator-search-box-enhanced">
                <input
                  type="text"
                  placeholder="Поиск по номеру группы, специальности или старосте..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="curator-search-input-enhanced"
                />
                <div className="curator-search-icon">
                  <img src="/social-icons/search_icon.svg" alt="Поиск" />
                </div>
              </div>
              
              <div className="curator-view-toggle">
                <button 
                  className={`curator-view-btn ${viewMode === 'cards' ? 'curator-view-active' : ''}`}
                  onClick={() => setViewMode('cards')}
                  title="Карточки"
                >
                  <img src="/social-icons/cards_icon.svg" alt="Карточки" />
                  <span>Карточки</span>
                </button>
                <button 
                  className={`curator-view-btn ${viewMode === 'list' ? 'curator-view-active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="Список"
                >
                  <img src="/social-icons/list_icon.svg" alt="Список" />
                  <span>Список</span>
                </button>
              </div>
            </div>

            <div className="curator-controls-bottom-row">
              <div className="curator-sort-controls-enhanced">
                <div className="curator-sort-group">
                  <label className="curator-sort-label">Сортировка:</label>
                  <select 
                    className="curator-filter-select-enhanced curator-sort-select" 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="group">По номеру группы</option>
                    <option value="course">По курсу</option>
                    <option value="specialty">По специальности</option>
                    <option value="students">По кол-ву студентов</option>
                    <option value="attendance">По посещаемости</option>
                    <option value="performance">По успеваемости</option>
                  </select>
                  <div className="curator-sort-buttons">
                    <button 
                      className="curator-sort-order-btn"
                      onClick={toggleSortOrder}
                      title={sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
                    >
                      <img className="curator-sort-order-icon"
                        src={sortOrder === 'asc' ? "/social-icons/sort_asc_icon.svg" : "/social-icons/sort_desc_icon.svg"} 
                        alt="Направление сортировки" 
                      />
                      <span>{sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="curator-course-filter-right">
                <label className="curator-filter-label">Курс</label>
                <select 
                  className="curator-filter-select-enhanced curator-course-select" 
                  value={courseFilter} 
                  onChange={(e) => setCourseFilter(e.target.value)}
                >
                  <option value="all">Все курсы</option>
                  <option value="1">1 курс</option>
                  <option value="2">2 курс</option>
                  <option value="3">3 курс</option>
                  <option value="4">4 курс</option>
                </select>
              </div>
            </div>
          </div>

          <div className="curator-content-section">
            <div className="curator-section-header">
              <h4>Кураторские группы</h4>
              <div className="curator-groups-count">
                <img src="/social-icons/filter_icon.svg" alt="Фильтр" />
                <span>Показано: <strong>{filteredGroups.length}</strong> из <strong>{groups.length}</strong></span>
              </div>
            </div>

            {loading ? (
              <div className="curator-loading">
                <div className="curator-loading-spinner"></div>
                <p>Загрузка групп...</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="curator-empty-state">
                <p>Группы не найдены</p>
                <p className="curator-empty-subtitle">Попробуйте изменить параметры поиска или фильтры</p>
              </div>
            ) : (
              <>
                {viewMode === 'cards' && (
                  <div className="curator-groups-cards-container">
                    <div className="curator-groups-cards">
                      {filteredGroups.map((group) => renderGroupCard(group))}
                    </div>
                  </div>
                )}

                {viewMode === 'list' && (
                  <div className="curator-groups-list-container">
                    <div className="curator-groups-list">
                      {filteredGroups.map((group, index) => renderGroupListItem(group, index))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Модальное окно заполнения социальных данных */}
      {showSocialModal && selectedStudentForSocial && (
        <div className="curator-modal-overlay" onClick={() => setShowSocialModal(false)}>
          <div className="curator-modal" onClick={(e) => e.stopPropagation()}>
            <div className="curator-modal-header">
              <div className="curator-modal-header-content">
                <div className="curator-modal-icon">
                  <img src="/social-icons/categories_icon.svg" alt="Социальные данные" />
                </div>
                <div>
                  <h3>Заполнение социальных данных</h3>
                  <p className="curator-modal-subtitle">{selectedStudentForSocial.name}</p>
                </div>
              </div>
              <button className="curator-modal-close" onClick={() => setShowSocialModal(false)}>
                ×
              </button>
            </div>

            <div className="curator-modal-content">
              <div className="curator-form-group">
                <label>Социальная категория</label>
                <select 
                  className="curator-select"
                  value={socialFormData.category}
                  onChange={(e) => setSocialFormData({...socialFormData, category: e.target.value})}
                >
                  <option value="">Выберите категорию</option>
                  <option value="Дети-сироты">Дети-сироты</option>
                  <option value="Дети из многодетных семей">Дети из многодетных семей</option>
                  <option value="Инвалиды и лица с ОВЗ">Инвалиды и лица с ОВЗ</option>
                  <option value="Малообеспеченные семьи">Малообеспеченные семьи</option>
                  <option value="Мигранты и беженцы">Мигранты и беженцы</option>
                  <option value="Студенты в трудной жизненной ситуации">Студенты в трудной жизненной ситуации</option>
                  <option value="Студенты группы риска">Студенты группы риска</option>
                  <option value="Одаренные дети">Одаренные дети</option>
                </select>
              </div>

              {socialFormData.category === 'Дети из многодетных семей' && (
                <div className="curator-form-group">
                  <label>Года рождения всех детей в семье</label>
                  <input
                    type="text"
                    className="curator-input"
                    placeholder="Например: 2018, 2020, 2022"
                    value={socialFormData.childrenBirthYears}
                    onChange={(e) => setSocialFormData({...socialFormData, childrenBirthYears: e.target.value})}
                  />
                  <small className="curator-form-hint">Укажите года рождения через запятую</small>
                </div>
              )}

              <div className="curator-form-group">
                <label>Адрес проживания</label>
                <input
                  type="text"
                  className="curator-input"
                  placeholder="Введите адрес"
                  value={socialFormData.address}
                  onChange={(e) => setSocialFormData({...socialFormData, address: e.target.value})}
                />
              </div>

              <div className="curator-form-group">
                <label>Основа обучения</label>
                <select 
                  className="curator-select"
                  value={socialFormData.education}
                  onChange={(e) => setSocialFormData({...socialFormData, education: e.target.value})}
                >
                  <option value="">Выберите основу</option>
                  <option value="Бюджет">Бюджет</option>
                  <option value="Платная">Платная</option>
                  <option value="Целевая">Целевая</option>
                </select>
              </div>
            </div>

            <div className="curator-modal-actions">
              <button
                className="curator-btn-secondary"
                onClick={() => setShowSocialModal(false)}
              >
                Отмена
              </button>
              <button
                className="curator-confirm-btn"
                onClick={handleSaveSocialData}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};