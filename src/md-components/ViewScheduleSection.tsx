import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ViewScheduleSection.css';
import { API_BASE_URL } from '../constants/apiConstant';

type ApiLesson = {
  id: number;
  dayWeek: string;
  typeWeek: string;
  numPair: number;
  room: number | null;
  idSt: number;
  idGroup: number;
  subgroup: number | null;
  replacement: boolean;
  idSubject: number;
  nameSubject: string;
  idTeacher: number | null;
  lastnameTeacher: string | null;
  nameTeacher: string | null;
  patronymicTeacher: string | null;
  numberGroup: number;
};

type Lesson = {
  id: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacher?: string;
  room?: string;
  numPair: number;
  subgroup?: number;
  dayWeek: string;
  typeWeek: string;
  replacement: boolean;
};

type DaySchedule = {
  weekday: string;
  lessons: Lesson[];
  noClassesText?: string;
};

type GroupedSlot = {
  startTime: string;
  endTime: string;
  lessons: Lesson[];
};

const pairTimes: Record<number, { start: string; end: string }> = {
  1: { start: '8:30', end: '10:10' },
  2: { start: '10:20', end: '12:00' },
  3: { start: '12:45', end: '14:25' },
  4: { start: '14:35', end: '16:15' },
  5: { start: '16:25', end: '18:05' },
  6: { start: '18:15', end: '19:55' },
  7: { start: '20:05', end: '21:45' },
  8: { start: '21:55', end: '23:35' },
};

// определение верхней/нижней недели
const getCurrentWeekType = (): 'upper' | 'lower' => {
  const today = new Date();
  const startOfAcademicYear = new Date(2025, 8, 1);
  const diffTime = today.getTime() - startOfAcademicYear.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  return weekNumber % 2 === 1 ? 'upper' : 'lower';
};

// конвертации времени в минуты
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// группировка пар по времени
const groupLessonsByTime = (lessons: Lesson[]): GroupedSlot[] => {
  const groups: Record<string, GroupedSlot> = {};
  
  for (const lesson of lessons) {
    const key = `${lesson.startTime}-${lesson.endTime}`;
    if (!groups[key]) {
      groups[key] = { 
        startTime: lesson.startTime, 
        endTime: lesson.endTime, 
        lessons: [] 
      };
    }
    groups[key].lessons.push(lesson);
  }
  
  return Object.values(groups).sort((a, b) => 
    timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );
};

// получение дней недели
const getWeekDays = (): string[] => {
  return ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
};

// преобразование API данных
const transformApiData = (apiData: ApiLesson[], weekDays: string[]): DaySchedule[] => {
  return weekDays.map((weekday) => {
    const dayLessons = apiData
      .filter(lesson => lesson.dayWeek === weekday)
      .map(lesson => {
        const pairTime = pairTimes[lesson.numPair];
        if (!pairTime) return null;

        let teacher: string | undefined = undefined;
        if (lesson.lastnameTeacher && lesson.nameTeacher) {
          const nameInitial = lesson.nameTeacher[0] || '';
          const patronymicInitial = lesson.patronymicTeacher ? lesson.patronymicTeacher[0] : '';
          teacher = `${lesson.lastnameTeacher} ${nameInitial}.${patronymicInitial ? patronymicInitial + '.' : ''}`.trim();
        }
        
        let room: string = 'ауд. -';
        if (lesson.room !== null)  {
          room = `ауд. ${lesson.room}`;
        }
        
        const subgroup = lesson.subgroup && lesson.subgroup > 0 ? lesson.subgroup : undefined;
        const subjectName = lesson.replacement 
          ? `${lesson.nameSubject || `Предмет ${lesson.idSubject}`} (Замена)`
          : lesson.nameSubject || `Предмет ${lesson.idSubject}`;

        const lessonData: Lesson = {
          id: lesson.id,
          startTime: pairTime.start,
          endTime: pairTime.end,
          subject: subjectName,
          teacher,
          room,
          subgroup,
          numPair: lesson.numPair,
          dayWeek: lesson.dayWeek,
          typeWeek: lesson.typeWeek,
          replacement: lesson.replacement
        };
        
        return lessonData;
      })
      .filter((lesson): lesson is NonNullable<typeof lesson> => lesson !== null);
    
    return {
      weekday,
      lessons: dayLessons,
      noClassesText: dayLessons.length === 0 ? 'Занятий нет' : undefined
    };
  });
};

// фильтрация по типу недели
const filterScheduleByWeekType = (schedule: DaySchedule[], weekType: 'upper' | 'lower' | 'common'): DaySchedule[] => {
  return schedule.map(day => ({
    ...day,
    lessons: day.lessons.filter(lesson => 
      lesson.typeWeek === 'Общая' || 
      (weekType === 'upper' && lesson.typeWeek === 'Верхняя') ||
      (weekType === 'lower' && lesson.typeWeek === 'Нижняя')
    )
  }));
};

