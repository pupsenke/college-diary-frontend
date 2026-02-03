import React, { useState, useEffect } from 'react';
import './SocialGroupsSection.css';

interface GroupData {
  id: number;
  number: string;
  specialty: string;
  course: number;
  studentsCount: number;
  performance: number;
  attendance: number;
  headman: string;
  curator: string;
  categories: {
    [key: string]: number;
  };
}

interface StudentData {
  id: number;
  name: string;
  gender: string;
  birthDate: string;
  address: string;
  phone: string;
  categories: string[];
  risk: 'high' | 'medium' | 'low';
  notes: string;
}

export const GroupsSection: React.FC = () => {
  // Состояния
  const [groups, setGroups] = useState<GroupData[]>([
    {
      id: 1,
      number: "2992",
      specialty: "Информационные системы и программирование",
      course: 4,
      studentsCount: 32,
      performance: 86,
      attendance: 92,
      headman: "Смирнов А.П.",
      curator: "Петрова И.С.",
      categories: {
        "Дети-сироты": 2,
        "Дети из многодетных семей": 5,
        "Инвалиды и лица с ОВЗ": 1,
        "Малообеспеченные семьи": 8,
        "Мигранты и беженцы": 0,
        "Студенты в трудной жизненной ситуации": 3,
        "Студенты группы риска": 4,
        "Одаренные дети": 6
      }
    },
    // ... добавьте остальные группы по аналогии
  ]);

  const [filteredGroups, setFilteredGroups] = useState<GroupData[]>(groups);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('group');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  const [showGroupDetail, setShowGroupDetail] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [loading, setLoading] = useState(false);

  // Социальные категории
  const socialCategories = [
    "Дети-сироты",
    "Дети из многодетных семей",
    "Инвалиды и лица с ОВЗ",
    "Малообеспеченные семьи",
    "Мигранты и беженцы",
    "Студенты в трудной жизненной ситуации",
    "Студенты группы риска",
    "Одаренные дети"
  ];

  // Загрузка групп
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    // В реальном приложении здесь был бы запрос к API
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  // Фильтрация и поиск
  useEffect(() => {
    let result = [...groups];

    // Поиск
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(group =>
        group.number.toLowerCase().includes(term) ||
        group.specialty.toLowerCase().includes(term)
      );
    }

    // Фильтр по курсу
    if (courseFilter !== 'all') {
      result = result.filter(group => group.course.toString() === courseFilter);
    }

    // Фильтр по специальности
    if (specialtyFilter !== 'all') {
      result = result.filter(group => group.specialty === specialtyFilter);
    }

    // Сортировка
    result.sort((a, b) => {
      let valueA, valueB;
      
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
          valueA = a.attendance;
          valueB = b.attendance;
          break;
        case 'performance':
          valueA = a.performance;
          valueB = b.performance;
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

    setFilteredGroups(result);
  }, [groups, searchTerm, courseFilter, specialtyFilter, sortBy, sortOrder]);

  // Получение статистики
  const getStats = () => {
    const totalStudents = groups.reduce((sum, group) => sum + group.studentsCount, 0);
    const riskGroups = groups.filter(group => group.performance < 70 || group.attendance < 75).length;
    const totalGroups = groups.length;

    let studentsWithCategories = 0;
    groups.forEach(group => {
      const studentsInCategories = Object.values(group.categories).reduce((sum, count) => sum + count, 0);
      studentsWithCategories += studentsInCategories;
    });

    const socialCoverage = Math.round((studentsWithCategories / totalStudents) * 100);

    return { totalStudents, riskGroups, totalGroups, socialCoverage };
  };

  const stats = getStats();

  // Рендер карточки группы
  const renderGroupCard = (group: GroupData) => {
    const totalCategories = Object.values(group.categories).filter(count => count > 0).length;
    const totalStudentsInCategories = Object.values(group.categories).reduce((a, b) => a + b, 0);
    const categoriesPercentage = Math.round((totalStudentsInCategories / group.studentsCount) * 100);

    return (
      <div key={group.id} className="group-card" onClick={() => handleGroupClick(group)}>
        <div className="group-card-header">
          <div className="group-badge">
            {group.number}
          </div>
          <div className="group-info">
            <h4>{group.specialty}</h4>
            <p>{group.course} курс • {group.studentsCount} студентов</p>
          </div>
        </div>
        
        <div className="group-stats">
          <div className="group-stat-item">
            <i className="fas fa-user-graduate"></i>
            <span>{group.performance}% успеваемость</span>
          </div>
          <div className="group-stat-item">
            <i className="fas fa-calendar-check"></i>
            <span>{group.attendance}% посещаемость</span>
          </div>
        </div>
        
        <div className="group-progress">
          <div className="group-progress-label">
            <span>Успеваемость</span>
            <span>{group.performance}%</span>
          </div>
          <div className="group-progress-bar">
            <div className="group-progress-fill" style={{ width: `${group.performance}%` }}></div>
          </div>
        </div>
        
        <div className="group-progress">
          <div className="group-progress-label">
            <span>Посещаемость</span>
            <span>{group.attendance}%</span>
          </div>
          <div className="group-progress-bar">
            <div className="group-progress-fill" style={{ width: `${group.attendance}%` }}></div>
          </div>
        </div>
        
        <div className="group-categories">
          <small>
            <i className="fas fa-tags"></i> {totalCategories} соц. категорий ({categoriesPercentage}%)
          </small>
        </div>
      </div>
    );
  };

  // Рендер строки таблицы
  const renderTableRow = (group: GroupData) => {
    const categoriesCount = Object.values(group.categories).filter(count => count > 0).length;
    
    return (
      <tr key={group.id} onClick={() => handleGroupClick(group)}>
        <td>{group.id}</td>
        <td><strong>{group.number}</strong></td>
        <td>{group.specialty}</td>
        <td>
          <span className="badge" style={{ 
            background: 'linear-gradient(135deg, #002FA7 0%, #5986f7 100%)', 
            color: 'white', 
            padding: '3px 10px', 
            borderRadius: '12px' 
          }}>
            {group.course}
          </span>
        </td>
        <td>{group.studentsCount}</td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{group.attendance}%</span>
            <div style={{ flex: 1, height: '6px', background: '#f8f9ff', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${group.attendance}%`, height: '100%', background: 'linear-gradient(90deg, #002FA7, #5986f7)' }}></div>
            </div>
          </div>
        </td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{group.performance}%</span>
            <div style={{ flex: 1, height: '6px', background: '#f8f9ff', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${group.performance}%`, height: '100%', background: 'linear-gradient(90deg, #002FA7, #5986f7)' }}></div>
            </div>
          </div>
        </td>
        <td>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
            {Object.entries(group.categories)
              .filter(([cat, count]) => count > 0)
              .slice(0, 3)
              .map(([cat, count]) => (
                <span key={cat} style={{ background: '#f8f9ff', color: '#1a237e', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>
                  {cat}: {count}
                </span>
              ))}
            {categoriesCount > 3 && (
              <span style={{ background: '#002FA7', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>
                +{categoriesCount - 3}
              </span>
            )}
          </div>
        </td>
        <td>
          <button 
            className="btn-secondary" 
            style={{ padding: '5px 10px', fontSize: '12px' }}
            onClick={(e) => {
              e.stopPropagation();
              handleGroupClick(group);
            }}
          >
            <i className="fas fa-eye"></i> Просмотр
          </button>
        </td>
      </tr>
    );
  };

  // Обработчики
  const handleGroupClick = (group: GroupData) => {
    setSelectedGroup(group);
    setShowGroupDetail(true);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Здесь можно добавить обновление данных
    }, 1000);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Получение списка специальностей
  const specialties = Array.from(new Set(groups.map(group => group.specialty)));

  return (
    <div className="groups-section">
      {/* Заголовок */}
      <div className="groups-header">
        <div className="groups-title">
          <h2><i className="fas fa-users"></i> Список всех групп</h2>
          <p>Просмотр социальных портретов учебных групп колледжа</p>
        </div>
        
        <div className="groups-actions">
          <button className="btn-primary" onClick={handleRefresh} disabled={loading}>
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            {loading ? 'Обновление...' : 'Обновить'}
          </button>
          <button className="btn-secondary" onClick={() => setShowStatistics(true)}>
            <i className="fas fa-chart-bar"></i>
            Статистика
          </button>
        </div>
      </div>

      {/* Панель управления */}
      <div className="groups-control-panel">
        <div className="groups-search-box">
          <i className="fas fa-search"></i>
          <input 
            type="text" 
            placeholder="Поиск по номеру группы или специальности..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="groups-filters">
          <select className="groups-filter-select" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="all">Все курсы</option>
            <option value="1">1 курс</option>
            <option value="2">2 курс</option>
            <option value="3">3 курс</option>
            <option value="4">4 курс</option>
          </select>
          
          <select className="groups-filter-select" value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)}>
            <option value="all">Все специальности</option>
            {specialties.map(specialty => (
              <option key={specialty} value={specialty}>{specialty}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Статистика */}
      <div className="groups-stats-cards">
        <div className="groups-stat-card">
          <div className="groups-stat-icon">
            <i className="fas fa-user-friends"></i>
          </div>
          <div className="groups-stat-info">
            <h3>{stats.totalGroups}</h3>
            <p>Всего групп</p>
          </div>
        </div>
        
        <div className="groups-stat-card">
          <div className="groups-stat-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="groups-stat-info">
            <h3>{stats.riskGroups}</h3>
            <p>Группы риска</p>
          </div>
        </div>
        
        <div className="groups-stat-card">
          <div className="groups-stat-icon">
            <i className="fas fa-graduation-cap"></i>
          </div>
          <div className="groups-stat-info">
            <h3>{stats.totalStudents}</h3>
            <p>Всего студентов</p>
          </div>
        </div>
        
        <div className="groups-stat-card">
          <div className="groups-stat-icon">
            <i className="fas fa-percentage"></i>
          </div>
          <div className="groups-stat-info">
            <h3>{stats.socialCoverage}%</h3>
            <p>Социальный охват</p>
          </div>
        </div>
      </div>

      {/* Управление видом */}
      <div className="groups-view-controls">
        <div className="groups-sort-controls">
          <span className="groups-sort-label">Сортировка:</span>
          <select className="groups-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="group">По номеру группы</option>
            <option value="course">По курсу</option>
            <option value="specialty">По специальности</option>
            <option value="students">По количеству студентов</option>
            <option value="attendance">По посещаемости</option>
            <option value="performance">По успеваемости</option>
          </select>
          <button className="groups-sort-order-btn" onClick={toggleSortOrder}>
            <i className={`fas fa-sort-amount-${sortOrder === 'asc' ? 'down' : 'up'}`}></i>
          </button>
        </div>
        
        <div className="groups-view-toggle">
          <button 
            className={`groups-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <i className="fas fa-th-large"></i>
            Сетка
          </button>
          <button 
            className={`groups-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <i className="fas fa-list"></i>
            Список
          </button>
          <button 
            className={`groups-view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            <i className="fas fa-table"></i>
            Таблица
          </button>
        </div>
      </div>

      {/* Контент */}
      <div className="groups-content-section">
        <div className="groups-section-header">
          <h3><i className="fas fa-layer-group"></i> Учебные группы</h3>
          <div className="groups-count">
            Показано: <span>{filteredGroups.length}</span> из <span>{groups.length}</span>
          </div>
        </div>

        {loading ? (
          <div className="groups-empty-state">
            <i className="fas fa-spinner fa-spin"></i>
            <h4>Загрузка групп...</h4>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="groups-empty-state">
            <i className="fas fa-user-friends"></i>
            <h4>Группы не найдены</h4>
            <p>Попробуйте изменить параметры поиска или фильтры</p>
          </div>
        ) : (
          <>
            {/* Сетка */}
            {viewMode === 'grid' && (
              <div className="groups-grid active">
                {filteredGroups.map(renderGroupCard)}
              </div>
            )}

            {/* Таблица */}
            {viewMode === 'table' && (
              <div className="groups-table-container active">
                <table className="groups-table">
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>Группа</th>
                      <th>Специальность</th>
                      <th>Курс</th>
                      <th>Кол-во студентов</th>
                      <th>Посещаемость</th>
                      <th>Успеваемость</th>
                      <th>Соц. категории</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.map(renderTableRow)}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Модальное окно детальной информации */}
      {showGroupDetail && selectedGroup && (
        <div className="groups-modal-overlay" onClick={() => setShowGroupDetail(false)}>
          <div className="groups-modal" onClick={(e) => e.stopPropagation()}>
            <div className="groups-modal-header">
              <h3><i className="fas fa-info-circle"></i> Детальная информация о группе</h3>
              <button className="groups-modal-close" onClick={() => setShowGroupDetail(false)}>
                &times;
              </button>
            </div>
            <div className="groups-modal-body">
              <div className="group-detail-content">
                <div className="group-detail-header">
                  <div className="group-detail-badge">
                    {selectedGroup.number}
                  </div>
                  <div className="group-detail-title">
                    <h2>{selectedGroup.specialty}</h2>
                    <p>{selectedGroup.course} курс • {selectedGroup.studentsCount} студентов • Куратор: {selectedGroup.curator}</p>
                    <div className="group-detail-meta">
                      <div className="group-meta-item">
                        <i className="fas fa-user-tie"></i>
                        <span>Староста: {selectedGroup.headman}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Здесь можно добавить детальную информацию о группе */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};