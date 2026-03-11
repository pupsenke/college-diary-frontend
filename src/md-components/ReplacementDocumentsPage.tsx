import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ReplacementDocumentsPage.css';

interface ReplacementRecord {
  id: string;
  date: string;
  displayDate: string;
  groupNumber: number;
  pairNumber: number;
  subgroup: number | null;
  subject: string;
  teacher: string;
  room: string;
  type: 'notWillBe' | 'replacement';
  newSubject?: string;
  newTeacher?: string;
  newRoom?: string;
  createdAt: string;
}

interface GroupedReplacements {
  [date: string]: ReplacementRecord[];
}

export const ReplacementDocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [groupedReplacements, setGroupedReplacements] = useState<GroupedReplacements>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    loadReplacements();
  }, []);

  const loadReplacements = () => {
    const storageKey = 'scheduleReplacements';
    const existingData = localStorage.getItem(storageKey);
    const replacements: ReplacementRecord[] = existingData ? JSON.parse(existingData) : [];

    // группировка по дате
    const grouped = replacements.reduce((acc: GroupedReplacements, record) => {
      if (!acc[record.date]) {
        acc[record.date] = [];
      }
      acc[record.date].push(record);
      return acc;
    }, {});

    // сортировка по дате (от новых к старым)
    const sortedGrouped: GroupedReplacements = {};
    Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .forEach(key => {
        sortedGrouped[key] = grouped[key].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

    setGroupedReplacements(sortedGrouped);
    
    // выбор первой даты, если есть
    const dates = Object.keys(sortedGrouped);
    if (dates.length > 0 && !selectedDate) {
      setSelectedDate(dates[0]);
    }
  };

  const handleBack = () => {
    navigate('/metodist/changes');
  };

  const handleDeleteDocument = (date: string) => {
    if (window.confirm(`Удалить все замены за ${new Date(date).toLocaleDateString('ru-RU')}?`)) {
      const storageKey = 'scheduleReplacements';
      const existingData = localStorage.getItem(storageKey);
      const replacements: ReplacementRecord[] = existingData ? JSON.parse(existingData) : [];
      
      const filtered = replacements.filter(r => r.date !== date);
      localStorage.setItem(storageKey, JSON.stringify(filtered));
      
      loadReplacements();
      if (selectedDate === date) {
        const remainingDates = Object.keys(groupedReplacements).filter(d => d !== date);
        setSelectedDate(remainingDates.length > 0 ? remainingDates[0] : null);
      }
    }
  };

  const handleDeleteRecord = (id: string) => {
    if (window.confirm('Удалить эту замену?')) {
      const storageKey = 'scheduleReplacements';
      const existingData = localStorage.getItem(storageKey);
      const replacements: ReplacementRecord[] = existingData ? JSON.parse(existingData) : [];
      
      const filtered = replacements.filter(r => r.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(filtered));
      
      loadReplacements();
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      weekday: 'long'
    });
  };

  // функции скачивания заглушка
  const downloadDocument = (date: string) => {
    console.log('Скачивание документа для даты:', date);
    alert('Функция скачивания документа будет реализована позже');
  };

  return (
    <div className="rd-container">
      <div className="rd-header-block">
        <button className="back-button" onClick={handleBack}>
          Назад
        </button>
        <button 
          className="download-main-btn"
          onClick={() => selectedDate && downloadDocument(selectedDate)}
          disabled={!selectedDate}>
          Скачать .docx
        </button>
      </div>

      <div className="rd-content-block">
        {Object.keys(groupedReplacements).length === 0 ? (
          <div className="rd-empty">
            <p>Нет сохраненных документов</p>
          </div>
        ) : (
          <div className="rd-content">
            <div className="rd-sidebar">
              <h3>Документы по датам</h3>
              <ul className="rd-date-list">
                {Object.keys(groupedReplacements).map(date => (
                  <li 
                    key={date} 
                    className={`rd-date-item ${selectedDate === date ? 'active' : ''}`}
                    onClick={() => setSelectedDate(date)}>
                    <span className="rd-date-text">{new Date(date).toLocaleDateString('ru-RU')}</span>
                    <button 
                      className="rd-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(date);}}
                      title="Удалить документ">
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rd-main">
              {selectedDate && groupedReplacements[selectedDate] && (
                <div className="rd-document">
                  <div className="rd-document-header">
                    <h2>
                      Изменения в расписании на {formatDate(selectedDate)}
                    </h2>
                  </div>

                  {Object.entries(
                    groupedReplacements[selectedDate].reduce((acc, record) => {
                      if (!acc[record.groupNumber]) acc[record.groupNumber] = [];
                      acc[record.groupNumber].push(record);
                      return acc;
                    }, {} as { [key: number]: ReplacementRecord[] })
                  )
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([groupNum, records]) => (
                      <div key={groupNum} className="rd-group">
                        <h3>Группа {groupNum}</h3>
                        <table className="rd-table">
                          <thead>
                            <tr>
                              <th>№ пары</th>
                              <th>Дисциплина по расписанию, Ф.И.О. преподавателя</th>
                              <th>Изменения</th>
                              <th>Ауд.</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {records
                              .sort((a, b) => a.pairNumber - b.pairNumber)
                              .map(record => {
                                const subjectInfo = record.subgroup 
                                  ? `${record.subject}, п/г ${record.subgroup}, ${record.teacher}`
                                  : `${record.subject}, ${record.teacher}`;
                                
                                const roomInfo = record.room !== '—' ? `, ауд.${record.room}` : '';
                                const fullSubjectInfo = subjectInfo + roomInfo;

                                let changesInfo = '';
                                if (record.type === 'notWillBe') {
                                  changesInfo = 'Не будет';
                                } else if (record.newSubject || record.newTeacher || record.newRoom) {
                                  const changes = [];
                                  if (record.newSubject) changes.push(record.newSubject);
                                  if (record.newTeacher) changes.push(record.newTeacher);
                                  if (record.newRoom) changes.push(`ауд.${record.newRoom}`);
                                  changesInfo = changes.join(', ');
                                }

                                return (
                                  <tr key={record.id}>
                                    <td style={{ textAlign: 'center' }}>{record.pairNumber}</td>
                                    <td>{fullSubjectInfo}</td>
                                    <td>{changesInfo}</td>
                                    <td style={{ textAlign: 'center' }}>{record.newRoom || '—'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                      <button 
                                        className="rd-record-delete"
                                        onClick={() => handleDeleteRecord(record.id)}
                                        title="Удалить запись">
                                        ×
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};