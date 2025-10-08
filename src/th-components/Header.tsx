import React from 'react';
import './Header.css';

export const Header: React.FC = () => {
  return (
    <header className="teacher-header">
      <div className="header-content">
        <div className="header-logo">
          <h1>Цифровой дневник</h1>
          <p>Политехнический колледж Hoary</p>
        </div>
        <div className="header-actions">
          <button className="notification-btn">
            <img src="notification_icon.svg" alt="Уведомления" />
          </button>
          <button className="logout-btn">
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
};