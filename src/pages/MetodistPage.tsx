import React, { useState } from 'react';
import { Header } from '../md-components/HeaderMetodist';
import { useUser } from '../context/UserContext';
import './MetodistStyle.css';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';

export const MetodistPage: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) {
    return (
      <div className="md-container">
        <div className="md-content">
          <div>Загрузка...</div>
        </div>
      </div>
    );
  }
  
  const handleEditScheduleClick = () => {
    navigate('/metodist/edit-schedule');
  };

  const handleViewGroupsClick = () => {
    navigate('/metodist/view-groups');
  };

  const handleChangesClick = () => {
    navigate('/metodist/changes');
  };

  const handleTeacherToRoomClick = () => {
    navigate('/metodist/teacher-to-room');
  };

  const handleNotesTeacherClick = () => {
    navigate('/metodist/notes-teacher');
  };

  const isHomePage = location.pathname === '/metodist' || location.pathname === '/metodist/';

  return (
    <div className="md-container">
      <div className="md-background-animation">
        <div className="md-shape md-shape-1"></div>
        <div className="md-shape md-shape-2"></div>
        <div className="md-shape md-shape-3"></div>
      </div>

      <div className="md-content">
        <Header />
        {isHomePage ? (
          <div className="md-white-background">
            <div className="md-main">
              <main className="md-content-area">
                <div className="md-section-header">
                  <h1 className="md-section-title">Панель методиста</h1>
                  <p className="md-section-subtitle">
                    Управление расписанием, группами и заменами преподавателей
                  </p>
                </div>
                <div className="md-buttons-grid">
                  <button className="md-button" onClick={handleEditScheduleClick}>
                    <div className="md-button-icon-container">
                      <img src="/md-icons/edit_icon.svg" alt="Редактировать" className="md-button-icon"/>
                    </div>
                    <h3 className="md-button-title">Редактировать расписание</h3>
                    <p className="md-button-desc">Изменение учебного расписания групп</p>
                  </button>
                  <button className="md-button" onClick={handleViewGroupsClick}>
                    <div className="md-button-icon-container">
                      <img src="/md-icons/view_icon.svg" alt="Просмотр" className="md-button-icon"/>
                    </div>
                    <h3 className="md-button-title">Просмотр групп</h3>
                    <p className="md-button-desc">Отображение списка учебных групп</p>
                  </button>
                  <button className="md-button" onClick={handleChangesClick}>
                    <div className="md-button-icon-container">
                      <img src="/md-icons/change_icon.svg" alt="Замены" className="md-button-icon"/>
                    </div>
                    <h3 className="md-button-title">Оформление замен</h3>
                    <p className="md-button-desc">Управление заменами преподавателей</p>
                  </button>
                  <button className="md-button" onClick={handleTeacherToRoomClick}>
                    <div className="md-button-icon-container">
                      <img src="/md-icons/room_icon.svg" alt="Аудитории" className="md-button-icon"/>
                    </div>
                    <h3 className="md-button-title">Аудитории</h3>
                    <p className="md-button-desc">Привязка преподавателей к аудитории</p>
                  </button>
                  <button className="md-button" onClick={handleNotesTeacherClick}>
                    <div className="md-button-icon-container">
                      <img src="/md-icons/room_icon.svg" alt="Заметки" className="md-button-icon"/>
                    </div>
                    <h3 className="md-button-title">Заметки</h3>
                    <p className="md-button-desc">Добавление примечаний к составлению расписания</p>
                  </button>
                </div>
              </main>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
};