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
  const [error, setError] = useState<string | null>(null);

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

  // функция для определения номера недели
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  // функция для форматирования даты в имени файла
  const formatDateForFileName = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // форматирование даты для отображения в документе
  const formatDisplayDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('ru-RU', { month: 'long' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // функция для скачивания документа
  const downloadDocument = async (date: string) => {
    try {
      setError(null);
      
      // форматирование даты для отображения
      const displayDate = formatDisplayDate(date);
      
      // определение типа недели
      const weekNumber = getWeekNumber(new Date(date));
      const weekType = weekNumber % 2 === 0 ? 'нижняя' : 'верхняя';
      
      // формирование данных для таблицы
      const tableData = groupedReplacements[date]
        .sort((a, b) => {
          if (a.groupNumber !== b.groupNumber) return a.groupNumber - b.groupNumber;
          return a.pairNumber - b.pairNumber;
        })
        .map(record => {
          let subjectInfo = '';
          
          // проверка есть ли данные о предмете и преподавателе
          if (record.subject && record.subject.trim() !== '') {
            subjectInfo = record.subject;
            if (record.teacher && record.teacher.trim() !== '') {
              subjectInfo += `, ${record.teacher}`;
            }
            if (record.subgroup) {
              subjectInfo += `, п/г ${record.subgroup}`;
            }
            
            // добавление аудитории к дисциплине по расписанию
            if (record.room && record.room !== '—' && record.room !== '') {
              subjectInfo += `, ауд. ${record.room}`;
            }
          } else {
            subjectInfo = '—';
          }
          
          // формирование информации об изменениях
          let changesInfo = '';
          if (record.type === 'notWillBe') {
            changesInfo = 'Не будет';
          } else {
            const changes = [];
            if (record.newSubject && record.newSubject.trim() !== '') {
              changes.push(record.newSubject);
            }
            if (record.newTeacher && record.newTeacher.trim() !== '') {
              changes.push(record.newTeacher);
            }
            changesInfo = changes.length > 0 ? changes.join(', ') : '—';
          }
          
          return {
            group: record.groupNumber.toString(),
            pair: record.pairNumber.toString(),
            subject: subjectInfo,
            changes: changesInfo,
            room: (record.newRoom && record.newRoom !== '—' && record.newRoom !== '') ? record.newRoom : '—'
          };
        });

      // данные для шаблона
      const templateData = {
        date: displayDate,
        weekType: weekType,
        year: new Date(date).getFullYear().toString(),
        methodistName: 'Исаева Е.С.',
        replacements: tableData,
      };

      const fileName = `${formatDateForFileName(date)}.docx`;

      // импорт библиотек
      const PizZip = (await import('pizzip')).default;
      const Docxtemplater = (await import('docxtemplater')).default;
      
      // загрузка шаблона
      const templateResponse = await fetch('/templates/replacement_template.docx');
      const templateArrayBuffer = await templateResponse.arrayBuffer();
      
      // создание документа
      const zip = new PizZip(templateArrayBuffer);
      
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: '{',
          end: '}'
        }
      });
      
      // установка данных через render
      doc.render(templateData);
      
      // получение сгенерированного документа
      const generatedDoc = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      
      // скачивание файла
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(generatedDoc);
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadLink.href);
            
    } catch (error) {
      console.error('Ошибка при создании документа:', error);
      setError('Не удалось создать документ. Проверьте наличие шаблона и библиотек.');
    }
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

      {error && (
        <div className="rd-error-message">
          {error}
        </div>
      )}

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
                                
                                const roomInfo = record.room !== '—' && record.room !== '' ? `, ауд.${record.room}` : '';
                                const fullSubjectInfo = subjectInfo + roomInfo;

                                let changesInfo = '';
                                if (record.type === 'notWillBe') {
                                  changesInfo = 'Не будет';
                                } else if (record.newSubject || record.newTeacher || record.newRoom) {
                                  const changes = [];
                                  if (record.newSubject) changes.push(record.newSubject);
                                  if (record.newTeacher) changes.push(record.newTeacher);
                                  if (record.newRoom && record.newRoom !== '—' && record.newRoom !== '') {
                                    changes.push(`ауд.${record.newRoom}`);
                                  }
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