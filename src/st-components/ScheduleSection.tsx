import React, { useState, useEffect } from 'react';
import './ScheduleSection.css';

// типы для данных из API
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
};

type Group = {
  id: number;
  numberGroup: number;
  admissionYear: number;
  idCurator: number;
  course: number;
  formEducation: string;
  profile: string;
  specialty: string;
};

type Subject = {
  id: number;
  subjectName: string;
};

type Teacher = {
  id: number;
  name: string;
  lastName: string;
  patronymic: string;
  login: string;
  email: string | null;
  staffPosition: Array<{
    id: number;
    name: string;
  }>;
};

type StData = {
  id: number;
  teachers: number[];
  idSubject: number;
  groups: number[];
};

// типы для отображения
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

// type PerformanceData = {
//   subject: string;
//   teacher: string;
//   totalHours: number;
//   attendedHours: number;
//   attendancePercentage: number;
//   grades: {
//     name: string;
//     grade: number;
//     date: string;
//   }[];
//   averageGrade: number;
// };

// type AttendanceData = {
//   subject: string;
//   lessons: {
//     date: string;
//     attended: boolean;
//     reason?: string;
//   }[];
// };

// маппинг номеров пар к времени
const pairTimes: Record<number, { start: string; end: string }> = {
  1: { start: '8:30', end: '10:10' },
  2: { start: '10:20', end: '12:00' },
  3: { start: '12:45', end: '14:25' },
  4: { start: '14:35', end: '16:15' },
  5: { start: '16:25', end: '18:05' },
  6: { start: '18:15', end: '19:55' }
};

// заглушки базы данных для успеваемости и посещаемости
// const performanceData: Record<string, PerformanceData> = {
//   "Системное программирование": {
//     subject: "Системное программирование",
//     teacher: "Иванов А.",
//     totalHours: 48,
//     attendedHours: 42,
//     attendancePercentage: 87.5,
//     grades: [
//       { name: "Практическая работа", grade: 5, date: "15.09.2025" },
//       { name: "Практическая работа", grade: 4, date: "22.09.2025" },
//       { name: "Практическая работа", grade: 5, date: "29.09.2025" },
//       { name: "Практическая работа", grade: 4, date: "05.10.2025" }
//     ],
//     averageGrade: 4.5
//   }
// };

// const attendanceData: Record<string, AttendanceData> = {
//   "Системное программирование": {
//     subject: "Системное программирование",
//     lessons: [
//       { date: "01.09.2025", attended: true },
//       { date: "08.09.2025", attended: true },
//       { date: "15.09.2025", attended: true },
//       { date: "22.09.2025", attended: true },
//       { date: "29.09.2025", attended: false, reason: "Болезнь" },
//       { date: "06.10.2025", attended: true },
//       { date: "13.10.2025", attended: true },
//       { date: "20.10.2025", attended: false, reason: "Прогул" }
//     ]
//   }
// };

// // модальное окно
// const LessonModal: React.FC<{
//   lesson: Lesson;
//   isOpen: boolean;
//   onClose: () => void;
// }> = ({ lesson, isOpen, onClose }) => {
//   if (!isOpen) return null;

//   const performance = performanceData[lesson.subject];
//   const attendance = attendanceData[lesson.subject];

//   return (
//     <div className="modal-overlay" onClick={onClose}>
//       <div className="modal-content" onClick={(e) => e.stopPropagation()}>
//         <div className="modal-header">
//           <h2>{lesson.subject}</h2>
//           <button className="modal-close" onClick={onClose}>×</button>
//         </div>
        
//         <div className="modal-body">
//           <div className="lesson-info">
//             <div className="info-row">
//               <span className="info-label">Преподаватель:</span>
//               <span className="info-value">{lesson.teacher}</span>
//             </div>
//             <div className="info-row">
//               <span className="info-label">Аудитория:</span>
//               <span className="info-value">{lesson.room}</span>
//             </div>
//             <div className="info-row">
//               <span className="info-label">Время:</span>
//               <span className="info-value">{lesson.startTime} - {lesson.endTime}</span>
//             </div>
//           </div>

//           {performance && (
//             <div className="performance-section">
//               <h3>Успеваемость</h3>
//                 <div className="stat-item">
//                   <span className="stat-label">Средний балл:</span>
//                   <span className="stat-value">{performance.averageGrade}</span>
//               </div>
              
//               <div className="grades-list">
//                 <h4>Оценки:</h4>
//                 {performance.grades.map((grade, index) => (
//                   <div key={index} className="grade-item">
//                     <span className="grade-name">{grade.name}</span>
//                     <span className="grade-value">{grade.grade}</span>
//                     <span className="grade-date">{grade.date}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {attendance && (
//             <div className="attendance-section">
//               <h3>Посещаемость</h3>
//                 <div className="stat-item">
//                   <span className="stat-label">Посещаемость:</span>
//                   <span className="stat-value">{performance.attendancePercentage}%</span>
//               </div>
              
