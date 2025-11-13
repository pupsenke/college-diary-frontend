import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { useCache } from '../context/CacheContext';
import { teacherApiService } from '../services/teacherApiService';
import { TeacherAttendanceSection, AttendanceRecord } from './TeacherAttendanceSection';
import { TeacherPerformanceSection } from './TeacherPerformanceSection';
import './GroupsSectionStyle.css';
import { CacheWarning } from '../th-components/CacheWarning';

export interface Group {
  numberGroup: string;
  specialty: string;
  subjectName: string;
  countStudent: number;
  attendancePercent?: number;
  course?: number;
  attendanceData?: {
    records: AttendanceRecord[];
    lastCalculated?: number;
  };
}

interface Discipline {
  idTeacher: number;
  subjectName: string;
  course: number;
  countGroup: number;
}

interface Props {
  selectedDiscipline?: string;
  onDisciplineClear?: () => void;
}

export const GroupsSection: React.FC<Props> = ({ selectedDiscipline, onDisciplineClear }) => {
  const { user } = useUser();
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isUsingCache, showCacheWarning, setShowCacheWarning, forceCacheCheck } = useCache();
  
  const [activeTab, setActiveTab] = useState<'semesters' | 'course'>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<'first' | 'second'>('first');
  const [selectedCourse, setSelectedCourse] = useState<'all' | '1' | '2' | '3' | '4'>('all');
  const [groupSearch, setGroupSearch] = useState<string>('');
  const [subjectSortOrder, setSubjectSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedGroupRow, setSelectedGroupRow] = useState<string | null>(null);
  const [showAttendance, setShowAttendance] = useState<boolean>(false);
  const [showPerformance, setShowPerformance] = useState<boolean>(false);
  const [selectedGroupData, setSelectedGroupData] = useState<Group | null>(null);
  const [currentStId, setCurrentStId] = useState<number | null>(null);

  const [attendanceData, setAttendanceData] = useState<Record<string, {
    records: AttendanceRecord[];
    percentage: number;
  }>>({});

  // Функция для создания уникального ключа группы
  const getGroupKey = (group: Group) => `${group.numberGroup}_${group.subjectName}`;

  // Функция для загрузки данных посещаемости для конкретной группы
  const loadGroupAttendanceData = async (group: Group): Promise<number> => {
    try {
      const teacherId = parseInt(localStorage.getItem('teacher_id') || '0');
      const stId = await teacherApiService.getStId(
        teacherId, 
        group.subjectName,
        group.numberGroup
      );
      
      if (stId) {
        const attendanceData = await teacherApiService.getGroupAttendance(
          group.numberGroup, 
          stId, 
          teacherId
        );
        
        if (attendanceData && Array.isArray(attendanceData)) {
          // Рассчитываем процент посещаемости
          let totalRecords = 0;
          let presentCount = 0;
          
          attendanceData.forEach((studentData: any) => {
            if (studentData.attendances && Array.isArray(studentData.attendances)) {
              studentData.attendances.forEach((attendance: any) => {
                totalRecords++;
                if (attendance.status === 'п') {
                  presentCount++;
                }
              });
            }
          });
          
          const percentage = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;
          
          // Сохраняем данные
          const groupKey = getGroupKey(group);
          setAttendanceData(prev => ({
            ...prev,
            [groupKey]: {
              records: [], // Можно сохранить реальные записи если нужно
              percentage: percentage
            }
          }));
          
          return percentage;
        }
      }
    } catch (error) {
      console.error(`Error loading attendance data for group ${group.numberGroup}:`, error);
    }
    
    return 0;
  };

  // Функция для загрузки данных посещаемости для всех групп
  const loadAllGroupsAttendanceData = async (groups: Group[]) => {
    const attendancePromises = groups.map(group => loadGroupAttendanceData(group));
    await Promise.allSettled(attendancePromises);
  };

  // Функция для получения групп с кэшированием
  const fetchGroups = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      setShowCacheWarning(false);

      if (forceRefresh) setRefreshing(true);

      if (!user?.name || !user?.lastName || !user?.patronymic) {
        throw new Error('Недостаточно данных пользователя для поиска');
      }

      const teacher = await teacherApiService.findTeacherByName(
        user.name,
        user.lastName,
        user.patronymic
      );

      if (!teacher) throw new Error('Преподаватель не найден');

      const teacherGroups = await teacherApiService.getTeacherGroups(teacher.id);

      // Оставляем только уникальные группы
      const uniqueGroups = teacherGroups.filter((group, index, self) =>
        index === self.findIndex(g =>
          g.numberGroup === group.numberGroup && g.subjectName === group.subjectName
        )
      );

      // Получаем уникальные номера групп
      const uniqueGroupNumbers = uniqueGroups
        .map(group => group.numberGroup) 
        .filter((number, index, array) => array.indexOf(number) === index);

      // Массово получаем информацию о группах
      const groupInfos = await Promise.all(
        uniqueGroupNumbers.map(number => {
          const groupId = teacherApiService.getGroupIdFromNumber(number);
          return groupId ? teacherApiService.getGroupById(groupId) : null;
        })
      );

      // Создаем карту номер групп -> информация
      const groupInfoMap = new Map();
      groupInfos.forEach((info, index) => {
        if (info) {
          groupInfoMap.set(uniqueGroupNumbers[index], info);
        }
      });

      // Обогащаем группы информацией о курсе
      const groupsWithCourse = uniqueGroups.map(group => {
        const groupInfo = groupInfoMap.get(group.numberGroup);
        return {
          ...group,
          course: groupInfo?.course || 1
        };
      });

      setAllGroups(groupsWithCourse);
      
      // Загружаем данные посещаемости для всех групп
      await loadAllGroupsAttendanceData(groupsWithCourse);
      
    } catch (err: any) {
      console.error('Ошибка при загрузке данных групп:', err);
      
      // Проверяем, является ли ошибка сетевой
      const isNetworkError = 
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Network request failed') ||
        err.message?.includes('Превышено время ожидания') ||
        err.name === 'TypeError';
      
      if (isNetworkError) {
        forceCacheCheck();
        
        setShowCacheWarning(true);
          
          // Пытаемся загрузить данные из кэша
          try {
            const teacherId = localStorage.getItem('teacher_id');
            if (teacherId) {
              const cachedGroups = localStorage.getItem(`cache_teacher_groups_${teacherId}`);
              if (cachedGroups) {
                const parsedGroups = JSON.parse(cachedGroups);
                setAllGroups(parsedGroups);
              }
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

  // Обработчик смены вкладки
  const handleTabChange = (tab: 'semesters' | 'course') => {
    setActiveTab(tab);
    setSelectedCourse('all');
    setSelectedSemester('first');
    setGroupSearch('');
    setSelectedGroupRow(null);
  };

  // Обработчик смены курса
  const handleCourseChange = (course: 'all' | '1' | '2' | '3' | '4') => {
    setSelectedCourse(course);
    setSelectedGroupRow(null);
  };

  // Обработчик смены семестра
  const handleSemesterChange = (semester: 'first' | 'second') => {
    setSelectedSemester(semester);
    setSelectedGroupRow(null);
  };

  // Обработчик изменения поиска по группе
  const handleGroupSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGroupSearch(e.target.value);
    setSelectedGroupRow(null);
  };

  // Обработчик обновления данных посещаемости (при работе в TeacherAttendanceSection)
  const handleAttendanceUpdate = useCallback((groupKey: string, data: {
    records: AttendanceRecord[];
    percentage: number;
  }) => {
    setAttendanceData(prev => ({
      ...prev,
      [groupKey]: {
        ...data,
        lastCalculated: Date.now()
      }
    }));
  }, []);

  // Функция для получения актуального процента посещаемости
  const getRealAttendancePercent = (group: Group): number => {
    const groupKey = getGroupKey(group);
    const data = attendanceData[groupKey];
    
    if (data && data.percentage > 0) {
      return data.percentage;
    }
    
    // Если данных нет, возвращаем 0 или базовый процент из группы
    return group.attendancePercent || 0;
  };

  // Функция принудительного обновления данных
  const handleRefresh = async () => {
    await fetchGroups(true);
  };

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  // Сохраняем данные в localStorage при обновлении
  useEffect(() => {
    if (Object.keys(attendanceData).length > 0) {
      localStorage.setItem('teacher_attendance_data', JSON.stringify(attendanceData));
    }
  }, [attendanceData]);

  // Загружаем данные из localStorage при монтировании
  useEffect(() => {
    const savedData = localStorage.getItem('teacher_attendance_data');
    if (savedData) {
      try {
        setAttendanceData(JSON.parse(savedData));
      } catch (error) {
        console.error('Error loading attendance data from localStorage:', error);
      }
    }
  }, []);

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
              <h3>Управление группами</h3>
              <p>Здесь отображаются все группы по преподаваемым дисциплинам. Вы можете фильтровать их по семестрам или курсам, а также есть поиск по номеру группы</p>
            </div>
          </div>
          
          <div className="info-section">
            <h4>Основные возможности</h4>
            <div className="features-grid">
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Просмотр всех учебных групп по дисциплине</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Фильтрация групп по семестрам и курсам</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Просмотр количества студентов в группах</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Работа с посещаемостью студентов</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Выставление оценок и контроль успеваемости</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h4>Как использовать</h4>
            <div className="usage-steps">
              <div className="step">
                <span className="step-number">1</span>
                <span>Выберите нужную группу из списка</span>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <span>Для работы с посещаемостью нажмите "Выставить посещаемость"</span>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <span>Для работы с оценками нажмите "Выставить оценки"</span>
              </div>
              <div className="step">
                <span className="step-number">4</span>
                <span>Используйте фильтры или поиск по группам</span>
              </div>
            </div>
          </div>

          <div className="info-tip">
            Для удобства используйте фильтрацию или поиск при большом количестве групп
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

  const filteredGroups = React.useMemo(() => {
    return allGroups.filter(group => {
      const groupNumberStr = String(group.numberGroup);

      const groupFilter = !groupSearch || groupNumberStr.toLowerCase().includes(groupSearch.toLowerCase());
      const disciplineFilter = !selectedDiscipline || group.subjectName.toLowerCase().includes(selectedDiscipline.toLowerCase());
      const semesterFilter = selectedSemester === 'first';

      let courseFilter = true;
      if (activeTab === 'course' && selectedCourse !== 'all') {
        // Преобразуем selectedCourse в число для сравнения
        courseFilter = group.course === parseInt(selectedCourse);
      }

      return groupFilter && disciplineFilter && semesterFilter && courseFilter;
    });
  }, [allGroups, groupSearch, selectedDiscipline, selectedSemester, activeTab, selectedCourse]);

  const sortedGroups = React.useMemo(() => {
    return [...filteredGroups].sort((a, b) => {
      if (subjectSortOrder === 'asc') {
        return a.subjectName.localeCompare(b.subjectName);
      } else {
        return b.subjectName.localeCompare(a.subjectName);
      }
    });
  }, [filteredGroups, subjectSortOrder]);

  const toggleSubjectSortOrder = () => {
    setSubjectSortOrder(subjectSortOrder === 'asc' ? 'desc' : 'asc');
  };

  const getPercentColor = (percent: number) => {
    if (percent >= 90) return '#2cbb00ff';
    if (percent >= 75) return '#a5db28ff';
    if (percent >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const handleRowClick = (group: Group) => {
    const groupKey = getGroupKey(group);
    setSelectedGroupRow(groupKey === selectedGroupRow ? null : groupKey);
  };

  const handleSetAttendance = () => {
    if (!selectedGroupRow) return;
      
    const groupData = allGroups.find(group => 
      getGroupKey(group) === selectedGroupRow
    );
    if (groupData) {
      setSelectedGroupData(groupData);
      
      // Получаем idSt для выбранной группы и предмета
      const getStIdForGroup = async () => {
        try {
          const teacherId = parseInt(localStorage.getItem('teacher_id') || '0');
          const stId = await teacherApiService.getStId(
            teacherId, 
            groupData.subjectName,
            groupData.numberGroup
          );
          
          if (stId) {
            setCurrentStId(stId);
            setShowAttendance(true);
          } else {
            console.error('Не удалось получить idSt для группы');
          }
        } catch (error) {
          console.error('Ошибка при получении idSt:', error);
        }
      };
      
      getStIdForGroup();
    }
  };

  const handleSetGrades = () => {
    if (!selectedGroupRow) return;
      
    const groupData = allGroups.find(group => 
      getGroupKey(group) === selectedGroupRow
    );
    if (groupData) {
      setSelectedGroupData(groupData);
      setShowPerformance(true);
    }
  };

  const handleClearDiscipline = () => {
    if (onDisciplineClear) {
      onDisciplineClear();
    }
  };

  const handleBackToGroups = () => {
    setShowAttendance(false);
    setShowPerformance(false);
    setSelectedGroupData(null);
    setCurrentStId(null);
  };

  // от успеваемости к посещаемости
  const handleSetAttendanceFromPerformance = () => {
    setShowPerformance(false);
    setShowAttendance(true);
  };

  // от посещаемости к успеваемости
  const handleSetGradesFromAttendance = () => {
    setShowAttendance(false);
    setShowPerformance(true);
  };

  // Условия отображения компонентов
  if (showPerformance && selectedGroupData) {
    return (
      <div className="teacher-performance-page">
        <TeacherPerformanceSection
          groupNumber={selectedGroupData.numberGroup}
          subject={selectedGroupData.subjectName}
          onBackToGroups={handleBackToGroups}
          onSetAttendance={handleSetAttendanceFromPerformance}
        />
      </div>
    );
  }

  if (showAttendance && selectedGroupData && currentStId) {
    const groupKey = getGroupKey(selectedGroupData);
    return (
      <TeacherAttendanceSection
        groupNumber={selectedGroupData.numberGroup}
        subject={selectedGroupData.subjectName}
        students={[]}
        idSt={currentStId}
        teacherId={parseInt(localStorage.getItem('teacher_id') || '0')}
        onBackToGroups={handleBackToGroups}
        onSetGrades={handleSetGradesFromAttendance}
        onAttendanceUpdate={(data) => handleAttendanceUpdate(groupKey, data)}
      />
    );
  }

  // Если данные пользователя еще не загружены
  if (!user) {
    return (
      <div className="gs-groups-section">
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Загрузка данных пользователя...
        </div>
      </div>
    );
  }

  return (
    <div className="gs-groups-section">
      {/* Заголовок с кнопками */}
      <div className="gs-cabinet-header">
        <InfoIcon />
        <RefreshButton />
      </div>

      {showCacheWarning && <CacheWarning />}

      {/* Блок выбранной дисциплины с кнопкой сброса фильтра */}
      {selectedDiscipline && (
        <div className="gs-discipline-filter">
          <div className="gs-discipline-info">
            <strong className="gs-discipline-name">{selectedDiscipline}</strong>
          </div>
          <button className="gs-clear-discipline" onClick={handleClearDiscipline}>
            Сбросить фильтр
          </button>
        </div>
      )}

      {error && !isUsingCache && (
        <div className="gs-error-message">
          {error}
        </div>
      )}

      <div className="gs-groups-header">
        <div className="gs-view-tabs">
          <button
            className={`gs-view-tab ${activeTab === 'semesters' ? 'gs-active' : ''}`}
            onClick={() => handleTabChange('semesters')}
          >
            По семестрам
          </button>
          <button
            className={`gs-view-tab ${activeTab === 'course' ? 'gs-active' : ''}`}
            onClick={() => handleTabChange('course')}
          >
            По курсу
          </button>
        </div>
      </div>

      <div className="gs-groups-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            Загрузка групп...
          </div>
        ) : (
          <>
            {activeTab === 'semesters' ? (
              <>
                <div className="gs-controls-row">
                  <div className="gs-semester-controls">
                    <div className="gs-semester-tabs">
                      <button
                        className={`gs-semester-tab ${selectedSemester === 'first' ? 'gs-active' : ''}`}
                        onClick={() => handleSemesterChange('first')}
                      >
                        1-ый семестр
                      </button>
                      <button
                        className={`gs-semester-tab ${selectedSemester === 'second' ? 'gs-active' : ''}`}
                        onClick={() => handleSemesterChange('second')}
                      >
                        2-ой семестр
                      </button>
                    </div>
                  </div>
                  
                  <div className="gs-group-search">
                    <input
                      type="text"
                      placeholder="Поиск по номеру группы"
                      value={groupSearch}
                      onChange={handleGroupSearchChange}
                      className="gs-group-search-input"
                    />
                    {groupSearch && (
                      <button 
                        className="gs-clear-search"
                        onClick={() => setGroupSearch('')}
                        title="Очистить поиск"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <div className="gs-groups-table-container">
                  <table className="gs-groups-table">
                    <thead>
                      <tr>
                        <th className="gs-number-column">№</th>
                        <th className="gs-group-column">Группа</th>
                        <th className="gs-specialty-column">Специальность</th>
                        <th className="gs-subject-column">
                          <div className="gs-column-header">
                            <span>Предмет</span>
                            <button 
                              className="gs-sort-button"
                              onClick={toggleSubjectSortOrder}
                            >
                              <img 
                                src="/th-icons/sort_icon.svg" 
                                alt="Сортировка" 
                                className={`gs-sort-icon ${subjectSortOrder === 'desc' ? 'gs-sort-desc' : ''}`}
                              />
                            </button>
                          </div>
                        </th>
                        <th className="gs-students-column">
                          <div className="gs-header-text">
                            Количество<br />студентов
                          </div>
                        </th>
                        <th className="gs-attendance-column">
                          <div className="gs-header-text">
                            Процент<br />посещаемости
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedGroups.length > 0 ? (
                        sortedGroups.map((group, index) => {
                          const groupKey = getGroupKey(group);
                          const attendancePercent = getRealAttendancePercent(group);
                          
                          return (
                            <tr 
                              key={groupKey} 
                              className={`gs-group-row ${selectedGroupRow === groupKey ? 'gs-selected' : ''}`}
                              onClick={() => handleRowClick(group)}
                            >
                              <td className="gs-number-cell">{index + 1}.</td>
                              <td className="gs-group-name">{group.numberGroup}</td>
                              <td className="gs-specialty-cell">{group.specialty}</td>
                              <td className="gs-subject-cell">{group.subjectName}</td>
                              <td className="gs-students-cell">{group.countStudent}</td>
                              <td className="gs-attendance-percent">
                                <span 
                                  className="gs-percent-bubble"
                                  style={{ backgroundColor: getPercentColor(attendancePercent) }}
                                >
                                  {attendancePercent.toFixed(0)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                            {selectedSemester === 'second' 
                              ? 'Второй семестр пока недоступен' 
                              : groupSearch ? `Группы с номером "${groupSearch}" не найдены` : 'Нет групп для отображения'
                            }
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="gs-controls-row">
                  <div className="gs-course-controls">
                    <div className="gs-course-tabs">
                      <button
                        className={`gs-course-tab ${selectedCourse === 'all' ? 'gs-active' : ''}`}
                        onClick={() => handleCourseChange('all')}
                      >
                        Все курсы
                      </button>
                      <button
                        className={`gs-course-tab ${selectedCourse === '1' ? 'gs-active' : ''}`}
                        onClick={() => handleCourseChange('1')}
                      >
                        1 курс
                      </button>
                      <button
                        className={`gs-course-tab ${selectedCourse === '2' ? 'gs-active' : ''}`}
                        onClick={() => handleCourseChange('2')}
                      >
                        2 курс
                      </button>
                      <button
                        className={`gs-course-tab ${selectedCourse === '3' ? 'gs-active' : ''}`}
                        onClick={() => handleCourseChange('3')}
                      >
                        3 курс
                      </button>
                      <button
                        className={`gs-course-tab ${selectedCourse === '4' ? 'gs-active' : ''}`}
                        onClick={() => handleCourseChange('4')}
                      >
                        4 курс
                      </button>
                    </div>
                  </div>
                  
                  <div className="gs-group-search">
                    <input
                      type="text"
                      placeholder="Поиск по номеру группы"
                      value={groupSearch}
                      onChange={handleGroupSearchChange}
                      className="gs-group-search-input"
                    />
                    {groupSearch && (
                      <button 
                        className="gs-clear-search"
                        onClick={() => setGroupSearch('')}
                        title="Очистить поиск"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <div className="gs-groups-table-container">
                  <table className="gs-groups-table">
                    <thead>
                      <tr>
                        <th className="gs-number-column">№</th>
                        <th className="gs-group-column">Группа</th>
                        <th className="gs-specialty-column">Специальность</th>
                        <th className="gs-subject-column">
                          <div className="gs-column-header">
                            <span>Предмет</span>
                            <button 
                              className="gs-sort-button"
                              onClick={toggleSubjectSortOrder}
                            >
                              <img 
                                src="/th-icons/sort_icon.svg" 
                                alt="Сортировка" 
                                className={`gs-sort-icon ${subjectSortOrder === 'desc' ? 'gs-sort-desc' : ''}`}
                              />
                            </button>
                          </div>
                        </th>
                        <th className="gs-students-column">
                          <div className="gs-header-text">
                            Количество<br />студентов
                          </div>
                        </th>
                        <th className="gs-attendance-column">
                          <div className="gs-header-text">
                            Процент<br />посещаемости
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedGroups.length > 0 ? (
                        sortedGroups.map((group, index) => {
                          const groupKey = getGroupKey(group);
                          const attendancePercent = getRealAttendancePercent(group);
                          
                          return (
                            <tr 
                              key={groupKey} 
                              className={`gs-group-row ${selectedGroupRow === groupKey ? 'gs-selected' : ''}`}
                              onClick={() => handleRowClick(group)}
                            >
                              <td className="gs-number-cell">{index + 1}.</td>
                              <td className="gs-group-name">{group.numberGroup}</td>
                              <td className="gs-specialty-cell">{group.specialty}</td>
                              <td className="gs-subject-cell">{group.subjectName}</td>
                              <td className="gs-students-cell">{group.countStudent}</td>
                              <td className="gs-attendance-percent">
                                <span 
                                  className="gs-percent-bubble"
                                  style={{ backgroundColor: getPercentColor(attendancePercent) }}
                                >
                                  {attendancePercent.toFixed(0)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                            {groupSearch ? 'Группы не найдены' : 'Нет групп для отображения'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="gs-action-buttons">
              <button 
                className={`gs-attendance-btn ${!selectedGroupRow ? 'gs-disabled' : ''}`}
                onClick={handleSetAttendance}
                disabled={!selectedGroupRow}
              >
                Выставить посещаемость
              </button>
              <button 
                className={`gs-grades-btn ${!selectedGroupRow ? 'gs-disabled' : ''}`}
                onClick={handleSetGrades}
                disabled={!selectedGroupRow}
              >
                Выставить оценки
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};