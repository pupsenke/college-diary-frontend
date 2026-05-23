import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { methodistApiService } from '../services/methodistApiService';
import { ApiStaff } from '../services/methodistApiService';
import './NotesTeacher.css';

export const NotesTeacher: React.FC = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<ApiStaff[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<ApiStaff[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingTeacherId, setEditingTeacherId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<{ id: number; message: string } | null>(null);

  // загрузка преподавателей
  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const staff = await methodistApiService.getStaffMembers();
      const teachersOnly = staff.filter(st => 
        st.staffPosition?.some(pos => pos.id === 9)
      );
      
      const sortedTeachers = [...teachersOnly].sort((a, b) => {
        const aHasNote = a.note && a.note.trim() !== '';
        const bHasNote = b.note && b.note.trim() !== '';
        
        if (aHasNote && !bHasNote) return -1;
        if (!aHasNote && bHasNote) return 1;
        
        const aName = `${a.lastName} ${a.name}`.toLowerCase();
        const bName = `${b.lastName} ${b.name}`.toLowerCase();
        return aName.localeCompare(bName);
      });
      
      setTeachers(sortedTeachers);
      setFilteredTeachers(sortedTeachers);
    } catch (error) {
      console.error('Ошибка при загрузке преподавателей:', error);
    } finally {
      setLoading(false);
    }
  };

  // фильтрация преподавателей по поиску
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTeachers(teachers);
    } else {
      const filtered = teachers.filter(teacher => {
        const fullName = `${teacher.lastName} ${teacher.name} ${teacher.patronymic || ''}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
      });
      setFilteredTeachers(filtered);
    }
  }, [searchTerm, teachers]);

  const handleEditNote = (teacher: ApiStaff) => {
    setEditingTeacherId(teacher.id);
    setNoteText(teacher.note || '');
  };

  const handleGoBack = () => {
    navigate(-1); // Возврат на предыдущую страницу
  };

  const getFullName = (teacher: ApiStaff) => {
    return `${teacher.lastName} ${teacher.name} ${teacher.patronymic || ''}`.trim();
  };

  if (loading) {
    return (
      <div className="nt-container">
        <div className="nt-loading">Загрузка преподавателей...</div>
      </div>
    );
  }

  return (
    <div className="nt-container">
      <div className="nt-header-section">
        <button className="nt-back-btn" onClick={handleGoBack} title="Назад">
          Назад
        </button>
        <div className="nt-search-wrapper">
          <input
            type="text"
            className="nt-search-input"
            placeholder="Поиск преподавателя..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="nt-list">
        <div className="nt-list-header">
          <div className="nt-header-name">Преподаватель</div>
          <div className="nt-header-note">Примечание</div>
          <div className="nt-header-action">Действие</div>
        </div>
        
        {filteredTeachers.map(teacher => (
          <div key={teacher.id} className={`nt-list-item ${teacher.note ? 'has-note' : ''}`}>
            <div className="nt-item-name">
              {getFullName(teacher)}
            </div>
            
            <div className="nt-item-note">
              {editingTeacherId === teacher.id ? (
                <textarea
                  className="nt-note-input"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Введите примечание..."
                  rows={2}
                  autoFocus
                />
              ) : (
                <div className="nt-note-display">
                  {teacher.note ? (
                    <span className="nt-note-text">{teacher.note}</span>
                  ) : (
                    <span className="nt-note-empty">Нет примечания</span>
                  )}
                </div>
              )}
            </div>
            
            <div className="nt-item-action">
              <button
                  className="nt-btn nt-btn-edit"
                  onClick={() => handleEditNote(teacher)}
                  title="Редактировать примечание"
                >
                  Редактировать
                </button>
            </div>
            
            {successMessage?.id === teacher.id && (
              <div className="nt-success-toast">
                {successMessage.message}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {filteredTeachers.length === 0 && (
        <div className="nt-no-results">
          <p>Преподаватели не найдены</p>
        </div>
      )}
    </div>
  );
};