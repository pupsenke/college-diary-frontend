import './ChangesScheduleSection.css';
import React, { useState, useEffect } from 'react';
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
  
  // состояния для выбранных значений при замене
  const [selectedNewTeacher, setSelectedNewTeacher] = useState<{ [key: number]: number }>({});
  const [selectedNewSubject, setSelectedNewSubject] = useState<{ [key: number]: number }>({});
  const [selectedNewRoom, setSelectedNewRoom] = useState<{ [key: number]: string }>({});
  
  const dbRooms = ['120', '123', '124', '127', '221', '226'];

  // загрузка групп
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/groups`);
        if (!res.ok) throw new Error(`Ошибка загрузки групп: ${res.status}`);
        const data: ApiGroup[] = await res.json();
        setGroups(data);
      } catch (e: any) {
        console.error(e);
      }
    };
    loadGroups();
  }, []);

  // загрузка предметов
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/subjects`);
        if (!res.ok) throw new Error(`Ошибка загрузки предметов: ${res.status}`);
        const data: ApiSubject[] = await res.json();
        setSubjects(data);
      } catch (e: any) {
        console.error(e);
      }
    };
    loadSubjects();
  }, []);

  // загрузка связей преподавателей с предметами
  useEffect(() => {
    const loadSubjectTeachers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/st`);
        if (!res.ok) throw new Error(`Ошибка загрузки данных st: ${res.status}`);
        const data: ApiSubjectTeacher[] = await res.json();
        setSubjectTeachers(data);
      } catch (e: any) {
        console.error(e);
      }
    };
    loadSubjectTeachers();
  }, []);

  // загрузка преподавателей
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/staffs`);
        if (!res.ok) throw new Error(`Ошибка загрузки преподавателей: ${res.status}`);
        const data: ApiStaff[] = await res.json();
        const onlyTeachers = data
          .filter(st => st.staffPosition?.some(pos => pos.id === 9))
          .map(st => ({
            id: st.id,
            name: `${st.lastName} ${st.name} ${st.patronymic || ''}`.trim()
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setTeachers(onlyTeachers);
      } catch (e: any) {
        console.error(e);
      }
    };
    loadTeachers();
  }, []);

  // загрузка расписания
  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/schedule`);
        if (!res.ok) throw new Error(`Ошибка загрузки расписания: ${res.status}`);
        const data: ApiSchedule[] = await res.json();
        setSchedule(data);
      } catch (e: any) {
        console.error(e);
      }
    };
    loadSchedule();
  }, []);

  // загрузка данных о предметах преподавателя
  useEffect(() => {
    const loadTeacherGroups = async () => {
      if (!selectedTeacher) {
        setTeacherGroups([]);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/st/teacherGroups/${selectedTeacher}`);
        if (!res.ok) throw new Error(`Ошибка загрузки данных teacherGroups: ${res.status}`);
        const data: TeacherGroupSubject[] = await res.json();
        setTeacherGroups(data);
      } catch (e: any) {
        console.error(e);
        setTeacherGroups([]);
      }
    };

    loadTeacherGroups();
  }, [selectedTeacher]);

  // определение типа недели
  useEffect(() => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      const weekNumber = Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
      const type = weekNumber % 2 === 0 ? 'Нижняя' : 'Верхняя';
      setWeekType(type);
    }
  }, [selectedDate]);

  const getSubjectNameByIdSt = (idSt: number): string => {
    const teacherGroup = teacherGroups.find(tg => tg.idSt === idSt);
    return teacherGroup?.subjectName || 'Предмет не найден';
  };

  const getSubjectIdByIdSt = (idSt: number): number => {
    const subjectTeacher = subjectTeachers.find(st => st.id === idSt);
    return subjectTeacher?.idSubject || 0;
  };

  const getDayWeekForApi = (date: Date): string => {
    const daysOfWeek = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return daysOfWeek[date.getDay()];
  };

  const getAllSubjects = (): SubjectOption[] => {
    return subjects
      .map(s => ({ id: s.id, name: s.subjectName }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // фильтрация пар
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
      filtered = filtered.filter(item => 
        item.numPair >= startPair && item.numPair <= endPair
      );
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
        teacherId: selectedTeacher,
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

  const handleSetNotWillBe = (pairId: number) => {
    setFilteredPairs(prev => prev.filter(p => p.id !== pairId));
    const newSelected = { ...selectedNewTeacher };
    delete newSelected[pairId];
    setSelectedNewTeacher(newSelected);
  };

  const handleSaveReplacement = (pairId: number) => {
    setFilteredPairs(prev => prev.filter(p => p.id !== pairId));
    const newSelected = { ...selectedNewTeacher };
    delete newSelected[pairId];
    setSelectedNewTeacher(newSelected);
  };

  const handleViewDocuments = () => {
    navigate('/metodist/changes/replacement-documents');
  };

  return (
    <div className="cs-container">
      <div className="cs-filters">
        <div className="cs-filter-group">
          <label>Дата:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="cs-input"/>
        </div>

        <div className="cs-filter-group">
          <label>Преподаватель:</label>
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(Number(e.target.value))}
            className="cs-select"
            style={{ minWidth: '250px' }}>
            <option value="">Выберите преподавателя</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="cs-filter-group">
          <label>Тип фильтрации:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'allDay' | 'pairRange')}
            className="cs-select">
            <option value="allDay">Весь день</option>
            <option value="pairRange">Диапазон пар</option>
          </select>
        </div>

        {filterType === 'pairRange' && (
          <div className="cs-filter-group cs-pair-range">
            <select
              value={startPair}
              onChange={(e) => setStartPair(Number(e.target.value))}
              className="cs-select">
              {[1,2,3,4,5,6].map(n => (
                <option key={n} value={n}>{n} пара</option>
              ))}
            </select>
            <span>—</span>
            <select
              value={endPair}
              onChange={(e) => setEndPair(Number(e.target.value))}
              className="cs-select">
              {[1,2,3,4,5,6].map(n => (
                <option key={n} value={n}>{n} пара</option>
              ))}
            </select>
          </div>
        )}

        <div className="cs-filter-group" style={{ marginLeft: 'auto' }}>
          <button 
            className="cs-btn cs-btn-view"
            onClick={handleViewDocuments}>
            Просмотр документов
          </button>
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
                    <td>
                      <div className="cs-teacher-name">{pair.teacherName}</div>
                    </td>
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
                          {teachers
                            .filter(t => t.id !== pair.teacherId)
                            .map(t => (
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
                        {dbRooms.map(room => (
                          <option key={room} value={room}>{room}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="cs-actions">
                        <button 
                          className="cs-btn cs-btn-save"
                          onClick={() => handleSaveReplacement(pair.id)}>
                          Сохранить
                        </button>
                        <button 
                          className="cs-btn cs-btn-notwill"
                          onClick={() => handleSetNotWillBe(pair.id)}>
                          Не будет
                        </button>
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