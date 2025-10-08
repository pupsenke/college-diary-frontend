import React from 'react';

export const DisciplinesSection: React.FC = () => {
  const disciplines = [
    'Дипломное проектирование 09.02.07',
    'МДК 02.01 Технология разработки программного обеспечения',
    'Операционные системы и среды',
    'Основы разработки программного обеспечения',
    'ПРАКТИКА ПРОИЗВОДСТВЕННАЯ 09.02.07',
    'ИНФОРМАЦИОННЫЕ СИСТЕМЫ И ПРОГРАММИРОВАНИЕ'
  ];

  return (
    <div className="disciplines-section">
      <h2>Мои дисциплины</h2>
      <div className="disciplines-list">
        {disciplines.map((discipline, index) => (
          <div key={index} className="discipline-card">
            <h3>{discipline}</h3>
            <div className="discipline-actions">
              <button className="btn-primary">Журнал</button>
              <button className="btn-secondary">Материалы</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};