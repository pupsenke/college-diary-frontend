import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { headApiService } from '../services/headApiService';
import './PersonalCabinetSectionStyle.css';

interface StaffProfileData {
  id: number;
  email?: string;
}

interface QuickAction {
  id: number;
  title: string;
  icon: string;
  link: string;
  description: string;
}

export const PersonalCabinetSection: React.FC = () => {
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [staffProfile, setStaffProfile] = useState<StaffProfileData | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [email, setEmail] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Быстрые действия для заведующего отделением
  const quickActions: QuickAction[] = [
    {
      id: 1,
      title: 'Документы',
      icon: '!',
      link: '/departmentHead/documents',
      description: 'Управление документами отделения'
    },
    {
      id: 2,
      title: 'Группы',
      icon: '!',
      link: '/departmentHead/groups',
      description: 'Просмотр и управление группами'
    },
    {
      id: 3,
      title: 'Сотрудники',
      icon: '!',
      link: '/departmentHead/staff',
      description: 'Управление сотрудниками отделения'
    },
    {
      id: 4,
      title: 'Расписание',
      icon: '!',
      link: '/departmentHead/schedule',
      description: 'Редактирование расписания'
    },
    {
      id: 5,
      title: 'Отчеты',
      icon: '!',
      link: '/departmentHead/reports',
      description: 'Просмотр отчетов по отделению'
    }
  ];

  // Загрузка данных профиля из API
  useEffect(() => {
    const loadStaffProfile = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const profile: StaffProfileData = {
          id: user.id,
          email: user.email || 'нет в апи'
        };

        setStaffProfile(profile);
        setEmail(profile.email || '');
      } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStaffProfile();
  }, [user]);

  // Проверяем, авторизован ли пользователь
  if (!user) {
    return (
      <div className="dh-pc-section dh-pc-personal-section">
        <div className="dh-pc-section-header">
          <h1 className="dh-pc-section-title">Личный кабинет</h1>
        </div>
        <div className="dh-pc-personal-content">
          <div className="dh-pc-not-authorized">
            <h3>Пользователь не авторизован</h3>
            <p>Пожалуйста, войдите в систему</p>
          </div>
        </div>
      </div>
    );
  }

  // Формируем профиль пользователя
  const userProfile = {
    lastName: user.lastName || '',
    firstName: user.name || '',
    patronymic: user.patronymic || '',
    email: staffProfile?.email || user.email || ''
  };

  // Определяем должность
  const getPosition = () => {
    if (!user || user.userType !== 'departmentHead') return 'Заведующий отделением';
    
    if (user.userType === 'departmentHead' && user.staffPosition) {
      const positions = user.staffPosition;
      
      const deptHeadPosition = positions.find((pos: any) => 
        pos.name && pos.name.toLowerCase().includes('зав. отделением')
      );
      
      if (deptHeadPosition) return deptHeadPosition.name;
      
      if (positions.length > 0 && positions[0].name) return positions[0].name;
    }
    
    return 'Заведующий отделением';
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (formErrors.email) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Введите корректный email';
    }
    return errors;
  };

  const handleSaveProfile = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsLoading(true);
      
      const updateData = {
        id: user.id,
        email: email.trim() || undefined
      };

      await headApiService.updateStaff(updateData);
      
      setStaffProfile(prev => prev ? {
        ...prev,
        email: email
      } : null);

      setIsEditing(false);
      alert('Данные успешно обновлены!');
    } catch (error) {
      console.error('Ошибка при обновлении профиля:', error);
      alert('Ошибка при обновлении данных. Пожалуйста, попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Новый пароль и подтверждение не совпадают');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert('Новый пароль должен содержать минимум 6 символов');
      return;
    }

    try {
      setIsLoading(true);
      
      const changePasswordData = {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
        userId: user.id
      };

      await headApiService.changePassword(changePasswordData);
      
      alert('Пароль успешно изменен!');
      setIsPasswordModalOpen(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Ошибка при смене пароля:', error);
      alert(error.message || 'Ошибка при смене пароля. Проверьте текущий пароль.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEmail(staffProfile?.email || '');
    setFormErrors({});
    setIsEditing(false);
  };

  // Обработчик клика по быстрому действию
  const handleQuickActionClick = (action: QuickAction) => {
    // В реальном приложении здесь будет навигация
    console.log(`Переход к: ${action.title}`);
    alert(`Переход к разделу: ${action.title}`);
  };

  if (isLoading && !staffProfile) {
    return (
      <div className="dh-pc-section dh-pc-personal-section">
        <div className="dh-pc-section-header">
          <h1 className="dh-pc-section-title">Личный кабинет</h1>
        </div>
        <div className="dh-pc-loading">
          <p>Загрузка данных профиля...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dh-pc-section dh-pc-personal-section">
      <div className="dh-pc-section-header">
        <h1 className="dh-pc-section-title">Личный кабинет</h1>
      </div>

      <div className="dh-pc-main-content">
        {/* Основной контент слева */}
        <div className="dh-pc-content-left">
          <div className="dh-pc-personal-content">
           

            <div className="dh-pc-profile-details">
              <div className="dh-pc-detail-group">
                <h3 className="dh-pc-detail-group-title">Личная информация</h3>
                
                {/* Не редактируемые поля - ФИО */}
                <div className="dh-pc-detail-field">
                  <label>Фамилия</label>
                  <p className={isEditing ? 'dh-pc-field-non-editable' : ''}>
                    {userProfile.lastName}
                  </p>
                </div>

                <div className="dh-pc-detail-field">
                  <label>Имя</label>
                  <p className={isEditing ? 'dh-pc-field-non-editable' : ''}>
                    {userProfile.firstName}
                  </p>
                </div>

                <div className="dh-pc-detail-field">
                  <label>Отчество</label>
                  <p className={isEditing ? 'dh-pc-field-non-editable' : ''}>
                    {userProfile.patronymic}
                  </p>
                </div>

                {/* Редактируемое поле - Email */}
                <div className="dh-pc-detail-field">
                  <label>Email</label>
                  {isEditing ? (
                    <>
                      <input 
                        type="email" 
                        value={email} 
                        onChange={handleEmailChange}
                        placeholder="Введите email"
                        className={`dh-pc-field-editable ${formErrors.email ? 'pc-error' : ''}`}
                        disabled={isLoading}
                      />
                      {formErrors.email && (
                        <span className="dh-pc-error-text">{formErrors.email}</span>
                      )}
                    </>
                  ) : (
                    <p>{userProfile.email}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="dh-pc-profile-footer">
              <div className="dh-pc-header-actions">
                {isEditing ? (
                  <>
                    <button 
                      className="dh-pc-save-btn"
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                    <button 
                      className="dh-pc-cancel-btn"
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                    >
                      Отмена
                    </button>
                  </>
                ) : (
                  <>
                    
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Панель быстрых действий справа */}
        <div className="dh-pc-content-right">
          <div className="dh-pc-quick-actions-panel">
            <button 
                      className="dh-pc-edit-btn"
                      onClick={() => setIsEditing(true)}
                      disabled={isLoading}
                    >
                      Редактировать профиль
                    </button>
                    <button 
                      className="dh-pc-password-btn"
                      onClick={() => setIsPasswordModalOpen(true)}
                      disabled={isLoading}
                    >
                      Сменить пароль
                    </button>

            <div className="dh-pc-stats-card">
              <h4 className="dh-pc-stats-title">Статистика отделения</h4>
              <div className="dh-pc-stats-grid">
                <div className="dh-pc-stat-item">
                  <div className="dh-pc-stat-value">?</div>
                  <div className="dh-pc-stat-label">Групп</div>
                </div>
                <div className="dh-pc-stat-item">
                  <div className="dh-pc-stat-value">?</div>
                  <div className="dh-pc-stat-label">Сотрудников</div>
                </div>
                <div className="dh-pc-stat-item">
                  <div className="dh-pc-stat-value">?</div>
                  <div className="dh-pc-stat-label">Студентов</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно смены пароля */}
      {isPasswordModalOpen && (
        <div className="dh-pc-modal-overlay" onClick={() => !isLoading && setIsPasswordModalOpen(false)}>
          <div className="dh-pc-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="dh-pc-modal-header">
              <h3 className="dh-pc-modal-title">Смена пароля</h3>
              <button 
                className="dh-pc-modal-close"
                onClick={() => !isLoading && setIsPasswordModalOpen(false)}
                disabled={isLoading}
              >
                ×
              </button>
            </div>
            
            <form className="dh-pc-password-form" onSubmit={handlePasswordSubmit}>
              <div className="dh-pc-form-field">
                <label htmlFor="currentPassword">Текущий пароль</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Введите текущий пароль"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="dh-pc-form-field">
                <label htmlFor="newPassword">Новый пароль</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Введите новый пароль (мин. 6 символов)"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>
              
              <div className="dh-pc-form-field">
                <label htmlFor="confirmPassword">Подтвердите новый пароль</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Повторите новый пароль"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="dh-pc-modal-actions">
                <button 
                  type="button"
                  className="dh-pc-btn-secondary"
                  onClick={() => !isLoading && setIsPasswordModalOpen(false)}
                  disabled={isLoading}
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  className="dh-pc-btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Смена пароля...' : 'Сменить пароль'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};