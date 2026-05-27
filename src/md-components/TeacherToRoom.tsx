import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { methodistApiService, ApiStaff, ApiRoom } from '../services/methodistApiService';
import './TeacherToRoom.css';

interface TeacherWithRoom {
  id: number;
  name: string;
  lastName: string;
  patronymic?: string;
  selectedRoomId: number | null;
  selectedRoomName: string;
}

const TeacherToRoom: React.FC = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<TeacherWithRoom[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<TeacherWithRoom[]>([]);
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [freeRooms, setFreeRooms] = useState<ApiRoom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openTeacherId, setOpenTeacherId] = useState<number | null>(null);
  const [roomSearchTerms, setRoomSearchTerms] = useState<Record<number, string>>({});
  const [filteredRoomsCache, setFilteredRoomsCache] = useState<Record<number, ApiRoom[]>>({});
  const [savingTeacherId, setSavingTeacherId] = useState<number | null>(null);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState<string>('');

  // загрузка преподавателей и аудиторий
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const staffMembers = await methodistApiService.getStaffMembers();
        
        const teachersList = staffMembers.filter(
          st => st.staffPosition?.some(pos => pos.id === 9)
        );

        const allRooms = await methodistApiService.getRoomsWithOwners();
        setRooms(allRooms);
        
        const freeRoomsList = await methodistApiService.getFreeRooms();
        setFreeRooms(freeRoomsList);
        
        const teachersWithRooms: TeacherWithRoom[] = teachersList.map(teacher => {
          const assignedRoom = allRooms.find(room => room.idStaffOwner === teacher.id);
          
          return {
            id: teacher.id,
            name: teacher.name,
            lastName: teacher.lastName,
            patronymic: teacher.patronymic,
            selectedRoomId: assignedRoom?.id || null,
            selectedRoomName: assignedRoom?.name || '',
          };
        });
        
        setTeachers(teachersWithRooms);
        setFilteredTeachers(teachersWithRooms);
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // фильтрация преподавателей по поиску
  useEffect(() => {
    if (teacherSearchTerm.trim() === '') {
      setFilteredTeachers(teachers);
    } else {
      const filtered = teachers.filter(teacher => {
        const fullName = `${teacher.lastName} ${teacher.name} ${teacher.patronymic || ''}`.toLowerCase();
        return fullName.includes(teacherSearchTerm.toLowerCase());
      });
      setFilteredTeachers(filtered);
    }
  }, [teacherSearchTerm, teachers]);
  
  // сохранение привязки аудитории к преподавателю через API
  const assignRoomToTeacher = async (teacherId: number, roomId: number | null): Promise<void> => {
    if (roomId === null) {
      try {
        await methodistApiService.assignRoomToStaff(0, teacherId);
      } catch (err) {
        console.error('Ошибка при отвязке аудитории:', err);
        throw err;
      }
    } else {
      await methodistApiService.assignRoomToStaff(roomId, teacherId);
    }
  };
  
  // обновление локального состояния после привязки/отвязки
  const updateLocalState = (teacherId: number, roomId: number | null, roomName: string) => {
    setTeachers(prev => prev.map(teacher =>
      teacher.id === teacherId
        ? { ...teacher, selectedRoomId: roomId, selectedRoomName: roomName }
        : teacher
    ));
    
    // обновление списка всех аудиторий 
    setRooms(prev => prev.map(room =>
      room.id === roomId
        ? { ...room, idStaffOwner: teacherId }
        : room.idStaffOwner === teacherId && room.id !== roomId
          ? { ...room, idStaffOwner: null }
          : room
    ));
    
    // обновление списка свободных аудиторий
    const updateFreeRooms = async () => {
      try {
        const newFreeRooms = await methodistApiService.getFreeRooms();
        setFreeRooms(newFreeRooms);
      } catch (err) {
        console.error('Ошибка обновления списка свободных аудиторий:', err);
      }
    };
    updateFreeRooms();
  };
  
  const handleRoomSelect = async (teacherId: number, roomId: number | null, roomName: string) => {
    setSavingTeacherId(teacherId);
    
    try {
      await assignRoomToTeacher(teacherId, roomId);
      updateLocalState(teacherId, roomId, roomName);
    } catch (err) {
      console.error('Ошибка при сохранении:', err);
      setError('Не удалось сохранить аудиторию');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSavingTeacherId(null);
    }
  };
  
  const handleRoomSearch = (teacherId: number, searchTerm: string) => {
    setRoomSearchTerms(prev => ({ ...prev, [teacherId]: searchTerm }));
    
    const currentTeacher = teachers.find(t => t.id === teacherId);
    const currentRoomId = currentTeacher?.selectedRoomId;
    const currentRoom = rooms.find(r => r.id === currentRoomId);
    
    let availableRooms: ApiRoom[] = [...freeRooms];
    
    if (currentRoom && currentRoom.idStaffOwner === teacherId) {
      const alreadyInList = availableRooms.some(r => r.id === currentRoom.id);
      if (!alreadyInList) {
        availableRooms = [currentRoom, ...availableRooms];
      }
    }
    
    if (searchTerm.trim() === '') {
      setFilteredRoomsCache(prev => ({ ...prev, [teacherId]: availableRooms }));
    } else {
      const filtered = availableRooms.filter(room =>
        room.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRoomsCache(prev => ({ ...prev, [teacherId]: filtered }));
    }
  };
  
  const getFilteredRoomsForTeacher = (teacherId: number): ApiRoom[] => {
    if (filteredRoomsCache[teacherId]) {
      return filteredRoomsCache[teacherId];
    }
    
    const currentTeacher = teachers.find(t => t.id === teacherId);
    const currentRoomId = currentTeacher?.selectedRoomId;
    const currentRoom = rooms.find(r => r.id === currentRoomId);
    
    let availableRooms: ApiRoom[] = [...freeRooms];
    if (currentRoom && currentRoom.idStaffOwner === teacherId && !availableRooms.some(r => r.id === currentRoom.id)) {
      availableRooms = [currentRoom, ...availableRooms];
    }
    
    return availableRooms;
  };
  
  const toggleDropdown = (teacherId: number) => {
    if (openTeacherId === teacherId) {
      setOpenTeacherId(null);
      setRoomSearchTerms(prev => {
        const newTerms = { ...prev };
        delete newTerms[teacherId];
        return newTerms;
      });
    } else {
      setOpenTeacherId(teacherId);
      if (!roomSearchTerms[teacherId]) {
        setRoomSearchTerms(prev => ({ ...prev, [teacherId]: '' }));
      }
      const currentTeacher = teachers.find(t => t.id === teacherId);
      const currentRoomId = currentTeacher?.selectedRoomId;
      const currentRoom = rooms.find(r => r.id === currentRoomId);
      
      let availableRooms: ApiRoom[] = [...freeRooms];
      if (currentRoom && currentRoom.idStaffOwner === teacherId && !availableRooms.some(r => r.id === currentRoom.id)) {
        availableRooms = [currentRoom, ...availableRooms];
      }
      setFilteredRoomsCache(prev => ({ ...prev, [teacherId]: availableRooms }));
    }
  };
  
  const formatTeacherName = (teacher: TeacherWithRoom): string => {
    let name = `${teacher.lastName} ${teacher.name}`;
    if (teacher.patronymic) {
      name += ` ${teacher.patronymic}`;
    }
    return name;
  };
  
  if (loading) {
    return (
      <div className="tr-loading">
        <div className="tr-loading-spinner"></div>
        <p>Загрузка данных...</p>
      </div>
    );
  }
  
  return (
    <div className="tr-container">
      <div className="tr-header">
        <button className="tr-back-btn" onClick={() => navigate(-1)}>
          Назад
        </button>
        <div className="tr-search-wrapper">
          <input
            type="text"
            className="tr-search-input"
            placeholder="Поиск преподавателя..."
            value={teacherSearchTerm}
            onChange={(e) => setTeacherSearchTerm(e.target.value)}
          />
        </div>
      </div>
      {error && (
        <div className="tr-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      {filteredTeachers.length === 0 ? (
        <div className="tr-empty">
          <p>Преподаватели не найдены</p>
        </div>
      ) : (
        <div className="tr-table-wrapper">
          <table className="tr-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Преподаватель</th>
                <th>Аудитория</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((teacher, index) => (
                <tr key={teacher.id} className="tr-row">
                  <td className="tr-number">{index + 1}</td>
                  <td className="tr-teacher-cell">
                    <div className="tr-teacher-info">
                      <span className="tr-teacher-name">{formatTeacherName(teacher)}</span>
                    </div>
                  </td>
                  <td className="tr-room-cell">
                    <div className="tr-selector-wrapper">
                      <button
                        className={`tr-selector-btn ${openTeacherId === teacher.id ? 'open' : ''}`}
                        onClick={() => toggleDropdown(teacher.id)}
                        disabled={savingTeacherId === teacher.id}
                      >
                        <span className={!teacher.selectedRoomName ? 'tr-placeholder' : ''}>
                          {teacher.selectedRoomName || 'Не выбрана'}
                        </span>
                        <span className="tr-selector-arrow">▼</span>
                      </button>
                      
                      {openTeacherId === teacher.id && (
                        <div className="tr-dropdown">
                          <div className="tr-dropdown-search">
                            <input
                              type="text"
                              className="tr-dropdown-input"
                              placeholder="Поиск аудитории..."
                              value={roomSearchTerms[teacher.id] || ''}
                              onChange={(e) => handleRoomSearch(teacher.id, e.target.value)}
                              autoFocus
                            />
                          </div>
                          <div className="tr-dropdown-list">
                            <div
                              className={`tr-dropdown-item ${!teacher.selectedRoomId ? 'selected' : ''}`}
                              onClick={() => {
                                handleRoomSelect(teacher.id, null, '');
                                setOpenTeacherId(null);
                              }}
                            >
                              <span>Не выбрано</span>
                            </div>
                            
                            {getFilteredRoomsForTeacher(teacher.id).length === 0 ? (
                              <div className="tr-dropdown-empty">
                                Аудитории не найдены
                              </div>
                            ) : (
                              getFilteredRoomsForTeacher(teacher.id).map(room => (
                                <div
                                  key={room.id}
                                  className={`tr-dropdown-item ${teacher.selectedRoomId === room.id ? 'selected' : ''}`}
                                  onClick={() => {
                                    handleRoomSelect(teacher.id, room.id, room.name);
                                    setOpenTeacherId(null);
                                  }}
                                >
                                  <span>{room.name}</span>
                                  {teacher.selectedRoomId === room.id && <span className="tr-check">✓</span>}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                      
                      {savingTeacherId === teacher.id && (
                        <div className="tr-saving">Сохранение...</div>
                      )}
                    </div>
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TeacherToRoom;