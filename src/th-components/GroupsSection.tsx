import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { teacherApiService } from '../services/teacherApiService';
import { TeacherAttendanceSection } from './TeacherAttendanceSection';
import { TeacherPerformanceSection } from './TeacherPerformanceSection';
import './GroupsSectionStyle.css';

export interface Group {
  numberGroup: string;
  specialty: string;
  subjectName: string;
  countStudent: number;
  attendancePercent?: number;
  course?: number;
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]); // Все группы без фильтрации
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'semesters' | 'course'>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<'first' | 'second'>('first');
  const [selectedCourse, setSelectedCourse] = useState<'all' | '1' | '2' | '3' | '4'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [subjectSortOrder, setSubjectSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedGroupRow, setSelectedGroupRow] = useState<string | null>(null);
  const [showAttendance, setShowAttendance] = useState<boolean>(false);
  const [showPerformance, setShowPerformance] = useState<boolean>(false);
  const [selectedGroupData, setSelectedGroupData] = useState<Group | null>(null);

  // Функция для создания уникального ключа группы
  const getGroupKey = (group: Group) => `${group.numberGroup}-${group.subjectName}`;

  // Функция для получения групп с кэшированием
  const fetchGroups = async (forceRefresh = false) => {
      try {
        setLoading(true);
        setError(null);
        setIsUsingCache(false);

        if (forceRefresh) {
          setRefreshing(true);
        }

        console.log('Загрузка данных групп...');
        
        if (!user?.name || !user?.lastName || !user?.patronymic) {
          throw new Error('Недостаточно данных пользователя для поиска');
        }

        const teacher = await teacherApiService.findTeacherByName(
          user.name, 
          user.lastName, 
          user.patronymic
        );

        if (!teacher) {
          throw new Error('Преподаватель не найден');
        }

        try {
          // Получаем все группы преподавателя
          const teacherGroups = await teacherApiService.getTeacherGroups(teacher.id);        

          // Добавляем процент посещаемости и сохраняем все группы
          const groupsWithAttendance = teacherGroups.map(group => ({
            ...group,
            attendancePercent: calculateGroupAttendance(group)
          }));
          
          setAllGroups(groupsWithAttendance);
          
          // В зависимости от активной вкладки загружаем соответствующие данные
          if (activeTab === 'course') {
            await loadCourseData(teacher.id, groupsWithAttendance);
          } else {
            await loadSemesterData(teacher.id, groupsWithAttendance);
          }
          
          console.log('Группы преподавателя загружены:', groupsWithAttendance);
          
        } catch (groupsError) {
          console.error('Ошибка загрузки групп:', groupsError);
          throw new Error('Не удалось загрузить группы');
        }

      } catch (err) {
        console.error('Ошибка при загрузке групп:', err);
        setError('Не удалось загрузить данные групп');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    // Загрузка данных для вкладки "По курсу"
  const loadCourseData = async (teacherId: number, baseGroups: Group[]) => {
    try {
      const disciplines = await teacherApiService.getTeacherDisciplinesByCourse(teacherId);
      
      // Фильтруем группы по выбранному курсу
      let filteredGroups = baseGroups;
    
      if (selectedCourse !== 'all') {
        const courseNum = parseInt(selectedCourse);
        // Создаем Set предметов для выбранного курса
        const courseSubjects = new Set(
          disciplines
            .filter(d => d.course === courseNum)
            .map(d => d.subjectName)
        );
        
        filteredGroups = baseGroups.filter(group => 
          courseSubjects.has(group.subjectName)
        );
      }
      
      setGroups(filteredGroups);
    } catch (error) {
      console.error('Ошибка загрузки данных по курсам:', error);
      // В случае ошибки показываем все группы
      setGroups(baseGroups);
    }
  };

  // Загрузка данных для вкладки "По семестрам"
  const loadSemesterData = async (teacherId: number, baseGroups: Group[]) => {
    try {
      const semesterNum = selectedSemester === 'first' ? 1 : 2;
      const disciplines = await teacherApiService.getTeacherDisciplinesBySemester(teacherId, semesterNum);
      
      // Фильтруем группы по семестру
      // Пока все группы для первого семестра
      let filteredGroups = baseGroups;
      
      if (selectedSemester === 'first') {
        filteredGroups = baseGroups;
      }
      
      setGroups(filteredGroups);
    } catch (error) {
      console.error('Ошибка загрузки данных по семестрам:', error);
      // В случае ошибки показываем все группы
      setGroups(baseGroups);
    }
  };

  // Обработчик смены вкладки
  const handleTabChange = (tab: 'semesters' | 'course') => {
    setActiveTab(tab);
    // При смене вкладки сбрасываем фильтры
    setSelectedCourse('all');
    setSelectedSemester('first');
    setSelectedGroup('all');
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

  // Обновляем данные при изменении фильтров
  useEffect(() => {
    if (allGroups.length > 0 && user) {
      teacherApiService.findTeacherByName(
        user.name, 
        user.lastName, 
        user.patronymic
      ).then(teacher => {
        if (teacher) {
          if (activeTab === 'course') {
            loadCourseData(teacher.id, allGroups);
          } else {
            loadSemesterData(teacher.id, allGroups);
          }
        }
      });
    }
  }, [selectedCourse, selectedSemester, activeTab, allGroups, user, selectedGroup]);

  const calculateGroupAttendance = (group: Group): number => {
    const basePercent = Math.floor(Math.random() * 30) + 70;
    return basePercent;
  };

  // Функция принудительного обновления данных
  const handleRefresh = async () => {
    if (user?.name && user?.lastName && user?.patronymic) {
      const cacheKey = `teacher_groups_${user.lastName}_${user.name}_${user.patronymic}`.toLowerCase();
      localStorage.removeItem(`cache_${cacheKey}`);
    }
    await fetchGroups(true);
  };

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);


  // Компонент информационной иконки
  const InfoIcon = () => (
    <div className="info-icon-btn" tabIndex={0}>
      <button className="header-btn" type="button">
        <span className="info-icon-text">i</span>
        <span>Информация</span>
      </button>
      <div className="info-tooltip">
        <div className="info-tooltip-content">
          <p><strong>Управление группами</strong></p>
          <p>Здесь отображаются все группы по преподаваемым дисциплинам. Вы можете фильтровать их по семестрам или курсам.</p>
          <p>Для работы с посещаемостью или оценками выберите группу и нажмите соответствующую кнопку.</p>
        </div>
      </div>
    </div>
  );

  // Компонент кнопки обновления
  const RefreshButton = () => (
    <button 
      className={`header-btn pc-refresh-btn ${refreshing ? 'pc-refreshing' : ''}`}
      onClick={handleRefresh}
      disabled={refreshing}
    >
      <img 
        src="/st-icons/upload_icon.svg" 
        className={`pc-refresh-icon ${refreshing ? 'pc-refresh-spin' : ''}`}
        alt="Обновить"
      />
      <span>Обновить данные</span>
    </button>
  );

  // Фильтрация данных с учетом выбранной дисциплины
  const filteredGroups = groups.filter(group => {
    const groupFilter = selectedGroup === 'all' || group.numberGroup === selectedGroup;
    const disciplineFilter = !selectedDiscipline || group.subjectName === selectedDiscipline;
    return groupFilter && disciplineFilter;
  });

  // Сортировка по предмету
  const sortedGroups = [...filteredGroups].sort((a, b) => {
    if (subjectSortOrder === 'asc') {
      return a.subjectName.localeCompare(b.subjectName);
    } else {
      return b.subjectName.localeCompare(a.subjectName);
    }
  });

  // Получение уникальных групп для выпадающего списка
  const uniqueGroups = Array.from(new Set(allGroups.map(group => group.numberGroup)));

  // Обработчики
  const handleGroupChange = (group: string) => {
    setSelectedGroup(group);
    setSelectedGroupRow(null);
  };

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
    
  const groupData = groups.find(group => 
    getGroupKey(group) === selectedGroupRow
  );
  if (groupData) {
    setSelectedGroupData(groupData);
    setShowAttendance(true);
  }
  };

  const handleSetGrades = () => {
    if (!selectedGroupRow) return;
      
    const groupData = groups.find(group => 
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

  // Моковые данные студентов для демонстрации
  const mockStudents = [
    { id: 1, lastName: 'Абрамов', firstName: 'Кирилл', middleName: 'Денисович' },
    { id: 2, lastName: 'Андреев', firstName: 'Никита', middleName: 'Игоревич' },
    { id: 3, lastName: 'Васильев', firstName: 'Алексей', middleName: 'Валерьевич' },
    { id: 4, lastName: 'Васильев', firstName: 'Дмитрий', middleName: 'Романович' },
    { id: 5, lastName: 'Васильев', firstName: 'Макар', middleName: 'Александрович' },
    { id: 6, lastName: 'Давтян', firstName: 'Егор', middleName: 'Каренович' },
    { id: 7, lastName: 'Загайный', firstName: 'Семен', middleName: 'Олегович' },
    { id: 8, lastName: 'Загоскин', firstName: 'Александр', middleName: 'Иванович' },
    { id: 9, lastName: 'Капустинская', firstName: 'Софья', middleName: 'Алексеевна' },
    { id: 10, lastName: 'Крючков', firstName: 'Захар', middleName: 'Владимирович' },
  ];

  // Условия отображения компонентов
  if (showPerformance && selectedGroupData) {
    return (
      <div className="teacher-performance-page">
        <TeacherPerformanceSection
          groupNumber={selectedGroupData.numberGroup}
          subject={selectedGroupData.subjectName}
          students={mockStudents}
          onBackToGroups={handleBackToGroups}
          onSetAttendance={handleSetAttendanceFromPerformance}
        />
      </div>
    );
  }

  if (showAttendance && selectedGroupData) {
    return (
      <div className="teacher-attendance-page">
        <TeacherAttendanceSection
          groupNumber={selectedGroupData.numberGroup}
          subject={selectedGroupData.subjectName}
          students={mockStudents}
          onBackToGroups={handleBackToGroups}
          onSetGrades={handleSetGradesFromAttendance}
        />
      </div>
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

      {/* Индикация использования кэша */}
      {isUsingCache && (
        <div className="gs-cache-warning">
          Используются кэшированные данные. Для актуальной информации обновите данные.
        </div>
      )}

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
            onClick={() => setActiveTab('semesters')}
          >
            По семестрам
          </button>
          <button
            className={`gs-view-tab ${activeTab === 'course' ? 'gs-active' : ''}`}
            onClick={() => setActiveTab('course')}
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
                        onClick={() => setSelectedSemester('first')}
                      >
                        1-ый семестр
                      </button>
                      <button
                        className={`gs-semester-tab ${selectedSemester === 'second' ? 'gs-active' : ''}`}
                        onClick={() => setSelectedSemester('second')}
                      >
                        2-ой семестр
                      </button>
                    </div>
                  </div>
                  
                  <div className="gs-group-selector">
                    <select
                      id="gs-group-select"
                      value={selectedGroup}
                      onChange={(e) => handleGroupChange(e.target.value)}
                      className="gs-group-select"
                    >
                      <option value="all">Все группы</option>
                      {uniqueGroups.map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
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
                                  style={{ backgroundColor: getPercentColor(group.attendancePercent || 0) }}
                                >
                                  {(group.attendancePercent || 0).toFixed(0)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                            Нет групп для отображения
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
                        onClick={() => setSelectedCourse('all')}
                      >
                        Все курсы
                      </button>
                      <button
                        className={`gs-course-tab ${selectedCourse === '1' ? 'gs-active' : ''}`}
                        onClick={() => setSelectedCourse('1')}
                      >
                        1 курс
                      </button>
                      <button
                        className={`gs-course-tab ${selectedCourse === '2' ? 'gs-active' : ''}`}
                        onClick={() => setSelectedCourse('2')}
                      >
                        2 курс
                      </button>
                      <button
                        className={`gs-course-tab ${selectedCourse === '3' ? 'gs-active' : ''}`}
                        onClick={() => setSelectedCourse('3')}
                      >
                        3 курс
                      </button>
                      <button
                        className={`gs-course-tab ${selectedCourse === '4' ? 'gs-active' : ''}`}
                        onClick={() => setSelectedCourse('4')}
                      >
                        4 курс
                      </button>
                    </div>
                  </div>
                  
                  <div className="gs-group-selector">
                    <select
                      id="gs-group-select"
                      value={selectedGroup}
                      onChange={(e) => handleGroupChange(e.target.value)}
                      className="gs-group-select"
                    >
                      <option value="all">Все группы</option>
                      {uniqueGroups.map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
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
                                  style={{ backgroundColor: getPercentColor(group.attendancePercent || 0) }}
                                >
                                  {(group.attendancePercent || 0).toFixed(0)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                            Нет групп для отображения
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