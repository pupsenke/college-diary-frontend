import React, { useState, useEffect } from 'react';
import { useUser, Student } from '../context/UserContext';
import './ScheduleSection.css';

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

type Mark = {
  number: number;
  value: number | null;
};

type Teacher = {
  idTeacher: number;
  lastnameTeacher: string;
  nameTeacher: string;
  patronymicTeacher: string;
};

type NameSubjectTeachersDTO = {
  idSt: number;
  idSubject: number;
  nameSubject: string;
  teachers: Teacher[];
};

type StudentMarks = {
  nameSubjectTeachersDTO: NameSubjectTeachersDTO;
  marksBySt: (Mark | null)[];
  certification: any;
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

export type DaySchedule = {
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
  SCHEDULE: 'schedule_cache',
  MARKS: 'marks_cache',
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
    console.log(`Расписание. Данные сохранены в кэш: ${key}`);
  } catch (error) {
    console.warn('Расписание. Не удалось сохранить данные в кэш:', error);
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
      console.log(`Расписание. Кэш устарел: ${key}`);
      return null;
    }
    // проверка целостности данных
    const currentHash = generateHash(data);
    if (currentHash !== hash) {
      localStorage.removeItem(cacheKey);
      console.log(`Расписание. Целостность кэша нарушена: ${key}`);
      return null;
    }
    console.log(`Расписание. Данные загружены из кэша: ${key}`);
    return data;
  } catch (error) {
    console.warn('Расписание. Ошибка при загрузке из кэша:', error);
    return null;
  }
};

