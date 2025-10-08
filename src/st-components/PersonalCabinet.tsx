import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import './PersonalCabinetStyle.css';

interface GroupData {
  course: string;
  admission_year: string;
  formEducation: string;
  specialty: string;
  profile: string;
}

export const PersonalCabinet: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useUser();
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: 'Поле не заполнено',
    phone: 'Поле не заполнено',
    group: '',
    course: '-',
    admission_year: '-',
    form_education: '-',
    speciality: '-',
    profile: '-',
    birthDate: 'Поле не заполнено',
    address: 'Поле не заполнено'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Функция для получения данных группы
  const fetchGroupData = async (groupId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:8080/api/v1/groups/number/${groupId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Ошибка при получении данных группы: ${response.status}`);
      }

      const groupData: GroupData = await response.json();
      
      return groupData;
    } catch (err) {
      console.error('Ошибка при загрузке данных группы:', err);
      setError('Не удалось загрузить данные группы');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Заполняем данные из контекста пользователя и получаем данные группы
  useEffect(() => {
    const initializeUserData = async () => {
      if (user) {
        // Сначала устанавливаем базовые данные из контекста
        const baseData = {
          firstName: user.name || '',
          lastName: user.surname || '',
          middleName: user.lastName || '',
          group: user.numberGroup ? user.numberGroup.toString() : ''
        };

        setUserData(prev => ({ ...prev, ...baseData }));

        // Если есть номер группы, получаем данные группы
        if (user.numberGroup) {
          const groupData = await fetchGroupData(user.numberGroup);
          
          if (groupData) {
            setUserData(prev => ({
              ...prev,
              ...baseData,
              course: groupData.course || '-',
              admission_year: groupData.admission_year || '-',
              form_education: groupData.formEducation || '-',
              speciality: groupData.specialty || '-',
              profile: groupData.profile || '-'
            }));
          }
        }
      }
    };

    initializeUserData();
  }, [user]);

  const handleSave = () => {
    setIsEditing(false);
    // Здесь будет логика сохранения данных на сервер
    console.log('Сохраненные данные:', userData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Восстанавливаем оригинальные данные
    if (user) {
      const baseData = {
        firstName: user.name || '',
        lastName: user.surname || '',
        middleName: user.lastName || '',
        group: user.numberGroup ? user.numberGroup.toString() : ''
      };

      setUserData(prev => ({ ...prev, ...baseData }));
      
      // При отмене можно также перезапросить данные группы
      if (user.numberGroup) {
        fetchGroupData(user.numberGroup).then(groupData => {
          if (groupData) {
            setUserData(prev => ({
              ...prev,
              ...baseData,
              course: groupData.course || '-',
              admission_year: groupData.admission_year || '-',
              form_education: groupData.formEducation || '-',
              speciality: groupData.specialty || '-',
              profile: groupData.profile || '-'
            }));
          }
        });
      }
    }
  };

  const handleChange = (field: string, value: string) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Если данные пользователя еще не загружены
  if (!user) {
    return (
      <div className="personal-cabinet">
        <div className="pc-content">
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            Загрузка данных пользователя...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="personal-cabinet">
      <div className="pc-header">
        {!isEditing ? (
          <button 
            className="pc-edit-btn"
            onClick={() => setIsEditing(true)}
          >
            Редактировать
          </button>
        ) : (
          <div className="pc-action-buttons">
            <button 
              className="pc-save-btn"
              onClick={handleSave}
            >
              Сохранить
            </button>
            <button 
              className="pc-cancel-btn"
              onClick={handleCancel}
            >
              Отмена
            </button>
          </div>
        )}
      </div>

      <div className="pc-content">
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
            Загрузка данных ...
          </div>
        )}
        
        {error && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#e53e3e' }}>
            {error}
          </div>
        )}

        <div className="pc-info-grid">
          <div className="pc-info-group">
            <h3>Основная информация</h3>
            <div className="pc-info-item">
              <label>Фамилия</label>
              {isEditing ? (
                <input
                  type="text"
                  value={userData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  className="pc-input"
                  placeholder="Введите фамилию"
                />
              ) : (
                <span>{userData.lastName || 'Не указано'}</span>
              )}
            </div>
            <div className="pc-info-item">
              <label>Имя</label>
              {isEditing ? (
                <input
                  type="text"
                  value={userData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className="pc-input"
                  placeholder="Введите имя"
                />
              ) : (
                <span>{userData.firstName || 'Не указано'}</span>
              )}
            </div>
            <div className="pc-info-item">
              <label>Отчество</label>
              {isEditing ? (
                <input
                  type="text"
                  value={userData.middleName}
                  onChange={(e) => handleChange('middleName', e.target.value)}
                  className="pc-input"
                  placeholder="Введите отчество"
                />
              ) : (
                <span>{userData.middleName || 'Не указано'}</span>
              )}
            </div>
            <div className="pc-info-item">
              <label>Дата рождения</label>
              {isEditing ? (
                <input
                  type="date"
                  value={userData.birthDate}
                  onChange={(e) => handleChange('birthDate', e.target.value)}
                  className="pc-input"
                />
              ) : (
                <span>{userData.birthDate}</span>
              )}
            </div>
          </div>

          <div className="pc-info-group">
            <h3>Контактная информация</h3>
            <div className="pc-info-item">
              <label>Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={userData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="pc-input"
                  placeholder="example@email.com"
                />
              ) : (
                <span>{userData.email}</span>
              )}
            </div>
            <div className="pc-info-item">
              <label>Телефон</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={userData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="pc-input"
                  placeholder="+7 (XXX) XXX-XX-XX"
                />
              ) : (
                <span>{userData.phone}</span>
              )}
            </div>
            <div className="pc-info-item">
              <label>Адрес</label>
              {isEditing ? (
                <input
                  type="text"
                  value={userData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="pc-input"
                  placeholder="Введите адрес проживания"
                />
              ) : (
                <span>{userData.address}</span>
              )}
            </div>
          </div>

          <div className="pc-info-group">
            <h3>Учебная информация</h3>
            <div className="pc-info-item">
              <label>Группа</label>
              <span>{userData.group || 'Не указана'}</span>
            </div>
            <div className="pc-info-item">
              <label>Курс</label>
              <span>{userData.course}</span>
            </div>
            <div className="pc-info-item">
              <label>Специальность</label>
              <span>{userData.speciality}</span>
            </div>
            <div className="pc-info-item">
              <label>Профиль</label>
              <span>{userData.profile}</span>
            </div>
            <div className="pc-info-item">
              <label>Год поступления</label>
              <span>{userData.admission_year}</span>
            </div>
            <div className="pc-info-item">
              <label>Форма обучения</label>
              <span>{userData.form_education}</span>
            </div>
          </div>
        </div>

        <div className="pc-additional-actions">
          <button className="pc-action-btn">Сменить пароль</button>
          <button className="pc-action-btn">Экспорт данных</button>
        </div>
      </div>
    </div>
  );
};