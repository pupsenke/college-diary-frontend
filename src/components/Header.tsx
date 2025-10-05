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
    <header className="header-main">
      <div className="header-logo-area">
        <div className="logo-mark">
          <img src='blue_icon.svg' alt="" className='image'/>
          <div>
            <div className="logo-title">Цифровой дневник</div>
            <div className="logo-subtitle">Политехнический колледж Новгу</div>
          </div>
        </div>
      </div>
      <div className="header-profile-area" ref={dropdownRef}>
        <div className="profile-card" onClick={toggleDropdown}>
          <div className="profile-info">
            <span className="profile-name">{getFullName()}</span>
            <span className="profile-role">
              {user?.userType === 'student' ? 'Студент' : 'Преподаватель'}
            </span>
          </div>
          <span className={`profile-arrow ${isDropdownOpen ? 'rotated' : ''}`}>▼</span>
        </div>
        
        {isDropdownOpen && (
          <div className="profile-dropdown">
            <div className="dropdown-user-info">
              <div className="user-gradient-bg"></div>
              <span className="dropdown-fullname">{getFullNameWithPatronymic()}</span>
              <span className="dropdown-group">Группа: {user?.numberGroup || '2992'}</span>
            </div>
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={handlePersonalCabinet}>
                Личный кабинет
              </button>
              <button className="dropdown-item">
                Статистика
              </button>
              <button className="dropdown-item" onClick={handleDocuments}>
                Документы
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout" onClick={handleLogout}>
                Выйти
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};