import React from 'react';
import './ScheduleSection.css';

const scheduleData = [
  {
    date: 'Понедельник 22.09.2025',
    lessons: [
      { id: 1, time: '8:30 - 10:10', subject: 'Основы бережливого производства', teacher: 'Лазич Ю.В', room: 'ауд. -' },
      { id: 2, time: '10:20 - 12:00', subject: 'Системное программирование', teacher: 'Иванов А.', room: 'ауд. 1117 НовГУ' },
      { id: 3, time: '12:45 - 14:25', subject: 'Стандартизация, сертификация и техническое документирование', teacher: 'Чернега А.М', room: 'ауд. 305' },
      { id: 4, time: '14:35 - 16:15', subject: 'Иностранный язык в профессиональной деятельности (немецкий)', teacher: 'Скачек Н.Г', room: 'ауд. 219' },
    ],
  },
  {
    date: 'Вторник 23.09.2025',
    lessons: [],
    noClassesText: 'Нет пар. Выходной',
  },
  {
    date: 'Среда 24.09.2025',
    lessons: [
      { id: 5, time: '8:30 - 10:10', subject: 'Системное программирование', teacher: 'Иванов А.', room: 'ауд. 1117 НовГУ'},
      { id: 6, time: '10:20 - 12:00', subject: 'Поддержка и тестирование программных модулей',   teacher: 'Андреев И.А', room: 'ауд. -' },
      { id: 7, time: '12:45 - 14:25', subject: 'Иностранный язык в профессиональной деятельности 1 п/г',   teacher: 'Плаксина И.А', room: 'ауд. 406' },
      { id: 8, time: '12:45 - 14:25', subject: 'Иностранный язык в профессиональной деятельности 2 п/г', teacher: 'Алексеева Л.Г', room: 'ауд. 306' },
      { id: 9, time: '14:35 - 16:15', subject: 'Стандартизация, сертификация и техническое документирование', teacher: 'Чернега А.М', room: 'ауд. 305' },
    ],
  },
  {
    date: 'Четверг 25.09.2025',
    lessons: [
      { id: 10, time: '8:30 - 10:10', subject: 'Физическая культура', teacher: 'Иванов В.Н', room: 'СП зал'},
      { id: 11, time: '10:20 - 12:00', subject: 'Разработка программных модулей',   teacher: 'Цымбалюк Л.Н', room: 'ауд. 124' },
      { id: 12, time: '12:45 - 14:25', subject: 'Поддержка и тестирование программных модулей',   teacher: 'Андреев И.А', room: 'ауд. -'},
      { id: 14, time: '14:35 - 16:15', subject: 'Проектный практикум'},
    ],
  },
];

export const ScheduleSection = () => {
  return (
    <div className="schedule-section">
      {scheduleData.map(({ date, lessons, noClassesText }) => (
        <div key={date} className="day-schedule">
          <h3 className="schedule-date">{date}</h3>
          {lessons.length > 0 ? (
            lessons.map(({ id, time, subject, teacher, room }) => (
              <div key={id} className="lesson-row">
                <div className="lesson-time">{time}</div>
                <div className="lesson-subject">{subject}</div>
                <div className="lesson-teacher-room">
                  <div>{teacher}</div>
                  <div>{room}</div>
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
