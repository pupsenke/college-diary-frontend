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
import mammoth from 'mammoth';

interface GroupedReplacements {
  [date: string]: ReplacementRecord[];
}

// ключи для localStorage
const SERVER_FILES_CACHE_KEY = 'rd_server_files_cache';
const SERVER_FILES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут

type ParsedDocsCache = Record<number, ReplacementRecord[]>;

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
  const [parsedServerReplacements, setParsedServerReplacements] = useState<ReplacementRecord[] | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // кэш для распарсенных документов в памяти
  const [parsedDocsCache, setParsedDocsCache] = useState<ParsedDocsCache>({});

  useEffect(() => {
    loadReplacements();
    loadServerFiles();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // ======== КЭШ СПИСКА ФАЙЛОВ В localStorage ========

  interface ServerFilesCacheEntry {
    timestamp: number;
    data: PathTypeResponse[];
  }

  const readServerFilesCache = (): ServerFilesCacheEntry | null => {
    try {
      const raw = localStorage.getItem(SERVER_FILES_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ServerFilesCacheEntry;
      if (!parsed || !Array.isArray(parsed.data)) return null;
      const now = Date.now();
      if (now - parsed.timestamp > SERVER_FILES_CACHE_TTL_MS) {
        // истёк срок действия
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  };

  const writeServerFilesCache = (data: PathTypeResponse[]) => {
    const entry: ServerFilesCacheEntry = {
      timestamp: Date.now(),
      data,
    };
    try {
      localStorage.setItem(SERVER_FILES_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // если localStorage недоступен — тихо игнорируем
    }
  };

  // ======== ПАРСИНГ ДОКУМЕНТОВ ========

  const parseDocumentBlob = async (blob: Blob, date: string): Promise<ReplacementRecord[]> => {
    const arrayBuffer = await blob.arrayBuffer();

    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value || '';

    if (result.messages && result.messages.length > 0) {
      console.warn('Mammoth warnings:', result.messages);
    }

    if (!html.trim()) {
      throw new Error('Не удалось получить содержимое документа (пустой HTML)');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const tables = doc.querySelectorAll('table');
    if (!tables.length) {
      throw new Error('В документе не найдено таблиц');
    }

    const table = tables[0];
    const rows = table.querySelectorAll('tr');
    if (rows.length < 2) {
      throw new Error('Таблица не содержит данных');
    }

    const dataRows = Array.from(rows).slice(1);
    const records: ReplacementRecord[] = [];

    for (const row of dataRows) {
      const cells = row.querySelectorAll('td');

      if (!cells.length) continue;
      if (cells.length < 5) continue;

      const rawGroup = cells[0].textContent?.trim() || '';
      const rawPair = cells[1].textContent?.trim() || '';
      const subjectInfo = (cells[2].textContent || '').trim();
      const changesInfo = (cells[3].textContent || '').trim();
      const roomCell = (cells[4].textContent || '').trim() || '—';

      const groupNum = parseInt(rawGroup, 10);
      const pairNum = parseInt(rawPair, 10);

      if (Number.isNaN(groupNum) || Number.isNaN(pairNum)) {
        continue;
      }

      if (!subjectInfo && !changesInfo) {
        continue;
      }

      let subject = '';
      let teacher = '';
      let subgroup: number | null = null;
      let originalRoom = '';

      const parts = subjectInfo
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      if (parts.length > 0) subject = parts[0];
      if (parts.length > 1) teacher = parts[1];

      for (let i = 2; i < parts.length; i++) {
        const part = parts[i];

        if (part.toLowerCase().startsWith('п/г')) {
          const match = part.match(/\d+/);
          if (match) subgroup = parseInt(match[0], 10);
        } else if (part.toLowerCase().startsWith('ауд.')) {
          originalRoom = part.replace(/ауд\./i, '').trim();
        }
      }

      const baseRoom = originalRoom || (roomCell !== '—' ? roomCell : '');

      let type: 'notWillBe' | 'replacement' = 'replacement';
      let newSubject = '';
      let newTeacher = '';
      let newRoom = '';

      if (changesInfo === 'Не будет') {
        type = 'notWillBe';
      } else if (changesInfo && changesInfo !== '—') {
        const changeParts = changesInfo
          .split(',')
          .map(p => p.trim())
          .filter(p => p.length > 0);

        if (changeParts.length > 0) newSubject = changeParts[0];
        if (changeParts.length > 1) newTeacher = changeParts[1];

        for (const part of changeParts) {
          if (part.toLowerCase().startsWith('ауд.')) {
            newRoom = part.replace(/ауд\./i, '').trim();
            break;
          }
        }
      }

      const id = `server_${date}_${groupNum}_${pairNum}_${records.length}`;

      records.push({
        id,
        date,
        displayDate: formatDisplayDate(date),
        groupNumber: groupNum,
        pairNumber: pairNum,
        subgroup,
        subject,
        teacher,
        room: baseRoom || '—',
        type,
        newSubject: type === 'replacement' && newSubject ? newSubject : undefined,
        newTeacher: type === 'replacement' && newTeacher ? newTeacher : undefined,
        newRoom: type === 'replacement'
          ? (newRoom || baseRoom || '—')
          : undefined,
        createdAt: new Date().toISOString(),
      });
    }

    if (!records.length) {
      throw new Error('Не удалось извлечь ни одной строки из таблицы');
    }

    return records;
  };

  // Парсинг файла по его ID для указанной даты + кэширование результата
  const parseServerFile = async (fileId: number, date: string) => {
    // сначала пробуем взять из кэша
    const cached = parsedDocsCache[fileId];
    if (cached && cached.length > 0) {
      setParsedServerReplacements(cached);
      setParseError(null);
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const blob = await methodistApiService.downloadFile(fileId);
      const records = await parseDocumentBlob(blob, date);

      // сохраняем в кэш по fileId
      setParsedDocsCache(prev => ({
        ...prev,
        [fileId]: records,
      }));

      setParsedServerReplacements(records);
    } catch (err: any) {
      console.error('Ошибка парсинга документа', err);
      const msg = err?.message || 'Неизвестная ошибка';
      setParseError(`Не удалось разобрать документ: ${msg}`);
      setParsedServerReplacements(null);
    } finally {
      setIsParsing(false);
    }
  };

  // Обработчик выбора даты
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);

    const serverFile = getServerFileForDate(date);

    if (serverFile) {
      setSelectedFileId(serverFile.id);

      const hasLocal = groupedReplacements[date]?.length > 0;

      if (!hasLocal) {
        parseServerFile(serverFile.id, date);
      } else {
        setParsedServerReplacements(null);
        setParseError(null);
      }
    } else {
      setSelectedFileId(null);
      setParsedServerReplacements(null);
      setParseError(null);
    }
  };

  // Сброс парсинга при изменении списка файлов (например, после удаления)
  useEffect(() => {
    if (selectedDate) {
      const serverFile = getServerFileForDate(selectedDate);
      if (!serverFile) {
        setParsedServerReplacements(null);
        setParseError(null);
      } else if (
        !groupedReplacements[selectedDate]?.length &&
        parsedServerReplacements === null &&
        !isParsing
      ) {
        parseServerFile(serverFile.id, selectedDate);
      }
    }
  }, [serverFiles, selectedDate, groupedReplacements]);

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

      // пробуем прочитать кэш
      const cached = readServerFilesCache();
      if (cached) {
        setServerFiles(cached.data);
        if (cached.data.length > 0 && selectedFileId === null) {
          setSelectedFileId(cached.data[0].id);
        }
        // фоном можно обновить, если нужно (опционально)
        // return;
      }

      const data = await methodistApiService.getFilesByType('Изменения в расписании');
      setServerFiles(data);
      writeServerFilesCache(data);

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

        // обновляем кэш списка файлов
        writeServerFilesCache(updatedFiles);

        if (selectedFileId === fileId) {
          setSelectedFileId(updatedFiles.length > 0 ? updatedFiles[0].id : null);
        }
        
        setSuccessMessage(`Документ "${fileName}" успешно удалён`);
        
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
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const formatDateForFileName = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

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
    const savedIds: string[] = [];
    
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
          console.warn('Пропускаем запись (не найдена связь)', record);
          continue;
        }

        const d = new Date(record.date);
        const dayWeek = methodistApiService.getDayWeekForApi(d);
        const weekNumber = getWeekNumber(d);
        const typeWeekFormatted = weekNumber % 2 === 0 ? 'Нижняя' : 'Верхняя';

        await methodistApiService.saveSchedule({
          dayWeek,
          typeWeek: typeWeekFormatted,
          numPair: record.pairNumber,
          room: record.newRoom || null,
          idSt: idInfo.idSt,
          idGroup: idInfo.idGroup,
          subgroup: record.subgroup,
          replacement: true,
          dateReplacement: record.date,
          isIgnored: false,
        });
        savedIds.push(record.id);
      } catch (e) {
        console.error('Ошибка при сохранении пары', record, e);
        setError(`Ошибка при сохранении замены для группы ${record.groupNumber}, ${record.pairNumber} пары`);
      }
    }
    
    if (savedIds.length > 0) {
      methodistApiService.deleteReplacementsByIds(savedIds);
      loadReplacements(); 
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
            const changes: string[] = [];
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

      const templateData = {
        date: displayDate,
        weekType: weekType,
        year: new Date(date).getFullYear().toString(),
        methodistName: 'Исаева Е.С.',
        replacements: tableData,
      };

      const PizZip = (await import('pizzip')).default;
      const Docxtemplater = (await import('docxtemplater')).default;

      const templateResponse = await fetch('/templates/replacement_template.docx');
      if (!templateResponse.ok) {
        throw new Error(`HTTP ${templateResponse.status}: ${templateResponse.statusText}`);
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
      setError(`Не удалось создать документ: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
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

  const parseDateFromFileName = (fileName: string): string | null => {
    const match = fileName.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month}-${day}`;
    }
    return null;
  };

  const getAllAvailableDates = (): string[] => {
    const localDates = Object.keys(groupedReplacements);
    const serverDates = serverFiles
      .map(file => parseDateFromFileName(file.nameFile))
      .filter((date): date is string => date !== null);
    
    const allDates = [...new Set([...localDates, ...serverDates])];
    return allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  };

  const getServerFileForDate = (date: string): PathTypeResponse | undefined => {
    return serverFiles.find(file => parseDateFromFileName(file.nameFile) === date);
  };

  const selectedFile = selectedFileId ? serverFiles.find(f => f.id === selectedFileId) || null : null;
  const availableDates = getAllAvailableDates();

  const currentDateHasLocalChanges = selectedDate && groupedReplacements[selectedDate]?.length > 0;
  const currentDateHasServerFile = selectedDate && getServerFileForDate(selectedDate);

  const currentRecords: ReplacementRecord[] =
    (selectedDate && groupedReplacements[selectedDate]) ||
    parsedServerReplacements ||
    [];

  const hasParsedOnly =
    selectedDate &&
    !currentDateHasLocalChanges &&
    parsedServerReplacements &&
    parsedServerReplacements.length > 0;

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

      {error && <div className="md-error-message">{error}</div>}
      {successMessage && <div className="md-success-message">{successMessage}</div>}

      <div className="rd-content-block">
        {availableDates.length === 0 ? (
          <div className="rd-empty">
            <p>Нет изменений для отображения</p>
          </div>
        ) : (
          <div className="rd-content">
            <div className="rd-sidebar">
              <h3>Документы по датам</h3>
              <ul className="rd-date-list">
                {availableDates.map(date => {
                  const serverFile = getServerFileForDate(date);
                  const hasLocalChanges = groupedReplacements[date]?.length > 0;
                  const isSelected = selectedDate === date;
                  
                  return (
                    <li
                      key={serverFile?.id || date}
                      className={`rd-date-item ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelectDate(date)}>
                      <span className="rd-date-text">
                        {formatDate(date)}
                        {serverFile && !hasLocalChanges && (
                          <span className="status-badge saved">сохранено</span>
                        )}
                        {hasLocalChanges && !serverFile && (
                          <span className="status-badge pending">черновик</span>
                        )}
                        {hasLocalChanges && serverFile && (
                          <span className="status-badge edited">изменено</span>
                        )}
                      </span>
                      {serverFile && (
                        <button
                          className="rd-delete-btn"
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteDocument(serverFile.id, serverFile.nameFile);
                          }}
                          disabled={deletingFileId === serverFile.id}
                          title="Удалить документ">
                          {deletingFileId === serverFile.id ? '...' : '×'}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rd-main">
              {selectedDate && (
                <div className="rd-document">
                  <div className="rd-document-header">
                    <h2>Изменения в расписании на {formatDate(selectedDate)}</h2>
                    <div className="rd-status-indicators">
                      {currentDateHasServerFile && (
                        <span className="status-indicator saved">
                          Документ сохранён на сервере
                        </span>
                      )}
                      {currentDateHasLocalChanges && (
                        <span className="status-indicator pending">
                          Есть несохранённые изменения
                        </span>
                      )}
                      {hasParsedOnly && (
                        <span className="status-indicator pending">
                          Документ загружен с сервера
                        </span>
                      )}
                    </div>
                  </div>

                  {currentRecords.length > 0 ? (
                    <>
                      {Object.entries(
                        currentRecords.reduce((acc, record) => {
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
                                    const roomInfo =
                                      record.room !== '—' && record.room !== ''
                                        ? `, ауд.${record.room}`
                                        : '';
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
                                          {currentDateHasLocalChanges && (
                                            <button
                                              className="rd-record-delete"
                                              onClick={() => handleDeleteRecord(record.id)}
                                              title="Удалить запись">
                                              ×
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        ))}

                      {currentDateHasLocalChanges && (
                        <div className="rd-document-actions">
                          <button
                            className="rd-save-btn"
                            onClick={async () => {
                              if (!selectedDate) return;
                              await saveScheduleForDate(selectedDate);
                              await uploadDocumentFile(selectedDate);
                              handleSelectDate(selectedDate);
                            }}>
                            Сохранить
                          </button>
                        </div>
                      )}
                    </>
                  ) : currentDateHasServerFile && !isParsing ? (
                    <div className="rd-document-saved">
                      <p className="rd-saved-message">
                        Не удалось получить данные о заменах из документа
                      </p>
                      <p className="rd-saved-hint">
                        Попробуйте скачать .docx и проверить формат таблицы
                      </p>
                    </div>
                  ) : (
                    <div className="rd-empty">
                      <p>Нет изменений для этой даты</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};