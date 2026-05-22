import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './EditScheduleSection.css';
import { methodistApiService } from '../services/methodistApiService';
import type {
  ApiGroup,
  ApiRoom,
  ApiSubjectWithTeachers,
  ApiStaff
} from '../services/methodistApiService';

type ApiScheduleItem = {
  id: number;
  dayWeek: string;
  typeWeek: 'Общая' | 'Верхняя' | 'Нижняя';
  numPair: number;
  room: string | null;
  nameSubject: string;
  lastnameTeacher: string;
  nameTeacher: string;
  patronymicTeacher: string;
  idGroup: number;
  subgroup?: number | null;
};

type PairData = {
  teacher: string;
  teacherId?: number;
  subject: string;
  subjectId?: number;
  idSt?: number;
  room: string;
  time: string;
  week: 'upper' | 'lower';
  typeWeek: 'Общая' | 'Верхняя' | 'Нижняя';
  idGroup?: number;
  subgroup?: number | null;
};

type PairCellData = {
  upper: PairData | null;
  lower: PairData | null;
};

export const EditSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedPair, setSelectedPair] = useState<number | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedIdSt, setSelectedIdSt] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedSubgroupType, setSelectedSubgroupType] = useState<number | null>(null);
  const [upperWeekChecked, setUpperWeekChecked] = useState<boolean>(true);
  const [lowerWeekChecked, setLowerWeekChecked] = useState<boolean>(true);
  const [schedule, setSchedule] = useState<Record<string, PairData[]>>({});
  const [loadingSchedule, setLoadingSchedule] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [teachers, setTeachers] = useState<{ id: number; name: string }[]>([]);
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [subjectsByTeacher, setSubjectsByTeacher] = useState<ApiSubjectWithTeachers[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<{ id: number; name: string }[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<ApiSubjectWithTeachers[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<ApiRoom[]>([]);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState<string>('');
  const [subjectSearchTerm, setSubjectSearchTerm] = useState<string>('');
  const [roomSearchTerm, setRoomSearchTerm] = useState<string>('');
  const [visibleRoomsCount, setVisibleRoomsCount] = useState<number>(4);
  const [showAllRooms, setShowAllRooms] = useState<boolean>(false);

  const daysOfWeek = methodistApiService.getWeekDays();
  const pairTimes = [
    { number: 1, time: '8:30 - 10:10' },
    { number: 2, time: '10:20 - 12:00' },
    { number: 3, time: '12:45 - 14:25' },
    { number: 4, time: '14:35 - 16:15' },
    { number: 5, time: '16:25 - 18:05' },
    { number: 6, time: '18:15 - 19:55' },
    { number: 7, time: '20:05 - 21:45' }
  ];

  const handleBackToMain = () => {
    navigate('/metodist');
  };

  // загрузка групп
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const data = await methodistApiService.getGroups();
        const sorted = [...data].sort((a, b) => a.numberGroup - b.numberGroup);
        setGroups(sorted);
      } catch (e: any) {
        console.error(e);
      }
    };
    loadGroups();
  }, []);

  // загрузка аудиторий
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const data = await methodistApiService.getRooms();
        setRooms(data);
        setFilteredRooms(data);
      } catch (e: any) {
        console.error(e);
      }
    };
    loadRooms();
  }, []);

  // при первом монтировании читаем id из localStorage и сразу грузим расписание
  useEffect(() => {
    const savedGroup = localStorage.getItem('selectedGroupForEdit');
    if (savedGroup) {
      const id = Number(savedGroup);
      if (!Number.isNaN(id)) {
        setSelectedGroupId(id);
        loadScheduleForGroup(id);
      }
    }
  }, []);

  // загрузка преподавателей
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const data = await methodistApiService.getTeachers();
        setTeachers(data);
        setFilteredTeachers(data);
      } catch (e: any) {
        console.error(e);
      }
    };
    loadTeachers();
  }, []);

  // загрузка предметов по выбранному преподавателю и группе
  useEffect(() => {
    const loadSubjectsByTeacherAndGroup = async () => {
      if (!selectedTeacherId || !selectedGroupId) {
        setSubjectsByTeacher([]);
        setFilteredSubjects([]);
        return;
      }

      try {
        const data = await methodistApiService.getGroupSubjects(selectedGroupId);
        
        const filteredByTeacher = data.filter(subject =>
          subject.teachers.some(teacher => teacher.idTeacher === selectedTeacherId)
        );
        
        setSubjectsByTeacher(filteredByTeacher);
        setFilteredSubjects(filteredByTeacher);
      } catch (e: any) {
        setSubjectsByTeacher([]);
        setFilteredSubjects([]);
      }
    };

    loadSubjectsByTeacherAndGroup();
  }, [selectedTeacherId, selectedGroupId]);

  // фильтрация преподавателей по поиску
  useEffect(() => {
    if (teacherSearchTerm.trim() === '') {
      setFilteredTeachers(teachers);
    } else {
      const filtered = teachers.filter(teacher =>
        teacher.name.toLowerCase().includes(teacherSearchTerm.toLowerCase())
      );
      setFilteredTeachers(filtered);
    }
  }, [teacherSearchTerm, teachers]);

  // фильтрация предметов по поиску
  useEffect(() => {
    if (subjectSearchTerm.trim() === '') {
      setFilteredSubjects(subjectsByTeacher);
    } else {
      const filtered = subjectsByTeacher.filter(subject =>
        subject.nameSubject.toLowerCase().includes(subjectSearchTerm.toLowerCase())
      );
      setFilteredSubjects(filtered);
    }
  }, [subjectSearchTerm, subjectsByTeacher]);

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
    setShowAllRooms(false);
    setVisibleRoomsCount(4);
  }, [roomSearchTerm, rooms]);

  // загрузка расписания по id группы
  const loadScheduleForGroup = async (groupId: number | null) => {
    if (!groupId) {
      setSchedule({});
      return;
    }

    setLoadingSchedule(true);
    setLoadError('');
    try {
      const data = await methodistApiService.getScheduleByGroup(groupId);

      const newSchedule: Record<string, PairData[]> = {};

      data.forEach(item => {
        const day = item.dayWeek;
        const pairNumber = item.numPair;
        
        if (!day || !pairNumber) return;

        const base: PairData = {
          teacher: (item.lastnameTeacher && item.nameTeacher) 
            ? `${item.lastnameTeacher} ${item.nameTeacher} ${item.patronymicTeacher || ''}`.trim() 
            : '',
          subject: item.nameSubject || '',
          room: item.room || '',
          time: pairTimes.find(p => p.number === pairNumber)?.time || '',
          typeWeek: item.typeWeek as 'Общая' | 'Верхняя' | 'Нижняя',
          idGroup: item.idGroup,
          subgroup: item.subgroup === null ? null : item.subgroup,
          week: item.typeWeek === 'Нижняя' ? 'lower' : 'upper'
        };

        let key = '';
        if (item.typeWeek === 'Общая') {
          key = `${groupId}-${day}-${pairNumber}-common`;
        } else if (item.typeWeek === 'Верхняя') {
          key = `${groupId}-${day}-${pairNumber}-upper`;
        } else if (item.typeWeek === 'Нижняя') {
          key = `${groupId}-${day}-${pairNumber}-lower`;
        }

        if (!newSchedule[key]) {
          newSchedule[key] = [];
        }
        newSchedule[key].push(base);
      });

      setSchedule(newSchedule);
    } catch (e: any) {
      setLoadError(e.message || 'Не удалось загрузить расписание');
      setSchedule({});
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleGroupChange = (value: string) => {
    const id = value ? Number(value) : null;
    setSelectedGroupId(id);
    setSelectedDay('');
    setSelectedPair(null);
    setSelectedTeacher('');
    setSelectedTeacherId(null);
    setSelectedSubject('');
    setSelectedSubjectId(null);
    setSelectedIdSt(null);
    setSelectedRoom('');
    setSelectedSubgroupType(null);
    setUpperWeekChecked(true);
    setLowerWeekChecked(true);
    setTeacherSearchTerm('');
    setSubjectSearchTerm('');
    setRoomSearchTerm('');
    setShowAllRooms(false);
    setVisibleRoomsCount(4);
    loadScheduleForGroup(id);
    if (id) {
      localStorage.setItem('selectedGroupForEdit', String(id));
    } else {
      localStorage.removeItem('selectedGroupForEdit');
    }
  };

  const handleTeacherSelect = (teacherId: number, teacherName: string) => {
    setSelectedTeacher(teacherName);
    setSelectedTeacherId(teacherId);
    setSelectedSubject('');
    setSelectedSubjectId(null);
    setSelectedIdSt(null);
    setSubjectSearchTerm('');
  };

  const handleSubjectSelect = (subject: ApiSubjectWithTeachers) => {
    setSelectedSubject(subject.nameSubject);
    setSelectedSubjectId(subject.idSubject);
    setSelectedIdSt(subject.idSt);
    setShowAllRooms(false);
    setVisibleRoomsCount(4);
  };

  const handleRoomSelect = (roomName: string) => {
    setSelectedRoom(roomName);
  };

  const savePair = async () => {
    if (!selectedGroupId || !selectedDay || !selectedPair || !selectedIdSt || !selectedRoom) {
      alert('Заполните все поля (преподаватель, предмет, аудитория)');
      return;
    }

    if (!upperWeekChecked && !lowerWeekChecked) {
      alert('Выберите хотя бы одну неделю');
      return;
    }

    setSaving(true);
    
    try {
      const subgroupValue = selectedSubgroupType === null ? null : selectedTeacherId;
      
      if (upperWeekChecked && lowerWeekChecked) {
        await methodistApiService.saveSchedule({
          dayWeek: selectedDay,
          typeWeek: 'Общая',
          numPair: selectedPair,
          room: selectedRoom,
          idSt: selectedIdSt,
          idGroup: selectedGroupId,
          subgroup: subgroupValue,
          replacement: false
        });
        
        const commonKey = `${selectedGroupId}-${selectedDay}-${selectedPair}-common`;
        setSchedule(prev => ({
          ...prev,
          [commonKey]: [{ 
            teacher: selectedTeacher,
            teacherId: selectedTeacherId || undefined,
            subject: selectedSubject,
            subjectId: selectedSubjectId || undefined,
            idSt: selectedIdSt,
            room: selectedRoom,
            time: pairTimes.find(p => p.number === selectedPair)?.time || '',
            week: 'upper',
            typeWeek: 'Общая',
            idGroup: selectedGroupId,
            subgroup: subgroupValue
          }]
        }));
      } else {
        if (upperWeekChecked) {
          await methodistApiService.saveSchedule({
            dayWeek: selectedDay,
            typeWeek: 'Верхняя',
            numPair: selectedPair,
            room: selectedRoom,
            idSt: selectedIdSt,
            idGroup: selectedGroupId,
            subgroup: subgroupValue,
            replacement: false
          });
          
          const upperKey = `${selectedGroupId}-${selectedDay}-${selectedPair}-upper`;
          setSchedule(prev => ({
            ...prev,
            [upperKey]: [{ 
              teacher: selectedTeacher,
              teacherId: selectedTeacherId || undefined,
              subject: selectedSubject,
              subjectId: selectedSubjectId || undefined,
              idSt: selectedIdSt,
              room: selectedRoom,
              time: pairTimes.find(p => p.number === selectedPair)?.time || '',
              week: 'upper',
              typeWeek: 'Верхняя',
              idGroup: selectedGroupId,
              subgroup: subgroupValue
            }]
          }));
        }

        if (lowerWeekChecked) {
          await methodistApiService.saveSchedule({
            dayWeek: selectedDay,
            typeWeek: 'Нижняя',
            numPair: selectedPair,
            room: selectedRoom,
            idSt: selectedIdSt,
            idGroup: selectedGroupId,
            subgroup: subgroupValue,
            replacement: false
          });
          
          const lowerKey = `${selectedGroupId}-${selectedDay}-${selectedPair}-lower`;
          setSchedule(prev => ({
            ...prev,
            [lowerKey]: [{ 
              teacher: selectedTeacher,
              teacherId: selectedTeacherId || undefined,
              subject: selectedSubject,
              subjectId: selectedSubjectId || undefined,
              idSt: selectedIdSt,
              room: selectedRoom,
              time: pairTimes.find(p => p.number === selectedPair)?.time || '',
              week: 'lower',
              typeWeek: 'Нижняя',
              idGroup: selectedGroupId,
              subgroup: subgroupValue
            }]
          }));
        }
      }

      setSelectedTeacher('');
      setSelectedTeacherId(null);
      setSelectedSubject('');
      setSelectedSubjectId(null);
      setSelectedIdSt(null);
      setSelectedRoom('');
      setSelectedSubgroupType(null);
      setSelectedPair(null);
      setUpperWeekChecked(true);
      setLowerWeekChecked(true);
      setTeacherSearchTerm('');
      setSubjectSearchTerm('');
      setRoomSearchTerm('');
      setShowAllRooms(false);
      setVisibleRoomsCount(4);
      
    } catch (e: any) {
      console.error('Ошибка сохранения:', e);
      alert('Ошибка при сохранении: ' + (e.message || 'Неизвестная ошибка'));
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setSelectedTeacher('');
    setSelectedTeacherId(null);
    setSelectedSubject('');
    setSelectedSubjectId(null);
    setSelectedIdSt(null);
    setSelectedRoom('');
    setSelectedSubgroupType(null);
    setSelectedPair(null);
    setUpperWeekChecked(true);
    setLowerWeekChecked(true);
    setTeacherSearchTerm('');
    setSubjectSearchTerm('');
    setRoomSearchTerm('');
    setShowAllRooms(false);
    setVisibleRoomsCount(4);
  };

  const getPairData = (day: string, pairNumber: number): PairCellData => {
    if (!selectedGroupId) return { upper: null, lower: null };

    const commonKey = `${selectedGroupId}-${day}-${pairNumber}-common`;
    const upperKey = `${selectedGroupId}-${day}-${pairNumber}-upper`;
    const lowerKey = `${selectedGroupId}-${day}-${pairNumber}-lower`;

    const commonPairs = schedule[commonKey] || [];
    const upperPairs = schedule[upperKey] || [];
    const lowerPairs = schedule[lowerKey] || [];

    const commonPair = commonPairs.length > 0 ? commonPairs[0] : null;
    const upperPair = upperPairs.length > 0 ? upperPairs[0] : null;
    const lowerPair = lowerPairs.length > 0 ? lowerPairs[0] : null;

    if (commonPair) {
      return { upper: commonPair, lower: commonPair };
    }

    return { upper: upperPair, lower: lowerPair };
  };

  const getSubgroupsData = (day: string, pairNumber: number, weekType: 'upper' | 'lower'): PairData[] => {
    if (!selectedGroupId) return [];

    let key = '';
    if (weekType === 'upper') {
      const commonKey = `${selectedGroupId}-${day}-${pairNumber}-common`;
      const upperKey = `${selectedGroupId}-${day}-${pairNumber}-upper`;
      key = schedule[commonKey] ? commonKey : upperKey;
    } else {
      const commonKey = `${selectedGroupId}-${day}-${pairNumber}-common`;
      const lowerKey = `${selectedGroupId}-${day}-${pairNumber}-lower`;
      key = schedule[commonKey] ? commonKey : lowerKey;
    }

    return schedule[key] || [];
  };

  const handleCellClick = (day: string, pairNumber: number) => {
    setSelectedDay(day);
    setSelectedPair(pairNumber);

    const pairData = getPairData(day, pairNumber);
    
    const commonKey = `${selectedGroupId}-${day}-${pairNumber}-common`;
    const commonPairs = schedule[commonKey];
    
    if (commonPairs && commonPairs.length > 0) {
      const commonPair = commonPairs[0];
      setSelectedTeacher(commonPair.teacher);
      setSelectedTeacherId(commonPair.teacherId || null);
      setSelectedSubject(commonPair.subject);
      setSelectedSubjectId(commonPair.subjectId || null);
      setSelectedIdSt(commonPair.idSt || null);
      setSelectedRoom(commonPair.room);
      setSelectedSubgroupType(commonPair.subgroup === null ? null : (commonPair.subgroup === 1 || commonPair.subgroup === 2 ? commonPair.subgroup : null));
      setUpperWeekChecked(true);
      setLowerWeekChecked(true);
    } else if (pairData.upper || pairData.lower) {
      const sourcePair = pairData.upper || pairData.lower;
      if (sourcePair) {
        setSelectedTeacher(sourcePair.teacher);
        setSelectedTeacherId(sourcePair.teacherId || null);
        setSelectedSubject(sourcePair.subject);
        setSelectedSubjectId(sourcePair.subjectId || null);
        setSelectedIdSt(sourcePair.idSt || null);
        setSelectedRoom(sourcePair.room);
        setSelectedSubgroupType(sourcePair.subgroup === null ? null : (sourcePair.subgroup === 1 || sourcePair.subgroup === 2 ? sourcePair.subgroup : null));
      }
      setUpperWeekChecked(!!pairData.upper);
      setLowerWeekChecked(!!pairData.lower);
    } else {
      setSelectedTeacher('');
      setSelectedTeacherId(null);
      setSelectedSubject('');
      setSelectedSubjectId(null);
      setSelectedIdSt(null);
      setSelectedRoom('');
      setSelectedSubgroupType(null);
      setUpperWeekChecked(true);
      setLowerWeekChecked(true);
    }
    
    setTeacherSearchTerm('');
    setSubjectSearchTerm('');
    setRoomSearchTerm('');
  };

  const renderSubgroups = (subgroups: PairData[], weekLabel: string) => {
    if (subgroups.length === 0) return null;
    
    if (subgroups.length === 1 && (subgroups[0].subgroup === null || subgroups[0].subgroup === undefined)) {
      const pair = subgroups[0];
      return (
        <div className="pair-info">
          {weekLabel && <div className="week-label">{weekLabel}</div>}
          <div className="pair-subject">{pair.subject || '—'}</div>
          <div className="pair-teacher">{pair.teacher && pair.teacher.trim() !== '' ? pair.teacher : 'Преподаватель не указан'}</div>
          <div className="pair-room">ауд. {pair.room || '—'}</div>
        </div>
      );
    }
    
    return (
      <div className="pair-info subgroups">
        {weekLabel && <div className="week-label">{weekLabel}</div>}
        {subgroups.map((pair, idx) => (
          <div key={idx} className="subgroup-item">
            <div className="subgroup-label">Подгруппа {pair.subgroup}:</div>
            <div className="pair-subject">{pair.subject || '—'}</div>
            <div className="pair-teacher">{pair.teacher && pair.teacher.trim() !== '' ? pair.teacher : 'Преподаватель не указан'}</div>
            <div className="pair-room">ауд. {pair.room || '—'}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderCellContent = (day: string, pairNumber: number) => {
    const upperSubgroups = getSubgroupsData(day, pairNumber, 'upper');
    const lowerSubgroups = getSubgroupsData(day, pairNumber, 'lower');
    
    const hasUpper = upperSubgroups.length > 0;
    const hasLower = lowerSubgroups.length > 0;

    if (!hasUpper && !hasLower) {
      return <div className="add-pair-btn">+</div>;
    }

    const commonKey = `${selectedGroupId}-${day}-${pairNumber}-common`;
    const isCommon = !!schedule[commonKey];

    if (isCommon) {
      return renderSubgroups(upperSubgroups, '');
    }

    return (
      <div className="pair-info both-weeks">
        {hasUpper && renderSubgroups(upperSubgroups, 'Верхняя:')}
        {hasLower && renderSubgroups(lowerSubgroups, 'Нижняя:')}
      </div>
    );
  };

  return (
    <div className="edit-schedule-page">
      <main className="edit-schedule-main">
        <div className="edit-schedule-panel">
          <div className="edit-schedule-top-panel">
            <div className="left-panel-section">
              <button className="back-button" onClick={handleBackToMain}>
                Назад
              </button>
              <div className="group-selection">
                <label htmlFor="group-select">Выберите группу:</label>
                <select
                  id="group-select"
                  value={selectedGroupId ?? ''}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="group-select">
                  <option value="">Выберите группу</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.numberGroup}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loadingSchedule && (
            <div className="status-banner">
              Загрузка расписания...
            </div>
          )}

          {loadError && (
            <div className="status-banner error">
              {loadError}
            </div>
          )}

          {saving && (
            <div className="status-banner">
              Сохранение расписания...
            </div>
          )}

          {selectedGroupId && !loadingSchedule && (
            <div className="schedule-grid-container">
              <div className="schedule-grid">
                <div className="grid-header empty"></div>
                {daysOfWeek.map(day => (
                  <div key={day} className="grid-header">
                    {day}
                  </div>
                ))}

                {pairTimes.map(pair => (
                  <React.Fragment key={pair.number}>
                    <div className="time-cell">
                      <div className="pair-number">{pair.number} пара</div>
                      <div className="pair-time">{pair.time}</div>
                    </div>

                    {daysOfWeek.map(day => {
                      const isSelected = selectedDay === day && selectedPair === pair.number;

                      return (
                        <div
                          key={`${day}-${pair.number}`}
                          className={`schedule-cell ${(getSubgroupsData(day, pair.number, 'upper').length > 0 || getSubgroupsData(day, pair.number, 'lower').length > 0) ? 'filled' : 'empty'} ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleCellClick(day, pair.number)}>
                          {renderCellContent(day, pair.number)}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {selectedGroupId && selectedDay && selectedPair && (
            <div className="edit-pair-panel">
              <h3 className="edit-pair-title">
                Редактирование пары: {selectedDay}, {selectedPair} пара ({pairTimes.find(p => p.number === selectedPair)?.time})
              </h3>

              <div className="edit-controls">
                <div className="control-group">
                  <h4>Преподаватель</h4>
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Поиск преподавателя..."
                      value={teacherSearchTerm}
                      onChange={(e) => setTeacherSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <div className="teachers-list">
                    {filteredTeachers.map(teacher => (
                      <button
                        key={teacher.id}
                        className={`teacher-btn ${selectedTeacher === teacher.name ? 'active' : ''}`}
                        onClick={() => handleTeacherSelect(teacher.id, teacher.name)}>
                        {teacher.name}
                      </button>
                    ))}
                    {filteredTeachers.length === 0 && (
                      <div className="no-results">Преподаватели не найдены</div>
                    )}
                  </div>
                </div>

                <div className="control-group">
                  <h4>Предмет</h4>
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Поиск предмета..."
                      value={subjectSearchTerm}
                      onChange={(e) => setSubjectSearchTerm(e.target.value)}
                      className="search-input"
                      disabled={!selectedTeacherId}
                    />
                  </div>
                  <div className="subjects-list">
                    {filteredSubjects.map(subject => (
                      <button
                        key={subject.idSubject}
                        className={`subject-btn ${selectedSubject === subject.nameSubject ? 'active' : ''}`}
                        onClick={() => handleSubjectSelect(subject)}
                        disabled={!selectedTeacherId}>
                        {subject.nameSubject}
                      </button>
                    ))}
                    {filteredSubjects.length === 0 && selectedTeacherId && (
                      <div className="no-results">У этого преподавателя нет предметов в данной группе</div>
                    )}
                    {!selectedTeacherId && (
                      <div className="no-results">Сначала выберите преподавателя</div>
                    )}
                  </div>
                </div>

                <div className="control-group">
                  <h4>Аудитория</h4>
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Поиск аудитории..."
                      value={roomSearchTerm}
                      onChange={(e) => setRoomSearchTerm(e.target.value)}
                      className="search-input"
                      disabled={!selectedSubjectId}
                    />
                  </div>
                  <div className="rooms-grid">
                    {(showAllRooms ? filteredRooms : filteredRooms.slice(0, visibleRoomsCount)).map(room => (
                      <button
                        key={room.id}
                        className={`room-btn ${selectedRoom === room.name ? 'active' : ''}`}
                        onClick={() => handleRoomSelect(room.name)}
                        disabled={!selectedSubjectId}>
                        {room.name}
                      </button>
                    ))}
                    {filteredRooms.length > visibleRoomsCount && !showAllRooms && (
                      <button
                        className="room-btn show-more-btn"
                        onClick={() => setShowAllRooms(true)}
                        disabled={!selectedSubjectId}>
                        Показать ещё (+{filteredRooms.length - visibleRoomsCount})
                      </button>
                    )}
                    {showAllRooms && filteredRooms.length > visibleRoomsCount && (
                      <button
                        className="room-btn show-less-btn"
                        onClick={() => setShowAllRooms(false)}
                        disabled={!selectedSubjectId}>
                        Свернуть
                      </button>
                    )}
                  </div>
                </div>

                <div className="control-group">
                  <h4>Подгруппа</h4>
                  <div className="subgroup-buttons">
                    <button
                      className={`subgroup-btn ${selectedSubgroupType === null ? 'active' : ''}`}
                      onClick={() => setSelectedSubgroupType(null)}>
                      Общая
                    </button>
                    <button
                      className={`subgroup-btn ${selectedSubgroupType === 1 ? 'active' : ''}`}
                      onClick={() => setSelectedSubgroupType(1)}>
                      Подгруппа 1
                    </button>
                    <button
                      className={`subgroup-btn ${selectedSubgroupType === 2 ? 'active' : ''}`}
                      onClick={() => setSelectedSubgroupType(2)}>
                      Подгруппа 2
                    </button>
                  </div>
                </div>

                <div className="control-group week-checkbox-group">
                  <h4>Выберите недели для пары</h4>
                  <div className="week-checkboxes">
                    <label className="week-checkbox-label">
                      <input
                        type="checkbox"
                        checked={upperWeekChecked}
                        onChange={(e) => setUpperWeekChecked(e.target.checked)}/>
                      <span>Верхняя неделя</span>
                    </label>
                    <label className="week-checkbox-label">
                      <input
                        type="checkbox"
                        checked={lowerWeekChecked}
                        onChange={(e) => setLowerWeekChecked(e.target.checked)}/>
                      <span>Нижняя неделя</span>
                    </label>
                  </div>
                </div>

                <div className="action-buttons">
                  <button className="cancel-btn" onClick={cancelEdit} disabled={saving}>
                    Отменить действие
                  </button>
                  <button 
                    className="save-btn" 
                    onClick={savePair}
                    disabled={saving || !selectedTeacherId || !selectedSubjectId || !selectedRoom}>
                    {saving ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};