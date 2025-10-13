import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import './HeaderStudentStyle.css';

export const Header: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

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
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleNavigation = (tab: string) => {
    // Закрываем dropdown
    setIsDropdownOpen(false);
    
    // Если мы уже на странице студента, просто обновляем параметр tab
    if (location.pathname === '/student') {
      navigate(`/student?tab=${tab}`);
    } else {
      // Если мы на другой странице, переходим на страницу студента с нужным tab
      navigate(`/student?tab=${tab}`);
    }
  };

  // Форматируем ФИО
  const getFullName = () => {
    if (!user) return 'Фамилия Имя';
    return `${user.lastName} ${user.name}`;
  };

  const getFullNameWithPatronymic = () => {
    if (!user) return 'Фамилия Имя Отчество';
    return `${user.lastName} ${user.name} ${user.surname}`;
  };

  // Обработчик клика по логотипу
  const handleLogoClick = () => {
    if (user?.userType === 'student') {
      navigate('/student');
    } else {
      navigate('/');
    }
  };

  return (
    <header className="h-header-main">
      <div className="h-header-logo-area">
        <div className="h-logo-mark" onClick={handleLogoClick} style={{cursor: 'pointer'}}>
          <img src='blue_icon.svg' alt="" className='h-image'/>
          <div>
            <div className="h-logo-title">Цифровой дневник</div>
            <div className="h-logo-subtitle">Политехнический колледж Новгу</div>
          </div>
        </div>
      </div>
      <div className="h-header-profile-area" ref={dropdownRef}>
        <div className="h-profile-card" onClick={toggleDropdown}>
          <div className="h-profile-info">
            <span className="h-profile-name">{getFullName()}</span>
            <span className="h-profile-role">
              {user?.userType === 'student' ? 'Студент' : ''}
            </span>
          </div>
          <span className={`h-profile-arrow ${isDropdownOpen ? 'h-rotated' : ''}`}>▼</span>
        </div>
        
        {isDropdownOpen && (
          <div className="h-profile-dropdown">
            <div className="h-dropdown-user-info">
              <div className="h-user-gradient-bg"></div>
              <span className="h-dropdown-fullname">{getFullNameWithPatronymic()}</span>
              <span className="h-dropdown-group">Группа: {user?.numberGroup || '2992'}</span>
            </div>
            <div className="h-dropdown-menu">
              <button 
                className="h-dropdown-item" 
                onClick={() => handleNavigation('main')}
              >
                Главная страница
              </button>
              <button 
                className="h-dropdown-item" 
                onClick={() => handleNavigation('personal')}
              >
                Личный кабинет
              </button>
              <button 
                className="h-dropdown-item" 
                onClick={() => handleNavigation('documents')}
              >
                Документы
              </button>
              <div className="h-dropdown-divider"></div>
              <button className="h-dropdown-item h-logout" onClick={handleLogout}>
                Выйти
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};