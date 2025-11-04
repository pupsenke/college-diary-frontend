import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { teacherApiService } from '../services/teacherApiService';
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

// Интерфейс для дисциплин преподавателя из API
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
  currentPassword: string;
  newLogin: string;
  confirmNewLogin: string;
}

interface Props {
  onNavigateToDisciplines?: (disciplineName?: string) => void;
  onNavigateToGroups?: (disciplineName?: string) => void;
  onDisciplineSelect?: (disciplineName: string) => void;
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
  const [isUsingCache, setIsUsingCache] = useState(false);
  
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

    // Функция для получения данных преподавателя с кэшированием
  const fetchTeacherData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      setIsUsingCache(false);

      if (forceRefresh) {
        setRefreshing(true);
      }

      console.log('Загрузка данных преподавателя...');
      
      if (!user?.name || !user?.lastName || !user?.patronymic) {
        throw new Error('Недостаточно данных пользователя для поиска');
      }

      // Ищем преподавателя по ФИО
      const teacher = await teacherApiService.findTeacherByName(
        user.name, 
        user.lastName, 
        user.patronymic
      );

      if (teacher) {
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
          console.error('Ошибка загрузки дисциплин с использованием резервных данных:', disciplinesError);
          
          // Используем данные из кэша, если есть
          const cacheKey = `teacher_disciplines_${teacher.id}`;
          const cachedDisciplines = localStorage.getItem(`cache_${cacheKey}`);
          
          if (cachedDisciplines) {
            const cachedData = JSON.parse(cachedDisciplines);
            if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) { // 5 минут
              const disciplineNames = cachedData.data;
              
              const formattedEmail = teacher.email 
                ? teacher.email.replace(/@.*$/, '@novsu.ru')
                : `${teacher.login}@novsu.ru`;
              
              const transformedData: TeacherData = {
                firstName: teacher.name,
                lastName: teacher.lastName,
                middleName: teacher.patronymic,
                email: formattedEmail,
                position: teacher.staffPosition[0]?.name || 'Преподаватель',
                disciplines: disciplineNames.length > 0 ? disciplineNames : ['Дисциплины не назначены (кэш)'],
                teacherId: teacher.id,
                login: teacher.login
              };
              
              setTeacherData(transformedData);
              setIsUsingCache(true);
              setError('Используются кэшированные данные дисциплин. Нет соединения с сервером.');
              console.log('Данные дисциплин загружены из кэша');
              return;
            }
          }
          
          // Если кэша нет или он устарел, используем базовые данные
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
        console.log('Преподаватель не найден в данных о персонале, используются контекстные данные');
        // Если преподаватель не найден в API, используем данные из контекста
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
      }

    } catch (err) {
      console.error('Ошибка при загрузке данных преподавателя:', err);
      
      // Пробуем загрузить из кэша при ошибке сети
      try {
        console.log('Попытка загрузки из кэша...');
        const cacheKey = `teacher_search_${user?.lastName}_${user?.name}_${user?.patronymic}`.toLowerCase();
        const cached = localStorage.getItem(`cache_${cacheKey}`);
        
        if (cached) {
          const cachedData = JSON.parse(cached);
          // Проверяем актуальность кэша (1 час)
          if (Date.now() - cachedData.timestamp < 60 * 60 * 1000) {
            const teacher = cachedData.data;
            
            const formattedEmail = teacher.email 
              ? teacher.email.replace(/@.*$/, '@novsu.ru')
              : `${teacher.login}@novsu.ru`;
            
            const transformedData: TeacherData = {
              firstName: teacher.name,
              lastName: teacher.lastName,
              middleName: teacher.patronymic,
              email: formattedEmail,
              position: teacher.staffPosition[0]?.name || 'Преподаватель',
              disciplines: ['Данные из кэша - обновите для актуальности'],
              teacherId: teacher.id,
              login: teacher.login
            };
            
            setTeacherData(transformedData);
            setIsUsingCache(true);
            setError('Используются кэшированные данные. Нет соединения с сервером.');
            console.log('Данные преподавателя загружены из кэша');
            return;
          }
        }
      } catch (cacheError) {
        console.error('Ошибка при загрузке из кэша:', cacheError);
      }
      
      setError('Не удалось загрузить данные преподавателя');
      
      // В случае ошибки используем данные из контекста
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Функция принудительного обновления данных
  const handleRefresh = async () => {
    if (teacherData.teacherId) {
      // Инвалидируем кэш перед обновлением
      teacherApiService.invalidateTeacherCache(teacherData.teacherId);
    }
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

      // Валидация
      if (!passwordData.currentPassword) {
        setError('Введите текущий пароль');
        return;
      }

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

      setSuccessMessage('Пароль успешно изменен');
      setShowPasswordModal(false);
      
    } catch (err) {
      setError('Не удалось изменить пароль. Проверьте текущий пароль.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLoginChange = async () => {
    try {
      setLoginLoading(true);
      setError(null);

      // Валидация
      if (!loginData.currentPassword) {
        setError('Введите текущий пароль');
        return;
      }

      if (!loginData.newLogin) {
        setError('Введите новый логин');
        return;
      }

      if (loginData.newLogin.length < 3) {
        setError('Логин должен содержать минимум 3 символа');
        return;
      }

      if (loginData.newLogin !== loginData.confirmNewLogin) {
        setError('Новые логины не совпадают');
        return;
      }

      if (!teacherData.teacherId) {
        setError('ID преподавателя не найден');
        return;
      }

      // Используем API сервис для смены логина
      await teacherApiService.changeLogin(teacherData.teacherId, loginData);

      setSuccessMessage('Логин успешно изменен');
      setShowLoginModal(false);
      
      // Обновляем данные пользователя
      setTeacherData(prev => ({
        ...prev,
        login: loginData.newLogin,
        email: `${loginData.newLogin}@novsu.ru`
      }));
      
    } catch (err) {
      setError('Не удалось изменить логин. Проверьте текущий пароль.');
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
      <div className="info-tooltip">
        <div className="info-tooltip-content">
          <p><strong>Добро пожаловать в личный кабинет преподавателя!</strong></p>
          <p>Здесь вы можете просмотреть свои личные данные, изменить логин или пароль, а также ознакомиться с перечнем преподаваемых дисциплин.</p>
          <p>Для навигации по группам и студентам нажмите на интересующую дисциплину.</p>
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
    if (onNavigateToDisciplines && 
        discipline !== 'Дисциплины не назначены' && 
        discipline !== 'Не удалось загрузить дисциплины' && 
        discipline !== 'Ошибка загрузки дисциплин') {
      
      // Сначала устанавливаем дисциплину
      if (onDisciplineSelect) {
        onDisciplineSelect(discipline);
      }
      // Затем переходим к дисциплинам
      onNavigateToDisciplines(discipline);
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
      {/* Добавляем заголовок с кнопкой обновления */}
      <div className="cabinet-header">
        <InfoIcon />
        <RefreshButton />
      </div>

      {/* Индикация использования кэша */}
      {isUsingCache && (
        <div className="cache-warning">
          Используются кэшированные данные. Для актуальной информации обновите данные.
        </div>
      )}

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

      {successMessage && (
        <div className="pc-success-message">
          {successMessage}
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
                <label>Текущий пароль</label>
                <input
                  type="password"
                  value={loginData.currentPassword}
                  onChange={(e) => handleLoginDataChange('currentPassword', e.target.value)}
                  className="pc-input"
                  placeholder="Введите текущий пароль"
                />
              </div>
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
                  disabled={loginLoading || !loginData.currentPassword || !loginData.newLogin || !loginData.confirmNewLogin}
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