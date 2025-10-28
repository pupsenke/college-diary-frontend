import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import './ScheduleSection.css';

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

// типы для отображения
type Lesson = {
  id: number;
  startTime: string;
  endTime: string;
  subject: string;
  group: number;
  subgroup?: number;
  room?: string;
  teacher?: string;
};

type DaySchedule = {
  date: { weekday: string; date: string };
  lessons: Lesson[];
  noClassesText?: string;
};

// время пар
const PAIR_TIMES: { [key: number]: { start: string; end: string } } = {
  1: { start: '8:30', end: '10:10' },
  2: { start: '10:20', end: '12:00' },
  3: { start: '12:45', end: '14:25' },
  4: { start: '14:35', end: '16:15' },
  5: { start: '16:25', end: '18:05' },
  6: { start: '18:15', end: '19:55' },
};

//функция для преобразования данных API в формат отображения
function transformApiDataToSchedule(apiData: ScheduleItem[]): DaySchedule[] {
  const daysOrder = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  
  const groupedByDay: { [key: string]: ScheduleItem[] } = {};
  
  apiData.forEach(item => {
    if (!groupedByDay[item.dayWeek]) {
      groupedByDay[item.dayWeek] = [];
    }
    groupedByDay[item.dayWeek].push(item);
  });
  
  return daysOrder.map(day => {
    const dayLessons = groupedByDay[day] || [];
    
    const lessons: Lesson[] = dayLessons.map(lesson => ({
      id: lesson.id,
      startTime: PAIR_TIMES[lesson.numPair]?.start || '--:--',
      endTime: PAIR_TIMES[lesson.numPair]?.end || '--:--',
      subject: lesson.nameSubject,
      group: lesson.numberGroup,
      subgroup: lesson.subgroup > 0 ? lesson.subgroup : undefined, // Добавляем подгруппу только если она > 0
      room: lesson.room ? `ауд. ${lesson.room}` : undefined,
      teacher: `${lesson.lastnameTeacher} ${lesson.nameTeacher[0]}.${lesson.patronymicTeacher[0]}.`
    }));
    
    lessons.sort((a, b) => {
      const lessonA = dayLessons.find(l => l.id === a.id);
      const lessonB = dayLessons.find(l => l.id === b.id);
      return (lessonA?.numPair || 0) - (lessonB?.numPair || 0);
    });
    
    return {
      date: { 
        weekday: day, 
        date: ' '
      },
      lessons,
      noClassesText: lessons.length === 0 ? "Нет пар" : undefined
    };
  });
}


