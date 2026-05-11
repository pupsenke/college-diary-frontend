import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import './HeaderMetodist.css';

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
  const { user, logout } = useUser();

  useEffect(() => {
    const savedTheme = localStorage.getItem('h-theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark') => {
    if (newTheme === 'light') {
      document.body.classList.add('h-theme-light');
      document.body.classList.remove('h-theme-dark');
    } else {
      document.body.classList.add('h-theme-dark');
      document.body.classList.remove('h-theme-light');
    }
  };

  // переключение темы
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('h-theme', newTheme);
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
    setIsDropdownOpen(false);

    switch (tab) {
      case 'personal-cabinet':
        navigate('/metodist/personal-cabinet');
        break;
      case 'edit-schedule':
        navigate('/metodist/edit-schedule');
        break;
      case 'view-groups':
        navigate('/metodist/view-groups');
        break;
      case 'changes':
        navigate('/metodist/changes');
        break;
      default:
        navigate(`/metodist?tab=${tab}`);
    }
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
    if (!user || user.userType !== 'metodist') return 'Методист';
    return user.position || 'Методист';
  };

  return (
    <header className="h-header-main">
      <div className="h-header-logo-area">
        <div className="h-logo-mark">
          <img src='blue_icon.svg' alt="" className='h-image'/>
          <div>
            <div className="h-logo-title">Цифровой дневник</div>
            <div className="h-logo-subtitle">Политехнический колледж НовГУ</div>
          </div>
        </div>
      </div>

      <div className="dh-header-right-area">
        <div className="dh-header-theme-area">
          <ThemeToggle currentTheme={theme} onToggle={toggleTheme} />
        </div>

        <div className="h-header-profile-area" ref={dropdownRef}>
          <div className="h-profile-card" onClick={toggleDropdown}>
            <div className="h-profile-info">
              <span className="h-profile-name">{getFullName()}</span>
              <span className="h-profile-role">{getPosition()}</span>
            </div>
            <span className={`h-profile-arrow ${isDropdownOpen ? 'h-rotated' : ''}`}>▼</span>
          </div>
        
          {isDropdownOpen && (
            <div className="h-profile-dropdown">
              <div className="h-dropdown-user-info">
                <div className="h-user-gradient-bg"></div>
                <span className="h-dropdown-fullname">{getFullNameWithPatronymic()}</span>
                <span className="h-dropdown-position">{getPosition()}</span>
              </div>
              <div className="h-dropdown-menu">
                <button className="h-dropdown-item" onClick={() => handleNavigation('personal-cabinet')}>
                  Личный кабинет
                </button>
                <button className="h-dropdown-item" onClick={() => handleNavigation('edit-schedule')}>
                  Редактирование расписания
                </button>
                <button className="h-dropdown-item" onClick={() => handleNavigation('view-groups')}>
                  Просмотр групп
                </button>
                <button className="h-dropdown-item" onClick={() => handleNavigation('changes')}>
                  Замены
                </button>
                <div className="h-dropdown-divider"></div>
                <button className="h-dropdown-item h-logout" onClick={handleLogout}>
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