import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import './HeaderStyle.css';

export const Header: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
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
    // Очищаем данные пользователя
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handlePersonalCabinet = () => {
    navigate('/student?tab=personal');
    setIsDropdownOpen(false);
  };

  const handleDocuments = () => {
    navigate('/student?tab=documents');
    setIsDropdownOpen(false);
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

  return (
    <header className="h-header-main">
      <div className="h-header-logo-area">
        <div className="h-logo-mark">
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
              {user?.userType === 'student' ? 'Студент' : 'Преподаватель'}
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
              <button className="h-dropdown-item" onClick={handlePersonalCabinet}>
                Личный кабинет
              </button>
              <button className="h-dropdown-item">
                Статистика
              </button>
              <button className="h-dropdown-item" onClick={handleDocuments}>
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