// функция для преобразования времени в минуты
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// компонент для отображения в виде сетки
const ScheduleGridView: React.FC<{ scheduleData: DaySchedule[] }> = ({ scheduleData }) => {
  return (
    <div className="schedule-grid">
      {scheduleData.map(({ date, lessons, noClassesText }: DaySchedule) => (
        <div key={date.weekday + date.date} className="day-schedule">
          <div className="schedule-date">
            <h3>{date.weekday}</h3>
            <span className="day-date">{date.date}</span>
          </div>

          {lessons.length > 0 ? (
            lessons.map((lesson: Lesson) => (
              <div key={lesson.id} className="lesson-row">
                <div className="lesson-time">{lesson.startTime} - {lesson.endTime}</div>
                <div className="lesson-content-th">
                  <div className="lesson-subject-th">{lesson.subject}</div>
                  <div className="lesson-details-th">
                    <div className="lesson-group-info">
                      <div className="lesson-group-th">Группа: {lesson.group}</div>
                      {lesson.subgroup && <div className="lesson-subgroup-th">п/г {lesson.subgroup}</div>}
                    </div>
                    {lesson.room && <div className="lesson-room-th">{lesson.room}</div>}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-classes">{noClassesText}</div>
          )}
        </div>
      ))}
    </div>
  );
};

// компонент для отображения в виде списка
const ScheduleListView: React.FC<{ scheduleData: DaySchedule[] }> = ({ scheduleData }) => {
  return (
    <div className="schedule-list">
      {scheduleData.map(({ date, lessons, noClassesText }: DaySchedule) => (
        <div key={date.weekday + date.date} className="day-schedule">
          <div className="schedule-date">
            <h3>{date.weekday}</h3>
            <span className="day-date">{date.date}</span>
          </div>

          {lessons.length > 0 ? (
            lessons.map((lesson: Lesson) => (
              <div key={lesson.id} className="lesson-row">
                <div className="lesson-time">{lesson.startTime} - {lesson.endTime}</div>
                <div className="lesson-content-th">
                  <div className="lesson-subject-th">{lesson.subject}</div>
                  <div className="lesson-details-th">
                    <div className="lesson-group-info">
                      <div className="lesson-group-th">Группа: {lesson.group}</div>
                      {lesson.subgroup && <div className="lesson-subgroup-th">п/г {lesson.subgroup}</div>}
                    </div>
                    {lesson.room && <div className="lesson-room-th">{lesson.room}</div>}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-classes">{noClassesText}</div>
          )}
        </div>
      ))}
    </div>
  );
};

const TodayScheduleView: React.FC<{ scheduleData: DaySchedule[] }> = ({ scheduleData }) => {
  const todaySchedule = scheduleData[1] || scheduleData[0]; 
  
  return (
    <div className="today-schedule">
      <div className="today-lessons">
        {todaySchedule.lessons.length > 0 ? (
          todaySchedule.lessons.map((lesson: Lesson) => (
            <div key={lesson.id} className="today-lesson">
              <div className="today-time">{lesson.startTime} - {lesson.endTime}</div>
              <div className="today-content-th">
                <div className="today-subject-th">{lesson.subject}</div>
                <div className="today-details-th">
                  <div className="today-group-info">
                    <div className="today-group-th">Группа: {lesson.group}</div>
                    {lesson.subgroup && <div className="today-subgroup-th">п/г {lesson.subgroup}</div>}
                  </div>
                  {lesson.room && <div className="today-room-th">{lesson.room}</div>}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="today-no-classes">{todaySchedule.noClassesText}</div>
        )}
      </div>
      
      {/* блок "Следующая пара" */}
      {todaySchedule.lessons.length > 0 && (
        <div className="next-lesson">
          <h3 className="next-lesson-title">Следующая пара</h3>
          {(() => {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const nextLesson = todaySchedule.lessons.find(lesson => 
              timeToMinutes(lesson.startTime) > currentTime
            );
            
            if (nextLesson) {
              return (
                <div className="next-lesson-card">
                  <div className="next-lesson-time">{nextLesson.startTime} - {nextLesson.endTime}</div>
                  <div className="next-lesson-subject">{nextLesson.subject}</div>
                  <div className="next-lesson-details">
                    <div className="next-lesson-group-info">
                      <div className="next-lesson-group">Группа: {nextLesson.group}</div>
                      {nextLesson.subgroup && <div className="next-lesson-subgroup">п/г {nextLesson.subgroup}</div>}
                    </div>
                    {nextLesson.room && <div className="next-lesson-room">{nextLesson.room}</div>}
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isTeacher, userId } = useUser();

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!isTeacher || !userId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`http://localhost:8080/api/v1/schedule/teacher/${userId}`);
        
        if (!response.ok) {
          throw new Error(`Ошибка загрузки: ${response.status}`);
        }
        
        const apiData: ScheduleItem[] = await response.json();
        const transformedData = transformApiDataToSchedule(apiData);
        setScheduleData(transformedData);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки расписания');
        console.error('Ошибка загрузки расписания:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [isTeacher, userId, activeTab]);

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

  if (!isTeacher) {
    return <div className="error">Доступно только для преподавателей</div>;
  }

  return (
    <div>
      {/* фильтр полное расписание/расписание на сегодня */}
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

      {/* вкладки верхняя/нижняя неделя (только для полного расписания) */}
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

          {/* переключение вида отображения */}
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${displayMode === 'grid' ? 'active' : ''}`}
              onClick={() => setDisplayMode('grid')}
            >
              Сетка
            </button>
            <button 
              className={`toggle-btn ${displayMode === 'list' ? 'active' : ''}`}
              onClick={() => setDisplayMode('list')}
            >
              Список
            </button>
          </div>
        </div>
      )}
      
      {/* отображение расписания в зависимости от выбранного режима */}
      {viewMode === 'full' ? (
        displayMode === 'grid' ? (
          <ScheduleGridView scheduleData={scheduleData} />
        ) : (
          <ScheduleListView scheduleData={scheduleData} />
        )
      ) : (
        <TodayScheduleView scheduleData={scheduleData} />
      )}
    </div>
  );
};