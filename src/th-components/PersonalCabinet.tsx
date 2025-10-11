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

export const PersonalCabinet: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useUser();
  const [teacherData, setTeacherData] = useState<TeacherData>({
    firstName: '',
    lastName: '',
    middleName: '',
    email: 's123456@std.nosu.ru',
    specialty: 'Математика и информатика',
    experience: '27 лет',
    disciplines: [
      'Дипломное проектирование 09.02.07',
      'МДК 02.01 Технология разработки программного обеспечения',
      'Операционные системы и среды',
      'Основы разработки программного обеспечения',
      'ПРАКТИКА ПРОИЗВОДСТВЕННАЯ 09.02.07',
      'ИНФОРМАЦИОННЫЕ СИСТЕМЫ И ПРОГРАММИРОВАНИЕ'
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

  const handleSave = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        throw new Error('ID пользователя не найден');
      }

      // Здесь будет логика сохранения данных на сервер
      const response = await fetch(`http://localhost:8080/api/v1/teachers/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: teacherData.firstName,
          lastName: teacherData.lastName,
          middleName: teacherData.middleName,
          email: teacherData.email
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка при сохранении данных');
      }

      setIsEditing(false);
      console.log('Данные успешно сохранены:', teacherData);
    } catch (err) {
      console.error('Ошибка при сохранении:', err);
      setError('Не удалось сохранить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Восстанавливаем оригинальные данные
    if (user) {
      const baseData = {
        firstName: user.name || '',
        lastName: user.lastName || '',
        middleName: user.surname || '',
        email: user.email || 's123456@std.nosu.ru'
      };

      setTeacherData(prev => ({ ...prev, ...baseData }));
    }
  };

  const handleChange = (field: keyof TeacherData, value: string) => {
    setTeacherData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = () => {
    // Логика смены пароля
    console.log('Смена пароля');
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
              {isEditing ? (
                <input
                  type="text"
                  value={teacherData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  className="pc-input"
                  placeholder="Введите фамилию"
                />
              ) : (
                <span className="info-value">{teacherData.lastName || 'Не указано'}</span>
              )}
            </div>
            <div className="info-item">
              <span className="info-label">Имя:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={teacherData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className="pc-input"
                  placeholder="Введите имя"
                />
              ) : (
                <span className="info-value">{teacherData.firstName || 'Не указано'}</span>
              )}
            </div>
            <div className="info-item">
              <span className="info-label">Отчество:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={teacherData.middleName}
                  onChange={(e) => handleChange('middleName', e.target.value)}
                  className="pc-input"
                  placeholder="Введите отчество"
                />
              ) : (
                <span className="info-value">{teacherData.middleName || 'Не указано'}</span>
              )}
            </div>
            <div className="info-item">
              <span className="info-label">Эл. почта:</span>
              {isEditing ? (
                <input
                  type="email"
                  value={teacherData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="pc-input"
                  placeholder="example@email.com"
                />
              ) : (
                <span className="info-value">{teacherData.email}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="change-password-section">
          {!isEditing ? (
            <button 
              className="change-password-btn"
              onClick={() => setIsEditing(true)}
            >
              Редактировать
            </button>
          ) : (
            <div className="action-buttons">
              <button 
                className="save-btn"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button 
                className="cancel-btn"
                onClick={handleCancel}
                disabled={loading}
              >
                Отмена
              </button>
            </div>
          )}
          <button 
            className="change-password-btn secondary"
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
        <label className="disciplines-label">Дисциплины:</label>
        <div className="disciplines-list">
          {teacherData.disciplines.map((discipline, index) => (
            <div key={index} className="discipline-item">
              {discipline}
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