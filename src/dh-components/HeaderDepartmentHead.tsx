import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import './HeaderDepartmentHeadStyle.css';

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

export const HeaderDepartmentHead: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // По умолчанию темная тема
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useUser();

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
    logout();
    navigate('/login');
    setIsDropdownOpen(false);
  };

  const handleNavigation = (tab: string) => {
    navigate(`/departmentHead?tab=${tab}`);
    setIsDropdownOpen(false);
  };

  const getFullName = () => {
    if (!user) return 'Фамилия Имя';
    return `${user.lastName} ${user.name}`;
  };

  const getFullNameWithPatronymic = () => {
    if (!user) return 'Фамилия Имя Отчество';
    return `${user.lastName} ${user.name} ${user.patronymic}`;
  };

  const getPosition = () => {
    if (!user || user.userType !== 'departmentHead') return 'Заведующий отделением';
    return user.position || 'Заведующий отделением';
  };

  return (
    <header className="dh-header-main">
      <div className="dh-header-logo-area">
        <div className="dh-logo-mark">
          <img src='blue_icon.svg' alt="" className='dh-image'/>
          <div>
            <div className="dh-logo-title">Цифровой дневник</div>
            <div className="dh-logo-subtitle">Политехнический колледж НовГУ</div>
          </div>
        </div>
      </div>

      {/* Правая часть - кнопка темы и профиль */}
      <div className="dh-header-right-area">
        <div className="dh-header-theme-area">
          <ThemeToggle currentTheme={theme} onToggle={toggleTheme} />
        </div>

        <div className="dh-header-profile-area" ref={dropdownRef}>
          <div className="dh-profile-card" onClick={toggleDropdown}>
            <div className="dh-profile-info">
              <span className="dh-profile-name">{getFullName()}</span>
              <span className="dh-profile-role">{getPosition()}</span>
            </div>
            <span className={`dh-profile-arrow ${isDropdownOpen ? 'dh-rotated' : ''}`}>▼</span>
          </div>
        
        {isDropdownOpen && (
          <div className="dh-profile-dropdown">
            <div className="dh-dropdown-user-info">
              <div className="dh-user-gradient-bg"></div>
              <span className="dh-dropdown-fullname">{getFullNameWithPatronymic()}</span>
              <span className="dh-dropdown-position">{getPosition()}</span>
            </div>
            <div className="dh-dropdown-menu">
              <button className="dh-dropdown-item" onClick={() => handleNavigation('personal')}>
                Личный кабинет
              </button>
              <button className="dh-dropdown-item" onClick={() => handleNavigation('management')}>
                Управление отделением
              </button>
              <button className="dh-dropdown-item" onClick={() => handleNavigation('staff')}>
                Управление сотрудниками
              </button>
              <button className="dh-dropdown-item" onClick={() => handleNavigation('academic')}>
                Учебная работа
              </button>
              <button className="dh-dropdown-item" onClick={() => handleNavigation('reports')}>
                Отчеты и аналитика
              </button>
              <div className="dh-dropdown-divider"></div>
              <button className="dh-dropdown-item dh-logout" onClick={handleLogout}>
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