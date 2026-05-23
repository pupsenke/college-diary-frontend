import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { HeaderDepartmentHead } from '../dh-components/HeaderDepartmentHead';
import { GroupDetailSection } from '../dh-components/GroupDetailSection';
import { AddGroupModal } from '../dh-components/AddGroupModal';
import { headApiService, StudentInfo } from '../services/headApiService';
import { SummaryStatementSection } from '../dh-components/SummaryStatementSection';
import { ScholarshipSection } from '../dh-components/ScholarshipSection';
import { DepartmentGroupsList } from '../dh-components/DepartmentGroupsList';
import { cacheService } from '../services/cacheService';
import { CACHE_TTL } from '../services/cacheConstants';
import './DepartmentHeadPageStyle.css';
import { DepartmentScholarshipSection } from '../dh-components/DepartmentScholarshipSection';
import { SessionAttestationSection } from '../dh-components/SessionAttestationSection';
import { PersonalCabinetSection } from '../dh-components/PersonalCabinetSection';

interface GroupData {
  id: number;
  name: string;
  numberGroup: number;
  course: number;
  students: number;
  curator: string;
  curatorId: number;
  leader: string;
  speciality: string;
  profile: string;
  averageGrade?: number;
  attendance?: number;
}

type DetailTabType = 'group' | 'scholarship' | 'session' | 'summary' | 'departmentGroups' | 'personalCabinet';
type LeftPanelView = 'department' | 'groups';

