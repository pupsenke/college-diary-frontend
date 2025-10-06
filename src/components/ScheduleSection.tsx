import React from 'react';
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

const scheduleData: DaySchedule[] = [
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
      { id: 15, startTime: '12:45', endTime: '14:25', subject: 'Системное программирование', teacher: 'Иванов А.', room: 'ауд. 1117 НовГУ' },
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
  // Правильная сортировка по времени начала
  return Object.values(groups).sort((a, b) => 
    timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );
}

export const ScheduleSection: React.FC = () => {
  return (
    <div className="schedule-section">
      {scheduleData.map(({ date, lessons, noClassesText }: DaySchedule) => (
        <div key={date.weekday + date.date} className="day-schedule">
          <h3 className="schedule-date">{date.weekday} {date.date}</h3>

          {lessons.length > 0 ? (
            groupLessonsByTime(lessons).map(({ startTime, endTime, lessons: grouped }: GroupedSlot) => (
              grouped.length > 1 ? (
                // Для сгруппированных предметов - разделенный вид
                <div key={`${startTime}-${endTime}`} className="separated-lesson-row">
                  <div className="separated-lesson-content">
                    {grouped.map((lesson: Lesson, index: number) => (
                      <div key={lesson.id} className="separated-lesson-item">
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
                // Для одиночных предметов - обычный вид
                <div key={`${startTime}-${endTime}`} className="lesson-row">
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
  );
};