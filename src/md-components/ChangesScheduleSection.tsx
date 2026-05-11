import './ChangesScheduleSection.css';
import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../constants/apiConstant';
import { useNavigate } from 'react-router-dom'; 

interface ApiGroup {
  id: number;
  numberGroup: number;
  specialty: string;
  course: number;
}

interface ApiSubject {
  id: number;
  subjectName: string;
}

interface ApiStaff {
  id: number;
  name: string;
  lastName: string;
  patronymic?: string;
  staffPosition?: { id: number }[];
}

interface ApiSchedule {
  id: number;
  dayWeek: string;
  typeWeek: string;
  numPair: number;
  room: string;
  idSt: number;
  idGroup: number;
  subgroup: number | null;
  replacement: boolean;
  dateReplacement: string | null;
}

interface ApiSubjectTeacher {
  id: number;
  teachers: number[];
  idSubject: number;
  groups: number[];
}

interface TeacherGroupSubject {
  idSt: number;
  subjectName: string;
  idGroups: number[];
}

interface TeacherOption {
  id: number;
  name: string;
}

interface SubjectOption {
  id: number;
  name: string;
}

interface SchedulePair {
  id: number;
  groupId: number;
  groupNumber: number;
  pairNumber: number;
  room: string;
  teacherId: number;
  teacherName: string;
  subjectId: number;
  subjectName: string;
  subgroup: number | null;
  dayWeek: string;
  typeWeek: string;
}

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

// компонент выпадающего списка с поиском
interface SearchableSelectProps {
  value: number | '';
  onChange: (value: number | '') => void;
  options: { id: number; name: string }[];
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Выберите...',
  className = '',
  style,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(o => o.id === value);

