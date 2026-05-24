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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openTeacherId, setOpenTeacherId] = useState<number | null>(null);
  const [roomSearchTerms, setRoomSearchTerms] = useState<Record<number, string>>({});
  const [filteredRoomsCache, setFilteredRoomsCache] = useState<Record<number, ApiRoom[]>>({});
  const [savingTeacherId, setSavingTeacherId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState<string>('');

  // загрузка преподавателей и аудиторий
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const staffMembers = await methodistApiService.getStaffMembers();
        
        // должность с id = 9
        const teachersList = staffMembers.filter(
          st => st.staffPosition?.some(pos => pos.id === 9)
        );

        const roomsList = await methodistApiService.getRooms();
        setRooms(roomsList);
        
        const savedTeacherRooms = getSavedTeacherRooms();
        
        const teachersWithRooms: TeacherWithRoom[] = teachersList.map(teacher => {
          const savedRoom = savedTeacherRooms[teacher.id];
          const selectedRoom = roomsList.find(r => r.id === savedRoom?.roomId);
          
          return {
            id: teacher.id,
            name: teacher.name,
            lastName: teacher.lastName,
            patronymic: teacher.patronymic,
            selectedRoomId: savedRoom?.roomId || null,
            selectedRoomName: selectedRoom?.name || '',
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
  
  // пока через localStorage
  const getSavedTeacherRooms = (): Record<number, { roomId: number; roomName: string }> => {
    const saved = localStorage.getItem('teacherRooms');
    return saved ? JSON.parse(saved) : {};
  };
  
  const saveTeacherRoom = (teacherId: number, roomId: number | null, roomName: string) => {
    const saved = getSavedTeacherRooms();
    
    if (roomId === null) {
      delete saved[teacherId];
    } else {
      saved[teacherId] = { roomId, roomName };
    }
    
    localStorage.setItem('teacherRooms', JSON.stringify(saved));
    
    setTeachers(prev => prev.map(teacher =>
      teacher.id === teacherId
        ? { ...teacher, selectedRoomId: roomId, selectedRoomName: roomName }
        : teacher
    ));
  };
  
  const handleRoomSelect = async (teacherId: number, roomId: number | null, roomName: string) => {
    setSavingTeacherId(teacherId);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      saveTeacherRoom(teacherId, roomId, roomName);
      setSuccessMessage(`Аудитория успешно ${roomName ? 'назначена' : 'снята'}`);
      setTimeout(() => setSuccessMessage(null), 3000);
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
    
    if (searchTerm.trim() === '') {
      setFilteredRoomsCache(prev => ({ ...prev, [teacherId]: rooms }));
    } else {
      const filtered = rooms.filter(room =>
        room.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRoomsCache(prev => ({ ...prev, [teacherId]: filtered }));
    }
  };
  
  const getFilteredRoomsForTeacher = (teacherId: number): ApiRoom[] => {
    if (filteredRoomsCache[teacherId]) {
      return filteredRoomsCache[teacherId];
    }
    return rooms;
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
                          {teacher.selectedRoomName || 'Выберите аудиторию'}
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
                              {!teacher.selectedRoomId && <span className="tr-check">✓</span>}
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