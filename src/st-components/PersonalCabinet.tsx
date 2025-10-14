import React, { useState, useEffect } from 'react';
import { useUser, Student } from '../context/UserContext';
import { apiService } from '../services/apiService';
import './PersonalCabinetStyle.css';

interface UserFormData {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  phone: string;
  birthDate: string;
  address: string;
}

interface StudentUpdateData {
  name: string;
  lastName: string;
  patronymic: string;
  email?: string;
  telephone?: string;
  birthDate?: string;
  address?: string;
}

export const PersonalCabinet: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { user, isStudent } = useUser();
  const [userData, setUserData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    birthDate: '',
    address: ''
  });
  const [groupData, setGroupData] = useState({
    group: '',
    course: '-',
    admissionYear: '-',
    formEducation: '-',
    specialty: '-',
    profile: '-'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Заполняем данные из контекста пользователя
  useEffect(() => {
    if (user) {
      const studentData = {
        firstName: user.name || '',
        lastName: user.lastName || '',
        middleName: user.patronymic || '',
        email: user.email || '',
        phone: user.telephone || '',
        birthDate: user.birthDate || '',
        address: user.address || ''
      };

      setUserData(studentData);

      // Если это студент, получаем данные группы
      if (isStudent && 'numberGroup' in user && user.numberGroup) {
        fetchGroupData(user.numberGroup);
      }
    }
  }, [user, isStudent]);

  const fetchGroupData = async (groupId: number) => {
    try {
      setLoading(true);
      const groupData = await apiService.getGroupData(groupId);
      
      setGroupData({
        group: groupData.numberGroup.toString(),
        course: groupData.course.toString(),
        admissionYear: groupData.admissionYear.toString(),
        formEducation: groupData.formEducation,
        specialty: groupData.specialty,
        profile: groupData.profile
      });
    } catch (err) {
      console.error('Ошибка при загрузке данных группы:', err);
      setError('Не удалось загрузить данные группы');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !isStudent) return;

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Подготавливаем данные для отправки
      const updateData: StudentUpdateData = {
        name: userData.firstName,
        lastName: userData.lastName,
        patronymic: userData.middleName,
        email: userData.email || undefined,
        telephone: userData.phone || undefined,
        birthDate: userData.birthDate || undefined,
        address: userData.address || undefined
      };

      // Отправляем запрос на обновление данных
      await apiService.updateStudentData(user.id, updateData);
      
      setSuccessMessage('Данные успешно сохранены');
      setIsEditing(false);
      
      // Обновляем данные в localStorage
      const updatedUser = {
        ...user,
        ...updateData
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
    } catch (err) {
      console.error('Ошибка при сохранении данных:', err);
      setError('Не удалось сохранить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      const originalData = {
        firstName: user.name || '',
        lastName: user.lastName || '',
        middleName: user.patronymic || '',
        email: user.email || '',
        phone: user.telephone || '',
        birthDate: user.birthDate || '',
        address: user.address || ''
      };
      setUserData(originalData);
    }
    setIsEditing(false);
    setError(null);
    setSuccessMessage(null);
  };

  const handleChange = (field: keyof UserFormData, value: string) => {
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
            disabled={!isStudent} // Только студенты могут редактировать
          >
            Редактировать
          </button>
        ) : (
          <div className="pc-action-buttons">
            <button 
              className="pc-save-btn"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button 
              className="pc-cancel-btn"
              onClick={handleCancel}
              disabled={loading}
            >
              Отмена
            </button>
          </div>
        )}
      </div>

      <div className="pc-content">
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
            Загрузка данных...
          </div>
        )}
        
        {error && (
          <div className="pc-error-message">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="pc-success-message">
            {successMessage}
          </div>
        )}

        <div className="pc-info-grid">
          <div className="pc-info-group">
            <h3>Основная информация</h3>
            <div className="pc-info-item">
              <label>Фамилия</label>
              {isEditing && isStudent ? (
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
              {isEditing && isStudent ? (
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
              {isEditing && isStudent ? (
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
              {isEditing && isStudent ? (
                <input
                  type="date"
                  value={userData.birthDate}
                  onChange={(e) => handleChange('birthDate', e.target.value)}
                  className="pc-input"
                />
              ) : (
                <span>{userData.birthDate || 'Не указано'}</span>
              )}
            </div>
          </div>

          <div className="pc-info-group">
            <h3>Контактная информация</h3>
            <div className="pc-info-item">
              <label>Email</label>
              {isEditing && isStudent ? (
                <input
                  type="email"
                  value={userData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="pc-input"
                  placeholder="example@email.com"
                />
              ) : (
                <span>{userData.email || 'Не указано'}</span>
              )}
            </div>
            <div className="pc-info-item">
              <label>Телефон</label>
              {isEditing && isStudent ? (
                <input
                  type="tel"
                  value={userData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="pc-input"
                  placeholder="+7 (XXX) XXX-XX-XX"
                />
              ) : (
                <span>{userData.phone || 'Не указано'}</span>
              )}
            </div>
            <div className="pc-info-item">
              <label>Адрес</label>
              {isEditing && isStudent ? (
                <input
                  type="text"
                  value={userData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="pc-input"
                  placeholder="Введите адрес проживания"
                />
              ) : (
                <span>{userData.address || 'Не указано'}</span>
              )}
            </div>
          </div>

          {isStudent && (
            <div className="pc-info-group">
              <h3>Учебная информация</h3>
              <div className="pc-info-item">
                <label>Группа</label>
                <span>{groupData.group || 'Не указана'}</span>
              </div>
              <div className="pc-info-item">
                <label>Курс</label>
                <span>{groupData.course}</span>
              </div>
              <div className="pc-info-item">
                <label>Специальность</label>
                <span>{groupData.specialty}</span>
              </div>
              <div className="pc-info-item">
                <label>Профиль</label>
                <span>{groupData.profile}</span>
              </div>
              <div className="pc-info-item">
                <label>Год поступления</label>
                <span>{groupData.admissionYear}</span>
              </div>
              <div className="pc-info-item">
                <label>Форма обучения</label>
                <span>{groupData.formEducation}</span>
              </div>
            </div>
          )}
        </div>

        {isStudent && (
          <div className="pc-additional-actions">
            <button className="pc-action-btn">Сменить пароль</button>
            <button className="pc-action-btn">Экспорт данных</button>
          </div>
        )}
      </div>
    </div>
  );
};