  const filtered = options.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSelect = (id: number) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-select-wrapper ${className}`}
      style={{ position: 'relative', width: '100%', ...style }}
    >
      <button
        type="button"
        className={`cs-select searchable-select-trigger ${
          disabled ? 'cs-disabled' : ''
        }`}
        onClick={() => {
          if (!disabled) setOpen(prev => !prev);
        }}
        disabled={disabled}
      >
        <span className="searchable-select-label">
          {selectedOption ? selectedOption.name : placeholder}
        </span>
      </button>

      {open && (
        <div className="searchable-select-dropdown">
          <div style={{ padding: '8px', borderBottom: '1px solid #eef2f6' }}>
            <input
              ref={searchInputRef}
              type="text"
              className="cs-input"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <ul className="searchable-select-list">
            {filtered.length > 0 ? (
              filtered.map(o => (
                <li
                  key={o.id}
                  className={`searchable-select-option ${
                    o.id === value ? 'selected' : ''
                  }`}
                  onMouseDown={() => handleSelect(o.id)}
                >
                  {o.name}
                </li>
              ))
            ) : (
              <li className="searchable-select-option no-results">
                Ничего не найдено
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// формирование замен в расписании
export const ChangesSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<number | ''>('');
  const [filterType, setFilterType] = useState<'allDay' | 'pairRange'>('allDay');
  const [startPair, setStartPair] = useState<number>(1);
  const [endPair, setEndPair] = useState<number>(6);
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [schedule, setSchedule] = useState<ApiSchedule[]>([]);
  const [subjectTeachers, setSubjectTeachers] = useState<ApiSubjectTeacher[]>([]);
  const [teacherGroups, setTeacherGroups] = useState<TeacherGroupSubject[]>([]);
  const [filteredPairs, setFilteredPairs] = useState<SchedulePair[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [weekType, setWeekType] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [selectedNewTeacher, setSelectedNewTeacher] = useState<{ [key: number]: number }>({});
  const [selectedNewSubject, setSelectedNewSubject] = useState<{ [key: number]: number }>({});
  const [selectedNewRoom, setSelectedNewRoom] = useState<{ [key: number]: string }>({});

  const dbRooms = ['120', '123', '124', '127', '221', '226'];

  useEffect(() => {
    const loadInitialData = async () => {
      setInitialLoading(true);
      try {
        const groupsRes = await fetch(`${API_BASE_URL}/api/v1/groups`);
        if (!groupsRes.ok) throw new Error(`Ошибка загрузки групп: ${groupsRes.status}`);
        setGroups(await groupsRes.json());

        const subjectsRes = await fetch(`${API_BASE_URL}/api/v1/subjects`);
        if (!subjectsRes.ok) throw new Error(`Ошибка загрузки предметов: ${subjectsRes.status}`);
        setSubjects(await subjectsRes.json());

        const stRes = await fetch(`${API_BASE_URL}/api/v1/st`);
        if (!stRes.ok) throw new Error(`Ошибка загрузки данных st: ${stRes.status}`);
        setSubjectTeachers(await stRes.json());

        const teachersRes = await fetch(`${API_BASE_URL}/api/v1/staffs`);
        if (!teachersRes.ok) throw new Error(`Ошибка загрузки преподавателей: ${teachersRes.status}`);
        const teachersData: ApiStaff[] = await teachersRes.json();
        const onlyTeachers = teachersData
          .filter(st => st.staffPosition?.some(pos => pos.id === 9))
          .map(st => ({
            id: st.id,
            name: `${st.lastName} ${st.name} ${st.patronymic || ''}`.trim()
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setTeachers(onlyTeachers);

        const scheduleRes = await fetch(`${API_BASE_URL}/api/v1/schedule`);
        if (!scheduleRes.ok) throw new Error(`Ошибка загрузки расписания: ${scheduleRes.status}`);
        setSchedule(await scheduleRes.json());
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    const loadTeacherGroups = async () => {
      if (!selectedTeacher) { setTeacherGroups([]); return; }
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/st/teacherGroups/${selectedTeacher}`);
        if (!res.ok) throw new Error(`Ошибка загрузки данных teacherGroups: ${res.status}`);
        setTeacherGroups(await res.json());
      } catch (e: any) {
        console.error(e);
        setTeacherGroups([]);
      }
    };
    loadTeacherGroups();
  }, [selectedTeacher]);

  useEffect(() => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      const weekNumber = Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
      setWeekType(weekNumber % 2 === 0 ? 'Нижняя' : 'Верхняя');
    }
  }, [selectedDate]);

  const getSubjectNameByIdSt = (idSt: number): string => {
    return teacherGroups.find(tg => tg.idSt === idSt)?.subjectName || 'Предмет не найден';
  };

  const getSubjectIdByIdSt = (idSt: number): number => {
    return subjectTeachers.find(st => st.id === idSt)?.idSubject || 0;
  };

  const getDayWeekForApi = (date: Date): string => {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[date.getDay()];
  };

  const getAllSubjects = (): SubjectOption[] =>
    subjects.map(s => ({ id: s.id, name: s.subjectName })).sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (!selectedTeacher || !selectedDate || teacherGroups.length === 0) {
      setFilteredPairs([]);
      return;
    }
    setLoading(true);

    const date = new Date(selectedDate);
    const dayWeekForApi = getDayWeekForApi(date);
    const weekNumber = Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    const typeWeek = weekNumber % 2 === 0 ? 'Нижняя' : 'Верхняя';
    const teacherIdStValues = teacherGroups.map(tg => tg.idSt);
    const allTeacherGroupIds = teacherGroups.flatMap(tg => tg.idGroups);

    let filtered = schedule.filter(item =>
      teacherIdStValues.includes(item.idSt) &&
      allTeacherGroupIds.includes(item.idGroup) &&
      item.dayWeek === dayWeekForApi &&
      (item.typeWeek === 'Общая' || item.typeWeek === typeWeek) &&
      !item.replacement
    );

    if (filterType === 'pairRange') {
      filtered = filtered.filter(item => item.numPair >= startPair && item.numPair <= endPair);
    }

    const pairsWithDetails: SchedulePair[] = filtered.map(item => {
      const group = groups.find(g => g.id === item.idGroup);
      const teacher = teachers.find(t => t.id === selectedTeacher);
      return {
        id: item.id,
        groupId: item.idGroup,
        groupNumber: group?.numberGroup || 0,
        pairNumber: item.numPair,
        room: item.room || '—',
        teacherId: selectedTeacher as number,
        teacherName: teacher?.name || 'Неизвестный преподаватель',
        subjectId: getSubjectIdByIdSt(item.idSt),
        subjectName: getSubjectNameByIdSt(item.idSt),
        subgroup: item.subgroup,
        dayWeek: item.dayWeek,
        typeWeek: item.typeWeek
      };
    });

    pairsWithDetails.sort((a, b) => a.pairNumber - b.pairNumber);
    setFilteredPairs(pairsWithDetails);
    setLoading(false);
  }, [selectedTeacher, selectedDate, schedule, groups, teachers, teacherGroups, subjectTeachers, filterType, startPair, endPair]);

  const saveReplacementToStorage = (pair: SchedulePair, type: 'notWillBe' | 'replacement', replacementData?: any) => {
    if (!selectedDate) return;
    const storageKey = 'scheduleReplacements';
    const existingData = localStorage.getItem(storageKey);
    const replacements: ReplacementRecord[] = existingData ? JSON.parse(existingData) : [];
    const newReplacement: ReplacementRecord = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: selectedDate,
      displayDate: new Date(selectedDate).toLocaleDateString('ru-RU'),
      groupNumber: pair.groupNumber,
      pairNumber: pair.pairNumber,
      subgroup: pair.subgroup,
      subject: pair.subjectName,
      teacher: pair.teacherName,
      room: pair.room,
      type,
      createdAt: new Date().toISOString()
    };
    if (type === 'replacement' && replacementData) {
      newReplacement.newSubject = replacementData.newSubject;
      newReplacement.newTeacher = replacementData.newTeacher;
      newReplacement.newRoom = replacementData.newRoom;
    }
    replacements.push(newReplacement);
    localStorage.setItem(storageKey, JSON.stringify(replacements));
  };

  const handleSetNotWillBe = (pairId: number) => {
    const pair = filteredPairs.find(p => p.id === pairId);
    if (pair) saveReplacementToStorage(pair, 'notWillBe');
    setFilteredPairs(prev => prev.filter(p => p.id !== pairId));
    const n = { ...selectedNewTeacher };
    delete n[pairId];
    setSelectedNewTeacher(n);
  };

  const handleSaveReplacement = (pairId: number) => {
    const pair = filteredPairs.find(p => p.id === pairId);
    if (pair) {
      const subjectName = subjects.find(s => s.id === selectedNewSubject[pairId])?.subjectName || '';
      const teacherName = teachers.find(t => t.id === selectedNewTeacher[pairId])?.name || '';
      saveReplacementToStorage(pair, 'replacement', { newSubject: subjectName, newTeacher: teacherName, newRoom: selectedNewRoom[pairId] });
    }
    setFilteredPairs(prev => prev.filter(p => p.id !== pairId));
    const n = { ...selectedNewTeacher };
    delete n[pairId];
    setSelectedNewTeacher(n);
  };

  if (initialLoading) return <div className="cs-loading">Загрузка данных...</div>;

  return (
    <div className="cs-container">
      <div className="cs-filters">
        <div className="cs-actions-row">
          <button className="back-button" onClick={() => navigate('/metodist')}>Назад</button>
          <button className="cs-btn cs-btn-add" onClick={() => navigate('/metodist/changes/add-pair')}>Добавить пару</button>
          <button className="cs-btn cs-btn-view" onClick={() => navigate('/metodist/changes/replacement-documents')}>Просмотр документов</button>
        </div>

        <div className="cs-filters-row">
          <div className="cs-filter-group">
            <label>Дата:</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="cs-input" />
          </div>

          <div className="cs-filter-group">
            <label>Преподаватель:</label>
            <SearchableSelect
              value={selectedTeacher}
              onChange={(val) => setSelectedTeacher(val)}
              options={teachers}
              placeholder="Выберите преподавателя"
            />
          </div>

          <div className="cs-filter-group">
            <label>Тип фильтрации:</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as 'allDay' | 'pairRange')} className="cs-select">
              <option value="allDay">Весь день</option>
              <option value="pairRange">Диапазон пар</option>
            </select>
          </div>

          {filterType === 'pairRange' && (
            <div className="cs-filter-group cs-pair-range">
              <select value={startPair} onChange={(e) => setStartPair(Number(e.target.value))} className="cs-select">
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} пара</option>)}
              </select>
              <span>—</span>
              <select value={endPair} onChange={(e) => setEndPair(Number(e.target.value))} className="cs-select">
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} пара</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading && <div className="cs-loading">Загрузка расписания...</div>}

      {!loading && filteredPairs.length > 0 ? (
        <div className="cs-schedule-list">
          <table className="cs-table">
            <thead>
              <tr>
                <th>№ группы</th>
                <th>№ пары</th>
                <th>Подгруппа</th>
                <th>Предмет</th>
                <th>Аудитория</th>
                <th>Преподаватель</th>
                <th>Тип недели</th>
                <th>Новый предмет</th>
                <th>Новый преподаватель</th>
                <th>Новая ауд.</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredPairs.map(pair => {
                const allSubjects = getAllSubjects();
                return (
                  <tr key={pair.id} className="cs-pair-row">
                    <td>{pair.groupNumber}</td>
                    <td>{pair.pairNumber}</td>
                    <td>{pair.subgroup || '-'}</td>
                    <td className="cs-subject-cell">{pair.subjectName}</td>
                    <td>{pair.room}</td>
                    <td><div className="cs-teacher-name">{pair.teacherName}</div></td>
                    <td>{pair.typeWeek}</td>
                    <td>
                      <div className="cs-change-cell">
                        <select
                          className="cs-change-select"
                          value={selectedNewSubject[pair.id] || ''}
                          onChange={(e) => {
                            const value = e.target.value ? Number(e.target.value) : 0;
                            setSelectedNewSubject(prev => ({ ...prev, [pair.id]: value }));
                          }}>
                          <option value="">Выберите предмет</option>
                          {allSubjects.map(subject => (
                            <option key={subject.id} value={subject.id}>{subject.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <div className="cs-change-cell">
                        <select
                          className="cs-change-select"
                          value={selectedNewTeacher[pair.id] || ''}
                          onChange={(e) => {
                            const value = e.target.value ? Number(e.target.value) : 0;
                            setSelectedNewTeacher(prev => ({ ...prev, [pair.id]: value }));
                            setSelectedNewSubject(prev => ({ ...prev, [pair.id]: 0 }));
                          }}>
                          <option value="">Выберите преподавателя</option>
                          {teachers.filter(t => t.id !== pair.teacherId).map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <select
                        className="cs-room-select"
                        value={selectedNewRoom[pair.id] || ''}
                        onChange={(e) => setSelectedNewRoom(prev => ({ ...prev, [pair.id]: e.target.value }))}>
                        <option value="">Ауд.</option>
                        {dbRooms.map(room => <option key={room} value={room}>{room}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="cs-actions">
                        <button className="cs-btn cs-btn-save" onClick={() => handleSaveReplacement(pair.id)}>Сохранить</button>
                        <button className="cs-btn cs-btn-notwill" onClick={() => handleSetNotWillBe(pair.id)}>Не будет</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && (
          <div className="cs-empty">
            {selectedDate && selectedTeacher ? (
              <p>Нет пар для отображения на выбранную дату</p>
            ) : (
              <p>Выберите дату и преподавателя для просмотра расписания</p>
            )}
          </div>
        )
      )}
    </div>
  );
};

// добавление пары
export const AddPairPage: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [schedule, setSchedule] = useState<ApiSchedule[]>([]);

  const [selectedGroup, setSelectedGroup] = useState<number | ''>('');
  const [selectedPair, setSelectedPair] = useState<number | ''>('');
  const [selectedTeacher, setSelectedTeacher] = useState<number | ''>('');
  const [selectedSubject, setSelectedSubject] = useState<number | ''>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedSubgroup, setSelectedSubgroup] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [weekType, setWeekType] = useState<string>('');

  const dbRooms = ['120', '123', '124', '127', '221', '226'];
  const subgroups = [1, 2];

  useEffect(() => {
    const loadData = async () => {
      try {
        const groupsRes = await fetch(`${API_BASE_URL}/api/v1/groups`);
        setGroups(await groupsRes.json());

        const teachersRes = await fetch(`${API_BASE_URL}/api/v1/staffs`);
        const teachersData: ApiStaff[] = await teachersRes.json();
        const onlyTeachers = teachersData
          .filter(st => st.staffPosition?.some(pos => pos.id === 9))
          .map(st => ({
            id: st.id,
            name: `${st.lastName} ${st.name} ${st.patronymic || ''}`.trim()
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setTeachers(onlyTeachers);

        const subjectsRes = await fetch(`${API_BASE_URL}/api/v1/subjects`);
        const subjectsData: ApiSubject[] = await subjectsRes.json();
        setSubjects(subjectsData);

        const scheduleRes = await fetch(`${API_BASE_URL}/api/v1/schedule`);
        setSchedule(await scheduleRes.json());
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      const weekNumber = Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
      setWeekType(weekNumber % 2 === 0 ? 'Нижняя' : 'Верхняя');
    }
  }, [selectedDate]);

  const getDayWeekForApi = (date: Date): string => {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[date.getDay()];
  };

  const getAvailablePairs = (): { numPair: number; time: string }[] => {
    if (!selectedGroup || !selectedDate) return [];
    const date = new Date(selectedDate);
    const dayWeekForApi = getDayWeekForApi(date);
    const weekNumber = Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    const typeWeek = weekNumber % 2 === 0 ? 'Нижняя' : 'Верхняя';
    const occupiedPairs = schedule
      .filter(item =>
        item.idGroup === selectedGroup &&
        item.dayWeek === dayWeekForApi &&
        (item.typeWeek === 'Общая' || item.typeWeek === typeWeek) &&
        !item.replacement
      )
      .map(item => item.numPair);
    const allPairs = [
      { numPair: 1, time: '8:30 - 10:10' },
      { numPair: 2, time: '10:20 - 12:00' },
      { numPair: 3, time: '12:45 - 14:25' },
      { numPair: 4, time: '14:35 - 16:15' },
      { numPair: 5, time: '16:25 - 18:05' },
      { numPair: 6, time: '18:45 - 20:05' },
      { numPair: 7, time: '20:05 - 21:45' }
    ];
    return allPairs.filter(pair => !occupiedPairs.includes(pair.numPair));
  };

  const availablePairs = getAvailablePairs();

  const handleSave = () => {
    if (!selectedGroup || !selectedPair || !selectedTeacher || !selectedSubject || !selectedRoom || !selectedDate) return;
    const group = groups.find(g => g.id === selectedGroup);
    const teacher = teachers.find(t => t.id === selectedTeacher);
    const subject = subjects.find(s => s.id === selectedSubject);
    if (!group || !teacher || !subject) return;

    const storageKey = 'scheduleReplacements';
    const existingData = localStorage.getItem(storageKey);
    const replacements: ReplacementRecord[] = existingData ? JSON.parse(existingData) : [];
    const newReplacement: ReplacementRecord = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: selectedDate,
      displayDate: new Date(selectedDate).toLocaleDateString('ru-RU'),
      groupNumber: group.numberGroup,
      pairNumber: selectedPair as number,
      subgroup: selectedSubgroup || null,
      subject: '—',
      teacher: '—',
      room: '—',
      type: 'replacement',
      newSubject: subject.subjectName,
      newTeacher: teacher.name,
      newRoom: selectedRoom,
      createdAt: new Date().toISOString()
    };
    replacements.push(newReplacement);
    localStorage.setItem(storageKey, JSON.stringify(replacements));
    navigate('/metodist/changes');
  };

  // Опции предметов для SearchableSelect
  const subjectOptions = subjects
    .map(s => ({ id: s.id, name: s.subjectName }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="add-pair-container">
      <div className="add-pair-header-block">
        <div className="add-pair-date-info">
          <div className="date-info-item">
            <span className="date-info-label">Дата:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-info-input"
              placeholder="дд.мм.гггг"
            />
          </div>
        </div>
        <div className="add-pair-nav">
          <button className="back-button" onClick={() => navigate('/metodist/changes')}>Назад</button>
        </div>
      </div>

      <div className="add-pair-form-block">
        <div className="add-pair-form">
          <div className="form-section">
            <h3>Основная информация</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Группа <span className="required">*</span></label>
                <select
                  value={selectedGroup}
                  onChange={(e) => { setSelectedGroup(Number(e.target.value)); setSelectedPair(''); }}
                  className="form-control">
                  <option value="">Выберите группу</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.numberGroup} - {group.specialty} ({group.course} курс)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Номер пары <span className="required">*</span></label>
                <select
                  value={selectedPair}
                  onChange={(e) => setSelectedPair(Number(e.target.value))}
                  className="form-control"
                  disabled={!selectedGroup}>
                  <option value="">Выберите пару</option>
                  {availablePairs.map(pair => (
                    <option key={pair.numPair} value={pair.numPair}>
                      {pair.numPair} пара ({pair.time})
                    </option>
                  ))}
                </select>
                {selectedGroup && availablePairs.length === 0 && (
                  <div className="form-hint warning">Нет свободных пар на выбранную дату</div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Подгруппа</label>
                <select
                  value={selectedSubgroup}
                  onChange={(e) => setSelectedSubgroup(e.target.value ? Number(e.target.value) : '')}
                  className="form-control">
                  <option value="">Нет</option>
                  {subgroups.map(num => <option key={num} value={num}>{num} подгруппа</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Детали занятия</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Преподаватель <span className="required">*</span></label>
                <SearchableSelect
                  value={selectedTeacher}
                  onChange={(val) => setSelectedTeacher(val)}
                  options={teachers}
                  placeholder="Выберите преподавателя"
                />
              </div>

              <div className="form-group">
                <label>Предмет <span className="required">*</span></label>
                <SearchableSelect
                  value={selectedSubject}
                  onChange={(val) => setSelectedSubject(val)}
                  options={subjectOptions}
                  placeholder="Выберите предмет"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Аудитория <span className="required">*</span></label>
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="form-control">
                  <option value="">Выберите аудиторию</option>
                  {dbRooms.map(room => <option key={room} value={room}>{room}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => navigate('/metodist/changes')}>Отмена</button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!selectedGroup || !selectedPair || !selectedTeacher || !selectedSubject || !selectedRoom}>
              Сохранить пару
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
