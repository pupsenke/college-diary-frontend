import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import './PersonalCabinet.css'; 

interface SocialWorkerData {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  position: string;
  phone: string;
  office: string;
  department: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileEditData {
  lastName: string;
  firstName: string;
  middleName: string;
  email: string;
  phone: string;
  office: string;
}

export const PersonalCabinet: React.FC = () => {
  const { user } = useUser();
  const [workerData, setWorkerData] = useState<SocialWorkerData>({
    firstName: 'Мария',
    lastName: 'Пшеничная',
    middleName: 'Алексеевна',
    email: 'xxx.p@college.ru',
    position: 'Социальный педагог',
    phone: '+7 (xxx) xxx-xx-xx',
    office: '405, 216A',
    department: 'Отдел социальной работы'
  });

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [profileData, setProfileData] = useState<ProfileEditData>({
    lastName: 'Пшеничная',
    firstName: 'Мария',
    middleName: 'Алексеевна',
    email: 'xxx.p@college.ru',
    phone: '+7 (xxx) xxx-xx-xx',
    office: '405, 216A'
  });

  const [recentActivity] = useState([
    { action: 'Обновлен профиль студента', details: 'Иванов А.С. (группа 2992)', time: 'Сегодня, 10:30' },
    { action: 'Создан отчет по группе риска', details: 'Отчет за 1 семестр', time: 'Вчера, 15:45' },
    { action: 'Проведена консультация', details: 'Студент Петрова М.И.', time: 'Вчера, 11:20' }
  ]);

  const fetchWorkerData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      if (forceRefresh) {
        setRefreshing(true);
      }
      
      // Имитация запроса к API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // В реальном приложении здесь будет запрос к API
      const mockData: SocialWorkerData = {
        firstName: user?.name || 'Мария',
        lastName: user?.lastName || 'Пшеничная',
        middleName: user?.patronymic || 'Алексеевна',
        email: `${user?.login || 'xxx.p'}@college.ru`,
        position: 'Социальный педагог',
        phone: '+7 (xxx) xxx-xx-xx',
        office: '405, 216A',
        department: 'Отдел социальной работы'
      };
      
      setWorkerData(mockData);
      
    } catch (err) {
      setError('Не удалось загрузить данные');
      console.error('Error fetching worker data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWorkerData();
    }
  }, [user]);

  const handleRefresh = async () => {
    await fetchWorkerData(true);
  };

  const handlePasswordModalOpen = () => {
    setShowPasswordModal(true);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setError(null);
  };

  const handleProfileModalOpen = () => {
    setShowProfileModal(true);
    setProfileData({
      lastName: workerData.lastName,
      firstName: workerData.firstName,
      middleName: workerData.middleName,
      email: workerData.email,
      phone: workerData.phone,
      office: workerData.office
    });
    setError(null);
  };

  const handlePasswordChange = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!passwordData.newPassword) {
        setError('Введите новый пароль');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setError('Пароль должен содержать минимум 6 символов');
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('Новые пароли не совпадают');
        return;
      }

      // Имитация запроса к API
      await new Promise(resolve => setTimeout(resolve, 1000));

      setShowPasswordModal(false);
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
    } catch (err) {
      setError('Не удалось изменить пароль');
      console.error('Password change error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profileData.lastName || !profileData.firstName) {
        setError('Пожалуйста, заполните обязательные поля');
        return;
      }

      // Имитация запроса к API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Обновляем данные
      setWorkerData(prev => ({
        ...prev,
        ...profileData
      }));

      setShowProfileModal(false);
      
    } catch (err) {
      setError('Не удалось сохранить профиль');
      console.error('Profile save error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordDataChange = (field: keyof PasswordChangeData, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProfileDataChange = (field: keyof ProfileEditData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const InfoIcon = () => (
    <div className="info-icon-btn" tabIndex={0}>
      <button className="header-btn" type="button">
        <span className="info-icon-text">i</span>
        <span>Информация</span>
      </button>
      <div className="info-tooltip small">
        <div className="info-tooltip-content">
          <div className="info-header">
            <div className="info-title">
              <h3>Личный кабинет социального педагога</h3>
              <p>Здесь вы можете просмотреть свои личные данные, изменить пароль, а также ознакомиться с последней активностью.</p>
            </div>
          </div>
          
          <div className="info-section">
            <h4>Основные возможности</h4>
            <div className="features-grid">
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Просмотр личных и учетных данных</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Изменение пароля учетной записи</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Просмотр последней активности</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Редактирование контактной информации</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h4>Как использовать</h4>
            <div className="usage-steps">
              <div className="step">
                <span className="step-number">1</span>
                <span>Для изменения данных нажмите кнопку "Сменить пароль" или "Редактировать профиль"</span>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <span>Внесите необходимые изменения в форму</span>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <span>Сохраните изменения или отмените редактирование</span>
              </div>
              <div className="step">
                <span className="step-number">4</span>
                <span>Следите за последней активностью внизу страницы</span>
              </div>
            </div>
          </div>

          <div className="info-tip">
            Регулярно обновляйте пароль для обеспечения безопасности учетной записи
          </div>
        </div>
      </div>
    </div>
  );

  const RefreshButton = () => (
    <button 
      className={`header-btn pc-refresh-btn ${refreshing ? 'pc-refreshing' : ''}`}
      onClick={handleRefresh}
      disabled={refreshing}
    >
      <img 
        src="/st-icons/upload_icon.svg" 
        className={`pc-refresh-icon ${refreshing ? 'pc-refresh-spin' : ''}`}
        alt="Обновить"
      />
      <span>Обновить данные</span>
    </button>
  );

  return (
    <div className="personal-cabinet">
      <div className="cabinet-header">
        <InfoIcon />
        <RefreshButton />
      </div>

      <div className="personal-info-main">
        {/* Левый блок - ФИО */}
        <div className="personal-info-section">
          <div className="info-column">
            <div className="info-item">
              <span className="info-label">Фамилия:</span> 
              <span className="info-value">{workerData.lastName}</span> 
            </div>
            <div className="info-item">
              <span className="info-label">Имя:</span> 
              <span className="info-value">{workerData.firstName}</span> 
            </div>
            <div className="info-item">
              <span className="info-label">Отчество:</span>
              <span className="info-value">{workerData.middleName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Должность:</span> 
              <span className="info-value">{workerData.position}</span> 
            </div>
          </div>
        </div>
        
        {/* Правый блок - Контактная информация */}
        <div className="personal-info-section">
          <div className="info-column">
            <div className="info-item">
              <span className="info-label">Эл. почта:</span> 
              <span className="info-value">{workerData.email}</span> 
            </div>
            <div className="info-item">
              <span className="info-label">Телефон:</span> 
              <span className="info-value">{workerData.phone}</span> 
            </div>
            <div className="info-item">
              <span className="info-label">Кабинет:</span> 
              <span className="info-value">{workerData.office}</span> 
            </div>
            <div className="info-item">
              <span className="info-label">Отдел:</span> 
              <span className="info-value">{workerData.department}</span> 
            </div>
          </div>
        </div>
      </div>

      <div className="buttons-row">
        <button 
          className="section-button edit-btn"
          onClick={handleProfileModalOpen}
          disabled={loading}
        >
          Редактировать профиль
        </button>
        <button 
          className="section-button password-btn"
          onClick={handlePasswordModalOpen}
          disabled={loading}
        >
          Сменить пароль
        </button>
      </div>

      <div className="disciplines-section">
        <div className="disciplines-header">
          <label className="disciplines-label">Последняя активность:</label>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
            Загрузка активности...
          </div>
        ) : (
          <div className="disciplines-list">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div 
                  key={index} 
                  className="discipline-item"
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#002FA7', marginBottom: '4px' }}>
                      {activity.action}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {activity.details}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', minWidth: '100px', textAlign: 'right' }}>
                    {activity.time}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                Нет данных об активности
              </div>
            )}
          </div>
        )}
      </div>

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

      {/* Модальное окно смены пароля */}
      {showPasswordModal && (
        <div className="lk-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="lk-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pc-modal-header">
                <div className="lk-modal-icon">
                  <img src="/social-icons/editing_icon.svg" alt="Смена пароля" />
                </div>
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
                <label>Текущий пароль</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => handlePasswordDataChange('currentPassword', e.target.value)}
                  className="pc-input"
                  placeholder="Введите текущий пароль"
                />
              </div>
              <div className="pc-form-group">
                <label>Новый пароль</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordDataChange('newPassword', e.target.value)}
                  className="pc-input"
                  placeholder="Введите новый пароль (минимум 6 символов)"
                />
              </div>
              <div className="pc-form-group"> 
                <label>Подтвердите новый пароль</label>
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
                  className="pc-btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={loading}
                >
                  Отмена
                </button>
                <button
                  className="pc-confirm-btn"
                  onClick={handlePasswordChange}
                  disabled={loading || !passwordData.newPassword || !passwordData.confirmPassword}
                >
                  {loading ? 'Смена пароля...' : 'Изменить пароль'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования профиля */}
      {showProfileModal && (
        <div className="lk-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="lk-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pc-modal-header">
                <div className="lk-modal-icon">
                  <img src="/social-icons/editing_icon.svg" alt="Редактирование профиля" />
                </div>
              <h3>Редактирование профиля</h3>
              <button 
                className="pc-modal-close"
                onClick={() => setShowProfileModal(false)}
              >
                ×
              </button>
            </div>

            <div className="pc-modal-content">
              <div className="pc-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleProfileDataChange('email', e.target.value)}
                  className="pc-input"
                />
              </div>
              
              <div className="pc-form-group">
                <label>Телефон</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleProfileDataChange('phone', e.target.value)}
                  className="pc-input"
                />
              </div>
              
              <div className="pc-form-group">
                <label>Кабинет</label>
                <input
                  type="text"
                  value={profileData.office}
                  onChange={(e) => handleProfileDataChange('office', e.target.value)}
                  className="pc-input"
                />
              </div>
              
              <div className="pc-modal-actions"> 
                <button
                  className="pc-btn-secondary"
                  onClick={() => setShowProfileModal(false)}
                  disabled={loading}
                >
                  Отмена
                </button>
                <button
                  className="pc-confirm-btn"
                  onClick={handleProfileSave}
                  disabled={loading || !profileData.lastName || !profileData.firstName}
                >
                  {loading ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};