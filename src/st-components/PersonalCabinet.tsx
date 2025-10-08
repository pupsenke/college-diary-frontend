import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import './PersonalCabinetStyle.css';

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
    birthDate: 'Поле не заполнено',
    address: 'Поле не заполнено'
  });

  // Заполняем данные из контекста пользователя
  useEffect(() => {
    if (user) {
      setUserData(prev => ({
        ...prev,
        firstName: user.name || '',
        lastName: user.surname || '',
        middleName: user.lastName || '',
        group: user.numberGroup ? user.numberGroup.toString() : ''
      }));
    }
  }, [user]);

  const handleSave = () => {
    setIsEditing(false);
    // Здесь будет логика сохранения данных на сервер
    console.log('Сохраненные данные:', userData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Восстанавливаем оригинальные данные из контекста
    if (user) {
      setUserData(prev => ({
        ...prev,
        firstName: user.name || '',
        lastName: user.surname || '',
        middleName: user.lastName || '',
        group: user.numberGroup ? user.numberGroup.toString() : ''
      }));
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
              <label>Год поступления</label>
              <span>{userData.speciality}</span>
            </div>
            <div className="pc-info-item">
              <label>Форма обучения</label>
              <span>{userData.speciality}</span>
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