import './ChangesScheduleSection.css';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { methodistApiService } from '../services/methodistApiService';
import type {
  ApiGroup,
  ApiSubject,
  TeacherOption,
  ApiRoom,
  ApiSchedule,
  ApiSubjectTeacher,
  TeacherGroupSubject,
  SchedulePair,
  ReplacementRecord,
  SubjectOption
} from '../services/methodistApiService';

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
        <div className="searchable-select-dropdown" style={{ position: 'absolute', zIndex: 1000 }}>
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
          <ul className="searchable-select-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
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
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
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
  const [roomSearchTerm, setRoomSearchTerm] = useState<string>('');
  const [filteredRooms, setFilteredRooms] = useState<ApiRoom[]>([]);
  const [roomOptions, setRoomOptions] = useState<{ id: number; name: string }[]>([]);
  const [newTeacherSubjects, setNewTeacherSubjects] = useState<{ [key: number]: SubjectOption[] }>({});

  // Загрузка предметов для выбранного нового преподавателя
  useEffect(() => {
    const loadSubjectsForNewTeacher = async () => {
      const teacherIds = [...new Set(Object.values(selectedNewTeacher).filter(id => id !== 0 && id !== undefined))];
      
      for (const teacherId of teacherIds) {
        if (newTeacherSubjects[teacherId]) continue;
        
        try {
          const teacherGroupsData = await methodistApiService.getTeacherGroups(teacherId);
          
          const uniqueSubjects = new Map<number, string>();
          teacherGroupsData.forEach(tg => {
            if (!uniqueSubjects.has(tg.idSt)) {
              uniqueSubjects.set(tg.idSt, tg.subjectName);
            }
          });
          
          const subjectsList = Array.from(uniqueSubjects.entries()).map(([id, name]) => ({
            id,
            name
          })).sort((a, b) => a.name.localeCompare(b.name));
          
          setNewTeacherSubjects(prev => ({
            ...prev,
            [teacherId]: subjectsList
          }));
        } catch (error) {
          console.error(`Ошибка загрузки предметов для преподавателя ${teacherId}:`, error);
          setNewTeacherSubjects(prev => ({
            ...prev,
            [teacherId]: []
          }));
        }
      }
    };
    
    if (Object.keys(selectedNewTeacher).length > 0) {
      loadSubjectsForNewTeacher();
    }
  }, [selectedNewTeacher, newTeacherSubjects]);

  // Загрузка аудиторий
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const data = await methodistApiService.getRooms();
        setRooms(data);
        const options = await methodistApiService.getRoomOptions();
        setRoomOptions(options);
      } catch (error) {
        console.error('Ошибка загрузки аудиторий:', error);
      }
    };
    loadRooms();
  }, []);

  // фильтрация аудиторий по поиску
  useEffect(() => {
    if (roomSearchTerm.trim() === '') {
      setFilteredRooms(rooms);
    } else {
      const filtered = rooms.filter(room =>
        room.name.toLowerCase().includes(roomSearchTerm.toLowerCase())
      );
      setFilteredRooms(filtered);
    }
  }, [roomSearchTerm, rooms]);

  useEffect(() => {
    const loadInitialData = async () => {
      setInitialLoading(true);
      try {
        const [groupsData, subjectsData, subjectTeachersData, teachersData, scheduleData] = await Promise.all([
          methodistApiService.getGroups(),
          methodistApiService.getSubjects(),
          methodistApiService.getSubjectTeachers(),
          methodistApiService.getTeachers(),
          methodistApiService.getSchedule()
        ]);
        
        setGroups(groupsData);
        setSubjects(subjectsData);
        setSubjectTeachers(subjectTeachersData);
        setTeachers(teachersData);
        setSchedule(scheduleData);
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
      if (!selectedTeacher) { 
        setTeacherGroups([]); 
        return; 
      }
      try {
        const data = await methodistApiService.getTeacherGroups(selectedTeacher as number);
        setTeacherGroups(data);
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
      setWeekType(methodistApiService.getWeekType(date));
    }
  }, [selectedDate]);

  const getSubjectNameByIdSt = (idSt: number): string => {
    return teacherGroups.find(tg => tg.idSt === idSt)?.subjectName || 'Предмет не найден';
  };

  const getSubjectIdByIdSt = (idSt: number): number => {
    return subjectTeachers.find(st => st.id === idSt)?.idSubject || 0;
  };

  // получение предметов для выбранного преподавателя
  const getSubjectsForTeacher = (teacherId: number): SubjectOption[] => {
    if (!teacherId) return [];
    if (newTeacherSubjects[teacherId]) {
      return newTeacherSubjects[teacherId];
    }
    return [];
  };

  useEffect(() => {
    if (!selectedTeacher || !selectedDate || teacherGroups.length === 0) {
      setFilteredPairs([]);
      return;
    }
    setLoading(true);

    const date = new Date(selectedDate);
    const dayWeekForApi = methodistApiService.getDayWeekForApi(date);
    const typeWeek = methodistApiService.getWeekType(date);
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

  // генерация уникального ID для записи замены
  const generateReplacementId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${performance.now()}`;
  };

  const saveReplacementToStorage = (pair: SchedulePair, type: 'notWillBe' | 'replacement', replacementData?: any) => {
    if (!selectedDate) return;
    
    const newReplacement: ReplacementRecord = {
      id: generateReplacementId(),
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
    
    methodistApiService.saveReplacement(newReplacement);
  };

  // очистка состояния по идентификатору пары
  const cleanupPairState = (pairId: number) => {
    setSelectedNewTeacher(prev => {
      const next = { ...prev };
      delete next[pairId];
      return next;
    });
    setSelectedNewSubject(prev => {
      const next = { ...prev };
      delete next[pairId];
      return next;
    });
    setSelectedNewRoom(prev => {
      const next = { ...prev };
      delete next[pairId];
      return next;
    });
  };

  const handleSetNotWillBe = (pairId: number) => {
    const pair = filteredPairs.find(p => p.id === pairId);
    if (pair) saveReplacementToStorage(pair, 'notWillBe');
    setFilteredPairs(prev => prev.filter(p => p.id !== pairId));
    cleanupPairState(pairId);
  };

  const handleSaveReplacement = (pairId: number) => {
    const pair = filteredPairs.find(p => p.id === pairId);
    if (pair) {
      const teacherId = selectedNewTeacher[pairId];
      const teacherSubjects = getSubjectsForTeacher(teacherId || 0);
      const selectedSubjectIdSt = selectedNewSubject[pairId];
      const subjectOption = teacherSubjects.find(s => s.id === selectedSubjectIdSt);
      const subjectName = subjectOption?.name || '';
      const teacherName = teachers.find(t => t.id === teacherId)?.name || '';

      saveReplacementToStorage(pair, 'replacement', { 
        newSubject: subjectName, 
        newTeacher: teacherName, 
        newRoom: selectedNewRoom[pairId] 
      });
    }

    setFilteredPairs(prev => prev.filter(p => p.id !== pairId));
    cleanupPairState(pairId);
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
                <th>п/г</th>
                <th>Предмет</th>
                <th>Аудитория</th>
                <th>Преподаватель</th>
                <th>Тип недели</th>
                <th>Новый преподаватель</th>
                <th>Новый предмет</th>
                <th>Новая ауд.</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredPairs.map(pair => {
                const teacherSubjects = getSubjectsForTeacher(selectedNewTeacher[pair.id] || 0);
                return (
                  <tr key={pair.id} className="cs-pair-row">
                    <td>{pair.groupNumber}</td>
                    <td>{pair.pairNumber}</td>
                    <td>{pair.subgroup || '—'}</td>
                    <td className="cs-subject-cell">{pair.subjectName}</td>
                    <td>{pair.room}</td>
                    <td><div className="cs-teacher-name">{pair.teacherName}</div></td>
                    <td>{pair.typeWeek}</td>
                    <td>
                      <div className="cs-change-cell">
                        <SearchableSelect
                          value={selectedNewTeacher[pair.id] || ''}
                          onChange={(value) => {
                            const val = value ? Number(value) : 0;
                            setSelectedNewTeacher(prev => ({ ...prev, [pair.id]: val }));
                            setSelectedNewSubject(prev => ({ ...prev, [pair.id]: 0 }));
                          }}
                          options={teachers.filter(t => t.id !== pair.teacherId)}
                          placeholder="Выберите преподавателя"
                        />
                      </div>
                    </td>
                    <td>
                      <div className="cs-change-cell">
                        <SearchableSelect
                          value={selectedNewSubject[pair.id] || ''}
                          onChange={(value) => {
                            const val = value ? Number(value) : 0;
                            setSelectedNewSubject(prev => ({ ...prev, [pair.id]: val }));
                          }}
                          options={teacherSubjects}
                          placeholder="Выберите предмет"
                          disabled={!selectedNewTeacher[pair.id]}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="cs-change-cell">
                        <SearchableSelect
                          value={(() => {
                            const room = rooms.find(r => r.name === (selectedNewRoom[pair.id] || ''));
                            return room ? room.id : '';
                          })()}
                          onChange={(value) => {
                            const roomId = value ? Number(value) : 0;
                            const room = rooms.find(r => r.id === roomId);
                            setSelectedNewRoom(prev => ({ ...prev, [pair.id]: room?.name || '' }));
                          }}
                          options={roomOptions}
                          placeholder="Выберите аудиторию"
                        />
                      </div>
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
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<SubjectOption[]>([]);
  const [roomOptions, setRoomOptions] = useState<{ id: number; name: string }[]>([]);
  
  const [selectedGroup, setSelectedGroup] = useState<number | ''>('');
  const [selectedPair, setSelectedPair] = useState<number | ''>('');
  const [selectedTeacher, setSelectedTeacher] = useState<number | ''>('');
  const [selectedSubject, setSelectedSubject] = useState<number | ''>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedSubgroup, setSelectedSubgroup] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [weekType, setWeekType] = useState<string>('');

  const subgroups = [1, 2];

  // загрузка аудиторий
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const data = await methodistApiService.getRooms();
        setRooms(data);
        const options = await methodistApiService.getRoomOptions();
        setRoomOptions(options);
      } catch (error) {
        console.error('Ошибка загрузки аудиторий:', error);
      }
    };
    loadRooms();
  }, []);

  // загрузка предметов для выбранного преподавателя
  useEffect(() => {
    const loadTeacherSubjects = async () => {
      if (!selectedTeacher || !selectedGroup) {
        setTeacherSubjects([]);
        return;
      }

      try {
        const data = await methodistApiService.getGroupSubjects(selectedGroup as number);
        
        const uniqueSubjects = new Map<number, string>();
        
        data
          .filter(item => item.teachers.some((t: any) => t.idTeacher === selectedTeacher))
          .forEach(item => {
            if (!uniqueSubjects.has(item.idSubject)) {
              uniqueSubjects.set(item.idSubject, item.nameSubject);
            }
          });
        
        const filtered = Array.from(uniqueSubjects.entries()).map(([id, name]) => ({
          id,
          name
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        setTeacherSubjects(filtered);
      } catch (error) {
        console.error('Ошибка загрузки предметов для преподавателя:', error);
        setTeacherSubjects([]);
      }
    };
    loadTeacherSubjects();
  }, [selectedTeacher, selectedGroup]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [groupsData, teachersData, scheduleData] = await Promise.all([
          methodistApiService.getGroups(),
          methodistApiService.getTeachers(),
          methodistApiService.getSchedule()
        ]);
        
        setGroups(groupsData);
        setTeachers(teachersData);
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      setWeekType(methodistApiService.getWeekType(date));
    }
  }, [selectedDate]);

  const getAvailablePairs = async (): Promise<{ numPair: number; time: string }[]> => {
    if (!selectedGroup || !selectedDate) return [];
    
    const date = new Date(selectedDate);
    const dayWeekForApi = methodistApiService.getDayWeekForApi(date);
    const typeWeek = methodistApiService.getWeekType(date);
    
    const scheduleData = await methodistApiService.getScheduleByGroup(selectedGroup as number);
    
    const occupiedPairs = scheduleData
      .filter(item =>
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

  const [availablePairs, setAvailablePairs] = useState<{ numPair: number; time: string }[]>([]);

  useEffect(() => {
    const loadAvailablePairs = async () => {
      const pairs = await getAvailablePairs();
      setAvailablePairs(pairs);
    };
    loadAvailablePairs();
  }, [selectedGroup, selectedDate]);

  const handleSave = async () => {
    if (!selectedGroup || !selectedPair || !selectedTeacher || !selectedSubject || !selectedRoom || !selectedDate) return;
    
    const group = groups.find(g => g.id === selectedGroup);
    const teacher = teachers.find(t => t.id === selectedTeacher);
    
    if (!group || !teacher) return;

    try {
      const groupSubjects = await methodistApiService.getGroupSubjects(selectedGroup as number);
      const subjectData = groupSubjects.find(s => s.idSubject === selectedSubject);
      
      if (!subjectData) {
        alert('Не удалось найти информацию о предмете');
        return;
      }

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
        newSubject: subjectData.nameSubject,
        newTeacher: teacher.name,
        newRoom: selectedRoom,
        createdAt: new Date().toISOString()
      };
      
      methodistApiService.saveReplacement(newReplacement);
      
      // небольшая задержка для гарантированной записи в localStorage
      await new Promise(resolve => setTimeout(resolve, 100));
      navigate('/metodist/changes');
    } catch (error) {
      console.error('Ошибка при сохранении пары:', error);
      alert('Не удалось сохранить пару');
    }
  };

  const isDateSelected = !!selectedDate;

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
                  className="form-control"
                  disabled={!isDateSelected}>
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
                  disabled={!selectedGroup || !isDateSelected}>
                  <option value="">Выберите пару</option>
                  {availablePairs.map(pair => (
                    <option key={pair.numPair} value={pair.numPair}>
                      {pair.numPair} пара ({pair.time})
                    </option>
                  ))}
                </select>
                {selectedGroup && availablePairs.length === 0 && isDateSelected && (
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
                  className="form-control"
                  disabled={!isDateSelected}>
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
                  onChange={(val) => {
                    setSelectedTeacher(val);
                    setSelectedSubject('');
                  }}
                  options={teachers}
                  placeholder="Выберите преподавателя"
                  disabled={!isDateSelected}
                />
              </div>

              <div className="form-group">
                <label>Предмет <span className="required">*</span></label>
                <SearchableSelect
                  value={selectedSubject}
                  onChange={(val) => setSelectedSubject(val)}
                  options={teacherSubjects}
                  placeholder="Выберите предмет"
                  disabled={!selectedTeacher || !isDateSelected}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Аудитория <span className="required">*</span></label>
                <SearchableSelect
                  value={(() => {
                    const room = rooms.find(r => r.name === selectedRoom);
                    return room ? room.id : '';
                  })()}
                  onChange={(value) => {
                    const roomId = value ? Number(value) : 0;
                    const room = rooms.find(r => r.id === roomId);
                    setSelectedRoom(room?.name || '');
                  }}
                  options={roomOptions}
                  placeholder="Выберите аудиторию"
                  disabled={!isDateSelected}
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => navigate('/metodist/changes')}>Отмена</button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!selectedGroup || !selectedPair || !selectedTeacher || !selectedSubject || !selectedRoom || !isDateSelected}>
              Сохранить пару
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};