const clearUserCache = (userId: number): void => {
  try {
    localStorage.removeItem(`${CACHE_KEYS.SCHEDULE}_${userId}`);
    localStorage.removeItem(`${CACHE_KEYS.MARKS}_${userId}`);
    console.log('Расписание. Кэш пользователя очищен');
  } catch (error) {
    console.warn('Расписание. Ошибка при очистке кэша:', error);
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

// определение верхней/нижней недели
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

// получение дат недели с определением типа недели
const getWeekDates = (weekType?: 'upper' | 'lower'): { 
  weekday: string; 
  date: string; 
  dateObj: Date;
  isCurrentWeek: boolean;
}[] => {
  const daysOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const today = new Date();
  const currentWeekType = getCurrentWeekType();
  // если тип недели не указан, используем текущий
  const targetWeekType = weekType || currentWeekType;
  // понедельник текущей недели
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

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function groupLessonsByTime(lessons: Lesson[]): GroupedSlot[] {
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

// тип для преобразованного урока
type TransformedLesson = {
  id: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacher?: string;
  room?: string;
  subgroup?: number;
  numPair: number;
  dayWeek: string;
  typeWeek: string;
  replacement: boolean;
};

export const transformApiData = (apiData: ApiLesson[], weekDates: { weekday: string; date: string; isCurrentWeek: boolean }[]): DaySchedule[] => {
  return weekDates.map(({ weekday, date, isCurrentWeek }) => {
    const dayLessons = apiData
      .filter(lesson => lesson.dayWeek === weekday)
      .map(lesson => {
        const pairTime = pairTimes[lesson.numPair];

        let teacher: string | undefined = undefined;
        if (lesson.lastnameTeacher && lesson.nameTeacher) {
          const nameInitial = lesson.nameTeacher[0] || '';
          const patronymicInitial = lesson.patronymicTeacher ? lesson.patronymicTeacher[0] : '';
          teacher = `${lesson.lastnameTeacher} ${nameInitial}.${patronymicInitial ? patronymicInitial + '.' : ''}`.trim();
        }
        let room: string;
        if (lesson.replacement) {
          room = lesson.room !== null ? `ауд. ${lesson.room}` : "ауд. -";
        } else {
          // обычные занятия
          if (lesson.room !== undefined && lesson.room !== null)  {
            room = `ауд. ${lesson.room}`;
          }
          else {
            room = `ауд. -`
          }
        }
        const subgroup = lesson.subgroup && lesson.subgroup > 0 ? lesson.subgroup : undefined;
        const subjectName = lesson.replacement 
          ? `${lesson.nameSubject || `Предмет ${lesson.idSubject}`} (Замена)`
          : lesson.nameSubject || `Предмет ${lesson.idSubject}`;

        const transformedLesson: TransformedLesson = {
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
        return transformedLesson;
      })
      .filter((lesson): lesson is TransformedLesson => lesson !== null);
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

const getNextLesson = (lessons: Lesson[]): Lesson | null => {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const allLessons = groupLessonsByTime(lessons).flatMap(slot => slot.lessons);
  return allLessons.find(lesson => 
    timeToMinutes(lesson.startTime) > currentTime
  ) || null;
};

export const MarksModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  marks: StudentMarks[];
}> = ({ isOpen, onClose, subjectName, marks }) => {
  if (!isOpen) return null;
  const subjectData = marks.find(mark => 
    mark.nameSubjectTeachersDTO?.nameSubject === subjectName
  );
  if (!subjectData) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{subjectName}</h3>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <div className="no-marks">
              <p>Нет данных по этому предмету</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // фильтрация и сотрировка оценок
  const subjectMarks = subjectData.marksBySt
    .filter((mark): mark is Mark => mark !== null && mark.value !== null)
    .sort((a, b) => b.number - a.number)
    .slice(0, 5);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{subjectName}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {subjectMarks.length > 0 ? (
            <div className="marks-list">
              <div className="marks-header">
                <span>Оценка</span>
                <span>Преподаватель</span>
              </div>
              {subjectMarks.map((mark, index) => {
                const teacher = subjectData.nameSubjectTeachersDTO.teachers[0];
                const teacherName = teacher ? 
                  `${teacher.lastnameTeacher} ${teacher.nameTeacher[0]}.${teacher.patronymicTeacher ? teacher.patronymicTeacher[0] + '.' : ''}` 
                  : 'Не указан';
                return (
                  <div key={index} className="mark-item">
                    <span className={`mark-value ${
                      mark.value && mark.value >= 4 ? 'good' : 
                      mark.value && mark.value >= 3 ? 'average' : 'poor'
                    }`}>
                      {mark.value}
                    </span>
                    <span className="mark-teacher">{teacherName}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-marks">
              <p>Нет оценок по этому предмету</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
  onLessonClick: (subjectName: string) => void;
}> = ({ scheduleData, activeDay, onLessonClick }) => {
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
        groupLessonsByTime(daySchedule.lessons).map((slot) => (
          slot.lessons.length > 1 ? (
            <div key={`${slot.startTime}-${slot.endTime}`} className="separated-lesson-row clickable-lesson">
              <div className="separated-time">
                {slot.startTime} - {slot.endTime}
              </div>
              <div className="separated-lesson-content">
                {slot.lessons.map((lesson: Lesson, index: number) => (
                  <div 
                    key={lesson.id} 
                    className={`separated-lesson-item clickable-lesson ${lesson.replacement ? 'replacement' : ''}`}
                    onClick={() => onLessonClick(lesson.subject)}
                  >
                    <div className="separated-subject">
                      {lesson.subject}
                    </div>
                    <div className="separated-lesson-meta">
                      {lesson.teacher && <div className="separated-teacher-room">{lesson.teacher}</div>}
                      {lesson.room && <div className="separated-room">{lesson.room}</div>}
                      {lesson.subgroup && <div className="separated-subgroup">Подгруппа №{lesson.subgroup}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div 
              key={`${slot.startTime}-${slot.endTime}`} 
              className={`lesson-row clickable-lesson ${slot.lessons[0].replacement ? 'replacement' : ''}`}
              onClick={() => onLessonClick(slot.lessons[0].subject)}
            >
              <div className="lesson-time">{slot.startTime} - {slot.endTime}</div>
              <div className="lesson-content">
                <div className="lesson-info">
                  <div className="lesson-subject">
                    {slot.lessons[0].subject}
                  </div>
                  <div className="lesson-meta">
                    {slot.lessons[0].teacher && <div className="lesson-teacher-room">{slot.lessons[0].teacher}</div>}
                    {slot.lessons[0].room && <div className="lesson-room">{slot.lessons[0].room}</div>}
                    {slot.lessons[0].subgroup && <div className="lesson-subgroup">Подгруппа №{slot.lessons[0].subgroup}</div>}
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

const NextLessonCard: React.FC<{ 
  scheduleData: DaySchedule[];
  onLessonClick: (subjectName: string) => void;
}> = ({ scheduleData, onLessonClick }) => {
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
    <div 
      className="next-lesson clickable-lesson"
      onClick={() => onLessonClick(nextLesson.subject)}
    >
      <div className="next-lesson-title">
        <h3>Следующая пара</h3>
      </div>
      <div className={`next-lesson-card ${nextLesson.replacement ? 'replacement' : ''}`}>
        <div className="next-lesson-subject">
          {nextLesson.subject}
        </div>
        <div className="next-lesson-details">
          <div className="next-lesson-detail">
            <div className="detail-label">Время</div>
            <div className="detail-value">{nextLesson.startTime} - {nextLesson.endTime}</div>
          </div>
          {nextLesson.teacher && (
            <div className="next-lesson-detail">
              <div className="detail-label">Преподаватель</div>
              <div className="detail-value">{nextLesson.teacher}</div>
            </div>
          )}
          {nextLesson.room && (
            <div className="next-lesson-detail">
              <div className="detail-label">Аудитория</div>
              <div className="detail-value">{nextLesson.room}</div>
            </div>
          )}
          {nextLesson.subgroup && (
            <div className="next-lesson-detail">
              <div className="detail-label">Подгруппа №</div>
              <div className="detail-value">{nextLesson.subgroup}</div>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marks, setMarks] = useState<StudentMarks[]>([]);
  const [isMarksModalOpen, setIsMarksModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null); 
  const { user, isStudent } = useUser();
  const userGroupId = isStudent ? (user as Student).idGroup : null;
  const userId = user?.id;
  const currentWeekNumber = getCurrentWeekNumber();
  const currentWeekType = getCurrentWeekType();

  useEffect(() => {
    const dates = getWeekDates(activeTab);
    setWeekDates(dates);
    const today = new Date();
    const currentDateStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}`;   
    let defaultActiveDay = dates[0].weekday;   
    if (dates.some(day => day.isCurrentWeek)) {
      const currentDay = dates.find(day => day.date === currentDateStr)?.weekday;
      if (currentDay) {
        defaultActiveDay = currentDay;
      }
    }   
    setActiveDay(defaultActiveDay);
  }, [activeTab]);

  useEffect(() => {
    const fetchScheduleData = async () => {
      try {
        setLoading(true);
        if (!userGroupId || !userId) {
          throw new Error('ID группы или пользователя не найден');
        }
        const cachedData = loadFromCache<ApiLesson[]>(CACHE_KEYS.SCHEDULE, userId);
        if (cachedData) {
          setUsingCachedData(true);
          const transformedData = transformApiData(cachedData, weekDates);
          setScheduleData(transformedData);
          setLastUpdated(new Date());
        }
        const scheduleResponse = await fetch(`http://localhost:8080/api/v1/schedule/group/${userGroupId}`); 
        if (!scheduleResponse.ok) {
          throw new Error('Ошибка загрузки расписания');
        }
        const apiData: ApiLesson[] = await scheduleResponse.json();      
        saveToCache(CACHE_KEYS.SCHEDULE, apiData, userId);
        if (!cachedData || generateHash(cachedData) !== generateHash(apiData)) {
          console.log('Расписание. Обновляем расписание из API');
          setUsingCachedData(false);
          const transformedData = transformApiData(apiData, weekDates);
          setScheduleData(transformedData);
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.error('Расписание. Ошибка загрузки данных:', err);
        if (!scheduleData.length) {
          setError(err instanceof Error ? err.message : 'Произошла ошибка');
        }
      } finally {
        setLoading(false);
      }
    };
    if (userGroupId && userId && weekDates.length > 0) {
      fetchScheduleData();
    }
  }, [userGroupId, userId, weekDates]);

  useEffect(() => {
  const fetchMarks = async () => {
    if (!isStudent || !user || !userId) return;
    try {
      const cachedMarks = loadFromCache<StudentMarks[]>(CACHE_KEYS.MARKS, userId, 2 * 60 * 60 * 1000);
      if (cachedMarks) {
        setMarks(cachedMarks);
      }  
      const marksResponse = await fetch(`http://localhost:8080/api/v1/students/marks/id/${user.id}`);    
      if (!marksResponse.ok) {
        throw new Error('Ошибка загрузки оценок');
      }    
      const marksData: StudentMarks[] = await marksResponse.json();
      console.log('Расписание. Загруженные оценки:', marksData);
      saveToCache(CACHE_KEYS.MARKS, marksData, userId);    
      if (!cachedMarks || generateHash(cachedMarks) !== generateHash(marksData)) {
        setMarks(marksData);
      }
    } catch (err) {
      console.error('Расписание. Ошибка загрузки оценок:', err);
    }
  };
  fetchMarks();
}, [isStudent, user, userId]);

  // функция для принудительного обновления данных
  const refreshData = async () => {
    if (!userGroupId || !userId) return;
    setLoading(true);
    setUsingCachedData(false);
    setError(null);
    try {
      clearUserCache(userId);
            const [scheduleResponse, marksResponse] = await Promise.all([
        fetch(`http://localhost:8080/api/v1/schedule/group/${userGroupId}`),
        isStudent && user ? fetch(`http://localhost:8080/api/v1/students/marks/id/${user.id}`) : null
      ]);
      if (!scheduleResponse.ok) {
        throw new Error('Ошибка загрузки расписания');
      }
      const apiData: ApiLesson[] = await scheduleResponse.json(); 
      saveToCache(CACHE_KEYS.SCHEDULE, apiData, userId);  
      const transformedData = transformApiData(apiData, weekDates);
      setScheduleData(transformedData);
      setLastUpdated(new Date());
      if (isStudent && marksResponse && marksResponse.ok) {
        const marksData: StudentMarks[] = await marksResponse.json();
        saveToCache(CACHE_KEYS.MARKS, marksData, userId);
        setMarks(marksData);
      }
      console.log('Расписание. Данные успешно обновлены');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(errorMessage);
      console.error('Расписание. Ошибка обновления данных:', err);
    } finally {
      setLoading(false);
    }
  };
  const getFilteredSchedule = (weekType: 'upper' | 'lower') => {
    return filterScheduleByWeekType(scheduleData, weekType);
  };
  const getCurrentDay = (): string => {
    const today = new Date();
    const currentDateStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    return weekDates.find(day => day.date === currentDateStr)?.weekday || '';
  };
  const handleLessonClick = (subjectName: string) => {
    setSelectedSubject(subjectName);
    setIsMarksModalOpen(true);
  };
  const closeMarksModal = () => {
    setIsMarksModalOpen(false);
    setSelectedSubject('');
  };
  const currentDay = getCurrentDay();
  const isCurrentWeek = weekDates.some(day => day.isCurrentWeek);
  const formatLastUpdated = (date: Date | null) => {
    if (!date) return '';
    return `Обновлено: ${date.toLocaleTimeString()}`;
  };
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
            onLessonClick={handleLessonClick}
          /> 
          {activeDay === currentDay && isCurrentWeek && (
            <NextLessonCard 
              scheduleData={getFilteredSchedule(activeTab)} 
              onLessonClick={handleLessonClick}
            />
          )}
        </div>
      </div>

      <MarksModal
        isOpen={isMarksModalOpen}
        onClose={closeMarksModal}
        subjectName={selectedSubject}
        marks={marks}
      />
    </div>
);
};