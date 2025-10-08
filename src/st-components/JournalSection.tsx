// JournalSection.jsx
import React, { useState } from 'react';

export const JournalSection = () => {
  const [selectedGroup, setSelectedGroup] = useState('ПКС-21');
  const [selectedDate, setSelectedDate] = useState('');

  const students = [
    { id: 1, name: 'Иванов Иван' },
    { id: 2, name: 'Петров Петр' },
    { id: 3, name: 'Сидорова Анна' },
  ];

  return (
    <div className="journal-section">
      
    </div>
  );
};