// Хук для кешированных данных
function useCachedFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttl: number,
  dependencies: React.DependencyList = []
): { data: T | null; loading: boolean; error: string | null; fromCache: boolean; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchData = useCallback(async (ignoreCache = false) => {
    setLoading(true);
    setError(null);

    try {
      if (!ignoreCache && !cacheService.isNetworkOnline()) {
        const cached = cacheService.get<T>(cacheKey, { ttl });
        if (cached) {
          setData(cached);
          setFromCache(true);
          setError('Нет подключения к интернету. Показаны кэшированные данные.');
          setLoading(false);
          return;
        }
        throw new Error('Нет подключения к интернету и отсутствуют кэшированные данные');
      }

      const result = await cacheService.getWithFallback(cacheKey, fetchFn, { ttl });
      setData(result.data);
      setFromCache(result.fromCache);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      const cached = cacheService.get<T>(cacheKey, { ttl });
      if (cached) {
        setData(cached);
        setFromCache(true);
        setError('Используются кэшированные данные из-за ошибки загрузки');
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetchFn, ttl]);

  const refetch = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  return { data, loading, error, fromCache, refetch };
}

export const DepartmentHeadPage: React.FC = () => {
  const { user } = useUser();
  const [academicGroups, setAcademicGroups] = useState<GroupData[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTabType>('departmentGroups');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);
  const [leftPanelView, setLeftPanelView] = useState<LeftPanelView>('department');
  const [showDepartmentGroups, setShowDepartmentGroups] = useState(true);
  const [selectedDepartmentGroupId, setSelectedDepartmentGroupId] = useState<number | null>(null);
  const [activeDepartmentTab, setActiveDepartmentTab] = useState<'groups' | 'scholarship' | 'personal'>('groups');
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [usingCache, setUsingCache] = useState(false);
  const [showPersonalCabinet, setShowPersonalCabinet] = useState(false);

  useEffect(() => {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      setOnlineStatus(isOnline);
      if (!isOnline) {
        setUsingCache(true);
      } else {
        setUsingCache(false);
      }
    };

    const unsubscribe = cacheService.onNetworkChange((isOnline) => {
      setOnlineStatus(isOnline);
      setUsingCache(!isOnline);
    });

    updateOnlineStatus();

    return () => {
      unsubscribe();
    };
  }, []);

  const loadGroups = useCallback(async () => {
    const groups = await headApiService.getGroups();
    
    const filteredGroups = groups.filter(group => 
      group.specialty === "09.02.07 Информационные системы и программирование"
    );
    
    const formattedGroups: GroupData[] = [];
    
    for (const group of filteredGroups) {
      try {
        let curatorName = 'Не указан';
        try {
          const curator = await headApiService.getCurator(group.idCurator);
          curatorName = `${curator.lastName} ${curator.name.charAt(0)}.${curator.patronymic ? curator.patronymic.charAt(0) + '.' : ''}`;
        } catch (curatorError) {
          console.error(`Ошибка при загрузке куратора для группы ${group.id}:`, curatorError);
        }
        
        let studentsCount = 0;
        
        try {
          const students = await headApiService.getGroupStudents(group.id);
          studentsCount = students.length;
        } catch (studentsError) {
          console.error(`Ошибка при загрузке студентов для группы ${group.id}:`, studentsError);
        }
        
        const groupAverageGrade = 111111;
        const groupAttendance = 1111;
        
        formattedGroups.push({
          id: group.id,
          name: group.numberGroup.toString(),
          numberGroup: group.numberGroup,
          course: group.course,
          students: studentsCount,
          curator: curatorName,
          curatorId: group.idCurator,
          leader: 'Не указан',
          speciality: group.specialty,
          profile: group.profile,
          averageGrade: groupAverageGrade,
          attendance: groupAttendance
        });
      } catch (error) {
        console.error(`Ошибка при обработке группы ${group.id}:`, error);
      }
    }
    
    formattedGroups.sort((a, b) => {
      if (a.course !== b.course) {
        return a.course - b.course;
      }
      return a.numberGroup - b.numberGroup;
    });
    
    return formattedGroups;
  }, []);

  const { 
    data: cachedGroups, 
    loading: groupsLoading, 
    error: groupsError,
    fromCache: groupsFromCache
  } = useCachedFetch(
    'department_groups',
    loadGroups,
    CACHE_TTL.GROUP_DATA,
    []
  );

  useEffect(() => {
    if (cachedGroups) {
      setAcademicGroups(cachedGroups);
    }
    setLoading(groupsLoading);
    if (groupsError) {
      setError(groupsError);
    } else {
      setError(null);
    }
    if (groupsFromCache) {
      setUsingCache(true);
    }
  }, [cachedGroups, groupsLoading, groupsError, groupsFromCache]);

  const loadDepartmentInfo = useCallback(async () => {
    try {
      const groups = await headApiService.getGroups();
      
      const filteredGroups = groups.filter(group => 
        group.specialty === "09.02.07 Информационные системы и программирование"
      );
      
      console.log('Фильтрованные группы:', filteredGroups.map(g => ({ id: g.id, number: g.numberGroup, specialty: g.specialty })));
      
      let totalStudents = 0;
      const groupStudentsPromises = filteredGroups.map(async (group) => {
        try {
          const students = await headApiService.getGroupStudents(group.id);
          console.log(`Группа ${group.numberGroup}: ${students.length} студентов`);
          return students.length;
        } catch (err) {
          console.error(`Ошибка загрузки студентов для группы ${group.id}:`, err);
          return 0;
        }
      });
      
      const studentsCounts = await Promise.all(groupStudentsPromises);
      totalStudents = studentsCounts.reduce((sum, count) => sum + count, 0);
      
      // **НОВЫЙ ЗАПРОС: получаем средний балл и посещаемость по отделению**
      let averagePerformance = 4.33; // значение по умолчанию
      let averageAttendance = 77; // значение по умолчанию
      
      try {
        const overallStats = await headApiService.getOverallStats();
        averagePerformance = overallStats.averageGrade;
        averageAttendance = overallStats.attendancePercentage;
        console.log('Получена общая статистика:', overallStats);
      } catch (statsError) {
        console.error('Ошибка при получении общей статистики:', statsError);
        // Используем значения по умолчанию
      }
      
      const departmentData = {
        totalGroups: filteredGroups.length,
        totalStudents: totalStudents,
        name: 'Отделение |||',
        specialities: ['09.02.07 Информационные системы и программирование'],
        totalTeachers: 24,
        averagePerformance: averagePerformance,
        averageAttendance: averageAttendance
      };
      
      console.log('Информация об отделении:', departmentData);
      return departmentData;
    } catch (error) {
      console.error('Ошибка при загрузке информации об отделении:', error);
      throw error;
    }
  }, []);

  const { 
    data: departmentInfo, 
    loading: departmentLoading,
    fromCache: deptFromCache
  } = useCachedFetch(
    'department_info',
    loadDepartmentInfo,
    CACHE_TTL.DEPARTMENT_INFO,
    [cachedGroups]
  );

  const loadDepartmentScholarships = useCallback(async () => {
    const groups = academicGroups.length > 0 ? academicGroups : cachedGroups || [];
    let totalStudents = 0;
    let excellentCount = 0;
    let goodExcellentCount = 0;
    let goodCount = 0;
    let noneCount = 0;
    let totalAmount = 0;

    for (const group of groups) {
      const students = await headApiService.getGroupStudents(group.id);
      totalStudents += students.length;
      
      for (const student of students) {
        const avgGrade = Math.random() * 2 + 3;
        
        if (avgGrade >= 4.8) {
          excellentCount++;
          totalAmount += 3500;
        } else if (avgGrade >= 4.0) {
          goodExcellentCount++;
          totalAmount += 2500;
        } else if (avgGrade >= 3.5) {
          goodCount++;
          totalAmount += 1800;
        } else {
          noneCount++;
        }
      }
    }

    return {
      totalStudents,
      excellentCount,
      goodExcellentCount,
      goodCount,
      noneCount,
      totalAmount,
      averageAmount: totalStudents > 0 ? totalAmount / totalStudents : 0
    };
  }, [academicGroups, cachedGroups]);

  const { 
    data: departmentScholarships,
    fromCache: scholarshipsFromCache
  } = useCachedFetch(
    'department_scholarships',
    loadDepartmentScholarships,
    CACHE_TTL.DEPARTMENT_SCHOLARSHIPS,
    [academicGroups]
  );

  const handleAddGroup = async (groupNumber: string) => {
    try {
      await headApiService.addGroup(groupNumber);
      cacheService.remove('department_groups');
      cacheService.remove('department_info');
      cacheService.remove('department_scholarships');
      window.location.reload();
    } catch (error) {
      console.error('Ошибка при добавлении группы:', error);
      return Promise.reject(error);
    }
  };

  const filteredGroups = academicGroups.filter(group => {
    const matchesSearch = 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.curator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.speciality.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.profile.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourse = selectedCourse === 'all' || group.course === selectedCourse;
    
    return matchesSearch && matchesCourse;
  });

  const groupsByCourse = {
    1: filteredGroups.filter(g => g.course === 1),
    2: filteredGroups.filter(g => g.course === 2),
    3: filteredGroups.filter(g => g.course === 3),
    4: filteredGroups.filter(g => g.course === 4)
  };

  const handleGroupClick = (groupId: number) => {
    setSelectedGroupId(groupId);
    setActiveDetailTab('group');
    setShowDepartmentGroups(false);
    setSelectedDepartmentGroupId(null);
    setShowPersonalCabinet(false);
  };

  const handleShowDepartmentGroups = () => {
    setActiveDepartmentTab('groups');
    setShowDepartmentGroups(true);
    setSelectedGroupId(null);
    setActiveDetailTab('departmentGroups');
    setSelectedDepartmentGroupId(null);
    setShowPersonalCabinet(false);
  };

  const handleShowDepartmentScholarship = () => {
    setActiveDepartmentTab('scholarship');
    setShowDepartmentGroups(false);
    setSelectedGroupId(null);
    setActiveDetailTab('scholarship');
    setSelectedDepartmentGroupId(null);
    setShowPersonalCabinet(false);
  };

  const handleBackToDepartmentGroups = () => {
    setActiveDepartmentTab('groups');
    setShowDepartmentGroups(true);
    setSelectedGroupId(null);
    setActiveDetailTab('departmentGroups');
    setSelectedDepartmentGroupId(null);
    setShowPersonalCabinet(false);
  };

  const handleOpenPersonalCabinet = () => {
    setActiveDepartmentTab('personal'); 
    setShowPersonalCabinet(true);
    setActiveDetailTab('personalCabinet');
    setSelectedGroupId(null);
    setShowDepartmentGroups(false);
    setLeftPanelView('department');
  };

  const handleClosePersonalCabinet = () => {
    setActiveDepartmentTab('groups'); 
    setShowPersonalCabinet(false);
    setActiveDetailTab('departmentGroups');
    setShowDepartmentGroups(true);
  };

  const CacheWarning = () => {
    if (!usingCache && !groupsFromCache && !deptFromCache && !scholarshipsFromCache) return null;
    
    return (
      <div className="dhp-cache-warning">
        <div className="dhp-cache-warning-icon">⚠️</div>
        <div className="dhp-cache-warning-text">
          {!onlineStatus 
            ? 'Нет подключения к интернету. Показаны сохранённые данные.' 
            : 'Используются кэшированные данные. Некоторые данные могут быть устаревшими.'}
        </div>
        {onlineStatus && (
          <button 
            className="dhp-cache-warning-btn"
            onClick={() => window.location.reload()}
          >
            Обновить
          </button>
        )}
      </div>
    );
  };

  const MetricPlaceholder = ({ label, value, isPercentage = false, isRealData = false }: { label: string; value: number; isPercentage?: boolean; isRealData?: boolean }) => (
    <div className="dhp-metric-card">
      <div className="dhp-metric-header">
        <span className="dhp-metric-title">{label}</span>
      </div>
      <div className="dhp-metric-value">
        {isPercentage ? `${value.toFixed(1)}%` : value.toFixed(2)}
      </div>
      <div className="dhp-metric-progress">
        <div className="dhp-progress-bar">
          <div 
            className="dhp-progress-fill" 
            style={{ width: `${isPercentage ? value : (value / 5) * 100}%` }}
          ></div>
        </div>
      </div>
      {!isRealData && <div className="dhp-metric-note">* демонстрационные данные</div>}
    </div>
  );

  const renderGroupCard = (group: GroupData) => (
    <div 
      key={group.id} 
      className={`dhp-group-card ${selectedGroupId === group.id ? 'active' : ''}`}
      onClick={() => handleGroupClick(group.id)}
    >
      <div className="dhp-group-header">
        <div className="dhp-group-badge">{group.name}</div>
      </div>
      <div className="dhp-group-body">
        <div className="dhp-group-info-compact">
          <div className="dhp-info-compact">
            <span className="dhp-info-label-compact">Куратор:</span>
            <span className="dhp-info-value-compact">{group.curator}</span>
          </div>
          <div className="dhp-info-compact">
            <span className="dhp-info-label-compact">{group.course} курс</span>
            <span className="dhp-info-value-compact">{group.profile}</span>
          </div>
          <div className="dhp-info-compact">
            <span className="dhp-info-label-compact">Студентов:</span>
            <span className="dhp-info-value-compact">{group.students}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInfoView = () => (
    <div className="dhp-department-info-view">
      {departmentLoading ? (
        <div className="dhp-department-loading">
          <div className="dhp-loading-spinner-small"></div>
          <p>Загрузка информации...</p>
        </div>
      ) : departmentInfo ? (
        <>
          <div className="dhp-department-header-info">
            <h3 className="dhp-department-name">{departmentInfo.name}</h3>
            <div className="dhp-department-stats">
              <div className="dhp-department-stat">
                <span className="dhp-stat-number">{departmentInfo.totalGroups}</span>
                <span className="dhp-stat-label">Групп</span>
              </div>
              <div className="dhp-department-stat">
                <span className="dhp-stat-number">{departmentInfo.totalStudents}</span>
                <span className="dhp-stat-label">Студентов</span>
              </div>
            </div>
          </div>
          
          <div className="dhp-department-specialities">
            <h4 className="dhp-specialities-title">Направления подготовки</h4>
            <div className="dhp-specialities-list">
              {departmentInfo.specialities?.map((spec: string, index: number) => (
                <div key={index} className="dhp-speciality-item">
                  <span className="dhp-speciality-name">{spec}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dhp-department-metrics">
            <div className="dhp-metrics-grid">
              <MetricPlaceholder 
                label="Средняя успеваемость" 
                value={departmentInfo.averagePerformance} 
              />
              <MetricPlaceholder 
                label="Общая посещаемость" 
                value={departmentInfo.averageAttendance} 
                isPercentage 
              />
            </div>
          </div>

          <div className="dhp-quick-links">
            <button 
              className={`dhp-quick-link-btn ${activeDepartmentTab === 'groups' ? 'active' : ''}`}
              onClick={handleShowDepartmentGroups}
            >
              <div className="dhp-quick-link-content">
                <span className="dhp-quick-link-title">Информация о группах</span>
                <span className="dhp-quick-link-description">Просмотр всех групп отделения</span>
              </div>
              <span className="dhp-quick-link-arrow">→</span>
            </button>
            
            <button 
              className={`dhp-quick-link-btn ${activeDepartmentTab === 'scholarship' ? 'active' : ''}`}
              onClick={handleShowDepartmentScholarship}
            >
              <div className="dhp-quick-link-content">
                <span className="dhp-quick-link-title">Стипендии</span>
                <span className="dhp-quick-link-description">Статистика по стипендиям</span>
              </div>
              <span className="dhp-quick-link-arrow">→</span>
            </button>

            <button 
              className={`dhp-quick-link-btn ${activeDepartmentTab === 'personal' ? 'active' : ''}`}
              onClick={handleOpenPersonalCabinet}
            >
              <div className="dhp-quick-link-content">
                <span className="dhp-quick-link-title">Личный кабинет</span>
                <span className="dhp-quick-link-description">Просмотр персональных данных</span>
              </div>
              <span className="dhp-quick-link-arrow">→</span>
            </button>
          </div>
        </>
      ) : (
        <div className="dhp-department-error">
          <p>Не удалось загрузить информацию об отделении</p>
          <button onClick={() => window.location.reload()} className="dhp-retry-btn">Повторить</button>
        </div>
      )}
    </div>
  );

  const renderDepartmentView = () => (
    <div className="dhp-department-view">
      <div className="dhp-department-content">
        {renderInfoView()}
      </div>
    </div>
  );

  const renderGroupsView = () => (
    <>
      <div className="dhp-groups-header">
        <div className="dhp-groups-title-wrapper">
          <h2 className="dhp-groups-title">
            Учебные группы 
            <span className="dhp-groups-count">{filteredGroups.length}</span>
          </h2>
          <button 
            className="dhp-add-group-icon-btn"
            onClick={() => setIsAddGroupModalOpen(true)}
            title="Добавить группу"
          >
            +
          </button>
        </div>
        <div className="dhp-groups-controls">
          <div className="dhp-search-container">
            <input
              type="text"
              className="dhp-search-input"
              placeholder="Поиск по группам..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="dhp-course-filter">
        <button 
          className={`dhp-course-filter-btn ${selectedCourse === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCourse('all')}
        >
          Все
        </button>
        {[1, 2, 3, 4].map(course => (
          <button
            key={course}
            className={`dhp-course-filter-btn ${selectedCourse === course ? 'active' : ''}`}
            onClick={() => setSelectedCourse(course)}
          >
            {course} курс
          </button>
        ))}
      </div>

      <div className="dhp-groups-list">
        {selectedCourse === 'all' ? (
          [1, 2, 3, 4].map(course => (
            groupsByCourse[course as keyof typeof groupsByCourse].length > 0 && (
              <div key={course} className="dhp-course-group">
                <h3 className="dhp-course-title">{course} курс</h3>
                <div className="dhp-groups-grid">
                  {groupsByCourse[course as keyof typeof groupsByCourse].map(group => renderGroupCard(group))}
                </div>
              </div>
            )
          ))
        ) : (
          <div className="dhp-course-group">
            <h3 className="dhp-course-title">{selectedCourse} курс</h3>
            <div className="dhp-groups-grid">
              {groupsByCourse[selectedCourse as keyof typeof groupsByCourse].map(group => renderGroupCard(group))}
            </div>
          </div>
        )}

        {filteredGroups.length === 0 && (
          <div className="dhp-no-groups">
            <p>Группы не найдены</p>
          </div>
        )}
      </div>
    </>
  );

  const renderDetailContent = () => {
    if (showPersonalCabinet) {
      return <PersonalCabinetSection />;
    }
    
    if (leftPanelView === 'department' && (showDepartmentGroups || activeDetailTab === 'departmentGroups')) {
      return (
        <div className="dhp-department-groups-full">
          <DepartmentGroupsList 
            groups={academicGroups}
            onGroupSelect={(groupId) => {
              setSelectedGroupId(groupId);
              setActiveDetailTab('group');
              setShowDepartmentGroups(false);
              setSelectedDepartmentGroupId(null);
              setShowPersonalCabinet(false);
            }}
          />
        </div>
      );
    }
    
    if (leftPanelView === 'department' && selectedGroupId === null && activeDetailTab === 'scholarship') {
      return <DepartmentScholarshipSection />;
    }
    
    if (leftPanelView === 'groups' && selectedGroupId !== null) {
      switch (activeDetailTab) {
        case 'group':
          return (
            <GroupDetailSection 
              groupId={selectedGroupId}
              onClose={() => {}}
              onGroupDeleted={() => {
                cacheService.remove('department_groups');
                cacheService.remove('department_info');
                cacheService.remove('department_scholarships');
                window.location.reload();
              }}
            />
          );
        case 'scholarship':
          return (
            <ScholarshipSection
              groupId={selectedGroupId}
              onClose={() => {}}
            />
          );
        case 'session':
          return (
            <SessionAttestationSection
              groupId={selectedGroupId}
              onClose={() => {}}
            />
          );
        case 'summary':
          return (
            <SummaryStatementSection
              groupId={selectedGroupId}
              onClose={() => {}}
            />
          );
        default:
          return null;
      }
    }
    
    if (leftPanelView === 'groups' && selectedGroupId === null) {
      return (
        <div className="dhp-info-placeholder">
          <h3>Выберите группу</h3>
          <p>Нажмите на карточку группы слева, чтобы просмотреть подробную информацию.</p>
        </div>
      );
    }
    
    return null;
  };

  const getDetailTabTitle = (tab: DetailTabType) => {
    const titles = {
      group: 'Информация',
      summary: 'Сводные ведомости',
      scholarship: 'Стипендии',
      session: 'Сессия',
      departmentGroups: 'Группы отделения',
      personalCabinet: 'Личный кабинет'
    };
    return titles[tab];
  };

  if (loading) {
    return (
      <div className="dhp-container">
        <div className="dhp-background-animation">
          <div className="dhp-shape dhp-shape-1"></div>
          <div className="dhp-shape dhp-shape-2"></div>
          <div className="dhp-shape dhp-shape-3"></div>
        </div>
        <div className="dhp-content">
          <HeaderDepartmentHead />
          <div className="dhp-loading-container">
            <div className="dhp-loading-spinner"></div>
            <p>Загрузка данных...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dhp-container">
        <div className="dhp-background-animation">
          <div className="dhp-shape dhp-shape-1"></div>
          <div className="dhp-shape dhp-shape-2"></div>
          <div className="dhp-shape dhp-shape-3"></div>
        </div>

        <div className="dhp-content">
          <HeaderDepartmentHead />

          <div className="dhp-main-layout">
            {/* Левая колонка: панель + кнопка под ней */}
            <div className="dhp-left-column">
              <div className="dhp-groups-panel">
                <div className="dhp-left-panel-nav">
                  <button
                    className={`dhp-nav-btn ${leftPanelView === 'department' ? 'active' : ''}`}
                    onClick={() => {
                      setLeftPanelView('department');
                      setShowDepartmentGroups(true);
                      setActiveDetailTab('departmentGroups');
                      setActiveDepartmentTab('groups');
                      setShowPersonalCabinet(false);
                    }}
                  >
                    Отделение
                  </button>
                  <button
                    className={`dhp-nav-btn ${leftPanelView === 'groups' ? 'active' : ''}`}
                    onClick={() => {
                      setLeftPanelView('groups');
                      setShowDepartmentGroups(false);
                      setShowPersonalCabinet(false);
                    }}
                  >
                    Группы
                  </button>
                </div>

                <div className="dhp-left-panel-content">
                  {leftPanelView === 'department' ? renderDepartmentView() : renderGroupsView()}
                </div>
              </div>
            </div>

            {/* Правая колонка: детальная панель */}
            <div className="dhp-detail-panel">
              {leftPanelView === 'groups' && selectedGroupId !== null && !showPersonalCabinet && (
                <div className="dhp-detail-tabs">
                 { (['group', 'summary', 'scholarship', 'session', 'diploma'] as DetailTabType[]).map((tab) => (
                    <button
                      key={tab}
                      className={`dhp-detail-tab ${activeDetailTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveDetailTab(tab)}
                    >
                      {getDetailTabTitle(tab)}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="dhp-detail-content">
                {renderDetailContent()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAddGroupModalOpen && (
        <AddGroupModal
          onClose={() => setIsAddGroupModalOpen(false)}
          onAdd={handleAddGroup}
        />
      )}
    </>
  );
};