export const ViewScheduleSection: React.FC = () => {
  const navigate = useNavigate();
  const [selectedWeek, setSelectedWeek] = useState<'upper' | 'lower'>(getCurrentWeekType());
  const [scheduleData, setScheduleData] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [weekDays, setWeekDays] = useState<string[]>([]);

  // получение выбранной группы из localStorage
  useEffect(() => {
    const savedGroup = localStorage.getItem('selectedGroupForEdit') || '';
    setSelectedGroup(savedGroup);
  }, []);

  // получение дней недели
  useEffect(() => {
    const days = getWeekDays();
    setWeekDays(days);
  }, []);

  // загрузка расписания
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!selectedGroup) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/api/v1/schedule/group/${selectedGroup}`);
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки расписания');
        }
        
        const apiData: ApiLesson[] = await response.json();
        const transformedData = transformApiData(apiData, weekDays);
        const filteredData = filterScheduleByWeekType(transformedData, selectedWeek);
        setScheduleData(filteredData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка');
        console.error('Ошибка загрузки расписания:', err);
      } finally {
        setLoading(false);
      }
    };

    if (selectedGroup && weekDays.length > 0) {
      fetchSchedule();
    }
  }, [selectedGroup, weekDays, selectedWeek]);

  // обновление данных
  const refreshData = async () => {
    if (!selectedGroup) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/v1/schedule/group/${selectedGroup}`);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки расписания');
      }
      const apiData: ApiLesson[] = await response.json();
      const transformedData = transformApiData(apiData, weekDays);
      const filteredData = filterScheduleByWeekType(transformedData, selectedWeek);
      setScheduleData(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
      console.error('Ошибка обновления расписания:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    navigate('/metodist/view-groups');
  };

  if (loading) {
    return (
      <div className="v-view-schedule-loading">
        <div className="v-spinner"></div>
        <p>Загрузка расписания группы ...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="v-view-schedule-error">
        <h3>Ошибка загрузки расписания</h3>
        <p>{error}</p>
        <button onClick={refreshData} className="v-retry-button">
          Попробовать снова
        </button>
        <button onClick={handleBackClick} className="back-button">
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="v-view-schedule-container">
      <div className="v-view-schedule-header">
        <button className="back-button" onClick={handleBackClick}>
          Назад
        </button>
        
        <div className="v-header-controls">
          <div className="v-week-switcher">
            <button 
              className={`v-week-btn ${selectedWeek === 'upper' ? 'active' : ''}`}
              onClick={() => setSelectedWeek('upper')}>
              Верхняя неделя
            </button>
            <button 
              className={`v-week-btn ${selectedWeek === 'lower' ? 'active' : ''}`}
              onClick={() => setSelectedWeek('lower')}>
              Нижняя неделя
            </button>
          </div>
          
          <button onClick={refreshData} className="v-refresh-button" title="Обновить расписание">
            <img src="/st-icons/upload_icon.svg" alt="Обновить" className="v-refresh-icon" />
          </button>
        </div>
      </div>

      <div className="v-schedule-main-content">
        {scheduleData.length > 0 ? (
          scheduleData.map((day) => (
            <div key={day.weekday} className="v-day-section">
              <div className="v-day-header">
                <h2 className="v-day-name">{day.weekday}</h2>
              </div>
              
              <div className="v-lesson-container">
                {day.lessons.length > 0 ? (
                  groupLessonsByTime(day.lessons).map((slot) => (
                    slot.lessons.length > 1 ? (
                      // разделенные пары (две в одно время)
                      <div key={`${slot.startTime}-${slot.endTime}`} className="v-separated-lesson-row">
                        <div className="v-lesson-time">
                          {slot.startTime} - {slot.endTime}
                        </div>
                        
                        <div className="v-separated-lesson-content">
                          {slot.lessons.map((lesson, index) => (
                            <div 
                              key={lesson.id} 
                              className={`v-separated-lesson-item ${lesson.replacement ? 'replacement' : ''}`}>
                              <div className="v-lesson-subject">
                                {lesson.subject}
                              </div>
                              
                              <div className="v-lesson-meta">
                                {lesson.teacher && (
                                  <div className="v-lesson-teacher">
                                    {lesson.teacher}
                                  </div>
                                )}
                                
                                {lesson.room && (
                                  <div className="v-lesson-room">
                                    {lesson.room}
                                  </div>
                                )}
                                
                                {lesson.subgroup && (
                                  <div className="v-lesson-subgroup">
                                    Подгруппа {lesson.subgroup}
                                  </div>
                                )}
                              </div>
                              
                              {lesson.replacement && (
                                <div className="v-replacement-badge">
                                  Замена
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // обычная пара
                      <div 
                        key={slot.lessons[0].id} 
                        className={`v-lesson-row ${slot.lessons[0].replacement ? 'replacement' : ''}`}>
                        <div className="v-lesson-time">
                          {slot.lessons[0].startTime} - {slot.lessons[0].endTime}
                        </div>
                        
                        <div className="v-lesson-content">
                          <div className="v-lesson-info">
                            <div className="v-lesson-subject">
                              {slot.lessons[0].subject}
                            </div>
                            
                            <div className="v-lesson-meta">
                              {slot.lessons[0].teacher && (
                                <div className="v-lesson-teacher">
                                  {slot.lessons[0].teacher}
                                </div>
                              )}
                              
                              {slot.lessons[0].room && (
                                <div className="v-lesson-room">
                                  {slot.lessons[0].room}
                                </div>
                              )}
                              
                              {slot.lessons[0].subgroup && (
                                <div className="v-lesson-subgroup">
                                  Подгруппа {slot.lessons[0].subgroup}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {slot.lessons[0].replacement && (
                            <div className="v-replacement-badge">
                              Замена
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  ))
                ) : (
                  <div className="v-no-lessons">
                    <div className="v-no-lessons-text">{day.noClassesText || 'Занятий нет'}</div>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : !loading && (
          <div className="v-empty-schedule">
            <h3>Расписание не найдено</h3>
            <p>Для группы {selectedGroup} нет расписания на выбранную неделю</p>
          </div>
        )}
      </div>
    </div>
  );
};