//               <div className="attendance-list">
//                 <h4>История посещений:</h4>
//                 {attendance.lessons.map((lesson, index) => (
//                   <div key={index} className={`attendance-item ${lesson.attended ? 'attended' : 'missed'}`}>
//                     <span className="attendance-date">{lesson.date}</span>
//                     <span className="attendance-status">
//                       {lesson.attended ? 'Присутствовал' : 'Отсутствовал'}
//                     </span>
//                     {lesson.reason && (
//                       <span className="attendance-reason">({lesson.reason})</span>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {!performance && !attendance && (
//             <div className="no-data">
//               <p>Данные по успеваемости и посещаемости для этого предмета отсутствуют</p>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

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

// функция для преобразования данных из API
const transformApiData = (
  apiData: ApiLesson[], 
  stData: StData[], 
  subjects: Subject[], 
  teachers: Teacher[],
  userGroupId: number
): DaySchedule[] => {
  const daysOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  
  return daysOfWeek.map(weekday => {
    const dayLessons = apiData
      .filter(lesson => lesson.dayWeek === weekday && lesson.idGroup === userGroupId)
      .map(lesson => {
        const st = stData.find(s => s.id === lesson.idSt);
        if (!st) {
          return null;
        }

        const subject = subjects.find(s => s.id === st.idSubject);

        // временно, именить тестовые данные в апи
        const teacherId = st.teachers[0];
        const teacher = teachers.find(t => t.id === teacherId);

        return {
          id: lesson.id,
          startTime: pairTimes[lesson.numPair].start,
          endTime: pairTimes[lesson.numPair].end,
          subject: subject?.subjectName || `Предмет ${st.idSubject}`,
          teacher: teacher ? `${teacher.lastName} ${teacher.name[0]}.${teacher.patronymic[0]}.` : undefined,
          room: `ауд. ${lesson.room}`,
          numPair: lesson.numPair,
          dayWeek: lesson.dayWeek,
          typeWeek: lesson.typeWeek
        };
      })
      .filter((lesson): lesson is NonNullable<typeof lesson> => lesson !== null);

    // группировка пар с одним днем недедли и одним временем проведения
    const groupedLessons: Lesson[] = [];
    const timeGroups: Record<string, Lesson[]> = {};

    dayLessons.forEach(lesson => {
      const timeKey = `${lesson.startTime}-${lesson.endTime}`;
      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = [];
      }
      timeGroups[timeKey].push(lesson);
    });

    // объединение 
    Object.values(timeGroups).forEach(lessonsInSlot => {
      if (lessonsInSlot.length === 1) {
        groupedLessons.push(lessonsInSlot[0]);
      } else {
        groupedLessons.push(...lessonsInSlot);
      }
    });

    // сортировка по времени начала
    groupedLessons.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    return {
      date: { weekday, date: '' }, // дата может быть добавлена при необходимости
      lessons: groupedLessons,
      noClassesText: groupedLessons.length === 0 ? 'Нет пар' : undefined
    };
  });
};

// функция для фильтрации расписания по типу недели
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

