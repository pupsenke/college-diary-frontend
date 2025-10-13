import React, { useState } from 'react';
import './ScheduleSection.css';

type Lesson = {
  id: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacher?: string;
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

// Типы для данных успеваемости и посещаемости
type PerformanceData = {
  subject: string;
  teacher: string;
  totalHours: number;
  attendedHours: number;
  attendancePercentage: number;
  grades: {
    name: string;
    grade: number;
    date: string;
  }[];
  averageGrade: number;
};

type AttendanceData = {
  subject: string;
  lessons: {
    date: string;
    attended: boolean;
    reason?: string;
  }[];
};

// Заглушки базы данных
const performanceData: Record<string, PerformanceData> = {
  "Системное программирование": {
    subject: "Системное программирование",
    teacher: "Иванов А.",
    totalHours: 48, //парсинг
    attendedHours: 42,
    attendancePercentage: 87.5, //само должно рассчитываться расчитывается из посещения
    grades: [
      { name: "Практическая работа", grade: 5, date: "15.09.2025" },
      { name: "Практическая работа", grade: 4, date: "22.09.2025" },
      { name: "Практическая работа", grade: 5, date: "29.09.2025" },
      { name: "Практическая работа", grade: 4, date: "05.10.2025" }
    ],
    averageGrade: 4.5
  }
};

const attendanceData: Record<string, AttendanceData> = {
  "Системное программирование": {
    subject: "Системное программирование",
    lessons: [
      { date: "01.09.2025", attended: true },
      { date: "08.09.2025", attended: true },
      { date: "15.09.2025", attended: true },
      { date: "22.09.2025", attended: true },
      { date: "29.09.2025", attended: false, reason: "Болезнь" },
      { date: "06.10.2025", attended: true },
      { date: "13.10.2025", attended: true },
      { date: "20.10.2025", attended: false, reason: "Прогул" }
    ]
  }
};

// Компонент модального окна
const LessonModal: React.FC<{
  lesson: Lesson;
  isOpen: boolean;
  onClose: () => void;
}> = ({ lesson, isOpen, onClose }) => {
  if (!isOpen) return null;

  const performance = performanceData[lesson.subject];
  const attendance = attendanceData[lesson.subject];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{lesson.subject}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="lesson-info">
            <div className="info-row">
              <span className="info-label">Преподаватель:</span>
              <span className="info-value">{lesson.teacher}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Аудитория:</span>
              <span className="info-value">{lesson.room}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Время:</span>
              <span className="info-value">{lesson.startTime} - {lesson.endTime}</span>
            </div>
          </div>

          {performance && (
            <div className="performance-section">
              <h3>Успеваемость</h3>
                <div className="stat-item">
                  <span className="stat-label">Средний балл:</span>
                  <span className="stat-value">{performance.averageGrade}</span>
              </div>
              
              <div className="grades-list">
                <h4>Оценки:</h4>
                {performance.grades.map((grade, index) => (
                  <div key={index} className="grade-item">
                    <span className="grade-name">{grade.name}</span>
                    <span className="grade-value">{grade.grade}</span>
                    <span className="grade-date">{grade.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {attendance && (
            <div className="attendance-section">
              <h3>Посещаемость</h3>
                <div className="stat-item">
                  <span className="stat-label">Посещаемость:</span>
                  <span className="stat-value">{performance.attendancePercentage}%</span>
              </div>
              
              <div className="attendance-list">
                <h4>История посещений:</h4>
                {attendance.lessons.map((lesson, index) => (
                  <div key={index} className={`attendance-item ${lesson.attended ? 'attended' : 'missed'}`}>
                    <span className="attendance-date">{lesson.date}</span>
                    <span className="attendance-status">
                      {lesson.attended ? 'Присутствовал' : 'Отсутствовал'}
                    </span>
                    {lesson.reason && (
                      <span className="attendance-reason">({lesson.reason})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!performance && !attendance && (
            <div className="no-data">
              <p>Данные по успеваемости и посещаемости для этого предмета отсутствуют</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const upperWeekData: DaySchedule[] = [
  {
    date: { weekday: 'Понедельник', date: '22.09.2025' },
    lessons: [
      { id: 1, startTime: '8:30', endTime: '10:10', subject: 'Основы бережливого производства', teacher: 'Лазич Ю.В', room: 'ауд. -' },
      { id: 2, startTime: '10:20', endTime: '12:00', subject: 'Системное программирование', teacher: 'Иванов А.', room: 'ауд. 1117 НовГУ' },
      { id: 3, startTime: '12:45', endTime: '14:25', subject: 'Стандартизация, сертификация и техническое документирование', teacher: 'Чернега А.М', room: 'ауд. 305' },
      { id: 4, startTime: '14:35', endTime: '16:15', subject: 'Иностранный язык в профессиональной деятельности (немецкий)', teacher: 'Скачек Н.Г', room: 'ауд. 219' },
    ],
  },
  {
    date: { weekday: 'Вторник', date: '23.09.2025' },
    lessons: [],
    noClassesText: 'Нет пар. Выходной',
  },
  {
    date: { weekday: 'Среда', date: '24.09.2025' },
    lessons: [
      { id: 5, startTime: '8:30', endTime: '10:10', subject: 'Системное программирование', teacher: 'Иванов А.', room: 'ауд. 1117 НовГУ' },
      { id: 6, startTime: '10:20', endTime: '12:00', subject: 'Поддержка и тестирование программных модулей', teacher: 'Андреев И.А', room: 'ауд. -' },
      { id: 7, startTime: '12:45', endTime: '14:25', subject: 'Иностранный язык в профессиональной деятельности', teacher: 'Плаксина И.А', room: 'ауд. 406' },
      { id: 8, startTime: '12:45', endTime: '14:25', subject: 'Иностранный язык в профессиональной деятельности', teacher: 'Алексеева Л.Г', room: 'ауд. 306' },
      { id: 9, startTime: '14:35', endTime: '16:15', subject: 'Стандартизация, сертификация и техническое документирование', teacher: 'Чернега А.М', room: 'ауд. 305' },
    ],
  },
  {
    date: { weekday: 'Четверг', date: '25.09.2025' },
    lessons: [
      { id: 10, startTime: '8:30', endTime: '10:10', subject: 'Физическая культура', teacher: 'Иванов В.Н', room: 'СП зал' },
      { id: 11, startTime: '10:20', endTime: '12:00', subject: 'Разработка программных модулей', teacher: 'Цымбалюк Л.Н', room: 'ауд. 124' },
      { id: 12, startTime: '12:45', endTime: '14:25', subject: 'Поддержка и тестирование программных модулей', teacher: 'Андреев И.А', room: 'ауд. -' },
      { id: 14, startTime: '14:35', endTime: '16:15', subject: 'Проектный практикум' },
    ],
  },
  {
    date: { weekday: 'Пятница', date: '26.09.2025' },
    lessons: [
      { id: 16, startTime: '14:35', endTime: '16:15', subject: 'Системное программирование', teacher: 'Иванов А.', room: 'ауд. 1117 НовГУ' },
      { id: 17, startTime: '16:25', endTime: '18:05', subject: 'Внедрение и поддержка компьютерных систем', teacher: 'Богданов М.М', room: 'ауд. 226' },
      { id: 18, startTime: '18:15', endTime: '20:05', subject: 'Внедрение и поддержка компьютерных систем', teacher: 'Богданов М.М', room: 'ауд. 226' },
    ],
  },
  {
    date: { weekday: 'Суббота', date: '27.09.2025' },
    lessons: [
      { id: 19, startTime: '12:45', endTime: '14:25', subject: 'Обеспечение качества функционирования компьютерных систем', teacher: 'Андреев И.А', room: 'ауд. -' },
      { id: 20, startTime: '14:35', endTime: '16:15', subject: 'Обеспечение качества функционирования компьютерных систем', teacher: 'Андреев И.А', room: 'ауд. -' },
      { id: 21, startTime: '16:25', endTime: '18:05', subject: 'Разработка программных модулей', teacher: 'Богданов М.М', room: 'ауд. 226' },
      { id: 22, startTime: '18:15', endTime: '20:05', subject: 'Разработка программных модулей', teacher: 'Богданов М.М', room: 'ауд. 226' },
    ],
  },
];

const lowerWeekData: DaySchedule[] = [
  {
    date: { weekday: 'Понедельник', date: '22.09.2025' },
    lessons: [
      { id: 23, startTime: '8:30', endTime: '10:10', subject: 'Основы бережливого производства', teacher: 'Лазич Ю.В', room: 'ауд. -' },
      { id: 24, startTime: '10:20', endTime: '12:00', subject: 'Системное программирование', teacher: 'Иванов А.', room: 'ауд. 1117 НовГУ' },
      { id: 25, startTime: '12:45', endTime: '14:25', subject: 'Стандартизация, сертификация и техническое документирование', teacher: 'Чернега А.М', room: 'ауд. 305' },
      { id: 26, startTime: '14:35', endTime: '16:15', subject: 'Иностранный язык в профессиональной деятельности (немецкий)', teacher: 'Скачек Н.Г', room: 'ауд. 219' },
    ],
  },
  {
    date: { weekday: 'Вторник', date: '23.09.2025' },
    lessons: [],
    noClassesText: 'Нет пар. Выходной',
  },
  {
    date: { weekday: 'Среда', date: '24.09.2025' },
    lessons: [
      { id: 27, startTime: '8:30', endTime: '10:10', subject: 'Системное программирование', teacher: 'Иванов А.', room: 'ауд. 1117 НовГУ' },
      { id: 28, startTime: '10:20', endTime: '12:00', subject: 'Поддержка и тестирование программных модулей', teacher: 'Андреев И.А', room: 'ауд. -' },
      { id: 29, startTime: '12:45', endTime: '14:25', subject: 'Иностранный язык в профессиональной деятельности', teacher: 'Плаксина И.А', room: 'ауд. 406' },
      { id: 30, startTime: '12:45', endTime: '14:25', subject: 'Иностранный язык в профессиональной деятельности', teacher: 'Алексеева Л.Г', room: 'ауд. 306' },
      { id: 31, startTime: '8:30', endTime: '10:10', subject: 'Основы бережливого производства', teacher: 'Лазич Ю.В', room: 'ауд. -' },
    ],
  },
  {
    date: { weekday: 'Четверг', date: '25.09.2025' },
    lessons: [
      { id: 32, startTime: '8:30', endTime: '10:10', subject: 'Физическая культура', teacher: 'Иванов В.Н', room: 'СП зал' },
      { id: 33, startTime: '10:20', endTime: '12:00', subject: 'Разработка программных модулей', teacher: 'Цымбалюк Л.Н', room: 'ауд. 124' },
      { id: 34, startTime: '12:45', endTime: '14:25', subject: 'Поддержка и тестирование программных модулей', teacher: 'Андреев И.А', room: 'ауд. -' },
      { id: 35, startTime: '14:35', endTime: '16:15', subject: 'Проектный практикум' },
    ],
  },
  {
    date: { weekday: 'Пятница', date: '26.09.2025' },
    lessons: [
      { id: 36, startTime: '12:45', endTime: '14:25', subject: 'Системное программирование', teacher: 'Иванов А.', room: 'ауд. 1117 НовГУ' },
      { id: 37, startTime: '14:35', endTime: '16:15', subject: 'Системное программирование', teacher: 'Иванов А.', room: 'ауд. 1117 НовГУ' },
      { id: 38, startTime: '16:25', endTime: '18:05', subject: 'Внедрение и поддержка компьютерных систем', teacher: 'Богданов М.М', room: 'ауд. 226' },
      { id: 39, startTime: '18:15', endTime: '20:05', subject: 'Внедрение и поддержка компьютерных систем', teacher: 'Богданов М.М', room: 'ауд. 226' },
    ],
  },
  {
    date: { weekday: 'Суббота', date: '27.09.2025' },
    lessons: [
      { id: 40, startTime: '12:45', endTime: '14:25', subject: 'Поддержка и тестирование программных модулей', teacher: 'Андреев И.А', room: 'ауд. -' },
      { id: 41, startTime: '14:35', endTime: '16:15', subject: 'Обеспечение качества функционирования компьютерных систем', teacher: 'Андреев И.А', room: 'ауд. -' },
      { id: 42, startTime: '16:25', endTime: '18:05', subject: 'Разработка программных модулей', teacher: 'Богданов М.М', room: 'ауд. 226' },
    ],
  },
];

// Функция для преобразования времени в минуты для корректной сортировки
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Группировка уроков по интервалу времени
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

// Обновленный компонент ScheduleView с поддержкой клика
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
              <div className="no-classes">{noClassesText}</div>
            )}
          </div>
        ))}
      </div>

      {selectedLesson && (
        <LessonModal
          lesson={selectedLesson}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

// Обновленный TodayScheduleView с поддержкой клика
const TodayScheduleView: React.FC<{ scheduleData: DaySchedule[] }> = ({ scheduleData }) => {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const todaySchedule = scheduleData[0];

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
            <div className="today-no-classes">{todaySchedule.noClassesText}</div>
          )}
        </div>
        
        {/* Блок "Следующая пара" */}
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

      {selectedLesson && (
        <LessonModal
          lesson={selectedLesson}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export const ScheduleSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upper' | 'lower'>('upper');
  const [viewMode, setViewMode] = useState<'full' | 'today'>('full');

  return (
    <div>
      {/* Фильтр Полное расписание / Расписание на сегодня */}
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

      {/* Вкладки верхняя/нижняя неделя (только для полного расписания) */}
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
      
      {/* Отображение расписания в зависимости от выбранного режима */}
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