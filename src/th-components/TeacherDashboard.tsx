import React, { useState } from 'react';
import { DisciplinesSection } from './DisciplinesSection';
import { GroupsSection } from './GroupsSection';

export const TeacherDashboard: React.FC = () => {
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>();

  const handleDisciplineSelect = (disciplineName: string) => {
    setSelectedDiscipline(disciplineName);
  };

  const handleClearDiscipline = () => {
    setSelectedDiscipline(undefined);
  };

  return (
    <div>
      {!selectedDiscipline ? (
        // Показываем только дисциплины
        <div>
          <DisciplinesSection 
            onDisciplineSelect={handleDisciplineSelect}
            selectedDiscipline={selectedDiscipline}
          />
        </div>
      ) : (
        // Показываем только группы
        <div>
          <GroupsSection 
            selectedDiscipline={selectedDiscipline}
            onDisciplineClear={handleClearDiscipline}
          />
        </div>
      )}
    </div>
  );
};