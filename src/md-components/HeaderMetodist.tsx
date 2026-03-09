import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import './HeaderMetodist.css';

export const Header: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, isStudent } = useUser();

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

  const handleEditSchedule = () => {
    navigate('/metodist/edit-schedule');
    setIsDropdownOpen(false);
  };

  const handleViewSection = () => {
    navigate('/metodist/view-groups');
    setIsDropdownOpen(false);
  };

  const handleChangesSchedule = () => {
    navigate('/metodist/changes');
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
              {isStudent ? 'Студент' : user?.userType === 'teacher' ? 'Преподаватель' : 'Методист'}
            </span>
          </div>
          <span className={`h-profile-arrow ${isDropdownOpen ? 'h-rotated' : ''}`}>▼</span>
        </div>
        
        {isDropdownOpen && (
          <div className="h-profile-dropdown">
            <div className="h-dropdown-user-info">
              <div className="h-user-gradient-bg"></div>
              <span className="h-dropdown-fullname">{getFullNameWithPatronymic()}</span>
            </div>
            <div className="h-dropdown-menu">
              <button className="h-dropdown-item" onClick={handleEditSchedule}>
                Редактирование расписания
              </button>
              <button className="h-dropdown-item" onClick={handleViewSection}>
                Просмотр групп
              </button>
              <button className="h-dropdown-item" onClick={handleChangesSchedule}>
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
    </header>
  );
};