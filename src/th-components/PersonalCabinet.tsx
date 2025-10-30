import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import './PersonalCabinet.css';

// Интерфейс для данных из API
interface StaffApiResponse {
  id: number;
  patronymic: string;
  name: string;
  lastName: string;
  login: string;
  password: string;
  email: string | null;
  staffPosition: Array<{
    id: number;
    name: string;
  }>;
}

interface TeacherData {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  position: string;
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
    email: '',
    position: '',
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

  // Функция для получения данных преподавателя из API
  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Запрашиваем всех сотрудников
      const response = await fetch('http://localhost:8080/api/v1/staffs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Ошибка при получении данных: ${response.status}`);
      }

      const staffData: StaffApiResponse[] = await response.json();
      
      // Находим текущего пользователя в списке сотрудников
      const currentTeacher = staffData.find(staff => 
        staff.name === user?.name && 
        staff.lastName === user?.lastName &&
        staff.patronymic === user?.patronymic
      );

      if (currentTeacher) {
        // Преобразуем данные из API в наш формат
        const transformedData: TeacherData = {
          firstName: currentTeacher.name,
          lastName: currentTeacher.lastName,
          middleName: currentTeacher.patronymic,
          email: currentTeacher.email || `${currentTeacher.login}@nosu.ru`,
          position: currentTeacher.staffPosition[0]?.name || 'Преподаватель',
          disciplines: [
            'Разработка программных модулей',
            'Дипломное проектирование',
            'Операционные системы и среды',
            'Основы разработки программного обеспечения',
            'Технология разработки и защиты баз данных',
            'Системное программирование',
            'Компьютерные сети'
          ]
        };

        setTeacherData(transformedData);
      } else {
        // Если преподаватель не найден в API, используем данные из контекста
        const fallbackData: TeacherData = {
          firstName: user?.name || '',
          lastName: user?.lastName || '',
          middleName: user?.patronymic || '',
          email: user?.email || `${user?.login}@nosu.ru` || 's123456@std.nosu.ru',
          position: 'Преподаватель',
          disciplines: [
            'Разработка программных модулей',
            'Дипломное проектирование',
            'Операционные системы и среды',
            'Основы разработки программного обеспечения',
            'Технология разработки и защиты баз данных',
            'Системное программирование',
            'Компьютерные сети'
          ]
        };
        setTeacherData(fallbackData);
      }

    } catch (err) {
      console.error('Ошибка при загрузке данных преподавателя:', err);
      setError('Не удалось загрузить данные преподавателя');
      
      // В случае ошибки используем данные из контекста
      const fallbackData: TeacherData = {
        firstName: user?.name || '',
        lastName: user?.lastName || '',
        middleName: user?.patronymic || '',
        email: user?.email || `${user?.login}@nosu.ru` || 's123456@std.nosu.ru',
        position: 'Преподаватель',
        disciplines: [
          'Разработка программных модулей',
          'Дипломное проектирование',
          'Операционные системы и среды',
          'Основы разработки программного обеспечения',
          'Технология разработки и защиты баз данных',
          'Системное программирование',
          'Компьютерные сети'
        ]
      };
      setTeacherData(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    if (user) {
      fetchTeacherData();
    }
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
            <div className="info-item">
              <span className="info-label">Должность:</span>
              <span className="info-value">{teacherData.position}</span>
            </div>
          </div>
        </div>
        
        <div className="change-password-section">
          <button 
            className="change-password-btn"
            onClick={handlePasswordChange}
            disabled={loading}
          >
            {loading ? 'Загрузка...' : 'Сменить пароль'}
          </button>
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
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#e53e3e',
          backgroundColor: '#fed7d7',
          margin: '20px',
          borderRadius: '8px'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};