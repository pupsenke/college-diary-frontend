import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { teacherApiService } from '../services/teacherApiService';
import './DisciplinesSectionStyle.css';

export interface Discipline {
  idTeacher: number;
  idSubject: number;
  subjectName: string;
  course: number;
  countGroup: number;
}

interface Props {
  onDisciplineSelect?: (disciplineName: string) => void;
  selectedDiscipline?: string;
}

export const DisciplinesSection: React.FC<Props> = ({ onDisciplineSelect, selectedDiscipline }) => {
  const { user } = useUser();
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'semesters' | 'course'>('semesters');
  const [selectedSemester, setSelectedSemester] = useState<'first' | 'second'>('first');
  const [selectedCourse, setSelectedCourse] = useState<'all' | '1' | '2' | '3' | '4'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Функция для получения дисциплин с кэшированием
  const fetchDisciplines = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      setIsUsingCache(false);

      if (forceRefresh) {
        setRefreshing(true);
      }

      console.log('Загрузка дисциплин преподавателя...');
      
      if (!user?.name || !user?.lastName || !user?.patronymic) {
        throw new Error('Недостаточно данных пользователя для поиска');
      }

      // Ищем преподавателя по ФИО
      const teacher = await teacherApiService.findTeacherByName(
        user.name, 
        user.lastName, 
        user.patronymic
      );

      if (!teacher) {
        throw new Error('Преподаватель не найден');
      }

      try {
        // Получаем дисциплины преподавателя по курсу (например, курс 4)
        const teacherDisciplines = await teacherApiService.getTeacherDisciplinesByCourse(teacher.id, 4);
        
        setDisciplines(teacherDisciplines);
        console.log('Дисциплины преподавателя загружены:', teacherDisciplines);
        
      } catch (disciplinesError) {
        console.error('Ошибка загрузки дисциплин:', disciplinesError);
        
        // Используем данные из кэша, если есть
        const cacheKey = `teacher_disciplines_course_${teacher.id}`;
        const cachedDisciplines = localStorage.getItem(`cache_${cacheKey}`);
        
        if (cachedDisciplines) {
          const cachedData = JSON.parse(cachedDisciplines);
          if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) { // 5 минут
            setDisciplines(cachedData.data);
            setIsUsingCache(true);
            setError('Используются кэшированные данные дисциплин. Нет соединения с сервером.');
            console.log('Данные дисциплин загружены из кэша');
            return;
          }
        }
        
        throw new Error('Не удалось загрузить дисциплины');
      }

    } catch (err) {
      console.error('Ошибка при загрузке дисциплин:', err);
      
      // Пробуем загрузить из кэша при ошибке сети
      try {
        console.log('Попытка загрузки дисциплин из кэша...');
        const cacheKey = `teacher_disciplines_${user?.lastName}_${user?.name}_${user?.patronymic}`.toLowerCase();
        const cached = localStorage.getItem(`cache_${cacheKey}`);
        
        if (cached) {
          const cachedData = JSON.parse(cached);
          // Проверяем актуальность кэша (1 час)
          if (Date.now() - cachedData.timestamp < 60 * 60 * 1000) {
            setDisciplines(cachedData.data);
            setIsUsingCache(true);
            setError('Используются кэшированные данные. Нет соединения с сервером.');
            console.log('Данные дисциплин загружены из кэша');
            return;
          }
        }
      } catch (cacheError) {
        console.error('Ошибка при загрузке из кэша:', cacheError);
      }
      
      setError('Не удалось загрузить данные дисциплин');
      
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Функция принудительного обновления данных
  const handleRefresh = async () => {
    // Инвалидируем кэш перед обновлением
    if (user?.name && user?.lastName && user?.patronymic) {
      const cacheKey = `teacher_disciplines_${user.lastName}_${user.name}_${user.patronymic}`.toLowerCase();
      localStorage.removeItem(`cache_${cacheKey}`);
    }
    await fetchDisciplines(true);
  };

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    if (user) {
      fetchDisciplines();
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
          <p><strong>Управление дисциплинами</strong></p>
          <p>Здесь отображаются все преподаваемые дисциплины. Вы можете фильтровать их по семестрам или курсам, а также сортировать по названию.</p>
          <p>Для просмотра подробной информации о группах и студентах нажмите на интересующую дисциплину.</p>
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

  // Фильтрация данных
  const filteredDisciplines = disciplines.filter(discipline => {
    // Поскольку у нас нет информации о семестре в API, распределяем равномерно
    const semester = discipline.idSubject % 2 === 0 ? 2 : 1;
    const semesterFilter = selectedSemester === 'first' ? semester === 1 : semester === 2;
    const courseFilter = selectedCourse === 'all' || discipline.course.toString() === selectedCourse;
    
    return semesterFilter && courseFilter;
  });

  // Сортировка по названию
  const sortedDisciplines = [...filteredDisciplines].sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.subjectName.localeCompare(b.subjectName);
    } else {
      return b.subjectName.localeCompare(a.subjectName);
    }
  });

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleDisciplineClick = (disciplineName: string) => {
    if (onDisciplineSelect) {
      onDisciplineSelect(disciplineName);
    }
  };

  // Если данные пользователя еще не загружены
  if (!user) {
    return (
      <div className="ds-disciplines-section">
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Загрузка данных пользователя...
        </div>
      </div>
    );
  }

  return (
    <div className="ds-disciplines-section">
      {/* Заголовок с кнопками */}
      <div className="ds-cabinet-header">
        <InfoIcon />
        <RefreshButton />
      </div>

      {/* Индикация использования кэша */}
      {isUsingCache && (
        <div className="ds-cache-warning">
          Используются кэшированные данные. Для актуальной информации обновите данные.
        </div>
      )}

      <div className="ds-disciplines-header">
        <div className="ds-view-tabs">
          <button
            className={`ds-view-tab ${activeTab === 'semesters' ? 'ds-active' : ''}`}
            onClick={() => setActiveTab('semesters')}
          >
            По семестрам
          </button>
          <button
            className={`ds-view-tab ${activeTab === 'course' ? 'ds-active' : ''}`}
            onClick={() => setActiveTab('course')}
          >
            По курсу
          </button>
        </div>
      </div>

      <div className="ds-disciplines-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            Загрузка дисциплин...
          </div>
        ) : error && !isUsingCache ? (
          <div className="ds-error-message">
            {error}
          </div>
        ) : (
          <>
            {activeTab === 'semesters' ? (
              <>
                <div className="ds-semester-controls">
                  <div className="ds-semester-tabs">
                    <button
                      className={`ds-semester-tab ${selectedSemester === 'first' ? 'ds-active' : ''}`}
                      onClick={() => setSelectedSemester('first')}
                    >
                      1-ый семестр
                    </button>
                    <button
                      className={`ds-semester-tab ${selectedSemester === 'second' ? 'ds-active' : ''}`}
                      onClick={() => setSelectedSemester('second')}
                    >
                      2-ой семестр
                    </button>
                  </div>
                </div>

                <div className="ds-disciplines-table-container">
                  <table className="ds-disciplines-table">
                    <thead>
                      <tr>
                        <th className="ds-number-column">№</th>
                        <th className="ds-subject-column">
                          <div className="ds-column-header">
                            <span>Предмет</span>
                            <button 
                              className="ds-sort-button"
                              onClick={toggleSortOrder}
                            >
                              <img 
                                src="/th-icons/sort_icon.svg" 
                                alt="Сортировка" 
                                className={`ds-sort-icon ${sortOrder === 'desc' ? 'ds-sort-desc' : ''}`}
                              />
                            </button>
                          </div>
                        </th>
                        <th className="ds-course-column">
                          <div className="ds-header-text">Курс</div>
                        </th>
                        <th className="ds-groups-column">
                          <div className="ds-header-text">
                            Количество<br />групп
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDisciplines.length > 0 ? (
                        sortedDisciplines.map((discipline, index) => (
                          <tr 
                            key={discipline.idSubject} 
                            className={`ds-discipline-row ${selectedDiscipline === discipline.subjectName ? 'ds-selected' : ''}`}
                            onClick={() => handleDisciplineClick(discipline.subjectName)}
                          >
                            <td className="ds-number-cell">{index + 1}.</td>
                            <td className="ds-subject-name">{discipline.subjectName}</td>
                            <td className="ds-course-cell">{discipline.course}</td>
                            <td className="ds-groups-cell">{discipline.countGroup}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                            Нет дисциплин для отображения
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="ds-course-controls">
                  <div className="ds-course-tabs">
                    <button
                      className={`ds-course-tab ${selectedCourse === 'all' ? 'ds-active' : ''}`}
                      onClick={() => setSelectedCourse('all')}
                    >
                      Все курсы
                    </button>
                    <button
                      className={`ds-course-tab ${selectedCourse === '1' ? 'ds-active' : ''}`}
                      onClick={() => setSelectedCourse('1')}
                    >
                      1 курс
                    </button>
                    <button
                      className={`ds-course-tab ${selectedCourse === '2' ? 'ds-active' : ''}`}
                      onClick={() => setSelectedCourse('2')}
                    >
                      2 курс
                    </button>
                    <button
                      className={`ds-course-tab ${selectedCourse === '3' ? 'ds-active' : ''}`}
                      onClick={() => setSelectedCourse('3')}
                    >
                      3 курс
                    </button>
                    <button
                      className={`ds-course-tab ${selectedCourse === '4' ? 'ds-active' : ''}`}
                      onClick={() => setSelectedCourse('4')}
                    >
                      4 курс
                    </button>
                  </div>
                </div>

                <div className="ds-disciplines-table-container">
                  <table className="ds-disciplines-table">
                    <thead>
                      <tr>
                        <th className="ds-number-column">№</th>
                        <th className="ds-subject-column">
                          <div className="ds-column-header">
                            <span>Предмет</span>
                            <button 
                              className="ds-sort-button"
                              onClick={toggleSortOrder}
                            >
                              <img 
                                src="/th-icons/sort_icon.svg" 
                                alt="Сортировка" 
                                className={`ds-sort-icon ${sortOrder === 'desc' ? 'ds-sort-desc' : ''}`}
                              />
                            </button>
                          </div>
                        </th>
                        <th className="ds-course-column">
                          <div className="ds-header-text">Курс</div>
                        </th>
                        <th className="ds-groups-column">
                          <div className="ds-header-text">
                            Количество<br />групп
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDisciplines.length > 0 ? (
                        sortedDisciplines.map((discipline, index) => (
                          <tr 
                            key={discipline.idSubject} 
                            className={`ds-discipline-row ${selectedDiscipline === discipline.subjectName ? 'ds-selected' : ''}`}
                            onClick={() => handleDisciplineClick(discipline.subjectName)}
                          >
                            <td className="ds-number-cell">{index + 1}.</td>
                            <td className="ds-subject-name">{discipline.subjectName}</td>
                            <td className="ds-course-cell">{discipline.course}</td>
                            <td className="ds-groups-cell">{discipline.countGroup}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                            Нет дисциплин для отображения
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};