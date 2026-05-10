import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './EditScheduleSection.css';
import { API_BASE_URL } from '../constants/apiConstant';

type ApiGroup = {
  id: number;
  numberGroup: number;
};

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
};

type ApiSubject = {
  id: number;
  subjectName: string;
};

type ApiStaff = {
  id: number;
  patronymic: string | null;
  name: string;
  lastName: string;
  staffPosition: { id: number; name: string }[];
};

type PairData = {
  teacher: string;
  subject: string;
  room: string;
  time: string;
  week: 'upper' | 'lower';
  typeWeek: 'Общая' | 'Верхняя' | 'Нижняя';
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
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [upperWeekChecked, setUpperWeekChecked] = useState<boolean>(true);
  const [lowerWeekChecked, setLowerWeekChecked] = useState<boolean>(true);
  const [schedule, setSchedule] = useState<Record<string, PairData>>({});
  const [loadingSchedule, setLoadingSchedule] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>('');
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [teachers, setTeachers] = useState<{ id: number; name: string }[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<{ id: number; name: string }[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<string[]>([]);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState<string>('');
  const [subjectSearchTerm, setSubjectSearchTerm] = useState<string>('');

  const dbRooms = ['120', '123', '124', '127', '221', '226'];
  const [filteredRooms, setFilteredRooms] = useState<string[]>(dbRooms);

  const daysOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
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
        const res = await fetch(`${API_BASE_URL}/api/v1/groups`);
        if (!res.ok) {
          throw new Error(`Ошибка загрузки групп: ${res.status}`);
        }
        const data: ApiGroup[] = await res.json();
        const sorted = [...data].sort((a, b) => a.numberGroup - b.numberGroup);
        setGroups(sorted);
      } catch (e: any) {
        console.error(e);
      }
    };
    loadGroups();
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

  // загрузка предметов
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/subjects`);
        if (!res.ok) {
          throw new Error(`Ошибка загрузки предметов: ${res.status}`);
        }
        const data: ApiSubject[] = await res.json();
        const names = data.map(s => s.subjectName);
        
        // сортировка предметов по алфавиту
        const sortedNames = [...names].sort((a, b) => a.localeCompare(b, 'ru'));
        setSubjects(sortedNames);
        setFilteredSubjects(sortedNames);
      } catch (e: any) {
        console.error(e);
      }
    };

    loadSubjects();
  }, []);

  // загрузка преподавателей
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/staffs`);
        if (!res.ok) {
          throw new Error(`Ошибка загрузки преподавателей: ${res.status}`);
        }
        const data: ApiStaff[] = await res.json();
        const onlyTeachers = data
          .filter(st => st.staffPosition?.some(pos => pos.id === 9))
          .map(st => ({
            id: st.id,
            name: `${st.lastName} ${st.name} ${st.patronymic || ''}`.trim()
          }));

        // сортировка преподавателей по алфавиту
        const sortedTeachers = [...onlyTeachers].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        setTeachers(sortedTeachers);
        setFilteredTeachers(sortedTeachers);
      } catch (e: any) {
        console.error(e);
      }
    };

    loadTeachers();
  }, []);

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
      setFilteredSubjects(subjects);
    } else {
      const filtered = subjects.filter(subject =>
        subject.toLowerCase().includes(subjectSearchTerm.toLowerCase())
      );
      setFilteredSubjects(filtered);
    }
  }, [subjectSearchTerm, subjects]);

  // фильтрация предметов и аудиторий по преподавателю (пока без логики, просто сброс)
  useEffect(() => {
    if (selectedTeacher) {
      setFilteredSubjects(subjects);
      setFilteredRooms(dbRooms);
    } else {
      setFilteredSubjects(subjects);
      setFilteredRooms(dbRooms);
    }
  }, [selectedTeacher, subjects]);

  // загрузка расписания по id группы
  const loadScheduleForGroup = async (groupId: number | null) => {
    if (!groupId) {
      setSchedule({});
      return;
    }

    setLoadingSchedule(true);
    setLoadError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/schedule/group/${groupId}`);
      if (!res.ok) {
        throw new Error(`Ошибка загрузки расписания: ${res.status}`);
      }
      const data: ApiScheduleItem[] = await res.json();

      const newSchedule: Record<string, PairData> = {};

      (data || []).forEach(item => {
        const day = item.dayWeek;
        const pairNumber = item.numPair;
        if (!day || !pairNumber) return;

        const base = {
          teacher: `${item.lastnameTeacher} ${item.nameTeacher} ${item.patronymicTeacher || ''}`.trim(),
          subject: item.nameSubject,
          room: item.room || '',
          time: pairTimes.find(p => p.number === pairNumber)?.time || '',
          typeWeek: item.typeWeek as 'Общая' | 'Верхняя' | 'Нижняя'
        };

        // маппинг typeWeek -> upper/lower
        if (item.typeWeek === 'Общая') {
          const upperKey = `${groupId}-${day}-${pairNumber}-upper`;
          newSchedule[upperKey] = { ...base, week: 'upper' };
        } else if (item.typeWeek === 'Верхняя') {
          const upperKey = `${groupId}-${day}-${pairNumber}-upper`;
          newSchedule[upperKey] = { ...base, week: 'upper' };
        } else if (item.typeWeek === 'Нижняя') {
          const lowerKey = `${groupId}-${day}-${pairNumber}-lower`;
          newSchedule[lowerKey] = { ...base, week: 'lower' };
        }
      });

      setSchedule(newSchedule);
    } catch (e: any) {
      console.error(e);
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
    setSelectedSubject('');
    setSelectedRoom('');
    setUpperWeekChecked(true);
    setLowerWeekChecked(true);
    setTeacherSearchTerm('');
    setSubjectSearchTerm('');
    loadScheduleForGroup(id);
    if (id) {
      localStorage.setItem('selectedGroupForEdit', String(id));
    } else {
      localStorage.removeItem('selectedGroupForEdit');
    }
  };

  const savePair = () => {
    if (selectedGroupId && selectedDay && selectedPair && selectedTeacher && selectedSubject && selectedRoom) {
      if (upperWeekChecked && lowerWeekChecked) {
        const upperKey = `${selectedGroupId}-${selectedDay}-${selectedPair}-upper`;
        const lowerKey = `${selectedGroupId}-${selectedDay}-${selectedPair}-lower`;
        setSchedule(prev => ({
          ...prev,
          [upperKey]: {
            teacher: selectedTeacher,
            subject: selectedSubject,
            room: selectedRoom,
            time: pairTimes.find(p => p.number === selectedPair)?.time || '',
            week: 'upper',
            typeWeek: 'Общая'
          },
          [lowerKey]: {
            teacher: selectedTeacher,
            subject: selectedSubject,
            room: selectedRoom,
            time: pairTimes.find(p => p.number === selectedPair)?.time || '',
            week: 'lower',
            typeWeek: 'Общая'
          }
        }));
      } else {
        if (upperWeekChecked) {
          const upperKey = `${selectedGroupId}-${selectedDay}-${selectedPair}-upper`;
          setSchedule(prev => ({
            ...prev,
            [upperKey]: {
              teacher: selectedTeacher,
              subject: selectedSubject,
              room: selectedRoom,
              time: pairTimes.find(p => p.number === selectedPair)?.time || '',
              week: 'upper',
              typeWeek: 'Верхняя'
            }
          }));
        }

        if (lowerWeekChecked) {
          const lowerKey = `${selectedGroupId}-${selectedDay}-${selectedPair}-lower`;
          setSchedule(prev => ({
            ...prev,
            [lowerKey]: {
              teacher: selectedTeacher,
              subject: selectedSubject,
              room: selectedRoom,
              time: pairTimes.find(p => p.number === selectedPair)?.time || '',
              week: 'lower',
              typeWeek: 'Нижняя'
            }
          }));
        }
      }

      setSelectedTeacher('');
      setSelectedSubject('');
      setSelectedRoom('');
      setSelectedPair(null);
      setUpperWeekChecked(true);
      setLowerWeekChecked(true);
      setTeacherSearchTerm('');
      setSubjectSearchTerm('');

      alert('Пара успешно сохранена');
    } else {
      alert('Заполните все поля и выберите хотя бы одну неделю');
    }
  };

  const cancelEdit = () => {
    setSelectedTeacher('');
    setSelectedSubject('');
    setSelectedRoom('');
    setSelectedPair(null);
    setUpperWeekChecked(true);
    setLowerWeekChecked(true);
    setTeacherSearchTerm('');
    setSubjectSearchTerm('');
  };

  const getPairData = (day: string, pairNumber: number): PairCellData => {
    if (!selectedGroupId) return { upper: null, lower: null };

    const upperKey = `${selectedGroupId}-${day}-${pairNumber}-upper`;
    const lowerKey = `${selectedGroupId}-${day}-${pairNumber}-lower`;

    const upperPair = schedule[upperKey] || null;
    const lowerPair = schedule[lowerKey] || null;

    if (upperPair && !lowerPair) {
      return { upper: upperPair, lower: null };
    }
    if (!upperPair && lowerPair) {
      return { upper: lowerPair, lower: null };
    }
    return { upper: upperPair, lower: lowerPair };
  };

  const handleCellClick = (day: string, pairNumber: number) => {
    setSelectedDay(day);
    setSelectedPair(pairNumber);

    const pairData = getPairData(day, pairNumber);

    if (pairData.upper || pairData.lower) {
      const sourcePair = pairData.upper || pairData.lower;
      if (sourcePair) {
        setSelectedTeacher(sourcePair.teacher);
        setSelectedSubject(sourcePair.subject);
        setSelectedRoom(sourcePair.room);
      }

      setUpperWeekChecked(!!pairData.upper);
      setLowerWeekChecked(!!pairData.lower);
    } else {
      setSelectedTeacher('');
      setSelectedSubject('');
      setSelectedRoom('');
      setUpperWeekChecked(true);
      setLowerWeekChecked(true);
    }
    setTeacherSearchTerm('');
    setSubjectSearchTerm('');
  };

  const renderCellContent = (pairData: PairCellData) => {
    const hasUpper = pairData.upper;
    const hasLower = pairData.lower;

    if (!hasUpper && !hasLower) {
      return <div className="add-pair-btn">+</div>;
    }

    return (
      <div className="pair-info both-weeks">
        {hasUpper && (
          <div className="week-section upper-week">
            {hasUpper.typeWeek !== 'Общая' && (
              <div className="week-label">Верхняя:</div>
            )}
            <div className="pair-subject">{hasUpper.subject}</div>
            <div className="pair-teacher">{hasUpper.teacher}</div>
            <div className="pair-room">ауд. {hasUpper.room}</div>
          </div>
        )}
        {hasLower && (
          <div className="week-section lower-week">
            {hasLower.typeWeek !== 'Общая' && (
              <div className="week-label">Нижняя:</div>
            )}
            <div className="pair-subject">{hasLower.subject}</div>
            <div className="pair-teacher">{hasLower.teacher}</div>
            <div className="pair-room">ауд. {hasLower.room}</div>
          </div>
        )}
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
                      const pairData = getPairData(day, pair.number);
                      const isSelected = selectedDay === day && selectedPair === pair.number;

                      return (
                        <div
                          key={`${day}-${pair.number}`}
                          className={`schedule-cell ${(pairData.upper || pairData.lower) ? 'filled' : 'empty'} ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleCellClick(day, pair.number)}>
                          {renderCellContent(pairData)}
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
                        onClick={() => setSelectedTeacher(teacher.name)}>
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
                    />
                  </div>
                  <div className="subjects-list">
                    {filteredSubjects.map(subject => (
                      <button
                        key={subject}
                        className={`subject-btn ${selectedSubject === subject ? 'active' : ''}`}
                        onClick={() => setSelectedSubject(subject)}
                        disabled={!selectedTeacher}>
                        {subject}
                      </button>
                    ))}
                    {filteredSubjects.length === 0 && (
                      <div className="no-results">Предметы не найдены</div>
                    )}
                  </div>
                </div>

                <div className="control-group">
                  <h4>Аудитория</h4>
                  <div className="rooms-grid">
                    {filteredRooms.map(room => (
                      <button
                        key={room}
                        className={`room-btn ${selectedRoom === room ? 'active' : ''}`}
                        onClick={() => setSelectedRoom(room)}
                        disabled={!selectedSubject}>
                        {room}
                      </button>
                    ))}
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
                  <button className="cancel-btn" onClick={cancelEdit}>
                    Отменить действие
                  </button>
                  <button className="save-btn" onClick={savePair}>
                    Сохранить изменения
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