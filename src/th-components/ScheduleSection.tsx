import React, { useState } from 'react';
import './ScheduleSection.css';


// типы для отображения
type Lesson = {
  id: number;
  startTime: string;
  endTime: string;
  subject: string;
  group: number;
  room?: string;
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

const upperWeekData: DaySchedule[] = [
  {
    date: { weekday: 'Понедельник', date: '22.09.2025' },
    lessons: [],
    noClassesText: "Нет пар"
  },
  {
    date: { weekday: 'Вторник', date: '23.09.2025' },
    lessons: [
      { id: 1, startTime: '10:20', endTime: '12:00', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
      { id: 2, startTime: '12:45', endTime: '14:25', subject: 'Технология разработки и защиты баз данных', group: 3991, room: 'ауд. 124' },
      { id: 3, startTime: '14:35', endTime: '16:15', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
    ],
  },
  {
    date: { weekday: 'Среда', date: '23.09.2025' },
    lessons: [
      { id: 3, startTime: '8:30', endTime: '10:10', subject: 'Технология разработки и защиты баз данных', group: 3991, room: 'ауд. 124' },
      { id: 4, startTime: '10:20', endTime: '12:00', subject: 'Оформление технической документации', group: 3991, room: 'ауд. 124' },
      { id: 5, startTime: '12:45', endTime: '14:25', subject: 'Технология разработки и защиты баз данных', group: 4996, room: 'ауд. 124' },
      { id: 6, startTime: '14:35', endTime: '16:15', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },

      
    ],
  },
  {
    date: { weekday: 'Четверг', date: '23.09.2025' },
    lessons: [
      { id: 7, startTime: '10:20', endTime: '12:00', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
      { id: 8, startTime: '12:45', endTime: '14:25', subject: 'Технология разработки и защиты баз данных', group: 3991, room: 'ауд. 124' },
      { id: 9, startTime: '14:35', endTime: '16:15', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
    ],
  },
  {
    date: { weekday: 'Пятница', date: '23.09.2025' },
    lessons: [],
    noClassesText: "Нет пар"
  },
  {
    date: { weekday: 'Суббота', date: '23.09.2025' },
    lessons: [],
    noClassesText: "Нет пар"
  },
];

const lowerWeekData: DaySchedule[] = [
  {
    date: { weekday: 'Понедельник', date: '22.09.2025' },
    lessons: [],
    noClassesText: "Нет пар"
  },
  {
    date: { weekday: 'Вторник', date: '23.09.2025' },
    lessons: [
      { id: 1, startTime: '10:20', endTime: '12:00', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
      { id: 2, startTime: '12:45', endTime: '14:25', subject: 'Технология разработки и защиты баз данных', group: 3991, room: 'ауд. 124' },
      { id: 3, startTime: '14:35', endTime: '16:15', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
    ],
  },
  {
    date: { weekday: 'Среда', date: '23.09.2025' },
    lessons: [
      { id: 3, startTime: '8:30', endTime: '10:10', subject: 'Технология разработки и защиты баз данных', group: 3991, room: 'ауд. 124' },
      { id: 4, startTime: '10:20', endTime: '12:00', subject: 'Оформление технической документации', group: 3991, room: 'ауд. 124' },
      { id: 5, startTime: '12:45', endTime: '14:25', subject: 'Технология разработки и защиты баз данных', group: 4996, room: 'ауд. 124' },
      { id: 6, startTime: '14:35', endTime: '16:15', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },

      
    ],
  },
  {
    date: { weekday: 'Четверг', date: '23.09.2025' },
    lessons: [
      { id: 7, startTime: '10:20', endTime: '12:00', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
      { id: 8, startTime: '12:45', endTime: '14:25', subject: 'Технология разработки и защиты баз данных', group: 3991, room: 'ауд. 124' },
      { id: 9, startTime: '14:35', endTime: '16:15', subject: 'Технология разработки и защиты баз данных', group: 3992, room: 'ауд. 124' },
    ],
  },
  {
    date: { weekday: 'Пятница', date: '23.09.2025' },
    lessons: [],
    noClassesText: "Нет пар"
  },
  {
    date: { weekday: 'Суббота', date: '23.09.2025' },
    lessons: [],
    noClassesText: "Нет пар"
  },
];

// функция для преобразования времени в минуты для корректной сортировки
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// группировка уроков по интервалу времени
function groupLessonsByTime(lessons: Lesson[]): GroupedSlot[] {
  const groups: Record<string, GroupedSlot> = {};
  for (const lesson of lessons) {
    const key = `${lesson.startTime}-${lesson.endTime}`;
    if (!groups[key]) {
      groups[key] = { startTime: lesson.startTime, endTime: lesson.endTime, lessons: [] };
    }
    groups[key].lessons.push(lesson);
  }
  // сортировка по времени начала
  return Object.values(groups).sort((a, b) => 
    timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );
}

const ScheduleView: React.FC<{ scheduleData: DaySchedule[] }> = ({ scheduleData }) => {
  return (
    <div className="schedule-section">
      {scheduleData.map(({ date, lessons, noClassesText }: DaySchedule) => (
        <div key={date.weekday + date.date} className="day-schedule">
          <h3 className="schedule-date">{date.weekday} {date.date}</h3>

          {lessons.length > 0 ? (
            lessons.map((lesson: Lesson) => (
              <div key={lesson.id} className="lesson-row">
                <div className="lesson-time">{lesson.startTime} - {lesson.endTime}</div>
                <div className="lesson-subject-group-th">
                  <div className="lesson-subject">{lesson.subject}</div>
                  <div className="lesson-group-th">{lesson.group}</div>
                </div>
                {lesson.room && <div className="lesson-room-th">{lesson.room}</div>}
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
  const todaySchedule = scheduleData[1]; 
  return (
    <div className="today-schedule">
      <div className="today-lessons">
        {todaySchedule.lessons.length > 0 ? (
          todaySchedule.lessons.map((lesson: Lesson) => (
            <div key={lesson.id} className="today-lesson">
              <div className="today-time">{lesson.startTime} - {lesson.endTime}</div>
              <div className="today-subject-group-th">
                <div className="today-subject">{lesson.subject}</div>
                  <div className="today-group-th">{lesson.group}</div>
              </div>
              {lesson.room && <div className="today-room-th">{lesson.room}</div>}
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
                    <div className="next-lesson-group">{nextLesson.group}</div>
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
      )}
      
      {/* отображение расписания в зависимости от выбранного режима */}
      {viewMode === 'full' ? (
        activeTab === 'upper' ? (
          <ScheduleView scheduleData={upperWeekData} />
        ) : (
          <ScheduleView scheduleData={lowerWeekData} />
        )
      ) : (
        activeTab === 'upper' ? (
          <TodayScheduleView scheduleData={upperWeekData} />
        ) : (
          <TodayScheduleView scheduleData={lowerWeekData} />
        )
      )}
    </div>
  );
};