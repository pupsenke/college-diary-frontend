import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import './HeaderDepartmentHeadStyle.css';

export const HeaderDepartmentHead: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout, isDepartmentHead } = useUser();

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
    logout();
    navigate('/login');
    setIsDropdownOpen(false);
  };

  const handlePersonalCabinet = () => {
    navigate('/departmentHead?tab=personal');
    setIsDropdownOpen(false);
  };

  const handleDepartmentManagement = () => {
    navigate('/departmentHead?tab=management');
    setIsDropdownOpen(false);
  };

  const handleStaffManagement = () => {
    navigate('/departmentHead?tab=staff');
    setIsDropdownOpen(false);
  };

  const handleAcademicWork = () => {
    navigate('/departmentHead?tab=academic');
    setIsDropdownOpen(false);
  };

  const handleReports = () => {
    navigate('/departmentHead?tab=reports');
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

  // Получаем должность
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
              <button className="dh-dropdown-item" onClick={handlePersonalCabinet}>
                Личный кабинет
              </button>
              <button className="dh-dropdown-item" onClick={handleDepartmentManagement}>
                Управление отделением
              </button>
              <button className="dh-dropdown-item" onClick={handleStaffManagement}>
                Управление сотрудниками
              </button>
              <button className="dh-dropdown-item" onClick={handleAcademicWork}>
                Учебная работа
              </button>
              <button className="dh-dropdown-item" onClick={handleReports}>
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
    </header>
  );
};