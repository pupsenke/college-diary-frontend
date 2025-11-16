import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import '../st-components/ScheduleSection.css';

const API_BASE_URL = 'http://localhost:8080';

export interface ScheduleItem {
  id: number;
  dayWeek: string;
  typeWeek: string;
  numPair: number;
  room: string;
  idSt: number;
  idSubject: number;
  nameSubject: string;
  idTeacher: number;
  lastnameTeacher: string;
  nameTeacher: string;
  patronymicTeacher: string;
  idGroup: number;
  numberGroup: number;
  subgroup: number; 
  replacement: boolean;
}

type Lesson = {
  id: number;
  startTime: string;
  endTime: string;
  subject: string;
  group: number;
  subgroup?: number;
  room?: string;
  typeWeek: string;
};

type DaySchedule = {
  date: { weekday: string; date: string };
  lessons: Lesson[];
  noClassesText?: string;
};

type GroupedSlot = {
  startTime: string;
  endTime: string;
  lessons: Lesson[];
};

const CACHE_KEYS = {
  TEACHER_SCHEDULE: 'teacher_schedule_cache',
  TIMESTAMP: 'cache_timestamp'
};

// функции для работы с кэшем
const generateHash = (data: any): string => {
  const jsonString = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

const saveToCache = <T,>(key: string, data: T, userId: number): void => {
  try {
    const cacheKey = `${key}_${userId}`;
    const cacheData = {
      data,
      timestamp: Date.now(),
      hash: generateHash(data)
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log(`Расписание преподавателя. Данные сохранены в кэш: ${key}`);
  } catch (error) {
    console.warn('Расписание преподавателя. Не удалось сохранить данные в кэш:', error);
  }
};

const loadFromCache = <T,>(key: string, userId: number, maxAge: number = 24 * 60 * 60 * 1000): T | null => {
  try {
    const cacheKey = `${key}_${userId}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    const { data, timestamp, hash } = JSON.parse(cached);
    // проверка актуальности кэша
    const isExpired = Date.now() - timestamp > maxAge;
    if (isExpired) {
      localStorage.removeItem(cacheKey);
      console.log(`Расписание преподавателя. Кэш устарел: ${key}`);
      return null;
    }
    // проверка целостности данных
    const currentHash = generateHash(data);
    if (currentHash !== hash) {
      localStorage.removeItem(cacheKey);
      console.log(`Расписание преподавателя. Целостность кэша нарушена: ${key}`);
      return null;
    }
    console.log(`Расписание преподавателя. Данные загружены из кэша: ${key}`);
    return data;
  } catch (error) {
    console.warn('Расписание преподавателя. Ошибка при загрузке из кэша:', error);
    return null;
  }
};

const clearTeacherCache = (userId: number): void => {
  try {
    localStorage.removeItem(`${CACHE_KEYS.TEACHER_SCHEDULE}_${userId}`);
    console.log('Расписание преподавателя. Кэш преподавателя очищен');
  } catch (error) {
    console.warn('Расписание преподавателя. Ошибка при очистке кэша:', error);
  }
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

// функция для определения верхней/нижней недели
export const getCurrentWeekType = (): 'upper' | 'lower' => {
  const today = new Date();
  const startOfAcademicYear = new Date(2025, 8, 1); // 1 сентября 2025 (месяцы 0-11)
  const diffTime = today.getTime() - startOfAcademicYear.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1; 
  // Согласно календарю: нечетные недели - верхние, четные - нижние
  return weekNumber % 2 === 1 ? 'upper' : 'lower';
};

// функция для получения номера текущей недели
export const getCurrentWeekNumber = (): number => {
  const today = new Date();
  const startOfAcademicYear = new Date(2025, 8, 1); // 1 сентября 2025
  const diffTime = today.getTime() - startOfAcademicYear.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
};

// функция для получения дат недели с определением типа недели
const getWeekDates = (weekType?: 'upper' | 'lower'): { 
  weekday: string; 
  date: string; 
  dateObj: Date;
  isCurrentWeek: boolean;
}[] => {
  const daysOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const today = new Date();
  const currentWeekType = getCurrentWeekType();  
  const targetWeekType = weekType || currentWeekType;
  const monday = new Date(today);
  const dayOfWeek = monday.getDay();
  const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  monday.setDate(diff);

  // если нужна противоположная неделя, сдвигаем на 7 дней
  if (targetWeekType !== currentWeekType) {
    monday.setDate(monday.getDate() + (targetWeekType === 'upper' ? -7 : 7));
  }
  const isCurrentWeek = targetWeekType === currentWeekType;
  return daysOfWeek.map((weekday, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return {
      weekday,
      date: `${day}.${month}`,
      dateObj: date,
      isCurrentWeek
    };
  });
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function groupLessonsByTime(lessons: Lesson[]): GroupedSlot[] {
  const groups: Record<string, GroupedSlot> = {};
  for (const lesson of lessons) {
    const key = `${lesson.startTime}-${lesson.endTime}`;
    if (!groups[key]) {
      groups[key] = { startTime: lesson.startTime, endTime: lesson.endTime, lessons: [] };
    }
    groups[key].lessons.push(lesson);
  }
  return Object.values(groups).sort((a, b) => 
    timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );
}

const transformApiData = (apiData: ScheduleItem[], weekDates: { weekday: string; date: string; isCurrentWeek: boolean }[]): DaySchedule[] => {
  return weekDates.map(({ weekday, date, isCurrentWeek }) => {
    const dayLessons = apiData
      .filter(lesson => lesson.dayWeek === weekday)
      .map(lesson => {
        const pairTime = pairTimes[lesson.numPair];
        if (!pairTime) {
          console.warn(`Неизвестный номер пары: ${lesson.numPair} для урока ${lesson.id}`);
          return null;
        }
        let room: string;
        if (lesson.room !== undefined && lesson.room !== null && lesson.room !== "") {
          room = `ауд. ${lesson.room}`;
        } else {
          room = `ауд. -`;
        }
        const subgroup = lesson.subgroup && lesson.subgroup > 0 ? lesson.subgroup : undefined;
        const transformedLesson: Lesson = {
          id: lesson.id,
          startTime: pairTime.start,
          endTime: pairTime.end,
          subject: lesson.nameSubject || `Предмет ${lesson.idSubject}`,
          group: lesson.numberGroup,
          subgroup,
          room,
          typeWeek: lesson.typeWeek
        };
        return transformedLesson;
      })
      .filter((lesson): lesson is Lesson => lesson !== null);
    const groupedLessons: Lesson[] = [];
    const timeGroups: Record<string, Lesson[]> = {};
    dayLessons.forEach(lesson => {
      const timeKey = `${lesson.startTime}-${lesson.endTime}`;
      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = [];
      }
      timeGroups[timeKey].push(lesson);
    });
    Object.values(timeGroups).forEach(lessonsInSlot => {
      if (lessonsInSlot.length === 1) {
        groupedLessons.push(lessonsInSlot[0]);
      } else {
        groupedLessons.push(...lessonsInSlot);
      }
    });
    groupedLessons.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    return {
      date: { weekday, date },
      lessons: groupedLessons,
      noClassesText: groupedLessons.length === 0 ? 'Нет пар' : undefined
    };
  });
};

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

// функция для определения следующей пары
const getNextLesson = (lessons: Lesson[]): Lesson | null => {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const allLessons = groupLessonsByTime(lessons).flatMap(slot => slot.lessons);
  return allLessons.find(lesson => 
    timeToMinutes(lesson.startTime) > currentTime
  ) || null;
};

const DayTabs: React.FC<{
  days: { weekday: string; date: string; isCurrentWeek: boolean }[];
  activeDay: string;
  onDayChange: (day: string) => void;
  currentDay: string;
  isCurrentWeek: boolean;
}> = ({ days, activeDay, onDayChange, currentDay, isCurrentWeek }) => {
  return (
    <div className="day-tabs-container">
      <div className="day-tabs">
        {days.map(({ weekday, date, isCurrentWeek: dayInCurrentWeek }) => (
          <button
            key={weekday}
            className={`day-tab ${activeDay === weekday ? 'active' : ''} ${
              currentDay === weekday && isCurrentWeek ? 'current-day' : ''
            }`}
            onClick={() => onDayChange(weekday)}
          >
            <div className="day-tab-weekday">{weekday}</div>
            <div className="day-tab-date">{date}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

const DayScheduleView: React.FC<{ 
  scheduleData: DaySchedule[];
  activeDay: string;
}> = ({ scheduleData, activeDay }) => {
  const daySchedule = scheduleData.find(day => day.date.weekday === activeDay);
  if (!daySchedule) {
    return (
      <div className="day-schedule-content">
        <div className="no-classes">
          <div className="no-classes-text">Расписание не найдено</div>
        </div>
      </div>
    );
  }
  return (
    <div className="day-schedule-content">
      {daySchedule.lessons.length > 0 ? (
        groupLessonsByTime(daySchedule.lessons).map(({ startTime, endTime, lessons: grouped }: GroupedSlot) => (
          grouped.length > 1 ? (
            <div key={`${startTime}-${endTime}`} className="separated-lesson-row">
              <div className="separated-time">
                {startTime} - {endTime}
              </div>
              <div className="separated-lesson-content">
                {grouped.map((lesson: Lesson, index: number) => (
                  <div 
                    key={lesson.id} 
                    className="separated-lesson-item"
                  >
                    <div className="separated-subject">
                      {lesson.subject}
                    </div>
                    <div className="separated-lesson-meta">
                      <div className="lesson-group-info">
                        <div className="lesson-group">Группа: {lesson.group}</div>
                        {lesson.subgroup && <div className="lesson-subgroup">Подгруппа №{lesson.subgroup}</div>}
                      </div>
                      {lesson.room && <div className="separated-room">{lesson.room}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div 
              key={`${startTime}-${endTime}`} 
              className="lesson-row"
            >
              <div className="lesson-time">{startTime} - {endTime}</div>
              <div className="lesson-content">
                <div className="lesson-info">
                  <div className="lesson-subject">
                    {grouped[0].subject}
                  </div>
                  <div className="lesson-meta">
                    <div className="lesson-group-info">
                      <div className="lesson-group">Группа: {grouped[0].group}</div>
                      {grouped[0].subgroup && <div className="lesson-subgroup">Подгруппа №{grouped[0].subgroup}</div>}
                    </div>
                    {grouped[0].room && <div className="lesson-room">{grouped[0].room}</div>}
                  </div>
                </div>
              </div>
            </div>
          )
        ))
      ) : (
        <div className="no-classes">
          <div className="no-classes-text">{daySchedule.noClassesText || 'Нет пар'}</div>
        </div>
      )}
    </div>
  );
};

const NextLessonCard: React.FC<{ scheduleData: DaySchedule[] }> = ({ scheduleData }) => {
  const today = new Date();
  const currentDateStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}`;
  const todaySchedule = scheduleData.find(day => day.date.date === currentDateStr);
  if (!todaySchedule || todaySchedule.lessons.length === 0) {
    return null;
  }
  const nextLesson = getNextLesson(todaySchedule.lessons);
  if (!nextLesson) {
    return (
      <div className="next-lesson">
        <div className="next-lesson-title">
          <h3>Следующая пара</h3>
        </div>
        <div className="next-lesson-card">
          <div className="no-next-lesson">Пар на сегодня больше нет</div>
        </div>
      </div>
    );
  }
  return (
    <div className="next-lesson">
      <div className="next-lesson-title">
        <h3>Следующая пара</h3>
      </div>
      <div className="next-lesson-card">
        <div className="next-lesson-subject">{nextLesson.subject}</div>
        <div className="next-lesson-details">
          <div className="next-lesson-detail">
            <div className="detail-label">Время</div>
            <div className="detail-value">{nextLesson.startTime} - {nextLesson.endTime}</div>
          </div>
          <div className="next-lesson-detail">
            <div className="detail-label">Группа</div>
            <div className="detail-value">{nextLesson.group}</div>
          </div>
          {nextLesson.subgroup && (
            <div className="next-lesson-detail">
              <div className="detail-label">Подгруппа №</div>
              <div className="detail-value">{nextLesson.subgroup}</div>
            </div>
          )}
          {nextLesson.room && (
            <div className="next-lesson-detail">
              <div className="detail-label">Аудитория</div>
              <div className="detail-value">{nextLesson.room}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ScheduleSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upper' | 'lower'>(getCurrentWeekType());
  const [activeDay, setActiveDay] = useState<string>('');
  const [scheduleData, setScheduleData] = useState<DaySchedule[]>([]);
  const [weekDates, setWeekDates] = useState<{ weekday: string; date: string; isCurrentWeek: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { isTeacher, userId } = useUser();
  const currentWeekNumber = getCurrentWeekNumber();
  const currentWeekType = getCurrentWeekType();

  useEffect(() => {
    const dates = getWeekDates(activeTab);
    setWeekDates(dates);
    // установка активного день 
    const today = new Date();
    const currentDateStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    let defaultActiveDay = dates[0].weekday;
    // если это текущая неделя, выбираем текущий день
    if (dates.some(day => day.isCurrentWeek)) {
      const currentDay = dates.find(day => day.date === currentDateStr)?.weekday;
      if (currentDay) {
        defaultActiveDay = currentDay;
      }
    }
    setActiveDay(defaultActiveDay);
  }, [activeTab]);

  // функция для принудительного обновления данных
  const refreshData = async () => {
    if (!isTeacher || !userId) return;
    setLoading(true);
    setUsingCachedData(false);
    setError(null);
    try {
      clearTeacherCache(userId);
      console.log('Расписание преподавателя. Принудительное обновление данных преподавателя');
      const response = await fetch(`${API_BASE_URL}/api/v1/schedule/teacher/${userId}`);
      if (!response.ok) {
        throw new Error(`Ошибка загрузки: ${response.status}`);
      }
      const apiData: ScheduleItem[] = await response.json();
      saveToCache(CACHE_KEYS.TEACHER_SCHEDULE, apiData, userId);
      const transformedData = transformApiData(apiData, weekDates);
      setScheduleData(transformedData);
      setLastUpdated(new Date());
      console.log('Расписание преподавателя. Данные преподавателя обновлены');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(errorMessage);
      console.error('Расписание преподавателя. Ошибка обновления данных:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!isTeacher || !userId) return;
      setLoading(true);
      setError(null);
      try {
        const cachedData = loadFromCache<ScheduleItem[]>(CACHE_KEYS.TEACHER_SCHEDULE, userId);
        if (cachedData) {
          setUsingCachedData(true);
          const transformedData = transformApiData(cachedData, weekDates);
          setScheduleData(transformedData);
          setLastUpdated(new Date());
        }
        console.log('Расписание преподавателя. Загрузка расписания преподавателя с сервера');
        const response = await fetch(`${API_BASE_URL}/api/v1/schedule/teacher/${userId}`);
        if (!response.ok) {
          throw new Error(`Ошибка загрузки: ${response.status}`);
        }
        const apiData: ScheduleItem[] = await response.json();
        saveToCache(CACHE_KEYS.TEACHER_SCHEDULE, apiData, userId);
        if (!cachedData || generateHash(cachedData) !== generateHash(apiData)) {
          console.log('Расписание преподавателя. Обновление расписания преподавателя из API');
          setUsingCachedData(false);
          const transformedData = transformApiData(apiData, weekDates);
          setScheduleData(transformedData);
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.error('Расписание преподавателя. Ошибка загрузки расписания:', err);
        if (!scheduleData.length) {
          setError(err instanceof Error ? err.message : 'Ошибка загрузки расписания');
        }
      } finally {
        setLoading(false);
      }
    };
    if (userId && weekDates.length > 0) {
      fetchSchedule();
    }
  }, [isTeacher, userId, weekDates]);

  const getFilteredSchedule = (weekType: 'upper' | 'lower') => {
    return filterScheduleByWeekType(scheduleData, weekType);
  };

  // получение текущего день недели для подсветки
  const getCurrentDay = (): string => {
    const today = new Date();
    const currentDateStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    return weekDates.find(day => day.date === currentDateStr)?.weekday || '';
  };

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return '';
    return `Обновлено: ${date.toLocaleTimeString()}`;
  };
  const currentDay = getCurrentDay();
  const isCurrentWeek = weekDates.some(day => day.isCurrentWeek);

  if (loading && !scheduleData.length) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Загрузка расписания</p>
      </div>
    );
  }

  if (error && !scheduleData.length) {
    return (
      <div className="error">
        <div className="error-message">Ошибка: {error}</div>
        <button onClick={refreshData} className="retry-button">
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!isTeacher) {
    return <div className="error">Доступно только для преподавателей</div>;
  }

  if (!scheduleData || scheduleData.length === 0) {
    return (
      <div className="schedule-section">
        <div className="no-classes">
          <div className="no-classes-text">Расписание не найдено</div>
          <button onClick={refreshData} className="retry-button">
            Обновить
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="schedule-section">
      <div className="schedule-header">
        <div className="week-info">
        </div>
        <div className="week-type-tabs">
          <button 
            className={`week-type-tab ${activeTab === 'upper' ? 'active' : ''}`}
            onClick={() => setActiveTab('upper')}
          >
            Верхняя неделя
          </button>
          <button 
            className={`week-type-tab ${activeTab === 'lower' ? 'active' : ''}`}
            onClick={() => setActiveTab('lower')}
          >
            Нижняя неделя
          </button>
        </div>
        <div className="header-actions">
          <button onClick={refreshData} className="refresh-button" title="Обновить данные">
            <img src="/st-icons/upload_icon.svg" alt="Обновить" className="refresh-icon" />
          </button>
        </div>
      </div>
      <div className="schedule-container">
        <DayTabs 
          days={weekDates}
          activeDay={activeDay}
          onDayChange={setActiveDay}
          currentDay={currentDay}
          isCurrentWeek={isCurrentWeek}
        />
        
        <div className="schedule-content">
          <DayScheduleView 
            scheduleData={getFilteredSchedule(activeTab)} 
            activeDay={activeDay}
          />
          
          {/* блок "Следующая пара" показывается только для текущего дня текущей недели */}
          {activeDay === currentDay && isCurrentWeek && (
            <NextLessonCard scheduleData={getFilteredSchedule(activeTab)} />
          )}
        </div>
      </div>
    </div>
  );
};