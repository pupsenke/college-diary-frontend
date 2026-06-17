import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { socialApiService, type SocialWorkerData, type SocialCategoryStat } from '../services/socialApiService';
import './SocialPersonalCabinet.css';

interface PasswordChangeData {
  newPassword: string;
  confirmPassword: string;
}

interface ProfileEditData {
  email: string;
  telephone: string;
}

export const PersonalCabinet: React.FC = () => {
  const { user } = useUser();
  const [workerData, setWorkerData] = useState<SocialWorkerData | null>(null);
  const [categoryStats, setCategoryStats] = useState<SocialCategoryStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    newPassword: '',
    confirmPassword: ''
  });

  const [profileData, setProfileData] = useState<ProfileEditData>({
    email: '',
    telephone: ''
  });

  const fetchWorkerData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      if (forceRefresh) {
        setRefreshing(true);
      }
      setError(null);

      const staffId = user?.id || parseInt(localStorage.getItem('user_id') || '0');
      if (!staffId) {
        throw new Error('ID сотрудника не найден');
      }

      let data: SocialWorkerData | null;
      if (forceRefresh) {
        data = await socialApiService.refreshSocialWorkerData(staffId);
      } else {
        data = await socialApiService.getSocialWorkerData(staffId);
      }

      if (data) {
        setWorkerData(data);
      } else {
        setError('Не удалось загрузить данные');
      }
    } catch (err) {
      setError('Не удалось загрузить данные');
      console.error('Error fetching worker data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategoryStats = async () => {
    try {
      setStatsLoading(true);
      const stats = await socialApiService.getSocialCategoriesStats();
      setCategoryStats(stats);
    } catch (err) {
      console.error('Error fetching category stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWorkerData();
      fetchCategoryStats();
    }
  }, [user]);

  const handleRefresh = async () => {
    await fetchWorkerData(true);
    await fetchCategoryStats();
  };

  const handlePasswordModalOpen = () => {
    setShowPasswordModal(true);
    setPasswordData({
      newPassword: '',
      confirmPassword: ''
    });
    setError(null);
  };

  const handleProfileModalOpen = async () => {
    if (!workerData) return;
    
    setProfileData({
      email: workerData.email,
      telephone: workerData.telephone
    });
    setShowProfileModal(true);
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

      const staffId = user?.id || parseInt(localStorage.getItem('user_id') || '0');
      const result = await socialApiService.changePassword(staffId, passwordData);

      if (result.success) {
        setShowPasswordModal(false);
        setPasswordData({ newPassword: '', confirmPassword: '' });
      }
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

      const staffId = user?.id || parseInt(localStorage.getItem('user_id') || '0');
      
      const updateResult = await socialApiService.updateStaffData(staffId, {
        email: profileData.email,
        telephone: profileData.telephone
      });

      if (updateResult.success) {
        await fetchWorkerData(true);
        setShowProfileModal(false);
      }
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
              <p>Здесь вы можете просмотреть свои личные данные, изменить пароль, а также ознакомиться со сводкой по социальным категориям.</p>
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
                <span>Сводка по социальным категориям</span>
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
                <span>Сохраните изменения</span>
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
      <span>{refreshing ? 'Обновление...' : 'Обновить данные'}</span>
    </button>
  );

  // Функция для получения цвета категории
  const getCategoryColor = (index: number): string => {
    const colors = [
      '#1e3a5f', '#2e5984', '#4a7fb5', '#6b9bd1',
      '#8ab6d6', '#5a6c7d', '#7a8fa3', '#9ab0c4'
    ];
    return colors[index % colors.length];
  };

  // Сортируем категории по количеству студентов (по убыванию)
  const sortedCategories = [...categoryStats].sort((a, b) => b.studentsCount - a.studentsCount);

  if (loading && !workerData) {
    return (
      <div className="personal-cabinet">
        <div className="cabinet-header">
          <InfoIcon />
          <RefreshButton />
        </div>
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Загрузка данных...
        </div>
      </div>
    );
  }

  if (!workerData) {
    return (
      <div className="personal-cabinet">
        <div className="cabinet-header">
          <InfoIcon />
          <RefreshButton />
        </div>
        <div className="error-state">
          <div className="error-message">
            <strong>Ошибка загрузки</strong>
            <br />
            {error || 'Не удалось загрузить данные пользователя'}
          </div>
          <button className="retry-button" onClick={handleRefresh}>
            Повторить попытку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="personal-cabinet">
      <div className="cabinet-header">
        <InfoIcon />
        <RefreshButton />
      </div>

      <div className="personal-info-main">
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
        
        <div className="personal-info-section">
          <div className="info-column">
            <div className="info-item">
              <span className="info-label">Эл. почта:</span> 
              <span className="info-value">{workerData.email || 'Не указан'}</span> 
            </div>
            <div className="info-item">
              <span className="info-label">Телефон:</span> 
              <span className="info-value">{workerData.telephone || 'Не указан'}</span> 
            </div>
            <div className="info-item">
              <span className="info-label">Кабинеты:</span> 
              <span className="info-value">{workerData.officesDisplay}</span> 
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
          className="section-button"
          onClick={handleProfileModalOpen}
          disabled={loading}
        >
          Редактировать профиль
        </button>
        <button 
          className="section-button"
          onClick={handlePasswordModalOpen}
          disabled={loading}
        >
          Сменить пароль
        </button>
      </div>

      {/* Сводка по социальным категориям */}
      <div className="social-category-section">
        <div className="section-header-modern">
          <div className="header-title">
            <h3>Социальные категории</h3>
          </div>
          {statsLoading && <div className="loading-spinner-small"></div>}
        </div>
        
        {sortedCategories.length > 0 ? (
          <div className="category-chips-container">
            {sortedCategories.map((stat, index) => (
              <div key={stat.categoryName} className="category-chip">
                <div 
                  className="category-chip-color" 
                  style={{ background: getCategoryColor(index) }}
                />
                <span className="category-chip-name">{stat.categoryName}</span>
                <span className="category-chip-count">{stat.studentsCount}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-categories">
            <p>Нет данных по социальным категориям</p>
          </div>
        )}
      </div>

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
                  value={profileData.telephone}
                  onChange={(e) => handleProfileDataChange('telephone', e.target.value)}
                  className="pc-input"
                  placeholder="+7 (xxx) xxx-xx-xx"
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
                  disabled={loading}
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