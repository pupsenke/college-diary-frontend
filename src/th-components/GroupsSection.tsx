import React from 'react';

export const GroupsSection: React.FC = () => {
  const groups = [
    { id: '2992', name: '2992', students: 25 },
    { id: '2991', name: '2991', students: 28 },
    { id: '2993', name: '2993', students: 22 }
  ];

  return (
    <div className="groups-section">
      <h2>Мои группы</h2>
      <div className="groups-list">
        {groups.map((group) => (
          <div key={group.id} className="group-card">
            <h3>{group.name}</h3>
            <p>Студентов: {group.students}</p>
            <div className="group-actions">
              <button className="btn-primary">Журнал группы</button>
              <button className="btn-secondary">Расписание</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};