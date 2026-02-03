import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import './SocialHeader.css';


export const SocialHeader: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, setUser } = useUser();

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
    localStorage.removeItem('userPassword');
    localStorage.removeItem('userLogin');
    localStorage.removeItem('userAllRoles');
    navigate('/login');
  };

  const handleReports = () => {
    navigate('/social?tab=reports');
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
    <header className="th-header-main">
      <div className="th-header-logo-area">
        <div className="th-logo-mark">
          <img src='/blue_icon.svg' alt="" className='th-image'/>
          <div>
            <div className="th-logo-title">Цифровой дневник</div>
            <div className="th-logo-subtitle">Политехнический колледж НовГУ</div>
          </div>
        </div>
      </div>
      <div className="th-header-profile-area" ref={dropdownRef}>
        <div className="th-profile-card" onClick={toggleDropdown}>
          <div className="th-profile-info">
            <span className="th-profile-name">{getFullName()}</span>
            <span className="th-profile-role">Социальный педагог</span>
          </div>
          <span className={`th-profile-arrow ${isDropdownOpen ? 'th-rotated' : ''}`}>▼</span>
        </div>
        
        {isDropdownOpen && (
          <div className="th-profile-dropdown">
            <div className="th-dropdown-user-info">
              <div className="th-user-gradient-bg"></div>
              <span className="th-dropdown-fullname">{getFullNameWithPatronymic()}</span>
              <span className="th-dropdown-department">Отдел социальной работы</span>
            </div>
            <div className="th-dropdown-menu">
              <button className="th-dropdown-item" onClick={handleReports}>
                <img src="th-icons/report_icon.svg" alt="Отчеты" className="dropdown-icon" />
                Отчеты
              </button>
              
              <div className="th-dropdown-divider"></div>
              
              <button className="th-dropdown-item th-logout" onClick={handleLogout}>
                <img src="th-icons/logout_icon.svg" alt="Выход" className="dropdown-icon" />
                Выйти
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};