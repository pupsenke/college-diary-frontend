import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ReplacementDocumentsPage.css';
import { methodistApiService } from '../services/methodistApiService';
import type {
  ReplacementRecord,
  PathTypeResponse,
  ApiGroup,
  ApiSubjectWithTeachers
} from '../services/methodistApiService';

interface GroupedReplacements {
  [date: string]: ReplacementRecord[];
}

export const ReplacementDocumentsPage: React.FC = () => {
  const navigate = useNavigate();

  const [groupedReplacements, setGroupedReplacements] = useState<GroupedReplacements>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [serverFiles, setServerFiles] = useState<PathTypeResponse[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<number | null>(null);

  const [groupsCache, setGroupsCache] = useState<ApiGroup[] | null>(null);
  const [groupSubjectsCache, setGroupSubjectsCache] = useState<Record<number, ApiSubjectWithTeachers[]>>({});

  useEffect(() => {
    loadReplacements();
    loadServerFiles();
  }, []);

  const loadReplacements = () => {
    const replacements = methodistApiService.getReplacements();

    const grouped = replacements.reduce((acc: GroupedReplacements, record) => {
      if (!acc[record.date]) {
        acc[record.date] = [];
      }
      acc[record.date].push(record);
      return acc;
    }, {});

    const sortedGrouped: GroupedReplacements = {};
    Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .forEach(key => {
        sortedGrouped[key] = grouped[key].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

    setGroupedReplacements(sortedGrouped);

    const dates = Object.keys(sortedGrouped);
    if (dates.length > 0 && !selectedDate) {
      setSelectedDate(dates[0]);
    }
  };

  const loadServerFiles = async () => {
    try {
      setError(null);
      const data = await methodistApiService.getFilesByType('Изменения в расписании');
      setServerFiles(data);

      if (data.length > 0 && selectedFileId === null) {
        setSelectedFileId(data[0].id);
      }
    } catch (e: any) {
      console.error('Ошибка загрузки файлов', e);
      const msg = e.response?.data?.message || e.message || 'Неизвестная ошибка';
      setError(`Не удалось загрузить список документов: ${msg}`);
    }
  };

  const handleBack = () => {
    navigate('/metodist/changes');
  };

  // удаление файла с сервера и из списка
  const handleDeleteDocument = async (fileId: number, fileName: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить документ "${fileName}"?\nЭто действие нельзя отменить.`)) {
      setDeletingFileId(fileId);
      setError(null);
      setSuccessMessage(null);
      
      try {
        await methodistApiService.deleteFile(fileId);
        const updatedFiles = serverFiles.filter(f => f.id !== fileId);
        setServerFiles(updatedFiles);
        if (selectedFileId === fileId) {
          setSelectedFileId(updatedFiles.length > 0 ? updatedFiles[0].id : null);
        }
        
        setSuccessMessage(`Документ "${fileName}" успешно удалён`);
        
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (e: any) {
        console.error('Ошибка при удалении файла:', e);
        const errorMsg = e.response?.data?.message || e.message || 'Неизвестная ошибка';
        setError(`Не удалось удалить документ: ${errorMsg}`);
      } finally {
        setDeletingFileId(null);
      }
    }
  };

  const handleDeleteRecord = (id: string) => {
    if (window.confirm('Удалить эту замену?')) {
      methodistApiService.deleteReplacement(id);
      loadReplacements();
      setSuccessMessage('Запись о замене успешно удалена');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      weekday: 'long',
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

  const normalizeName = (fullName: string): string =>
    fullName.replace(/\s+/g, ' ').trim().toLowerCase();

  const ensureGroupsLoaded = async (): Promise<ApiGroup[] | null> => {
    if (groupsCache) return groupsCache;
    try {
      const data = await methodistApiService.getGroups();
      setGroupsCache(data);
      return data;
    } catch (e) {
      console.error('Исключение при загрузке групп:', e);
      return null;
    }
  };

  const ensureGroupSubjectsLoaded = async (groupId: number): Promise<ApiSubjectWithTeachers[] | null> => {
    if (groupSubjectsCache[groupId]) return groupSubjectsCache[groupId];
    try {
      const data = await methodistApiService.getGroupSubjects(groupId);
      setGroupSubjectsCache(prev => ({ ...prev, [groupId]: data }));
      return data;
    } catch (e) {
      console.error('Исключение при загрузке subjects для группы', groupId, e);
      return null;
    }
  };

  const getGroupByNumber = async (groupNumber: number): Promise<ApiGroup | null> => {
    const groups = await ensureGroupsLoaded();
    if (!groups) return null;
    const group = groups.find(g => g.numberGroup === groupNumber);
    if (!group) {
      console.error('Группа не найдена по номеру', groupNumber);
      return null;
    }
    return group;
  };

  const findIdStForOldPair = async (record: ReplacementRecord): Promise<{ idSt: number; idGroup: number } | null> => {
    try {
      const group = await getGroupByNumber(record.groupNumber);
      if (!group) return null;

      const subjectsData = await ensureGroupSubjectsLoaded(group.id);
      if (!subjectsData) return null;

      const baseSubjectName = record.subject?.trim() || '';
      const baseTeacherName = record.teacher?.trim() || '';

      if (!baseSubjectName || !baseTeacherName) return null;

      const normalizedBaseSubject = baseSubjectName.toLowerCase();
      const normalizedBaseTeacher = normalizeName(baseTeacherName);

      for (const gs of subjectsData) {
        if (gs.nameSubject.toLowerCase() !== normalizedBaseSubject) continue;

        for (const t of gs.teachers) {
          const full = `${t.lastnameTeacher} ${t.nameTeacher} ${t.patronymicTeacher || ''}`;
          if (normalizeName(full) === normalizedBaseTeacher) {
            return { idSt: gs.idSt, idGroup: group.id };
          }
        }
      }
      return null;
    } catch (e) {
      console.error('Ошибка при поиске idSt', record, e);
      return null;
    }
  };

  const findIdStForNewPair = async (record: ReplacementRecord): Promise<{ idSt: number; idGroup: number } | null> => {
    try {
      const group = await getGroupByNumber(record.groupNumber);
      if (!group) return null;

      const subjectsData = await ensureGroupSubjectsLoaded(group.id);
      if (!subjectsData) return null;

      const baseSubjectName = record.newSubject?.trim() || '';
      const baseTeacherName = record.newTeacher?.trim() || '';

      if (!baseSubjectName || !baseTeacherName) return null;

      const normalizedBaseSubject = baseSubjectName.toLowerCase();
      const normalizedBaseTeacher = normalizeName(baseTeacherName);

      for (const gs of subjectsData) {
        if (gs.nameSubject.toLowerCase() !== normalizedBaseSubject) continue;

        for (const t of gs.teachers) {
          const full = `${t.lastnameTeacher} ${t.nameTeacher} ${t.patronymicTeacher || ''}`;
          if (normalizeName(full) === normalizedBaseTeacher) {
            return { idSt: gs.idSt, idGroup: group.id };
          }
        }
      }
      return null;
    } catch (e) {
      console.error('Ошибка при поиске idSt для новой пары', record, e);
      return null;
    }
  };

  const isOldPair = (record: ReplacementRecord): boolean => {
    const hasOldSubject = record.subject && record.subject.trim() !== '' && record.subject !== '—';
    const hasOldTeacher = record.teacher && record.teacher.trim() !== '' && record.teacher !== '—';
    return Boolean(hasOldSubject && hasOldTeacher);
  };

  const saveScheduleForDate = async (date: string) => {
    const records = groupedReplacements[date];
    if (!records || records.length === 0) return;

    setError(null);
    
    for (const record of records) {
      try {
        let idInfo: { idSt: number; idGroup: number } | null = null;

        if (record.type === 'notWillBe') {
          idInfo = await findIdStForOldPair(record);
        } else {
          if (isOldPair(record)) {
            idInfo = await findIdStForOldPair(record);
          } else {
            idInfo = await findIdStForNewPair(record);
          }
        }

        if (!idInfo) {
          console.error('Пропускаем запись', record);
          continue;
        }

        const d = new Date(record.date);
        const dayWeek = d.toLocaleDateString('ru-RU', { weekday: 'long' });
        const dayWeekFormatted = dayWeek.charAt(0).toUpperCase() + dayWeek.slice(1);
        const weekNumber = getWeekNumber(d);
        const typeWeekFormatted = weekNumber % 2 === 0 ? 'Нижняя' : 'Верхняя';

        await methodistApiService.saveSchedule({
          dayWeek: dayWeekFormatted,
          typeWeek: typeWeekFormatted,
          numPair: record.pairNumber,
          room: record.newRoom || null,
          idSt: idInfo.idSt,
          idGroup: idInfo.idGroup,
          subgroup: record.subgroup,
          replacement: true,
        });
      } catch (e) {
        console.error('Ошибка при сохранении пары', record, e);
        setError(`Ошибка при сохранении замены для группы ${record.groupNumber}, ${record.pairNumber} пары`);
      }
    }
  };

  const generateDocumentBlob = async (date: string): Promise<Blob | null> => {
    try {
      setError(null);

      const displayDate = formatDisplayDate(date);
      const weekNumber = getWeekNumber(new Date(date));
      const weekType = weekNumber % 2 === 0 ? 'нижняя' : 'верхняя';

      const tableData = groupedReplacements[date]
        .sort((a, b) => {
          if (a.groupNumber !== b.groupNumber) return a.groupNumber - b.groupNumber;
          return a.pairNumber - b.pairNumber;
        })
        .map(record => {
          let subjectInfo = '';

          if (record.subject && record.subject.trim() !== '') {
            subjectInfo = record.subject;
            if (record.teacher && record.teacher.trim() !== '') {
              subjectInfo += `, ${record.teacher}`;
            }
            if (record.subgroup) {
              subjectInfo += `, п/г ${record.subgroup}`;
            }
            if (record.room && record.room !== '—' && record.room !== '') {
              subjectInfo += `, ауд. ${record.room}`;
            }
          } else {
            subjectInfo = '—';
          }

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
            if (record.newRoom && record.newRoom !== '—' && record.newRoom.trim() !== '') {
              changes.push(`ауд. ${record.newRoom}`);
            }
            changesInfo = changes.length > 0 ? changes.join(', ') : '—';
          }

          return {
            group: record.groupNumber.toString(),
            pair: record.pairNumber.toString(),
            subject: subjectInfo,
            changes: changesInfo,
            room: record.newRoom && record.newRoom !== '—' && record.newRoom !== '' ? record.newRoom : '—',
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

      // импорт библиотек
      const PizZip = (await import('pizzip')).default;
      const Docxtemplater = (await import('docxtemplater')).default;

      const templateResponse = await fetch('/templates/replacement_template.docx');
      if (!templateResponse.ok) {
        setError('Не удалось загрузить шаблон документа.');
        return null;
      }
      const templateArrayBuffer = await templateResponse.arrayBuffer();

      const zip = new PizZip(templateArrayBuffer);      
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{', end: '}' },
      });

      doc.render(templateData);

      const generatedDoc = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      return generatedDoc;
    } catch (error) {
      console.error('Ошибка при создании документа:', error);
      setError('Не удалось создать документ.');
      return null;
    }
  };

  const uploadDocumentFile = async (date: string) => {
    try {
      setError(null);
      const blob = await generateDocumentBlob(date);
      if (!blob) return;

      const fileName = `${formatDateForFileName(date)}.docx`;
      const file = new File([blob], fileName, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      await methodistApiService.uploadFile(file, 'Изменения в расписании', 1);
      setSuccessMessage(`Документ за ${formatDisplayDate(date)} успешно сохранён на сервер!`);
      await loadServerFiles();
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      console.error('Ошибка при загрузке документа', e);
      const errorMessage = e.response?.data?.message || e.message || 'Неизвестная ошибка';
      setError(`Произошла ошибка: ${errorMessage}`);
    }
  };

  const handleDownloadSelectedFile = async () => {
    if (selectedFileId === null) return;
    const file = serverFiles.find(f => f.id === selectedFileId);
    if (!file) return;

    try {
      setError(null);
      const blob = await methodistApiService.downloadFile(file.id);

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const fileName = file.nameFile && file.nameFile.trim() !== '' ? file.nameFile : 'document.docx';
      a.download = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      console.error('Ошибка скачивания файла', e);
      const msg = e.response?.data?.message || e.message || 'Неизвестная ошибка';
      setError(`Не удалось скачать файл: ${msg}`);
    }
  };

  const selectedFile = selectedFileId ? serverFiles.find(f => f.id === selectedFileId) || null : null;

  return (
    <div className="rd-container">
      <div className="rd-header-block">
        <button className="back-button" onClick={handleBack}>
          Назад
        </button>
        <button 
          className="rd-save-btn" 
          onClick={handleDownloadSelectedFile} 
          disabled={!selectedFile}>
          Скачать .docx
        </button>
      </div>

      {error && <div className="rd-error-message">{error}</div>}
      {successMessage && <div className="rd-success-message">{successMessage}</div>}

      <div className="rd-content-block">
        {serverFiles.length === 0 ? (
          <div className="rd-empty">
            <p>Нет сохраненных документов</p>
          </div>
        ) : (
          <div className="rd-content">
            <div className="rd-sidebar">
              <h3>Документы по датам</h3>
              <ul className="rd-date-list">
                {serverFiles.map(file => (
                  <li
                    key={file.id}
                    className={`rd-date-item ${selectedFileId === file.id ? 'active' : ''}`}
                    onClick={() => setSelectedFileId(file.id)}>
                    <span className="rd-date-text">{file.nameFile}</span>
                    <button
                      className="rd-delete-btn"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteDocument(file.id, file.nameFile);
                      }}
                      disabled={deletingFileId === file.id}
                      title="Удалить документ">
                      {deletingFileId === file.id ? '...' : '×'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rd-main">
              {selectedDate && groupedReplacements[selectedDate] && (
                <div className="rd-document">
                  <div className="rd-document-header">
                    <h2>Изменения в расписании на {formatDate(selectedDate)}</h2>
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

                  <div className="rd-document-actions">
                    <button
                      className="rd-save-btn"
                      onClick={async () => {
                        if (!selectedDate) return;
                        await saveScheduleForDate(selectedDate);
                        await uploadDocumentFile(selectedDate);
                      }}>
                      Сохранить изменения
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};