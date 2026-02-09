import React, { useState, useEffect, useMemo } from 'react';
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
  gender: 'М' | 'Ж';
  birthDate: string;
  address: string;
  phone: string;
  categories: string[];
  risk: 'high' | 'medium' | 'low';
  notes: string;
}

interface CategoryStats {
  name: string;
  count: number;
  percentage: number;
}

interface CourseStats {
  course: number;
  groups: number;
  students: number;
  performance: number;
  attendance: number;
  coverage: number;
}

interface ExtendedStats {
  totalStudents: number;
  totalGroups: number;
  riskGroups: number;
  avgPerformance: number;
  avgAttendance: number;
  byCourse: CourseStats[];
  topCategories: CategoryStats[];
}

export const GroupsSection: React.FC = () => {  
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [showCacheWarning, setShowCacheWarning] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // Данные групп
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
    {
      id: 2,
      number: "2991",
      specialty: "Информационные системы и программирование",
      course: 4,
      studentsCount: 30,
      performance: 82,
      attendance: 90,
      headman: "Козлов М.И.",
      curator: "Сидоров А.В.",
      categories: {
        "Дети-сироты": 1,
        "Дети из многодетных семей": 4,
        "Инвалиды и лица с ОВЗ": 2,
        "Малообеспеченные семьи": 6,
        "Мигранты и беженцы": 1,
        "Студенты в трудной жизненной ситуации": 2,
        "Студенты группы риска": 3,
        "Одаренные дети": 5
      }
    }
  ]);

  // Данные студентов
  const [studentsData] = useState<Record<number, StudentData[]>>({
    1: [
      { id: 1, name: "Смирнов Алексей Петрович", gender: "М", birthDate: "15.03.2003", address: "г. Москва, ул. Ленина, д. 15", phone: "+7 (999) 123-45-67", categories: ["Дети из многодетных семей", "Одаренные дети"], risk: "low", notes: "Отличник, активный в общественной жизни" },
      { id: 2, name: "Иванова Мария Сергеевна", gender: "Ж", birthDate: "22.07.2002", address: "г. Москва, пр. Мира, д. 42", phone: "+7 (999) 234-56-78", categories: ["Малообеспеченные семьи"], risk: "medium", notes: "Требуется материальная помощь" }
    ]
  });

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

  // Состояния
  const [filteredGroups, setFilteredGroups] = useState<GroupData[]>(groups);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('group');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  // Модальные окна
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  const [showGroupDetail, setShowGroupDetail] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [expandedStudents, setExpandedStudents] = useState<Set<number>>(new Set());
  const [studentCategoryFilter, setStudentCategoryFilter] = useState<string>('all');

  // Получение списка специальностей
  const specialties = useMemo(() => 
    Array.from(new Set(groups.map(group => group.specialty))), 
    [groups]
  );

  // Функция для фильтрации студентов по категориям
  const filteredStudentsByCategory = useMemo(() => {
    if (!selectedGroup || selectedCategories.size === 0) {
      return studentsData[selectedGroup?.id || 1] || [];
    }
    
    const students = studentsData[selectedGroup.id] || [];
    return students.filter(student => 
      student.categories.some(cat => selectedCategories.has(cat))
    );
  }, [selectedGroup, selectedCategories]);

  // Функция для обработки клика по категории
  const handleCategoryClick = (category: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(category)) {
      newSelected.delete(category);
    } else {
      newSelected.add(category);
    }
    setSelectedCategories(newSelected);
  };

  // Функция получения цвета категории (синие оттенки)
  const getCategoryColor = (index: number): string => {
    const blueColors = [
      '#001F5C', '#002FA7', '#1A4FBF', '#356FD8',
      '#508FF1', '#6BAFFF', '#86CFFF', '#A1EFFF'
    ];
    return blueColors[index % blueColors.length];
  };

  // Функция получения цвета риска
  const getRiskColor = (risk: 'high' | 'medium' | 'low'): string => {
    switch (risk) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#3b82f6';
    }
  };

  const getRiskText = (risk: 'high' | 'medium' | 'low'): string => {
    switch (risk) {
      case 'high': return 'Высокий риск';
      case 'medium': return 'Средний риск';
      case 'low': return 'Низкий риск';
      default: return 'Не определен';
    }
  };

  // Базовая статистика
  const stats = useMemo(() => {
    const totalStudents = groups.reduce((sum, group) => sum + group.studentsCount, 0);
    const riskGroups = groups.filter(group => group.performance < 70 || group.attendance < 75).length;
    const totalGroups = groups.length;

    let studentsWithCategories = 0;
    groups.forEach(group => {
      const studentsInCategories = Object.values(group.categories).reduce((sum, count) => sum + count, 0);
      studentsWithCategories += studentsInCategories;
    });

    const socialCoverage = Math.round((studentsWithCategories / totalStudents) * 100);
    const avgPerformance = Math.round(groups.reduce((sum, group) => sum + group.performance, 0) / groups.length);
    const avgAttendance = Math.round(groups.reduce((sum, group) => sum + group.attendance, 0) / groups.length);

    // Статистика по курсам
    const byCourse: CourseStats[] = [1, 2, 3, 4].map(course => {
      const courseGroups = groups.filter(g => g.course === course);
      if (courseGroups.length === 0) return null;
      
      const courseStudents = courseGroups.reduce((sum, g) => sum + g.studentsCount, 0);
      const coursePerformance = Math.round(courseGroups.reduce((sum, g) => sum + g.performance, 0) / courseGroups.length);
      const courseAttendance = Math.round(courseGroups.reduce((sum, g) => sum + g.attendance, 0) / courseGroups.length);
      
      const studentsInCategories = courseGroups.reduce((sum, group) => {
        return sum + Object.values(group.categories).reduce((catSum, count) => catSum + count, 0);
      }, 0);
      
      const coverage = Math.round((studentsInCategories / courseStudents) * 100);
      
      return {
        course,
        groups: courseGroups.length,
        students: courseStudents,
        performance: coursePerformance,
        attendance: courseAttendance,
        coverage
      };
    }).filter(Boolean) as CourseStats[];

    // Топ категорий
    const categoryTotals: Record<string, number> = {};
    groups.forEach(group => {
      Object.entries(group.categories).forEach(([cat, count]) => {
        if (count > 0) {
          categoryTotals[cat] = (categoryTotals[cat] || 0) + count;
        }
      });
    });

    const topCategories: CategoryStats[] = Object.entries(categoryTotals)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalStudents) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return { 
      totalStudents, 
      riskGroups, 
      totalGroups, 
      socialCoverage,
      avgPerformance,
      avgAttendance,
      byCourse,
      topCategories
    };
  }, [groups]);

  // Фильтрация и сортировка
  useEffect(() => {
    let result = [...groups];

    // Поиск
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(group =>
        group.number.toLowerCase().includes(term) ||
        group.specialty.toLowerCase().includes(term) ||
        group.curator.toLowerCase().includes(term)
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

    // Фильтр по категории
    if (categoryFilter !== 'all') {
      result = result.filter(group => group.categories[categoryFilter] > 0);
    }

    // Сортировка
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
  }, [groups, searchTerm, courseFilter, specialtyFilter, categoryFilter, sortBy, sortOrder]);

  // Загрузка данных
  const fetchGroups = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      setShowCacheWarning(false);

      if (forceRefresh) setRefreshing(true);

      // Имитация запроса к API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // В реальном приложении здесь будет запрос к API
      setGroups(prev => [...prev]); // Обновляем состояние
      
    } catch (err: any) {
      console.error('Ошибка при загрузке данных групп:', err);
      
      const isNetworkError = 
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Network request failed') ||
        err.message?.includes('Превышено время ожидания') ||
        err.name === 'TypeError';
      
      if (isNetworkError) {
        setIsUsingCache(true);
        setShowCacheWarning(true);
        
        // Пытаемся загрузить данные из кэша
        try {
          const cachedGroups = localStorage.getItem('cache_social_groups');
          if (cachedGroups) {
            const parsedGroups = JSON.parse(cachedGroups);
            setGroups(parsedGroups);
          }
        } catch (cacheError) {
          console.error('Error loading cached groups:', cacheError);
        }
      } else {
        setError('Не удалось загрузить данные групп');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Обработчики
  const handleRefresh = () => {
    fetchGroups(true);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleGroupClick = (group: GroupData) => {
    setSelectedGroup(group);
    setShowGroupDetail(true);
  };

  const toggleStudentDetails = (studentId: number) => {
    const newExpanded = new Set(expandedStudents);
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId);
    } else {
      newExpanded.add(studentId);
    }
    setExpandedStudents(newExpanded);
  };

  // Компонент информационной иконки
  const InfoIcon = () => (
    <div className="info-icon-btn" tabIndex={0}>
      <button className="header-btn" type="button">
        <span className="info-icon-text">i</span>
        <span>Информация</span>
      </button>
      <div className="info-tooltip small">
        <div className="info-tooltip-content">
          <div className="info-header">
            <div className="info-title">
              <h3>Социальные группы</h3>
              <p>Здесь отображаются все учебные группы с социальной статистикой. Вы можете фильтровать их по курсам, специальностям и социальным категориям.</p>
            </div>
          </div>
          
          <div className="info-section">
            <h4>Основные возможности</h4>
            <div className="features-grid">
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Просмотр социальной статистики по группам</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Фильтрация по социальным категориям</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Детальная информация о студентах групп риска</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Просмотр подробной статистики</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h4>Как использовать</h4>
            <div className="usage-steps">
              <div className="step">
                <span className="step-number">1</span>
                <span>Используйте фильтры для поиска нужных групп</span>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <span>Нажмите на группу для просмотра детальной информации</span>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <span>Используйте кнопку "Статистика" для общих показателей</span>
              </div>
              <div className="step">
                <span className="step-number">4</span>
                <span>Обновляйте данные при необходимости</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Компонент кнопки обновления
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

  // Компонент кнопки статистики
  const StatisticsButton = () => (
    <button 
      className="header-btn"
      onClick={() => setShowStatistics(true)}
    >
      <img 
        src="/social-icons/statistics_icon.svg" 
        alt="Статистика"
        style={{ width: '20px', height: '20px' }}
      />
      <span>Статистика</span>
    </button>
  );

  const renderGroupCard = (group: GroupData) => {
    const categoriesCount = Object.values(group.categories).filter(count => count > 0).length;
    const totalStudentsInCategories = Object.values(group.categories).reduce((a, b) => a + b, 0);
    const categoriesPercentage = Math.round((totalStudentsInCategories / group.studentsCount) * 100);
    
    return (
      <div 
        key={group.id} 
        className="sg-group-card"
        onClick={() => handleGroupClick(group)}
      >
        {/* Верхняя часть карточки с номером группы */}
        <div className="sg-card-top">
          <div className="sg-card-group-header">
            <div className="sg-card-group-number">
              <span className="sg-group-number-label">Группа</span>
              <span className="sg-group-number-value">{group.number}</span>
            </div>
            <div className="sg-card-course">
              <span className="sg-course-label">{group.course} курс</span>
            </div>
          </div>
          
          <div className="sg-card-specialty">
            <h4>{group.specialty}</h4>
          </div>
        </div>
        
        {/* Основная информация */}
        <div className="sg-card-main-info">
          <div className="sg-card-students">
            <span className="sg-students-label">Студентов</span>
            <span className="sg-students-value">{group.studentsCount}</span>
          </div>
          
          <div className="sg-card-categories">
            <span className="sg-categories-label">Соц. категорий</span>
            <span className="sg-categories-value">{categoriesCount}</span>
          </div>
        </div>
        
        {/* Показатели */}
        <div className="sg-card-metrics">
          <div className="sg-card-metric">
            <div className="sg-metric-header">
              <span className="sg-metric-label">Посещаемость</span>
              <span className="sg-metric-value">{group.attendance}%</span>
            </div>
            <div className="sg-metric-progress">
              <div 
                className="sg-metric-progress-fill" 
                style={{ width: `${group.attendance}%`, background: '#002FA7' }}
              ></div>
            </div>
          </div>
          
          <div className="sg-card-metric">
            <div className="sg-metric-header">
              <span className="sg-metric-label">Успеваемость</span>
              <span className="sg-metric-value">{group.performance}%</span>
            </div>
            <div className="sg-metric-progress">
              <div 
                className="sg-metric-progress-fill" 
                style={{ width: `${group.performance}%`, background: '#002FA7' }}
              ></div>
            </div>
          </div>
        </div>
        
        {/* Куратор и староста */}
        <div className="sg-card-responsible">
          <div className="sg-responsible-item">
            <span className="sg-responsible-label">Староста</span>
            <span className="sg-responsible-value">{group.headman}</span>
          </div>
          <div className="sg-responsible-item">
            <span className="sg-responsible-label">Куратор</span>
            <span className="sg-responsible-value">{group.curator}</span>
          </div>
        </div>
      </div>
    );
  };

  // Рендер элемента списка
   const renderGroupListItem = (group: GroupData, index: number) => {
    const categoriesCount = Object.values(group.categories).filter(count => count > 0).length;
    
    return (
      <div 
        key={group.id} 
        className="sg-group-list-item"
        onClick={() => handleGroupClick(group)}
      >        
        <div className="sg-list-main">
          <div className="sg-list-header">
            <div className="sg-list-group-info">
              <span className="sg-list-group-number">{group.number}</span>
              <span className="sg-list-course-badge">{group.course} курс</span>
            </div>
            <div className="sg-list-specialty">{group.specialty}</div>
          </div>
          
          <div className="sg-list-details">
            <div className="sg-list-detail">
              <span className="sg-detail-label">Студентов:</span>
              <span className="sg-detail-value">{group.studentsCount}</span>
            </div>
            <div className="sg-list-detail">
              <span className="sg-detail-label">Категорий:</span>
              <span className="sg-detail-value">{categoriesCount}</span>
            </div>
          </div>
        </div>
        
        <div className="sg-list-metrics">
          <div className="sg-list-metric">
            <div className="sg-list-metric-header">
              <span>Посещаемость</span>
              <span>{group.attendance}%</span>
            </div>
            <div className="sg-list-progress">
              <div 
                className="sg-list-progress-fill" 
                style={{ width: `${group.attendance}%`, background: '#002FA7' }}
              ></div>
            </div>
          </div>
          
          <div className="sg-list-metric">
            <div className="sg-list-metric-header">
              <span>Успеваемость</span>
              <span>{group.performance}%</span>
            </div>
            <div className="sg-list-progress">
              <div 
                className="sg-list-progress-fill" 
                style={{ width: `${group.performance}%`, background: '#002FA7' }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Компонент графика для статистики
  const StatChart = ({ title, value, max = 100, color = '#002FA7' }: { title: string; value: number; max?: number; color?: string }) => {
    const percentage = (value / max) * 100;
    
    return (
      <div className="stat-chart">
        <div className="stat-chart-header">
          <span className="stat-chart-title">{title}</span>
          <span className="stat-chart-value">{value}%</span>
        </div>
        <div className="stat-chart-bar">
          <div 
            className="stat-chart-fill" 
            style={{ width: `${percentage}%`, background: color }}
          ></div>
        </div>
      </div>
    );
  };

  // Компонент круговой диаграммы
  const PieChart = ({ title, data, colors, total }: { title: string; data: { label: string; value: number }[]; colors: string[]; total: number }) => {
    let accumulatedAngle = 0;
    
    return (
      <div className="pie-chart-container">
        <div className="pie-chart-header">
          <h4 className="pie-chart-title">{title}</h4>
          <div className="pie-chart-total">
            <span className="pie-total-value">{total}</span>
            <span className="pie-total-label">Всего студентов</span>
          </div>
        </div>
        <div className="pie-chart-wrapper">
          <svg className="pie-chart" viewBox="0 0 100 100">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const angle = (percentage / 100) * 360;
              const x1 = 50 + 40 * Math.cos((accumulatedAngle * Math.PI) / 180);
              const y1 = 50 + 40 * Math.sin((accumulatedAngle * Math.PI) / 180);
              const x2 = 50 + 40 * Math.cos(((accumulatedAngle + angle) * Math.PI) / 180);
              const y2 = 50 + 40 * Math.sin(((accumulatedAngle + angle) * Math.PI) / 180);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              const pathData = [
                `M 50 50`,
                `L ${x1} ${y1}`,
                `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                `L 50 50`
              ].join(' ');
              
              accumulatedAngle += angle;
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke="#fff"
                  strokeWidth="0.5"
                />
              );
            })}
          </svg>
        </div>
        <div className="pie-chart-legend">
          {data.map((item, index) => (
            <div key={index} className="pie-legend-item">
              <div 
                className="pie-legend-color" 
                style={{ background: colors[index % colors.length] }}
              ></div>
              <span className="pie-legend-label">{item.label}</span>
              <span className="pie-legend-value">{item.value} ({Math.round((item.value / total) * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Компонент линейного графика
  const LineChart = ({ title, data, color = '#002FA7' }: { title: string; data: { label: string; value: number }[]; color?: string }) => {
    const maxValue = Math.max(...data.map(d => d.value), 100);
    
    return (
      <div className="line-chart-container">
        <h4 className="line-chart-title">{title}</h4>
        <div className="line-chart-wrapper">
          <svg className="line-chart" viewBox="0 0 100 50">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((y, i) => (
              <line
                key={i}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
            ))}
            
            {/* Data line */}
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2"
              points={data.map((d, i) => {
                const x = (i / (data.length - 1)) * 100;
                const y = 100 - (d.value / maxValue) * 100;
                return `${x},${y}`;
              }).join(' ')}
            />
            
            {/* Data points */}
            {data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 100 - (d.value / maxValue) * 100;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="2"
                  fill={color}
                  stroke="#fff"
                  strokeWidth="1"
                />
              );
            })}
          </svg>
        </div>
        <div className="line-chart-labels">
          {data.map((d, i) => (
            <div key={i} className="line-chart-label">
              <span>{d.label}</span>
              <span className="line-chart-value">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Рендер статистики в модальном окне
  const renderStatisticsModal = () => {
    // Подготовка данных для графиков
    const performanceByCourse = stats.byCourse.map(course => ({
      label: `${course.course} курс`,
      value: course.performance
    }));

    const attendanceByCourse = stats.byCourse.map(course => ({
      label: `${course.course} курс`,
      value: course.attendance
    }));

    const categoryDistribution = stats.topCategories.map((cat, index) => ({
      label: cat.name,
      value: cat.count
    }));

    const blueColors = [
      '#001F5C', '#002FA7', '#1A4FBF', '#356FD8',
      '#508FF1', '#6BAFFF', '#86CFFF', '#A1EFFF'
    ];

    return (
      <div className="pc-modal-overlay" onClick={() => setShowStatistics(false)}>
        <div className="pc-modal pc-modal-lg" onClick={(e) => e.stopPropagation()}>
          <div className="pc-modal-header">
            <div className="pc-modal-header-content">
              <div className="pc-modal-icon">
                <img src="/social-icons/statistics_icon.svg" alt="Статистика" />
              </div>
              <div>
                <h3>Статистика социального сопровождения</h3>
                <p className="pc-modal-subtitle">Обзор ключевых показателей и тенденций</p>
              </div>
            </div>
            <button 
              className="pc-modal-close"
              onClick={() => setShowStatistics(false)}
            >
              ×
            </button>
          </div>

          <div className="pc-modal-content">
            <div className="sg-stats-overview">
              <div className="sg-stats-grid">
                <div className="sg-stat-card-lg">
                  <div className="sg-stat-icon-lg">
                    <img src="/social-icons/all_groups_icon.svg" alt="Группы" />
                  </div>
                  <div className="sg-stat-info-lg">
                    <h3>{stats.totalGroups}</h3>
                    <p>Всего групп</p>
                  </div>
                </div>
                
                <div className="sg-stat-card-lg">
                  <div className="sg-stat-icon-lg">
                    <img src="/social-icons/students_icon.svg" alt="Студенты" />
                  </div>
                  <div className="sg-stat-info-lg">
                    <h3>{stats.totalStudents}</h3>
                    <p>Всего студентов</p>
                  </div>
                </div>
                
                <div className="sg-stat-card-lg">
                  <div className="sg-stat-icon-lg">
                    <img src="/social-icons/warning_icon.svg" alt="Риск" />
                  </div>
                  <div className="sg-stat-info-lg">
                    <h3>{stats.riskGroups}</h3>
                    <p>Группы риска</p>
                  </div>
                </div> 
              </div>

              <div className="sg-stats-section">
                <div className="sg-section-header">
                  <h4><img src="/social-icons/performance_icon.svg" alt="Успеваемость" className='sg-performance-icon' /> Ключевые показатели</h4>
                  <span className="sg-section-subtitle">Средние значения по всем группам</span>
                </div>
                <div className="sg-key-metrics-grid">
                  <div className="sg-key-metric">
                    <StatChart value={stats.avgPerformance} title="Средняя успеваемость" color="#002FA7" />
                  </div>
                  
                  <div className="sg-key-metric">
                    <StatChart value={stats.avgAttendance} title="Средняя посещаемость" color="#1A4FBF" />
                  </div>
                </div>
              </div>

              <div className="sg-stats-section">
                <div className="sg-section-header">
                  <h4><img src="/social-icons/trend_icon.svg" alt="Тренды" className='sg-performance-icon'/> Динамика по курсам</h4>
                  <span className="sg-section-subtitle">Сравнение показателей по курсам обучения</span>
                </div>
                <div className="sg-charts-grid">
                  <div className="sg-chart-container">
                    <LineChart 
                      title="Успеваемость по курсам" 
                      data={performanceByCourse}
                      color="#002FA7"
                    />
                  </div>
                  <div className="sg-chart-container">
                    <LineChart 
                      title="Посещаемость по курсам" 
                      data={attendanceByCourse}
                      color="#1A4FBF"
                    />
                  </div>
                </div>
              </div>

              <div className="sg-stats-section">
                <div className="sg-section-header">
                  <h4><img src="/social-icons/distribution_icon.svg" alt="Распределение" className='sg-performance-icon'/> Распределение по социальным категориям</h4>
                  <span className="sg-section-subtitle">Количественное распределение студентов по категориям</span>
                </div>
                <div className="sg-pie-chart-container">
                  <PieChart 
                    title="Социальные категории" 
                    data={categoryDistribution}
                    colors={blueColors}
                    total={stats.totalStudents}
                  />
                </div>
              </div>

              <div className="sg-stats-section">
                <div className="sg-section-header">
                  <h4><img src="/social-icons/courses_icon.svg" alt="Курсы" className='sg-performance-icon'/> Детальная статистика по курсам</h4>
                  <span className="sg-section-subtitle">Подробные показатели для каждого курса</span>
                </div>
                <div className="sg-courses-detailed">
                  {stats.byCourse.map(courseStat => (
                    <div key={courseStat.course} className="sg-course-detailed">
                      <div className="sg-course-detailed-header">
                        <div className="sg-course-title">
                          <h5>{courseStat.course} курс</h5>
                          <span className="sg-course-subtitle">{courseStat.groups} групп • {courseStat.students} студентов</span>
                        </div>
                        <div className="sg-course-coverage">
                          <span>Охват</span>
                          <span className="sg-coverage-value">{courseStat.coverage}%</span>
                        </div>
                      </div>
                      <div className="sg-course-metrics">
                        <div className="sg-course-metric">
                          <span>Успеваемость</span>
                          <div className="sg-progress-group">
                            <div className="sg-progress-bar">
                              <div 
                                className="sg-progress-fill" 
                                style={{ width: `${courseStat.performance}%`, background: '#002FA7' }}
                              ></div>
                            </div>
                            <span className="sg-percent">{courseStat.performance}%</span>
                          </div>
                        </div>
                        <div className="sg-course-metric">
                          <span>Посещаемость</span>
                          <div className="sg-progress-group">
                            <div className="sg-progress-bar">
                              <div 
                                className="sg-progress-fill" 
                                style={{ width: `${courseStat.attendance}%`, background: '#1A4FBF' }}
                              ></div>
                            </div>
                            <span className="sg-percent">{courseStat.attendance}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pc-modal-actions">
              <button
                className="pc-btn-secondary"
                onClick={() => setShowStatistics(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Рендер детальной информации о группе
 const renderGroupDetailModal = () => {
    if (!selectedGroup) return null;

    const totalCategories = Object.values(selectedGroup.categories).filter(count => count > 0).length;
    const totalStudentsInCategories = Object.values(selectedGroup.categories).reduce((a, b) => a + b, 0);
    const categoriesPercentage = Math.round((totalStudentsInCategories / selectedGroup.studentsCount) * 100);
    
    // Используем отфильтрованных студентов
    const filteredStudents = selectedCategories.size > 0 
      ? filteredStudentsByCategory 
      : studentsData[selectedGroup.id] || [];

    return (
      <div className="pc-modal-overlay" onClick={() => {
        setShowGroupDetail(false);
        setSelectedCategories(new Set()); // Сбрасываем фильтр при закрытии
      }}>
        <div className="pc-modal pc-modal-xl" onClick={(e) => e.stopPropagation()}>
          <div className="pc-modal-header">
            <div className="pc-modal-header-content">
              <div className="pc-modal-icon">
                  <img src="/social-icons/all_groups_icon.svg" alt="Группа"/>
              </div>
              <div>
                <h3>Группа {selectedGroup.number}</h3>
                <p className="pc-modal-subtitle">{selectedGroup.specialty} • {selectedGroup.course} курс</p>
              </div>
            </div>
            <button 
              className="pc-modal-close"
              onClick={() => {
                setShowGroupDetail(false);
                setSelectedCategories(new Set());
              }}
            >
              ×
            </button>
          </div>

          <div className="pc-modal-content">
            <div className="sg-group-detail-info">

              <div className="sg-group-details-grid">
                <div className="sg-responsible-section">
                  <h4><img src="/social-icons/responsible_icon.svg" alt="Ответственные" className='sg-performance-icon'/> Ответственные</h4>
                  <div className="sg-responsible-cards">
                    <div className="sg-responsible-card">
                      <div className="sg-responsible-info">
                        <h5>Староста группы</h5>
                        <p className="sg-responsible-name">{selectedGroup.headman}</p>
                        <p className="sg-responsible-role">Староста</p>
                      </div>
                    </div>
                    <div className="sg-responsible-card">
                      <div className="sg-responsible-info">
                        <h5>Куратор группы</h5>
                        <p className="sg-responsible-name">{selectedGroup.curator}</p>
                        <p className="sg-responsible-role">Куратор</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sg-performance-section">
                  <h4><img src="/social-icons/performance_icon.svg" alt="Показатели" className='sg-performance-icon'/> Ключевые показатели</h4>
                  <div className="sg-performance-cards">
                    <div className="sg-performance-card">
                      <div className="sg-performance-header">
                        <span>Успеваемость</span>
                        <span className="sg-performance-value">{selectedGroup.performance}%</span>
                      </div>
                      <div className="sg-progress-bar-lg">
                        <div 
                          className="sg-progress-fill-lg" 
                          style={{ width: `${selectedGroup.performance}%`, background: '#002FA7' }}
                        ></div>
                      </div>
                    </div>
                    <div className="sg-performance-card">
                      <div className="sg-performance-header">
                        <span>Посещаемость</span>
                        <span className="sg-performance-value">{selectedGroup.attendance}%</span>
                      </div>
                      <div className="sg-progress-bar-lg">
                        <div 
                          className="sg-progress-fill-lg" 
                          style={{ width: `${selectedGroup.attendance}%`, background: '#1A4FBF' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sg-group-section">
                <div className="sg-section-header">
                  <h4><img src="/social-icons/categories_icon.svg" alt="Категории" className='sg-performance-icon'/> Социальные категории</h4>
                  <span className="sg-section-subtitle">
                    {selectedCategories.size > 0 
                      ? `Выбрано категорий: ${selectedCategories.size}`
                      : 'Нажмите на категорию для фильтрации студентов'}
                  </span>
                </div>

                
                <div className="sg-categories-detailed">
                  {Object.entries(selectedGroup.categories)
                    .filter(([_, count]) => count > 0)
                    .map(([cat, count], index) => {
                      const percentage = Math.round((count / selectedGroup.studentsCount) * 100);
                      const isSelected = selectedCategories.has(cat);
                      
                      return (
                        <div 
                          key={cat} 
                          className={`sg-category-detailed ${isSelected ? 'sg-category-selected' : ''}`}
                          onClick={() => handleCategoryClick(cat)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="sg-category-header">
                            <div 
                              className="sg-category-color" 
                              style={{ 
                                background: getCategoryColor(index),
                                border: isSelected ? '2px solid white' : 'none',
                                boxShadow: isSelected ? '0 0 0 2px #002FA7' : 'none'
                              }}
                            >
                              {isSelected && (
                                <span className="sg-category-check">✓</span>
                              )}
                            </div>
                            <span className="sg-category-name">{cat}</span>
                            <span className="sg-category-count">{count} студентов</span>
                          </div>
                          <div className="sg-progress-group">
                            <div className="sg-progress-bar">
                              <div 
                                className="sg-progress-fill" 
                                style={{ width: `${percentage}%`, background: getCategoryColor(index) }}
                              ></div>
                            </div>
                            <span className="sg-percent">{percentage}%</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="sg-group-section">
                <div className="sg-section-header">
                  <div>
                    <h4><img src="/social-icons/courses_icon.svg" alt="Студенты" className='sg-performance-icon'/> Студенты группы</h4>
                    <span className="sg-section-subtitle">
                      {selectedCategories.size > 0 
                        ? `Показаны студенты из выбранных категорий: ${filteredStudents.length} из ${studentsData[selectedGroup.id]?.length || 0}`
                        : 'Список студентов с информацией о социальных категориях'}
                    </span>
                  </div>
                  {/* Убираем старый селект фильтрации */}
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="sg-empty-state">
                    <p>
                      {selectedCategories.size > 0 
                        ? 'Студенты не найдены в выбранных категориях'
                        : 'Студенты не найдены'
                      }
                    </p>
                    {selectedCategories.size > 0 && (
                      <button 
                        className="sg-clear-filter-btn"
                        onClick={() => setSelectedCategories(new Set())}
                      >
                        Сбросить фильтр
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="sg-students-list-compact">
                    {filteredStudents.map(student => {
                      const isExpanded = expandedStudents.has(student.id);
                      
                      return (
                        <div key={student.id} className="sg-student-card-compact">
                          <div 
                            className="sg-student-card-border"
                            style={{ borderLeft: `4px solid ${getRiskColor(student.risk)}` }}
                          >
                            <div className="sg-student-main-info">
                              <div className="sg-student-basic">
                                <h5>{student.name}</h5>
                                <div className="sg-student-meta">
                                  <span className="sg-student-gender">{student.gender}</span>
                                  <span className="sg-student-divider">•</span>
                                  <span className="sg-student-birth">{student.birthDate}</span>
                                  <span className="sg-student-divider">•</span>
                                  <span className="sg-student-phone">{student.phone}</span>
                                </div>
                              </div>
                              <div className="sg-student-actions-compact">
                                <span 
                                  className={`sg-risk-label-compact sg-risk-${student.risk}`}
                                  style={{ background: getRiskColor(student.risk) }}
                                >
                                  {getRiskText(student.risk)}
                                </span>
                                <button 
                                  className="sg-toggle-details-compact"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStudentDetails(student.id);
                                  }}
                                >
                                  {isExpanded ? 'Скрыть' : 'Подробнее'}
                                </button>
                              </div>
                            </div>
                            
                            <div className="sg-student-categories-compact">
                              {student.categories.map((cat, index) => {
                                const isSelected = selectedCategories.has(cat);
                                return (
                                  <span 
                                    key={cat} 
                                    className={`sg-student-category-compact ${isSelected ? 'sg-student-category-selected' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCategoryClick(cat);
                                    }}
                                    style={{ 
                                      background: getCategoryColor(socialCategories.indexOf(cat)),
                                      color: socialCategories.indexOf(cat) < 4 ? 'white' : '#002FA7',
                                      border: isSelected ? '2px solid white' : 'none',
                                      boxShadow: isSelected ? '0 0 0 2px #002FA7' : 'none'
                                    }}
                                  >
                                    {cat}
                                  </span>
                                );
                              })}
                            </div>

                            {isExpanded && (
                              <div className="sg-student-details-compact">
                                <div className="sg-details-grid">
                                  <div className="sg-detail-row">
                                    <span className="sg-detail-label">Адрес:</span>
                                    <span className="sg-detail-value">{student.address}</span>
                                  </div>
                                  <div className="sg-detail-row">
                                    <span className="sg-detail-label">Примечания:</span>
                                    <span className="sg-detail-value">{student.notes}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="pc-modal-actions">
              <button
                className="pc-btn-secondary"
                onClick={() => {
                  setShowGroupDetail(false);
                  setSelectedCategories(new Set());
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    fetchGroups();
  }, []);

   return (
    <div className="sg-groups-section">
      {/* Заголовок с кнопками */}
      <div className="sg-cabinet-header">
        <InfoIcon />
        <div className="sg-header-actions">
          <StatisticsButton />
          <RefreshButton />
        </div>
      </div>

      {showCacheWarning && (
        <div className="sg-cache-warning">
          <span>Используются кэшированные данные. Обновите данные для получения актуальной информации.</span>
        </div>
      )}

      {error && (
        <div className="sg-error-message">
          <span>{error}</span>
        </div>
      )}

      {/* Обновленная панель управления с улучшенным расположением */}
      <div className="sg-control-panel-enhanced">
        <div className="sg-controls-top-row">
          <div className="sg-search-box-enhanced">
            <input
              type="text"
              placeholder="Поиск по номеру группы, специальности или куратору..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sg-search-input-enhanced"
            />
            <div className="sg-search-icon">
              <img src="/social-icons/search_icon.svg" alt="Поиск" />
            </div>
          </div>
          
          <div className="sg-view-toggle">
            <button 
              className={`sg-view-btn ${viewMode === 'cards' ? 'sg-view-active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Карточки"
            >
              <img src="/social-icons/cards_icon.svg" alt="Карточки" />
              <span>Карточки</span>
            </button>
            <button 
              className={`sg-view-btn ${viewMode === 'list' ? 'sg-view-active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Список"
            >
              <img src="/social-icons/list_icon.svg" alt="Список" />
              <span>Список</span>
            </button>
          </div>
        </div>

        <div className="sg-controls-middle-row">
          <div className="sg-filters-grid">
            <div className="sg-filter-group sg-course-filter">
              <label className="sg-filter-label">Курс</label>
              <select 
                className="sg-filter-select-enhanced sg-course-select" 
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
            
            <div className="sg-filter-group sg-specialty-filter">
              <label className="sg-filter-label">Специальность</label>
              <select 
                className="sg-filter-select-enhanced sg-specialty-select" 
                value={specialtyFilter} 
                onChange={(e) => setSpecialtyFilter(e.target.value)}
              >
                <option value="all">Все специальности</option>
                {specialties.map(specialty => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>
            </div>
            
            <div className="sg-filter-group sg-category-filter">
              <label className="sg-filter-label">Категория</label>
              <select 
                className="sg-filter-select-enhanced sg-category-select" 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Все категории</option>
                {socialCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="sg-controls-bottom-row">
          <div className="sg-sort-controls-enhanced">
            <div className="sg-sort-group">
              <label className="sg-sort-label">Сортировка:</label>
              <select 
                className="sg-filter-select-enhanced sg-sort-select" 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="group">По номеру группы</option>
                <option value="course">По курсу</option>
                <option value="specialty">По специальности</option>
                <option value="students">По количеству студентов</option>
                <option value="attendance">По посещаемости</option>
                <option value="performance">По успеваемости</option>
              </select>
              <div className="sg-sort-buttons">
                <button 
                  className="sg-sort-order-btn"
                  onClick={toggleSortOrder}
                  title={sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
                >
                  <img className="sg-sort-order-icon"
                    src={sortOrder === 'asc' ? "/social-icons/sort_asc_icon.svg" : "/social-icons/sort_desc_icon.svg"} 
                    alt="Направление сортировки" 
                  />
                  <span>{sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Карточки статистики */}
      <div className="sg-stats-cards">
        <div className="sg-stat-card">
          <div className="sg-stat-icon">
            <img src="/social-icons/all_groups_icon.svg" alt="Группы" />
          </div>
          <div className="sg-stat-info">
            <h3>{stats.totalGroups}</h3>
            <p>Всего групп</p>
          </div>
        </div>
        
        <div className="sg-stat-card">
          <div className="sg-stat-icon">
            <img src="/social-icons/students_icon.svg" alt="Студенты" />
          </div>
          <div className="sg-stat-info">
            <h3>{stats.totalStudents}</h3>
            <p>Всего студентов</p>
          </div>
        </div>
        
        <div className="sg-stat-card">
          <div className="sg-stat-icon">
            <img src="/social-icons/warning_icon.svg" alt="Риск" />
          </div>
          <div className="sg-stat-info">
            <h3>{stats.riskGroups}</h3>
            <p>Группы риска</p>
          </div>
        </div>
      </div>

      {/* Контент с группами */}
      <div className="sg-content-section">
        <div className="sg-section-header">
          <h3>Учебные группы</h3>
          <div className="sg-groups-count">
            <img src="/social-icons/filter_icon.svg" alt="Фильтр" />
            <span>Показано: <strong>{filteredGroups.length}</strong> из <strong>{groups.length}</strong></span>
          </div>
        </div>

        {loading ? (
          <div className="sg-loading">
            <div className="sg-loading-spinner"></div>
            <p>Загрузка групп...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="sg-empty-state">
            <p>Группы не найдены</p>
            <p className="sg-empty-subtitle">Попробуйте изменить параметры поиска или фильтры</p>
          </div>
        ) : (
          <>
            {/* Карточки */}
            {viewMode === 'cards' && (
              <div className="sg-groups-cards-container">
                <div className="sg-groups-cards">
                  {filteredGroups.map((group) => renderGroupCard(group))}
                </div>
              </div>
            )}

            {/* Список */}
            {viewMode === 'list' && (
              <div className="sg-groups-list-container">
                <div className="sg-groups-list">
                  {filteredGroups.map((group, index) => renderGroupListItem(group, index))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Модальное окно детальной информации о группе */}
      {showGroupDetail && renderGroupDetailModal()}

      {/* Модальное окно статистики */}
      {showStatistics && renderStatisticsModal()}
    </div>
  );
};