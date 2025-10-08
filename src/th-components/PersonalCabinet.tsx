import React from 'react';
import { useUser } from '../context/UserContext';

export const PersonalCabinet: React.FC = () => {
  const { user } = useUser();

  return (
    <div className="personal-cabinet">
      <h2>Личный кабинет преподавателя</h2>
      <div className="personal-info">
        <div className="info-row">
          <label>Фамилия:</label>
          <span>{user?.lastName || 'Фамилия'}</span>
        </div>
        <div className="info-row">
          <label>Имя:</label>
          <span>{user?.name || 'Имя'}</span>
        </div>
        <div className="info-row">
          <label>Отчество:</label>
          <span>{user?.surname || 'Отчество'}</span>
        </div>
        <div className="info-row">
          <label>Эл. почта:</label>
          <span>{user?.email || 's123456@std.nosu.ru'}</span>
        </div>
        <div className="info-row">
          <label>Специальность:</label>
          <span>Математика и информатика</span>
        </div>
        <div className="info-row">
          <label>Общий стаж:</label>
          <span>27 лет</span>
        </div>
      </div>
      
      <div className="teaching-info">
        <h3>Преподаваемые дисциплины</h3>
        <ul>
          <li>Дипломное проектирование 09.02.07</li>
          <li>МДК 02.01 Технология разработки программного обеспечения</li>
          <li>Операционные системы и среды</li>
          <li>Основы разработки программного обеспечения</li>
          <li>ПРАКТИКА ПРОИЗВОДСТВЕННАЯ 09.02.07</li>
          <li>ИНФОРМАЦИОННЫЕ СИСТЕМЫ И ПРОГРАММИРОВАНИЕ</li>
        </ul>
      </div>
    </div>
  );
};