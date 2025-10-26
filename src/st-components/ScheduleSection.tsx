import React, { useState, useEffect } from 'react';
import { useUser, Student } from '../context/UserContext';
import './ScheduleSection.css';

type ApiLesson = {
  id: number;
  dayWeek: string;
  typeWeek: string;
  numPair: number;
  room: number;
  idSt: number;
  idGroup: number;
  subgroup: string | null;
  replacement: boolean;
  idSubject: number;
  nameSubject: string;
  idTeacher: number;
  lastnameTeacher: string;
  nameTeacher: string;
  patronymicTeacher: string;
  numberGroup: number;
};

//для отображения
type Lesson = {
  id: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacher?: string;
  room?: string;
  numPair: number;
  dayWeek: string;
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

const pairTimes: Record<number, { start: string; end: string }> = {
  1: { start: '8:30', end: '10:10' },
  2: { start: '10:20', end: '12:00' },
  3: { start: '12:45', end: '14:25' },
  4: { start: '14:35', end: '16:15' },
  5: { start: '16:25', end: '18:05' },
  6: { start: '18:15', end: '19:55' }
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

//функция преобразования данных 
const transformApiData = (apiData: ApiLesson[]): DaySchedule[] => {
  const daysOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  
  return daysOfWeek.map(weekday => {
    const dayLessons = apiData
      .filter(lesson => lesson.dayWeek === weekday)
      .map(lesson => {
        return {
          id: lesson.id,
          startTime: pairTimes[lesson.numPair].start,
          endTime: pairTimes[lesson.numPair].end,
          subject: lesson.nameSubject || `Предмет ${lesson.idSubject}`,
          teacher: `${lesson.lastnameTeacher} ${lesson.nameTeacher[0]}.${lesson.patronymicTeacher[0]}.`,
          room: `ауд. ${lesson.room}`,
          numPair: lesson.numPair,
          dayWeek: lesson.dayWeek,
          typeWeek: lesson.typeWeek
        };
      });

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
      date: { weekday, date: '' },
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

const ScheduleView: React.FC<{ scheduleData: DaySchedule[], viewMode: 'grid' | 'list' }> = ({ scheduleData, viewMode }) => {
  return (
    <div className={viewMode === 'grid' ? 'schedule-grid' : 'schedule-list'}>
      {scheduleData.map(({ date, lessons, noClassesText }: DaySchedule) => (
        <div key={date.weekday + date.date} className="day-schedule">
          <div className="schedule-date">
            <h3>{date.weekday}</h3>
            <div className="day-date">{date.date}</div>
          </div>

          {lessons.length > 0 ? (
            groupLessonsByTime(lessons).map(({ startTime, endTime, lessons: grouped }: GroupedSlot) => (
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
                        <div className="separated-teacher-room">
                          {lesson.teacher && <div className="lesson-teacher-room">{lesson.teacher}</div>}
                          {lesson.room && <div className="lesson-room">{lesson.room}</div>}
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
                        {grouped[0].teacher && <div className="lesson-teacher-room">{grouped[0].teacher}</div>}
                        {grouped[0].room && <div className="lesson-room">{grouped[0].room}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            ))
          ) : (
            <div className="no-classes">
              <div className="no-classes-text">{noClassesText || 'Нет пар'}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const TodayScheduleView: React.FC<{ scheduleData: DaySchedule[] }> = ({ scheduleData }) => {
  const todaySchedule = scheduleData.find(day => day.lessons.length > 0) || scheduleData[0];

  return (
    <div className="today-schedule">
      <div className="today-lessons">
        {todaySchedule.lessons.length > 0 ? (
          groupLessonsByTime(todaySchedule.lessons).map(({ startTime, endTime, lessons: grouped }: GroupedSlot) => (
            grouped.length > 1 ? (
              <div key={`${startTime}-${endTime}`} className="separated-lesson-row">
                <div className="separated-time">
                  {startTime} - {endTime}
                </div>
                <div className="separated-lesson-content">
                  {grouped.map((lesson: Lesson) => (
                    <div 
                      key={lesson.id} 
                      className="separated-lesson-item"
                    >
                      <div className="separated-subject">
                        {lesson.subject}
                      </div>
                      <div className="separated-teacher-room">
                        {lesson.teacher && <div className="lesson-teacher-room">{lesson.teacher}</div>}
                        {lesson.room && <div className="lesson-room">{lesson.room}</div>}
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
                      {grouped[0].teacher && <div className="lesson-teacher-room">{grouped[0].teacher}</div>}
                      {grouped[0].room && <div className="lesson-room">{grouped[0].room}</div>}
                    </div>
                  </div>
                </div>
              </div>
            )
          ))
        ) : (
          <div className="no-classes">
            <div className="no-classes-text">{todaySchedule.noClassesText || 'Нет пар'}</div>
          </div>
        )}
      </div>
      
      {todaySchedule.lessons.length > 0 && (
        <div className="next-lesson">
          <div className="next-lesson-title">
            <h3>Следующая пара</h3>
          </div>
          {(() => {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const allLessons = groupLessonsByTime(todaySchedule.lessons).flatMap(slot => slot.lessons);
            const nextLesson = allLessons.find(lesson => 
              timeToMinutes(lesson.startTime) > currentTime
            );
            
            if (nextLesson) {
              return (
                <div className="next-lesson-card">
                  <div className="next-lesson-subject">{nextLesson.subject}</div>
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
                  </div>
                </div>
              );
            } else {
              return (
                <div className="next-lesson-card">
                  <div className="no-next-lesson">Пар на сегодня больше нет</div>
                </div>
              );
            }
          })()}
        </div>
      )}
    </div>
  );
};

export const ScheduleSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upper' | 'lower'>('upper');
  const [viewMode, setViewMode] = useState<'full' | 'today'>('full');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [scheduleData, setScheduleData] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user, isStudent } = useUser();

  const userGroupId = isStudent ? (user as Student).idGroup : null;

  useEffect(() => {
    const fetchScheduleData = async () => {
      try {
        setLoading(true);
        
        //запрос к API
        const scheduleResponse = await fetch(`http://localhost:8080/api/v1/schedule/group/${userGroupId}`);
        
        if (!scheduleResponse.ok) {
          throw new Error('Ошибка загрузки расписания');
        }

        const apiData: ApiLesson[] = await scheduleResponse.json();
        
        // Преобразуем данные - теперь все необходимое уже в API
        const transformedData = transformApiData(apiData);
        setScheduleData(transformedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка');
        console.error('Ошибка загрузки данных:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchScheduleData();
  }, [userGroupId]);

  const getFilteredSchedule = (weekType: 'upper' | 'lower') => {
    return filterScheduleByWeekType(scheduleData, weekType);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Загрузка расписания...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error">Ошибка: {error}</div>;
  }

  return (
    <div className="schedule-section">
      <div className="schedule-filter">
        <button 
          className={`filter-btn ${viewMode === 'full' ? 'active' : ''}`}
          onClick={() => setViewMode('full')}
        >
          Полное расписание
        </button>
        <button 
          className={`filter-btn ${viewMode === 'today' ? 'active' : ''}`}
          onClick={() => setViewMode('today')}
        >
          Расписание на сегодня
        </button>
      </div>

      {viewMode === 'full' && (
        <div className="view-controls">
          <div className="view-tabs">
            <button 
              className={`view-tab ${activeTab === 'upper' ? 'active' : ''}`}
              onClick={() => setActiveTab('upper')}
            >
              Верхняя неделя
            </button>
            <button 
              className={`view-tab ${activeTab === 'lower' ? 'active' : ''}`}
              onClick={() => setActiveTab('lower')}
            >
              Нижняя неделя
            </button>
          </div>
          
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${displayMode === 'grid' ? 'active' : ''}`}
              onClick={() => setDisplayMode('grid')}
            >Сетка
            </button>
            <button 
              className={`toggle-btn ${displayMode === 'list' ? 'active' : ''}`}
              onClick={() => setDisplayMode('list')}
            >Список
            </button>
          </div>
        </div>
      )}
      
      {viewMode === 'full' ? (
        <ScheduleView scheduleData={getFilteredSchedule(activeTab)} viewMode={displayMode} />
      ) : (
        <TodayScheduleView scheduleData={getFilteredSchedule(activeTab)} />
      )}
    </div>
  );
};