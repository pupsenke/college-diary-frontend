import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { useCache } from '../context/CacheContext';
import { teacherApiService } from '../services/teacherApiService';
import './PersonalCabinet.css';
import { CacheWarning } from '../th-components/CacheWarning';

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

interface TeacherSubject {
  idTeacher: number;
  idSubject: number;
  subjectName: string;
  idGroups: number[];
}

interface TeacherData {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  position: string;
  disciplines: string[];
  teacherId?: number;
  login?: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface LoginChangeData {
  currentPassword?: string;
  newLogin: string;
  confirmNewLogin: string;
}

interface Props {
  onNavigateToDisciplines?: (disciplineName?: string) => void;
  onNavigateToGroups?: (disciplineName?: string) => void;
  onDisciplineSelect?: (disciplineName: string | undefined) => void;
}

export const PersonalCabinet: React.FC<Props> = ({ 
  onNavigateToDisciplines, 
  onNavigateToGroups,
  onDisciplineSelect
}) => {
  const { user } = useUser();
  const [teacherData, setTeacherData] = useState<TeacherData>({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    position: '',
    disciplines: [],
    login: ''
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { isUsingCache, showCacheWarning, setShowCacheWarning, forceCacheCheck } = useCache();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [loginData, setLoginData] = useState<LoginChangeData>({
    currentPassword: '',
    newLogin: '',
    confirmNewLogin: ''
  });
  
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Функция для показа успешного сообщения
  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    // Автоматически скрываем сообщение через 5 секунд
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  }, []);

  const fetchTeacherData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      setShowCacheWarning(false);

      if (forceRefresh) {
        setRefreshing(true);
      }

      console.log('Загрузка данных преподавателя...');
      
      if (!user?.name || !user?.lastName || !user?.patronymic) {
        throw new Error('Недостаточно данных пользователя для поиска');
      }

      // Инвалидируем кэш при принудительном обновлении
      if (forceRefresh && teacherData.teacherId) {
        teacherApiService.invalidateTeacherCache(teacherData.teacherId);
      }

      // Ищем преподавателя по ФИО
      const teacher = await teacherApiService.findTeacherByName(
        user.name, 
        user.lastName, 
        user.patronymic
      );

      if (teacher) {
        console.log('Найден преподаватель с ID:', teacher.id);
        localStorage.setItem('teacher_id', teacher.id.toString());
        console.log('Teacher ID сохранен в localStorage:', teacher.id);

        try {
          // Получаем дисциплины преподавателя
          const teacherDisciplines = await teacherApiService.getTeacherDisciplines(teacher.id);
          
          // Форматируем email для novsu.ru
          const formattedEmail = teacher.email 
            ? teacher.email.replace(/@.*$/, '@novsu.ru')
            : `${teacher.login}@novsu.ru`;
          
          // Преобразуем данные из API в наш формат
          const transformedData: TeacherData = {
            firstName: teacher.name,
            lastName: teacher.lastName,
            middleName: teacher.patronymic,
            email: formattedEmail,
            position: teacher.staffPosition[0]?.name || 'Преподаватель',
            disciplines: teacherDisciplines.length > 0 ? teacherDisciplines : ['Дисциплины не назначены'],
            teacherId: teacher.id,
            login: teacher.login
          };

          setTeacherData(transformedData);
          console.log('Набор данных преподавателя с дисциплинами:', transformedData);
          
        } catch (disciplinesError) {
          console.error('Ошибка загрузки дисциплин:', disciplinesError);
          
          // Используем базовые данные при ошибке
          const formattedEmail = teacher.email 
            ? teacher.email.replace(/@.*$/, '@novsu.ru')
            : `${teacher.login}@novsu.ru`;
          
          const transformedData: TeacherData = {
            firstName: teacher.name,
            lastName: teacher.lastName,
            middleName: teacher.patronymic,
            email: formattedEmail,
            position: teacher.staffPosition[0]?.name || 'Преподаватель',
            disciplines: ['Не удалось загрузить дисциплины'],
            teacherId: teacher.id,
            login: teacher.login
          };
          setTeacherData(transformedData);
        }
      } else {
        console.log('Преподаватель не найден, используются контекстные данные');
        const formattedEmail = user?.email 
          ? user.email.replace(/@.*$/, '@novsu.ru')
          : `${user?.login}@novsu.ru`;
        
        const fallbackData: TeacherData = {
          firstName: user?.name || '',
          lastName: user?.lastName || '',
          middleName: user?.patronymic || '',
          email: formattedEmail,
          position: 'Преподаватель',
          disciplines: ['Дисциплины не найдены'],
          login: user?.login || ''
        };
        setTeacherData(fallbackData);
        
        localStorage.removeItem('teacher_id');
      }

    } catch (err: any) {
      console.error('Ошибка при загрузке данных преподавателя:', err);
      
      // Проверяем, является ли ошибка сетевой
      const isNetworkError = 
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Network request failed') ||
        err.message?.includes('Превышено время ожидания') ||
        err.name === 'TypeError';
      
      if (isNetworkError) {
        // Принудительно проверяем глобальное состояние кэша
        forceCacheCheck();
        
        setShowCacheWarning(true);

        const formattedEmail = user?.email 
          ? user.email.replace(/@.*$/, '@novsu.ru')
          : `${user?.login}@novsu.ru`;
          
          const fallbackData: TeacherData = {
            firstName: user?.name || '',
            lastName: user?.lastName || '',
            middleName: user?.patronymic || '',
            email: formattedEmail,
            position: 'Преподаватель',
            disciplines: ['Данные загружены из кэша'],
            login: user?.login || ''
          };
          setTeacherData(fallbackData);
      } else {
        setError('Не удалось загрузить данные преподавателя');
        
        const formattedEmail = user?.email 
          ? user.email.replace(/@.*$/, '@novsu.ru')
          : `${user?.login}@novsu.ru`;
        
        const fallbackData: TeacherData = {
          firstName: user?.name || '',
          lastName: user?.lastName || '',
          middleName: user?.patronymic || '',
          email: formattedEmail,
          position: 'Преподаватель',
          disciplines: ['Ошибка загрузки дисциплин'],
          login: user?.login || ''
        };
        setTeacherData(fallbackData);
      }
      
      // Очищаем teacher_id при ошибке
      localStorage.removeItem('teacher_id');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Функция принудительного обновления данных
  const handleRefresh = async () => {
    await fetchTeacherData(true);
  };

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    if (user) {
      fetchTeacherData();
    }
  }, [user]);

  // Обработчики модальных окон
  const handlePasswordModalOpen = useCallback(() => {
    setShowPasswordModal(true);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setError(null);
    setSuccessMessage(null);
  }, []);

  const handleLoginModalOpen = useCallback(() => {
    setShowLoginModal(true);
    setLoginData({
      currentPassword: '',
      newLogin: '',
      confirmNewLogin: ''
    });
    setError(null);
    setSuccessMessage(null);
  }, []);

  // Обновленные обработчики с использованием API сервиса
  const handlePasswordChange = async () => {
    try {
      setPasswordLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Валидация (без проверки текущего пароля)
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

      if (!teacherData.teacherId) {
        setError('ID преподавателя не найден');
        return;
      }

      // Используем API сервис для смены пароля
      await teacherApiService.changePassword(teacherData.teacherId, passwordData);

      showSuccess('Пароль успешно изменен!');
      setShowPasswordModal(false);
      
      // Очищаем форму
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
    } catch (err) {
      console.error('Password change error:', err);
      setError(err instanceof Error ? err.message : 'Не удалось изменить пароль');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLoginChange = async () => {
    try {
      setLoginLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Валидация
      if (!loginData.newLogin) {
        setError('Введите новый логин');
        return;
      }

      if (loginData.newLogin.length < 3) {
        setError('Логин должен содержать минимум 3 символа');
        return;
      }

      const loginRegex = /^[a-zA-Z0-9]+$/;
      if (!loginRegex.test(loginData.newLogin)) {
        setError('Логин может содержать только латинские буквы и цифры');
        return;
      }

      if (loginData.newLogin !== loginData.confirmNewLogin) {
        setError('Новые логины не совпадают');
        return;
      }

      if (loginData.newLogin === teacherData.login) {
        setError('Новый логин не должен совпадать с текущим');
        return;
      }

      if (!teacherData.teacherId) {
        setError('ID преподавателя не найден');
        return;
      }

      console.log('Starting login change process...');
      
      // Проверяем доступность логина
      try {
        const availability = await teacherApiService.isLoginAvailable(loginData.newLogin);
        if (!availability.available) {
          setError(availability.message || 'Этот логин уже занят');
          return;
        }
      } catch (availabilityError) {
        console.log('Login availability check failed, proceeding...');
      }
      
      // Используем API сервис для смены логина
      const result = await teacherApiService.changeLogin(teacherData.teacherId, loginData);
      
      console.log('Login change result:', result);

      showSuccess('Логин успешно изменен!');
      setShowLoginModal(false);
      
      // Обновляем данные пользователя
      setTeacherData(prev => ({
        ...prev,
        login: loginData.newLogin,
        email: `${loginData.newLogin}@novsu.ru`
      }));
      
      // Очищаем форму
      setLoginData({
        currentPassword: '',
        newLogin: '',
        confirmNewLogin: ''
      });
      
    } catch (err) {
      console.error('Login change error:', err);
      
      if (err instanceof Error) {
        if (err.message.includes('уже занят') || err.message.includes('409')) {
          setError('Этот логин уже занят. Выберите другой логин.');
        } else if (err.message.includes('400')) {
          setError('Неверный формат логина');
        } else if (err.message.includes('500')) {
          setError('Внутренняя ошибка сервера. Попробуйте другой логин.');
        } else if (err.message.includes('Ошибка соединения')) {
          setError('Проблемы с соединением. Проверьте интернет и попробуйте снова.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Не удалось изменить логин. Попробуйте позже.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Компонент информационной иконки
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
              <h3>Личный кабинет преподавателя</h3>
              <p>Здесь вы можете просмотреть свои личные данные, изменить логин или пароль, а также ознакомиться с перечнем преподаваемых дисциплин.</p>
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
                <span>Изменение логина и пароля учетной записи</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Просмотр списка преподаваемых дисциплин</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"></span>
                <span>Быстрый переход к управлению группами</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h4>Как использовать</h4>
            <div className="usage-steps">
              <div className="step">
                <span className="step-number">1</span>
                <span>Для изменения данных нажмите кнопку "Сменить ..."</span>
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
                <span>Для перехода к дисциплине нажмите на её название</span>
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

  // Компонент кнопки обновления
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

  // Компонент успешного уведомления
  const SuccessNotification = () => {
    if (!successMessage) return null;

    return (
      <div className="pc-success-notification">
        <div className="pc-success-content">
          <div className="pc-success-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path 
                d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="pc-success-text">
            <div className="pc-success-title">Успешно!</div>
            <div className="pc-success-message">{successMessage}</div>
          </div>
          <button 
            className="pc-success-close"
            onClick={() => setSuccessMessage(null)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path 
                d="M12 4L4 12M4 4L12 12" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const handlePasswordDataChange = useCallback((field: keyof PasswordChangeData, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleLoginDataChange = useCallback((field: keyof LoginChangeData, value: string) => {
    setLoginData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleDisciplineClick = (discipline: string) => {
    const isValidDiscipline = 
      discipline !== 'Дисциплины не назначены' && 
      discipline !== 'Не удалось загрузить дисциплины' && 
      discipline !== 'Ошибка загрузки дисциплин';

    if (isValidDiscipline) {
      if (onDisciplineSelect) {
        onDisciplineSelect(discipline);
      }
      
      if (onNavigateToGroups) {
        onNavigateToGroups(discipline);
      } else if (onNavigateToDisciplines) {
        onNavigateToDisciplines(discipline);
      }
    }
  };

  // Если данные пользователя еще не загружены
  if (!user) {
    return (
      <div className="personal-cabinet">
        <SuccessNotification />
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Загрузка данных пользователя...
        </div>
      </div>
    );
  }

  return (
    <div className="personal-cabinet">
      {/* Уведомление об успехе */}
      <SuccessNotification />

      {/* Добавляем заголовок с кнопкой обновления */}
      <div className="cabinet-header">
        <InfoIcon />
        <RefreshButton />
      </div>

      {showCacheWarning && <CacheWarning />}

      <div className="personal-info-main">
        {/* Левый блок - ФИО */}
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
          </div>
        </div>
        
        {/* Правый блок - почта и логин */}
        <div className="personal-info-section">
          <div className="info-column">
            <div className="info-item">
              <span className="info-label">Эл. почта:</span>
              <span className="info-value">{teacherData.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Логин:</span>
              <span className="info-value">{teacherData.login}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Кнопки под блоками */}
      <div className="buttons-row">
        <button 
          className="section-button password-btn"
          onClick={handlePasswordModalOpen}
          disabled={loading}
        >
          Сменить пароль
        </button>
        <button 
          className="section-button login-btn"
          onClick={handleLoginModalOpen}
          disabled={loading}
        >
          Сменить логин
        </button>
      </div>

      <div className="disciplines-section">
        <div className="disciplines-header">
          <label className="disciplines-label">Дисциплины:</label>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
            Загрузка дисциплин...
          </div>
        ) : (
          <div className="disciplines-list">
            {teacherData.disciplines.length > 0 ? (
              teacherData.disciplines.map((discipline, index) => (
                <div 
                  key={index} 
                  className={`discipline-item ${discipline !== 'Дисциплины не назначены' && discipline !== 'Не удалось загрузить дисциплины' && discipline !== 'Ошибка загрузки дисциплин' ? 'clickable' : ''}`}
                  onClick={() => handleDisciplineClick(discipline)}
                >
                  {discipline}
                  {discipline !== 'Дисциплины не назначены' && 
                   discipline !== 'Не удалось загрузить дисциплины' && 
                   discipline !== 'Ошибка загрузки дисциплин' && (
                    <span className="discipline-arrow">→</span>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                Нет данных о дисциплинах
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
                  className="pc-confirm-btn"
                  onClick={handlePasswordChange}
                  disabled={passwordLoading || !passwordData.newPassword || !passwordData.confirmPassword}
                >
                  {passwordLoading ? 'Смена пароля...' : 'Сменить пароль'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно смены логина */}
      {showLoginModal && (
        <div className="pc-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="pc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pc-modal-header">
              <h3>Смена логина</h3>
              <button 
                className="pc-modal-close"
                onClick={() => setShowLoginModal(false)}
              >
                ×
              </button>
            </div>

            <div className="pc-modal-content">
              <div className="pc-form-group">
                <label>Новый логин</label>
                <input
                  type="text"
                  value={loginData.newLogin}
                  onChange={(e) => handleLoginDataChange('newLogin', e.target.value)}
                  className="pc-input"
                  placeholder="Введите новый логин"
                />
              </div>
              <div className="pc-form-group">
                <label>Подтвердите новый логин</label>
                <input
                  type="text"
                  value={loginData.confirmNewLogin}
                  onChange={(e) => handleLoginDataChange('confirmNewLogin', e.target.value)}
                  className="pc-input"
                  placeholder="Повторите новый логин"
                />
              </div>
              <div className="pc-modal-actions">
                <button
                  className="pc-confirm-btn"
                  onClick={handleLoginChange}
                  disabled={loginLoading || !loginData.newLogin || !loginData.confirmNewLogin}
                >
                  {loginLoading ? 'Смена логина...' : 'Сменить логин'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};