// отображение полного расписание с поддержкой клика для открытия модального окна
const ScheduleView: React.FC<{ scheduleData: DaySchedule[] }> = ({ scheduleData }) => {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLesson(null);
  };

  return (
    <>
      <div className="schedule-section">
        {scheduleData.map(({ date, lessons, noClassesText }: DaySchedule) => (
          <div key={date.weekday + date.date} className="day-schedule">
            <h3 className="schedule-date">{date.weekday} {date.date}</h3>

            {lessons.length > 0 ? (
              groupLessonsByTime(lessons).map(({ startTime, endTime, lessons: grouped }: GroupedSlot) => (
                grouped.length > 1 ? (
                  <div key={`${startTime}-${endTime}`} className="separated-lesson-row">
                    <div className="separated-lesson-content">
                      {grouped.map((lesson: Lesson, index: number) => (
                        <div 
                          key={lesson.id} 
                          className="separated-lesson-item"
                          onClick={() => handleLessonClick(lesson)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="separated-time">
                            {startTime} - {endTime}
                          </div>
                          <div className="separated-subject">
                            {lesson.subject}
                          </div>
                          <div className="separated-teacher-room">
                            {lesson.teacher && <div>{lesson.teacher}</div>}
                            {lesson.room && <div>{lesson.room}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div 
                    key={`${startTime}-${endTime}`} 
                    className="lesson-row"
                    onClick={() => handleLessonClick(grouped[0])}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="lesson-time">{startTime} - {endTime}</div>
                    <div className="lesson-subject">
                      <div className="lesson-group-item">
                        {grouped[0].subject}
                      </div>
                    </div>
                    <div className="lesson-teacher-room">
                      <div className="lesson-group-teacher-room">
                        {grouped[0].teacher && <div>{grouped[0].teacher}</div>}
                        {grouped[0].room && <div>{grouped[0].room}</div>}
                      </div>
                    </div>
                  </div>
                )
              ))
            ) : (
              <div className="no-classes">{noClassesText || 'Нет пар'}</div>
            )}
          </div>
        ))}
      </div>

      {/* {selectedLesson && (
        <LessonModal
          lesson={selectedLesson}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )} */}
    </>
  );
};

// отображение расписания на сегодня с поддержкой клика для открытия модального окна
const TodayScheduleView: React.FC<{ scheduleData: DaySchedule[] }> = ({ scheduleData }) => {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // временно, нудно определять день недели автоматически
  const todaySchedule = scheduleData.find(day => day.lessons.length > 0) || scheduleData[0];

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLesson(null);
  };

  return (
    <>
      <div className="today-schedule">
        <div className="today-lessons">
          {todaySchedule.lessons.length > 0 ? (
            groupLessonsByTime(todaySchedule.lessons).map(({ startTime, endTime, lessons: grouped }: GroupedSlot) => (
              grouped.length > 1 ? (
                <div key={`${startTime}-${endTime}`} className="today-separated-lesson">
                  <div className="today-time">{startTime} - {endTime}</div>
                  <div className="today-subjects">
                    {grouped.map((lesson: Lesson) => (
                      <div 
                        key={lesson.id} 
                        className="today-subject-item"
                        onClick={() => handleLessonClick(lesson)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="today-subject-name">{lesson.subject}</div>
                        <div className="today-teacher-room">
                          {lesson.teacher && <span>{lesson.teacher}</span>}
                          {lesson.room && <span>{lesson.room}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div 
                  key={`${startTime}-${endTime}`} 
                  className="today-lesson"
                  onClick={() => handleLessonClick(grouped[0])}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="today-time">{startTime} - {endTime}</div>
                  <div className="today-subject">{grouped[0].subject}</div>
                  <div className="today-teacher-room">
                    {grouped[0].teacher && <div>{grouped[0].teacher}</div>}
                    {grouped[0].room && <div>{grouped[0].room}</div>}
                  </div>
                </div>
              )
            ))
          ) : (
            <div className="today-no-classes">{todaySchedule.noClassesText || 'Нет пар'}</div>
          )}
        </div>
        
        {/* блок следующая пара */}
        {todaySchedule.lessons.length > 0 && (
          <div className="next-lesson">
            <h3 className="next-lesson-title">Следующая пара</h3>
            {(() => {
              const now = new Date();
              const currentTime = now.getHours() * 60 + now.getMinutes();
              const allLessons = groupLessonsByTime(todaySchedule.lessons).flatMap(slot => slot.lessons);
              const nextLesson = allLessons.find(lesson => 
                timeToMinutes(lesson.startTime) > currentTime
              );
              
              if (nextLesson) {
                return (
                  <div 
                    className="next-lesson-card"
                    onClick={() => handleLessonClick(nextLesson)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="next-lesson-time">{nextLesson.startTime} - {nextLesson.endTime}</div>
                    <div className="next-lesson-subject">{nextLesson.subject}</div>
                    <div className="next-lesson-teacher-room">
                      {nextLesson.teacher && <div>{nextLesson.teacher}</div>}
                      {nextLesson.room && <div>{nextLesson.room}</div>}
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

      {/* {selectedLesson && (
        <LessonModal
          lesson={selectedLesson}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )} */}
    </>
  );
};

export const ScheduleSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upper' | 'lower'>('upper');
  const [viewMode, setViewMode] = useState<'full' | 'today'>('full');
  const [scheduleData, setScheduleData] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // временно, брать после авторизации
  const userGroupId = 1; 

  // загрузка данных из API
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        const [scheduleResponse, stResponse, subjectsResponse, teachersResponse] = await Promise.all([
          fetch('http://localhost:8080/api/v1/schedule'),
          fetch('http://localhost:8080/api/v1/st'),
          fetch('http://localhost:8080/api/v1/subjects'), 
          fetch('http://localhost:8080/api/v1/staffs') 
        ]);

        if (!scheduleResponse.ok || !stResponse.ok || !subjectsResponse.ok || !teachersResponse.ok) {
          throw new Error('Ошибка загрузки данных');
        }

        const [apiData, stData, subjects, teachers]: [ApiLesson[], StData[], Subject[], Teacher[]] = await Promise.all([
          scheduleResponse.json(),
          stResponse.json(),
          subjectsResponse.json(),
          teachersResponse.json()
        ]);

        const transformedData = transformApiData(apiData, stData, subjects, teachers, userGroupId);
        setScheduleData(transformedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка');
        console.error('Ошибка загрузки данных:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [userGroupId]);

  // фильтр по неделе
  const getFilteredSchedule = (weekType: 'upper' | 'lower') => {
    return filterScheduleByWeekType(scheduleData, weekType);
  };

  if (loading) {
    return <div className="loading">Загрузка расписания...</div>;
  }

  if (error) {
    return <div className="error">Ошибка: {error}</div>;
  }

  return (
    <div>
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

      {/* фильтр верхняя/нижняя неделя (только для полного расписания) */}
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
        <ScheduleView scheduleData={getFilteredSchedule(activeTab)} />
      ) : (
        <TodayScheduleView scheduleData={getFilteredSchedule(activeTab)} />
      )}
    </div>
  );
};