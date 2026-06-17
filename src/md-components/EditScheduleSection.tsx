import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import './EditScheduleSection.css';
import { methodistApiService } from '../services/methodistApiService';
import type {
  ApiGroup,
  ApiRoom,
  ApiSubjectWithTeachers,
  ApiStaff,
  ApiScheduleItem
} from '../services/methodistApiService';

type PairData = {
  id?: number;
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
  subgroupNumber?: number | null;
};

type PairCellData = {
  upper: PairData | null;
  lower: PairData | null;
};

type TeacherWithNote = {
  id: number;
  name: string;
  note: string;
};

export const EditSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
  const [loadError, setLoadError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [filteredTeachers, setFilteredTeachers] = useState<TeacherWithNote[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<ApiSubjectWithTeachers[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<ApiRoom[]>([]);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState<string>('');
  const [subjectSearchTerm, setSubjectSearchTerm] = useState<string>('');
  const [roomSearchTerm, setRoomSearchTerm] = useState<string>('');
  const [currentEditingScheduleId, setCurrentEditingScheduleId] = useState<number | null>(null);
  const [selectedSubjectTeachersCount, setSelectedSubjectTeachersCount] = useState<number>(0);

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

  const groupsQuery = useQuery<ApiGroup[]>({
    queryKey: ['groups'],
    queryFn: () => methodistApiService.getGroups(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const roomsQuery = useQuery<ApiRoom[]>({
    queryKey: ['rooms'],
    queryFn: () => methodistApiService.getRooms(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const teachersQuery = useQuery<TeacherWithNote[]>({
    queryKey: ['teachers-with-notes'],
    queryFn: () => methodistApiService.getTeachersWithNotes(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const selectedGroupSubjectsQuery = useQuery<ApiSubjectWithTeachers[]>({
    queryKey: ['group-subjects', selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return [];
      return methodistApiService.getGroupSubjects(selectedGroupId);
    },
    enabled: !!selectedGroupId && !!selectedTeacherId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const scheduleQuery = useQuery<Record<string, PairData[]>>({
    queryKey: ['schedule-by-group', selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return {};
      const data = await methodistApiService.getScheduleByGroup(selectedGroupId);
      const filteredData = data.filter((item: ApiScheduleItem) => item.isIgnored !== true);
      const newSchedule: Record<string, PairData[]> = {};

      filteredData.forEach((item: ApiScheduleItem) => {
        const day = item.dayWeek;
        const pairNumber = item.numPair;

        if (!day || !pairNumber) return;

        const teacherId = item.subgroup !== null && item.subgroup !== undefined 
          ? item.subgroup 
          : item.idTeacher;

        const base: PairData = {
          id: item.id,
          teacher: (item.lastnameTeacher && item.nameTeacher)
            ? `${item.lastnameTeacher} ${item.nameTeacher} ${item.patronymicTeacher || ''}`.trim()
            : '',
          teacherId: teacherId || undefined,
          subject: item.nameSubject || '',
          subjectId: item.idSubject,
          idSt: item.idSt,
          room: item.room || '',
          time: pairTimes.find((p) => p.number === pairNumber)?.time || '',
          typeWeek: item.typeWeek as 'Общая' | 'Верхняя' | 'Нижняя',
          idGroup: item.idGroup,
          subgroup: item.subgroup === null ? null : item.subgroup,
          week: item.typeWeek === 'Нижняя' ? 'lower' : 'upper'
        };

        let key = '';
        if (item.typeWeek === 'Общая') {
          key = `${selectedGroupId}-${day}-${pairNumber}-common`;
        } else if (item.typeWeek === 'Верхняя') {
          key = `${selectedGroupId}-${day}-${pairNumber}-upper`;
        } else if (item.typeWeek === 'Нижняя') {
          key = `${selectedGroupId}-${day}-${pairNumber}-lower`;
        }

        if (!newSchedule[key]) {
          newSchedule[key] = [];
        }
        newSchedule[key].push(base);
      });

      return newSchedule;
    },
    enabled: !!selectedGroupId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // сортировка аудиторий, сначала привязанная к выбранному преподавателю, затем остальные
  const sortRoomsByOwner = (roomsList: ApiRoom[], teacherId: number | null): ApiRoom[] => {
    if (!teacherId) return [...roomsList].sort((a, b) => a.name.localeCompare(b.name));
    
    const assignedRoom = roomsList.find(room => room.idStaffOwner === teacherId);
    const otherRooms = roomsList.filter(room => room.idStaffOwner !== teacherId);
    
    const sortedOther = [...otherRooms].sort((a, b) => a.name.localeCompare(b.name));
    
    if (assignedRoom) {
      return [assignedRoom, ...sortedOther];
    }
    
    return sortedOther;
  };

  useEffect(() => {
    const savedGroup = localStorage.getItem('selectedGroupForEdit');
    if (savedGroup) {
      const id = Number(savedGroup);
      if (!Number.isNaN(id)) {
        setSelectedGroupId(id);
      }
    }
  }, []);

  // загрузка преподавателей с примечаниями 
  useEffect(() => {
    if (groupsQuery.data) {
      const sorted = [...groupsQuery.data].sort((a, b) => a.numberGroup - b.numberGroup);
      if (selectedGroupId === null && sorted.length > 0) {
        const savedGroup = localStorage.getItem('selectedGroupForEdit');
        const savedGroupId = savedGroup ? Number(savedGroup) : null;
        if (savedGroupId && sorted.some(g => g.id === savedGroupId)) {
          setSelectedGroupId(savedGroupId);
        } else {
          setSelectedGroupId(sorted[0].id);
        }
      }
    }
  }, [groupsQuery.data]);

  // фильтрация преподавателей по поиску
  useEffect(() => {
    if (teachersQuery.data) {
      setFilteredTeachers(
        teacherSearchTerm.trim() === ''
          ? teachersQuery.data
          : teachersQuery.data.filter((teacher: TeacherWithNote) =>
              teacher.name.toLowerCase().includes(teacherSearchTerm.toLowerCase())
            )
      );
    }
  }, [teachersQuery.data, teacherSearchTerm]);

  // фильтрация и сортировка аудиторий по поиску
  useEffect(() => {
    if (!roomsQuery.data) return;
    
    let filtered = [...roomsQuery.data];
    
    if (roomSearchTerm.trim() !== '') {
      filtered = filtered.filter((room: ApiRoom) =>
        room.name.toLowerCase().includes(roomSearchTerm.toLowerCase())
      );
    }
    
    const sorted = sortRoomsByOwner(filtered, selectedTeacherId);
    setFilteredRooms(sorted);
  }, [roomsQuery.data, roomSearchTerm, selectedTeacherId]);

  // удаление дублирования предметов
  useEffect(() => {
    if (!selectedTeacherId || !selectedGroupId || !selectedGroupSubjectsQuery.data) {
      setFilteredSubjects([]);
      return;
    }

    const filteredByTeacher = selectedGroupSubjectsQuery.data.filter((subject: ApiSubjectWithTeachers) =>
      subject.teachers.some(teacher => teacher.idTeacher === selectedTeacherId)
    );

    // удаление дубликатов по idSubject
    const uniqueSubjectsMap = new Map<number, ApiSubjectWithTeachers>();
    filteredByTeacher.forEach((subject: ApiSubjectWithTeachers) => {
      if (!uniqueSubjectsMap.has(subject.idSubject)) {
        uniqueSubjectsMap.set(subject.idSubject, subject);
      }
    });

    const uniqueSubjects = Array.from(uniqueSubjectsMap.values());

    const filtered =
      subjectSearchTerm.trim() === ''
        ? uniqueSubjects
        : uniqueSubjects.filter((subject: ApiSubjectWithTeachers) =>
            subject.nameSubject.toLowerCase().includes(subjectSearchTerm.toLowerCase())
          );

    setFilteredSubjects(filtered);
  }, [selectedGroupSubjectsQuery.data, selectedTeacherId, selectedGroupId, subjectSearchTerm]);

  // сброс пагинации аудиторий при изменении поиска или выборе преподавателя
  useEffect(() => {
    if (selectedSubjectId && selectedGroupSubjectsQuery.data) {
      const selectedSubjectData = selectedGroupSubjectsQuery.data.find(
        (sub: ApiSubjectWithTeachers) => sub.idSubject === selectedSubjectId
      );
      if (selectedSubjectData) {
        setSelectedSubjectTeachersCount(selectedSubjectData.teachers.length);
      } else {
        setSelectedSubjectTeachersCount(0);
      }
    } else {
      setSelectedSubjectTeachersCount(0);
    }
  }, [selectedSubjectId, selectedGroupSubjectsQuery.data]);

  useEffect(() => {
    setLoadError('');
  }, [selectedGroupId]);

  useEffect(() => {
    if (groupsQuery.error) {
      setLoadError('Не удалось загрузить группы');
    }
    if (roomsQuery.error) {
      setLoadError('Не удалось загрузить аудитории');
    }
    if (teachersQuery.error) {
      setLoadError('Не удалось загрузить преподавателей');
    }
    if (scheduleQuery.error) {
      setLoadError('Не удалось загрузить расписание');
    }
  }, [groupsQuery.error, roomsQuery.error, teachersQuery.error, scheduleQuery.error]);

  const normalizedSchedule = scheduleQuery.data ?? {};
  const groups = groupsQuery.data ? [...groupsQuery.data].sort((a, b) => a.numberGroup - b.numberGroup) : [];
  const loadingSchedule = scheduleQuery.isLoading;

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
    setCurrentEditingScheduleId(null);
    setSelectedSubjectTeachersCount(0);

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
    setSelectedSubgroupType(null);
    setSelectedSubjectTeachersCount(0);
  };

  const handleSubjectSelect = (subject: ApiSubjectWithTeachers) => {
    setSelectedSubject(subject.nameSubject);
    setSelectedSubjectId(subject.idSubject);
    setSelectedIdSt(subject.idSt);
    setSelectedSubgroupType(null);
    setSelectedSubjectTeachersCount(subject.teachers.length);
  };

  const handleRoomSelect = (roomName: string) => {
    setSelectedRoom(roomName);
  };

  const handleDeletePairMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      try {
        await methodistApiService.deleteSchedule(scheduleId);
      } catch {
        await methodistApiService.updateScheduleIgnored(scheduleId, true);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schedule-by-group', selectedGroupId] });
    },
  });

  const savePairMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGroupId || !selectedDay || !selectedPair || !selectedIdSt || !selectedRoom) {
        throw new Error('Заполните все поля (преподаватель, предмет, аудитория)');
      }

      if (!upperWeekChecked && !lowerWeekChecked) {
        throw new Error('Выберите хотя бы одну неделю');
      }

      const subgroupValue = selectedSubgroupType === null 
        ? null 
        : selectedTeacherId;

      const checkConflict = async (typeWeek: 'Общая' | 'Верхняя' | 'Нижняя') => {
        const existingSchedule = await methodistApiService.getScheduleByGroup(selectedGroupId);
        
        return existingSchedule.some((item: ApiScheduleItem) => 
          item.isIgnored !== true &&
          item.dayWeek === selectedDay &&
          item.numPair === selectedPair &&
          item.typeWeek === typeWeek &&
          (subgroupValue === null 
            ? item.subgroup === null 
            : item.subgroup === subgroupValue) &&
          item.id !== currentEditingScheduleId
        );
      };

      if (upperWeekChecked && lowerWeekChecked) {
        const hasConflict = await checkConflict('Общая');
        if (hasConflict) {
          throw new Error(`Конфликт: на ${selectedDay} ${selectedPair} пару (${subgroupValue === null ? 'общая группа' : `подгруппа ${selectedSubgroupType}`}) уже есть занятие.`);
        }
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
      } else {
        if (upperWeekChecked) {
          const hasConflict = await checkConflict('Верхняя');
          if (hasConflict) {
            throw new Error(`Конфликт: на ${selectedDay} ${selectedPair} пару (${subgroupValue === null ? 'общая группа' : `подгруппа ${selectedSubgroupType}`}) верхней недели уже есть занятие.`);
          }
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
        }

        if (lowerWeekChecked) {
          const hasConflict = await checkConflict('Нижняя');
          if (hasConflict) {
            throw new Error(`Конфликт: на ${selectedDay} ${selectedPair} пару (${subgroupValue === null ? 'общая группа' : `подгруппа ${selectedSubgroupType}`}) нижней недели уже есть занятие.`);
          }
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
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schedule-by-group', selectedGroupId] });
    },
  });

  const handleDeletePair = async () => {
    if (!currentEditingScheduleId) {
      alert('Не найден ID занятия для удаления');
      return;
    }

    if (!window.confirm('Вы уверены, что хотите удалить это занятие?')) {
      return;
    }

    setDeleting(true);
    try {
      await handleDeletePairMutation.mutateAsync(currentEditingScheduleId);
      alert('Занятие успешно удалено');
      cancelEdit();
    } catch (e) {
      console.error('Ошибка удаления/скрытия:', e);
      alert('Не удалось удалить или скрыть занятие. Попробуйте позже.');
    } finally {
      setDeleting(false);
    }
  };

  const savePair = async () => {
    setSaving(true);
    try {
      await savePairMutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ['schedule-by-group', selectedGroupId] });
      cancelEdit();
      alert('Изменения успешно сохранены');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Неизвестная ошибка';
      alert('Ошибка при сохранении: ' + message);
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
    setSelectedDay('');
    setUpperWeekChecked(true);
    setLowerWeekChecked(true);
    setTeacherSearchTerm('');
    setSubjectSearchTerm('');
    setRoomSearchTerm('');
    setCurrentEditingScheduleId(null);
    setSelectedSubjectTeachersCount(0);
  };

  const getPairData = (day: string, pairNumber: number): PairCellData => {
    if (!selectedGroupId) return { upper: null, lower: null };

    const commonKey = `${selectedGroupId}-${day}-${pairNumber}-common`;
    const upperKey = `${selectedGroupId}-${day}-${pairNumber}-upper`;
    const lowerKey = `${selectedGroupId}-${day}-${pairNumber}-lower`;

    const commonPairs = normalizedSchedule[commonKey] || [];
    const upperPairs = normalizedSchedule[upperKey] || [];
    const lowerPairs = normalizedSchedule[lowerKey] || [];

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
      key = normalizedSchedule[commonKey] ? commonKey : upperKey;
    } else {
      const commonKey = `${selectedGroupId}-${day}-${pairNumber}-common`;
      const lowerKey = `${selectedGroupId}-${day}-${pairNumber}-lower`;
      key = normalizedSchedule[commonKey] ? commonKey : lowerKey;
    }

    const items = normalizedSchedule[key] || [];
    
    if (items.length === 0) return [];
    
    const hasSubgroups = items.some((item: PairData) => item.subgroup !== null && item.subgroup !== undefined);
    
    if (!hasSubgroups) {
      return items;
    }
    
    const subgroupsWithIds = items.filter((item: PairData) => item.subgroup !== null && item.subgroup !== undefined);
    const commonItems = items.filter((item: PairData) => item.subgroup === null || item.subgroup === undefined);
    
    const result = [...commonItems];
    subgroupsWithIds.forEach((item: PairData, index: number) => {
      result.push({
        ...item,
        subgroupNumber: index + 1
      });
    });
    
    return result;
  };

  const handleCellClick = (day: string, pairNumber: number) => {
    setSelectedDay(day);
    setSelectedPair(pairNumber);

    const pairData = getPairData(day, pairNumber);

    const commonKey = `${selectedGroupId}-${day}-${pairNumber}-common`;
    const commonPairs = normalizedSchedule[commonKey];

    if (commonPairs && commonPairs.length > 0) {
      const commonPair = commonPairs[0];
      setSelectedTeacher(commonPair.teacher);
      setSelectedTeacherId(commonPair.teacherId || null);
      setSelectedSubject(commonPair.subject);
      setSelectedSubjectId(commonPair.subjectId || null);
      setSelectedIdSt(commonPair.idSt || null);
      setSelectedRoom(commonPair.room);
      
      const hasSubgroups = commonPairs.some((p: PairData) => p.subgroup !== null);
      if (hasSubgroups) {
        setSelectedSubgroupType(null);
      } else {
        setSelectedSubgroupType(null);
      }
      
      setUpperWeekChecked(true);
      setLowerWeekChecked(true);
      setCurrentEditingScheduleId(commonPair.id || null);
    } else if (pairData.upper || pairData.lower) {
      const sourcePair = pairData.upper || pairData.lower;
      if (sourcePair) {
        setSelectedTeacher(sourcePair.teacher);
        setSelectedTeacherId(sourcePair.teacherId || null);
        setSelectedSubject(sourcePair.subject);
        setSelectedSubjectId(sourcePair.subjectId || null);
        setSelectedIdSt(sourcePair.idSt || null);
        setSelectedRoom(sourcePair.room);
        
        if (sourcePair.subgroup !== null && sourcePair.subgroup !== undefined) {
          setSelectedSubgroupType(1);
        } else {
          setSelectedSubgroupType(null);
        }
        
        setCurrentEditingScheduleId(sourcePair.id || null);
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
      setCurrentEditingScheduleId(null);
    }

    setTeacherSearchTerm('');
    setSubjectSearchTerm('');
    setRoomSearchTerm('');
    
    setTimeout(() => {
      const editPanel = document.querySelector('.edit-pair-panel');
      if (editPanel) {
        editPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const renderSubgroups = (subgroups: PairData[], weekLabel: string) => {
    if (subgroups.length === 0) return null;

    if (subgroups.length === 1 && subgroups[0].subgroup === null) {
      const pair = subgroups[0];
      return (
        <div className="pair-info">
          {weekLabel && <div className="week-label">{weekLabel}</div>}
          <div className="pair-subject">{pair.subject || '—'}</div>
          <div className="pair-teacher">
            {pair.teacher && pair.teacher.trim() !== '' ? pair.teacher : 'Преподаватель не указан'}
          </div>
          <div className="pair-room">ауд. {pair.room || '—'}</div>
        </div>
      );
    }

    return (
      <div className="pair-info subgroups">
        {weekLabel && <div className="week-label">{weekLabel}</div>}
        {subgroups.map((pair: PairData, idx: number) => (
          <div key={idx} className="subgroup-item">
            {pair.subgroupNumber !== null && pair.subgroupNumber !== undefined && (
              <div className="subgroup-label">Подгруппа {pair.subgroupNumber}:</div>
            )}
            <div className="pair-subject">{pair.subject || '—'}</div>
            <div className="pair-teacher">
              {pair.teacher && pair.teacher.trim() !== '' ? pair.teacher : 'Преподаватель не указан'}
            </div>
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
    const isCommon = !!normalizedSchedule[commonKey];

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
                  {groups.map((group: ApiGroup) => (
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

          {(saving || deleting) && (
            <div className="status-banner">
              {saving ? 'Сохранение расписания...' : 'Удаление занятия...'}
            </div>
          )}

          {selectedGroupId && !loadingSchedule && (
            <div className="schedule-grid-container">
              <div className="schedule-grid">
                <div className="grid-header empty"></div>
                {daysOfWeek.map((day: string) => (
                  <div key={day} className="grid-header">
                    {day}
                  </div>
                ))}

                {pairTimes.map((pair) => (
                  <React.Fragment key={pair.number}>
                    <div className="time-cell">
                      <div className="pair-number">{pair.number} пара</div>
                      <div className="pair-time">{pair.time}</div>
                    </div>

                    {daysOfWeek.map((day: string) => {
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
                Редактирование пары: {selectedDay}, {selectedPair} пара ({pairTimes.find((p) => p.number === selectedPair)?.time})
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
                  <div className="items-list teachers-list">
                    {filteredTeachers.map((teacher: TeacherWithNote) => {
                      const hasNote = !!teacher.note && teacher.note.trim() !== '';
                      const isActive = selectedTeacher === teacher.name;

                      return (
                        <button
                          key={teacher.id}
                          className={`list-item teacher-item ${isActive ? 'active' : ''}`}
                          onClick={() => handleTeacherSelect(teacher.id, teacher.name)}
                        >
                          <span className="item-name">{teacher.name}</span>

                          {hasNote && (
                            <span className="item-note-wrapper">
                              <img
                                src={isActive ? "/md-icons/info_icon_white.svg" : "/md-icons/info_icon.svg"}
                                alt="info"
                                className="item-note-icon"
                              />
                              <span className="item-note-tooltip">
                                {teacher.note}
                              </span>
                            </span>
                          )}
                        </button>
                      );
                    })}
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
                  <div className="items-list subjects-list">
                    {filteredSubjects.map((subject: ApiSubjectWithTeachers) => (
                      <button
                        key={subject.idSubject}
                        className={`list-item subject-item ${selectedSubject === subject.nameSubject ? 'active' : ''}`}
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
                  <div className="items-list rooms-list">
                    {filteredRooms.map((room: ApiRoom) => {
                      const isOwnerRoom = room.idStaffOwner === selectedTeacherId;
                      const isActive = selectedRoom === room.name;
                      
                      return (
                        <button
                          key={room.id}
                          className={`list-item room-item ${isActive ? 'active' : ''} ${isOwnerRoom ? 'owner-room' : ''}`}
                          onClick={() => handleRoomSelect(room.name)}
                          disabled={!selectedSubjectId}>
                          <span className="item-name">{room.name}</span>
                        </button>
                      );
                    })}
                    {filteredRooms.length === 0 && (
                      <div className="no-results">Аудитории не найдены</div>
                    )}
                    {!selectedSubjectId && (
                      <div className="no-results">Сначала выберите предмет</div>
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
                    {selectedSubjectTeachersCount > 1 && (
                      <>
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
                      </>
                    )}
                  </div>
                  {selectedSubjectTeachersCount <= 1 && selectedSubjectId && (
                    <div className="no-results" style={{ marginTop: '8px', fontSize: '12px' }}>
                      Для этого предмета не предусмотрено разделение на подгруппы (только один преподаватель)
                    </div>
                  )}
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
              </div>

              <div className="action-buttons">
                <button
                  className="delete-btn"
                  onClick={handleDeletePair}
                  disabled={saving || deleting || !currentEditingScheduleId}>
                  {deleting ? 'Удаление...' : 'Удалить'}
                </button>
                <button className="cancel-btn" onClick={cancelEdit} disabled={saving || deleting}>
                  Отменить
                </button>
                <button
                  className="save-btn"
                  onClick={savePair}
                  disabled={saving || deleting || !selectedTeacherId || !selectedSubjectId || !selectedRoom}>
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};