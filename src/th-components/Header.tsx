import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import './Header.css';

interface ThemeToggleProps {
  currentTheme: 'light' | 'dark';
  onToggle: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ currentTheme, onToggle }) => {
  return (
    <button 
      className="dh-theme-toggle"
      onClick={onToggle}
      aria-label={currentTheme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
    >
      <div className="dh-theme-toggle-inner">
        <div className={`dh-theme-icon ${currentTheme === 'dark' ? 'dh-moon-icon' : 'dh-sun-icon'}`}>
          {currentTheme === 'dark' ? (
            <img src="/sun_icon.svg" alt="Светлая тема" width="20" height="20" />
          ) : (
            <img src="/moon_icon.svg" alt="Темная тема" width="20" height="20" />
          )}
        </div>
      </div>
    </button>
  );
};

export const Header: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  // Загрузка темы из localStorage при монтировании
  useEffect(() => {
    const savedTheme = localStorage.getItem('dh-theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  // Применение темы к body
  const applyTheme = (newTheme: 'light' | 'dark') => {
    if (newTheme === 'light') {
      document.body.classList.add('dh-theme-light');
      document.body.classList.remove('dh-theme-dark');
    } else {
      document.body.classList.add('dh-theme-dark');
      document.body.classList.remove('dh-theme-light');
    }
  };

  // Переключение темы
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('dh-theme', newTheme);
    applyTheme(newTheme);
  };

  // Закрытие dropdown при клике вне его области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleDisciplines = () => {
    navigate('/teacher?tab=disciplines');
    setIsDropdownOpen(false);
  };

  const handleSchedule = () => {
    navigate('/teacher?tab=schedule');
    setIsDropdownOpen(false);
  };

  // Форматируем ФИО
  const getFullName = () => {
    if (!user) return 'Фамилия Имя';
    return `${user.lastName} ${user.name}`;
  };

  const getFullNameWithPatronymic = () => {
    if (!user) return 'Фамилия Имя Отчество';
    return `${user.lastName} ${user.name} ${user.patronymic}`;
  };

  const getPosition = () => {
    if (!user || user.userType !== 'teacher') return 'Преподаватель';
    return user.position || 'Преподаватель';
  };

  return (
    <header className="th-header-main">
      <div className="th-header-logo-area">
        <div className="th-logo-mark">
          <img src='blue_icon.svg' alt="" className='th-image'/>
          <div>
            <div className="th-logo-title">Цифровой дневник</div>
            <div className="th-logo-subtitle">Политехнический колледж НовГУ</div>
          </div>
        </div>
      </div>

      {/* Правая часть - кнопка темы и профиль */}
      <div className="dh-header-right-area">
        <div className="dh-header-theme-area">
          <ThemeToggle currentTheme={theme} onToggle={toggleTheme} />
        </div>

        {/* Вся область профиля и дропдауна внутри одного ref */}
        <div className="dh-header-profile-area" ref={dropdownRef}>
          <div className="dh-profile-card" onClick={toggleDropdown}>
            <div className="dh-profile-info">
              <span className="dh-profile-name">{getFullName()}</span>
              <span className="dh-profile-role">{getPosition()}</span>
            </div>
            <span className={`dh-profile-arrow ${isDropdownOpen ? 'dh-rotated' : ''}`}>▼</span>
          </div>
        
          {/* Дропдаун теперь внутри того же div с ref */}
          {isDropdownOpen && (
            <div className="th-profile-dropdown">
              <div className="th-dropdown-user-info">
                <div className="th-user-gradient-bg"></div>
                <span className="th-dropdown-fullname">{getFullNameWithPatronymic()}</span>
                <span className="th-dropdown-department">Преподаватель</span>
              </div>
              <div className="th-dropdown-menu">
                <button className="th-dropdown-item" onClick={handleDisciplines}>
                  Дисциплины
                </button>
                <button className="th-dropdown-item" onClick={handleSchedule}>
                  Расписание
                </button>
                <div className="th-dropdown-divider"></div>
                <button className="th-dropdown-item th-logout" onClick={handleLogout}>
                  Выйти
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};