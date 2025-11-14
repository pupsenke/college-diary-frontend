import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser, Student } from '../context/UserContext';
import { apiService } from '../services/studentApiService';
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
  name?: string;
  lastName?: string;
  patronymic?: string;
  email?: string;
  telephone?: string;
  birthDate?: string;
  address?: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface GroupData {
  group: string;
  course: string;
  admissionYear: string;
  formEducation: string;
  specialty: string;
  profile: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const PersonalCabinetComponent: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { user, isStudent, setUser } = useUser();
  const [userData, setUserData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    birthDate: '',
    address: ''
  });
  const [originalData, setOriginalData] = useState<UserFormData | null>(null);
  const [groupData, setGroupData] = useState<GroupData>({
    group: '',
    course: '-',
    admissionYear: '-',
    formEducation: '-',
    specialty: '-',
    profile: '-'
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const student = user as Student;

  // Функция загрузки данных группы с приоритетом API
  const fetchGroupData = async (forceRefresh = false) => {
    if (!student?.idGroup) return;

    try {
      if (forceRefresh) {
        setRefreshing(true);
      }
      setError(null);
      setIsUsingCache(false);

      const groupData = await apiService.getGroupData(student.idGroup);
      
      updateGroupState(groupData);
      
    } catch (error) {
      console.error('Ошибка при загрузке данных группы с API:', error);
      
      try {
        const cacheKey = `group_${student.idGroup}`;
        const cached = localStorage.getItem(`cache_${cacheKey}`);
        
        if (cached) {
          const cachedData = JSON.parse(cached);
          // Проверяем актуальность кэша (30 минут)
          if (Date.now() - cachedData.timestamp < 30 * 60 * 1000) {
            updateGroupState(cachedData.data);
            setIsUsingCache(true);
            setError('Используются кэшированные данные. Нет соединения с сервером.');
          } else {
            throw new Error('Кэш группы устарел');
          }
        } else {
          throw new Error('Нет данных группы в кэше');
        }
      } catch (cacheError) {
        console.error('Ошибка при загрузке группы из кэша:', cacheError);
        setError('Не удалось загрузить данные группы. Проверьте подключение к интернету.');
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Функция для обновления состояния группы
  const updateGroupState = useCallback((groupData: any) => {
    if (!groupData) return;
    
    setGroupData({
      group: groupData.numberGroup?.toString() || '',
      course: groupData.course?.toString() || '-',
      admissionYear: groupData.admissionYear?.toString() || '-',
      formEducation: groupData.formEducation || '-',
      specialty: groupData.specialty || '-',
      profile: groupData.profile || '-'
    });
  }, []);

  // Функция принудительного обновления данных
  const handleRefresh = async () => {
    if (student?.idGroup) {
      const cacheKey = `group_${student.idGroup}`;
      localStorage.removeItem(`cache_${cacheKey}`);
    }
    await fetchGroupData(true);
  };

  // Инициализация данных пользователя
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
      setOriginalData(studentData);
    }
  }, [user]);

  // Загрузка данных группы при монтировании
  useEffect(() => {
    if (isStudent && student?.idGroup) {
      fetchGroupData();
    }
  }, [isStudent, student?.idGroup]);

  const handlePasswordChange = async () => {
    if (!user) return;

    try {
      setPasswordLoading(true);
      setError(null);

      // Валидация
      if (!passwordData.currentPassword) {
        setError('Введите текущий пароль');
        return;
      }

      if (!passwordData.newPassword) {
        setError('Введите новый пароль');
        return;
      }

      if (passwordData.newPassword.length < 4) { // Изменено с 6 на 4 символа
        setError('Пароль должен содержать минимум 4 символа');
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('Новые пароли не совпадают');
        return;
      }

      // Вызов метода смены пароля из apiService
      await apiService.updateStudentPassword(
        user.id,
        user.login,
        passwordData.newPassword
      );

      setSuccessMessage('Пароль успешно изменен');
      setShowPasswordModal(false);
      resetPasswordForm();
      
    } catch (err) {
      console.error('Ошибка смены пароля:', err);
      setError('Не удалось изменить пароль. Проверьте текущий пароль и попробуйте еще раз.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const resetPasswordForm = useCallback(() => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  }, []);

  const handlePasswordModalOpen = useCallback(() => {
    setShowPasswordModal(true);
    resetPasswordForm();
    setError(null);
    setSuccessMessage(null);
  }, [resetPasswordForm]);

  const exportToPDF = useCallback(() => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Личные данные - ${userData.lastName} ${userData.firstName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin-bottom: 25px; }
          .section h2 { color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 5px; }
          .info-row { margin: 8px 0; display: flex; }
          .info-label { font-weight: bold; min-width: 200px; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Личные данные</h1>
          <p>Дата экспорта: ${new Date().toLocaleDateString('ru-RU')}</p>
        </div>
        
        <div class="section">
          <h2>Основная информация</h2>
          <div class="info-row"><span class="info-label">ФИО:</span> ${userData.lastName} ${userData.firstName} ${userData.middleName}</div>
          <div class="info-row"><span class="info-label">Дата рождения:</span> ${userData.birthDate ? new Date(userData.birthDate).toLocaleDateString('ru-RU') : 'Не указано'}</div>
          <div class="info-row"><span class="info-label">Email:</span> ${userData.email || 'Не указано'}</div>
          <div class="info-row"><span class="info-label">Телефон:</span> ${userData.phone || 'Не указано'}</div>
          <div class="info-row"><span class="info-label">Адрес:</span> ${userData.address || 'Не указано'}</div>
        </div>
        
        ${isStudent ? `
        <div class="section">
          <h2>Учебная информация</h2>
          <div class="info-row"><span class="info-label">Группа:</span> ${groupData.group}</div>
          <div class="info-row"><span class="info-label">Курс:</span> ${groupData.course}</div>
          <div class="info-row"><span class="info-label">Специальность:</span> ${groupData.specialty}</div>
          <div class="info-row"><span class="info-label">Профиль:</span> ${groupData.profile}</div>
          <div class="info-row"><span class="info-label">Форма обучения:</span> ${groupData.formEducation}</div>
          <div class="info-row"><span class="info-label">Год поступления:</span> ${groupData.admissionYear}</div>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Документ сгенерирован автоматически в системе Цифровой дневник</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  }, [userData, groupData, isStudent]);

  const handleSave = async () => {
    if (!user || !isStudent || !originalData) return;

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const hasChanges = 
        userData.firstName !== originalData.firstName ||
        userData.lastName !== originalData.lastName ||
        userData.middleName !== originalData.middleName ||
        userData.email !== originalData.email ||
        userData.phone !== originalData.phone ||
        userData.birthDate !== originalData.birthDate ||
        userData.address !== originalData.address;

      if (!hasChanges) {
        setSuccessMessage('Нет изменений для сохранения');
        setIsEditing(false);
        return;
      }

      const updateData: StudentUpdateData = {};

      if (userData.firstName !== originalData.firstName) {
        updateData.name = userData.firstName;
      }
      if (userData.lastName !== originalData.lastName) {
        updateData.lastName = userData.lastName;
      }
      if (userData.middleName !== originalData.middleName) {
        updateData.patronymic = userData.middleName;
      }
      if (userData.email !== originalData.email) {
        updateData.email = userData.email || undefined;
      }
      if (userData.phone !== originalData.phone) {
        updateData.telephone = userData.phone || undefined;
      }
      if (userData.birthDate !== originalData.birthDate) {
        updateData.birthDate = userData.birthDate || undefined;
      }
      if (userData.address !== originalData.address) {
        updateData.address = userData.address || undefined;
      }

      await apiService.updateStudentData(user.id, updateData);
      
      setSuccessMessage('Данные успешно сохранены');
      
      const updatedUser = {
        ...user,
        name: userData.firstName,
        lastName: userData.lastName,
        patronymic: userData.middleName,
        email: userData.email,
        telephone: userData.phone,
        birthDate: userData.birthDate,
        address: userData.address
      };
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setOriginalData(userData);
      setIsEditing(false);
      
    } catch (err) {
      console.error('Ошибка при сохранении данных:', err);
      setError('Не удалось сохранить данные. Проверьте введенные данные.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = useCallback(() => {
    if (originalData) {
      setUserData(originalData);
    }
    setIsEditing(false);
    setError(null);
    setSuccessMessage(null);
  }, [originalData]);

  const handleChange = useCallback((field: keyof UserFormData, value: string) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleEditStart = useCallback(() => {
    setOriginalData(userData);
    setIsEditing(true);
    setError(null);
    setSuccessMessage(null);
  }, [userData]);

  const handlePasswordDataChange = useCallback((field: keyof PasswordChangeData, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Компонент кнопки обновления
  const RefreshButton = () => (
    <button 
      className={`pc-refresh-btn ${refreshing ? 'pc-refreshing' : ''}`}
      onClick={handleRefresh}
      disabled={refreshing}
    >
      <img 
        src="/st-icons/upload_icon.svg" 
        className={`pc-refresh-icon ${refreshing ? 'pc-refresh-spin' : ''}`}
      />
    </button>
  );

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
        <div className="pc-header-left">
          {!isEditing ? (
            <button 
              className="pc-edit-btn"
              onClick={handleEditStart}
              disabled={!isStudent}
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
                {loading ? (
                  <>
                    <span className="pc-loading-spinner"></span>
                    Сохранение...
                  </>
                ) : (
                  'Сохранить'
                )}
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
        
        <div className="pc-header-right">
          <RefreshButton />
        </div>
      </div>

      <div className="pc-content">

        {successMessage && (
          <div className="pc-success-message">
            {successMessage}
          </div>
        )}

        <div className="pc-info-grid">
          <div className="pc-info-group">
            <h3>Основная информация</h3>
            <div className="pc-info-item">
              <label>Фамилия *</label>
              {isEditing && isStudent ? (
                <input
                  type="text"
                  value={userData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  className="pc-input"
                  placeholder="Введите фамилию"
                  required
                />
              ) : (
                <span>{userData.lastName || 'Не указано'}</span>
              )}
            </div>
            <div className="pc-info-item">
              <label>Имя *</label>
              {isEditing && isStudent ? (
                <input
                  type="text"
                  value={userData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className="pc-input"
                  placeholder="Введите имя"
                  required
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
                <span>{userData.birthDate ? new Date(userData.birthDate).toLocaleDateString('ru-RU') : 'Не указано'}</span>
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
                  placeholder="+7 (999) 999-99-99"
                />
              ) : (
                <span>{userData.phone || 'Не указано'}</span>
              )}
            </div>
            <div className="pc-info-item">
              <label>Адрес</label>
              {isEditing && isStudent ? (
                <textarea
                  value={userData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="pc-textarea"
                  placeholder="Введите адрес проживания"
                  rows={3}
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
                <span className="pc-readonly">{groupData.group || 'Не указана'}</span>
              </div>
              <div className="pc-info-item">
                <label>Курс</label>
                <span className="pc-readonly">{groupData.course}</span>
              </div>
              <div className="pc-info-item">
                <label>Специальность</label>
                <span className="pc-readonly">{groupData.specialty}</span>
              </div>
              <div className="pc-info-item">
                <label>Профиль</label>
                <span className="pc-readonly">{groupData.profile}</span>
              </div>
              <div className="pc-info-item">
                <label>Год поступления</label>
                <span className="pc-readonly">{groupData.admissionYear}</span>
              </div>
              <div className="pc-info-item">
                <label>Форма обучения</label>
                <span className="pc-readonly">{groupData.formEducation}</span>
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="pc-edit-notice">
            <p>Поля, отмеченные *, обязательны для заполнения</p>
          </div>
        )}

        {isStudent && !isEditing && (
          <div className="pc-additional-actions">
            <button className="pc-action-btn" onClick={handlePasswordModalOpen}>
              Сменить пароль
            </button>
            <button className="pc-action-btn" onClick={exportToPDF}>
              Экспорт данных в PDF
            </button>
          </div>
        )}
      </div>

      {/* Модальное окно смены пароля */}
      {showPasswordModal && (
        <div className="pc-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="pc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pc-modal-header">
              <h3>Смена пароля</h3>
              <button 
                className="pc-modal-close"
                onClick={() => setShowPasswordModal(false)}
              >
                ×
              </button>
            </div>

            <div className="pc-modal-content">
              <div className="pc-form-group">
                <label>Текущий пароль *</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => handlePasswordDataChange('currentPassword', e.target.value)}
                  className="pc-input"
                  placeholder="Введите текущий пароль"
                />
              </div>
              <div className="pc-form-group">
                <label>Новый пароль *</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordDataChange('newPassword', e.target.value)}
                  className="pc-input"
                  placeholder="Введите новый пароль (минимум 6 символов)"
                />
              </div>
              <div className="pc-form-group">
                <label>Подтвердите новый пароль *</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => handlePasswordDataChange('confirmPassword', e.target.value)}
                  className="pc-input"
                  placeholder="Повторите новый пароль"
                />
              </div>
              <div className="pc-modal-actions">
                <button
                  className="pc-confirm-btn"
                  onClick={handlePasswordChange}
                  disabled={passwordLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                >
                  {passwordLoading ? 'Смена пароля...' : 'Сменить пароль'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const PersonalCabinet = PersonalCabinetComponent;