import React from 'react';

export const ScheduleSection: React.FC = () => {
  const schedule = [
    { time: '10:20 - 12:00', subject: 'Вика и Лера абобы <3', group: '2992' },
    { time: '12:10 - 13:50', subject: 'Операционные системы', group: '2991' },
    { time: '14:00 - 15:40', subject: 'Основы программирования', group: '2993' }
  ];

  return (
    <div className="schedule-section">
      <h2>Расписание занятий</h2>
      <div className="next-class">
        <h3>Следующая пара:</h3>
        <div className="next-class-card">
          <div className="class-time">{schedule[0].time}</div>
          <div className="class-subject">{schedule[0].subject}</div>
          <div className="class-group">Группа: {schedule[0].group}</div>
        </div>
      </div>
      
      <div className="schedule-list">
        <h3>Расписание на сегодня</h3>
        {schedule.map((item, index) => (
          <div key={index} className="schedule-item">
            <div className="schedule-time">{item.time}</div>
            <div className="schedule-details">
              <div className="schedule-subject">{item.subject}</div>
              <div className="schedule-group">Группа {item.group}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};