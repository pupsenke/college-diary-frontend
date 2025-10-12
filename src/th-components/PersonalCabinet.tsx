import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import './PersonalCabinet.css';

interface TeacherData {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  specialty: string;
  experience: string;
  disciplines: string[];
}

interface Props {
  onNavigateToDisciplines?: (disciplineName?: string) => void;
  onNavigateToGroups?: (disciplineName?: string) => void;
}

export const PersonalCabinet: React.FC<Props> = ({ 
  onNavigateToDisciplines, 
  onNavigateToGroups 
}) => {
  const { user } = useUser();
  const [teacherData, setTeacherData] = useState<TeacherData>({
    firstName: '',
    lastName: '',
    middleName: '',
    email: 's123456@std.nosu.ru',
    specialty: 'Математика и информатика',
    experience: '27 лет',
    disciplines: [
      'Разработка программных модулей',
      'Дипломное проектирование',
      'Операционные системы и среды',
      'Основы разработки программного обеспечения',
      'Технология разработки и защиты баз данных',
      'Системное программирование',
      'Компьютерные сети'
    ]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Функция для получения данных преподавателя
  const fetchTeacherData = async (teacherId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      // Здесь будет реальный запрос к API
      const response = await fetch(`http://localhost:8080/api/v1/teachers/${teacherId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Ошибка при получении данных преподавателя: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Ошибка при загрузке данных преподавателя:', err);
      setError('Не удалось загрузить данные преподавателя');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Функция для получения дисциплин преподавателя
  const fetchTeacherDisciplines = async (teacherId: number) => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/teachers/${teacherId}/disciplines`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Ошибка при получении дисциплин: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Ошибка при загрузке дисциплин:', err);
      return [];
    }
  };

  // Заполняем данные из контекста пользователя и получаем данные преподавателя
  useEffect(() => {
    const initializeTeacherData = async () => {
      if (user) {
        const baseData = {
          firstName: user.name || '',
          lastName: user.lastName || '',
          middleName: user.surname || '',
          email: user.email || 's123456@std.nosu.ru'
        };

        setTeacherData(prev => ({ ...prev, ...baseData }));

        // Получаем дополнительные данные преподавателя
        if (user.id) {
          const teacherData = await fetchTeacherData(user.id);
          const disciplines = await fetchTeacherDisciplines(user.id);
          
          if (teacherData) {
            setTeacherData(prev => ({
              ...prev,
              ...baseData,
              specialty: teacherData.specialty || 'Математика и информатика',
              experience: teacherData.experience || '27 лет',
              disciplines: disciplines.length > 0 ? disciplines : prev.disciplines
            }));
          }
        }
      }
    };

    initializeTeacherData();
  }, [user]);

  const handlePasswordChange = () => {
    // Логика смены пароля
    console.log('Смена пароля');
  };

  const handleDisciplineClick = (discipline: string) => {
    if (onNavigateToGroups) {
      onNavigateToGroups(discipline);
    }
  };

  const handleViewAllDisciplines = () => {
    if (onNavigateToDisciplines) {
      onNavigateToDisciplines();
    }
  };

  // Если данные пользователя еще не загружены
  if (!user) {
    return (
      <div className="personal-cabinet">
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Загрузка данных пользователя...
        </div>
      </div>
    );
  }

  return (
    <div className="personal-cabinet">
      <div className="personal-info-main">
        <div className="personal-info-section">
          <div className="info-column">
            <div className="info-item">
              <span className="info-label">Фамилия:</span>
              <span className="info-value">{teacherData.lastName || 'Не указано'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Имя:</span>
              <span className="info-value">{teacherData.firstName || 'Не указано'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Отчество:</span>
              <span className="info-value">{teacherData.middleName || 'Не указано'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Эл. почта:</span>
              <span className="info-value">{teacherData.email}</span>
            </div>
          </div>
        </div>
        
        <div className="change-password-section">
          <button 
            className="change-password-btn"
            onClick={handlePasswordChange}
          >
            Сменить пароль
          </button>
        </div>
      </div>

      <div className="professional-info-main">
        <div className="professional-info-section">
          <div className="info-column">
            <div className="info-item">
              <span className="info-label">Специальность:</span>
              <span className="info-value">{teacherData.specialty}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Общий стаж:</span>
              <span className="info-value">{teacherData.experience}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="disciplines-section">
        <div className="disciplines-header">
          <label className="disciplines-label">Дисциплины:</label>
        </div>
        <div className="disciplines-list">
          {teacherData.disciplines.map((discipline, index) => (
            <div 
              key={index} 
              className="discipline-item clickable"
              onClick={() => handleDisciplineClick(discipline)}
            >
              {discipline}
              <span className="discipline-arrow">→</span>
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
          Загрузка данных...
        </div>
      )}
      
      {error && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#e53e3e' }}>
          {error}
        </div>
      )}
    </div>
  );
};