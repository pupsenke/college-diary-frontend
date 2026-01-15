import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import './PersonalCabinetSectionStyle.css';

export const PersonalCabinetSection: React.FC = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);

  const userProfile = {
    lastName: user?.lastName || 'Иванов',
    firstName: user?.name || 'Иван',
    patronymic: user?.patronymic || 'Иванович',
    department: 'Информационные технологии',
    email: 'i.i.ivanov@college.ru',
    phone: '+7 (911) 123-45-67',
    office: 'А-101',
    workPhone: '+7 (8162) 12-34-56',
    employmentDate: '15.08.2018',
    qualifications: ['Высшая категория', 'Кандидат технических наук']
  };

  const recentActivities = [
    { id: 1, action: 'Изменение расписания', date: '15.01.2024', time: '14:30' },
    { id: 2, action: 'Просмотр отчета по успеваемости', date: '14.01.2024', time: '11:15' },
    { id: 3, action: 'Редактирование данных преподавателя', date: '13.01.2024', time: '16:45' }
  ];

  return (
    <div className="dh-pc-section dh-pc-personal-section">
      {/* <div className="dh-pc-section-header">
        <h1 className="dh-pc-section-title">Личный кабинет</h1>
        <div className="dh-pc-section-controls">
          <button 
            className={`dh-pc-view-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Профиль
          </button>
          <button 
            className={`dh-pc-view-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            Безопасность
          </button>
        </div>
      </div>

      <div className="dh-pc-personal-content">
        {activeTab === 'profile' && (
          <div className="dh-pc-profile-tab">
            <div className="dh-pc-profile-header">
              <button 
                className="dh-pc-edit-btn"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Сохранить' : 'Редактировать'}
              </button>
            </div>

            <div className="dh-pc-profile-details">
              <div className="dh-pc-details-grid">
                <div className="dh-pc-detail-group">
                  <h3 className="dh-pc-detail-group-title">Основная информация</h3>
                  
                  <div className="dh-pc-detail-field">
                    <label>Фамилия</label>
                    {isEditing ? (
                      <input type="text" value={userProfile.lastName} />
                    ) : (
                      <p>{userProfile.lastName}</p>
                    )}
                  </div>

                  <div className="dh-pc-detail-field">
                    <label>Имя</label>
                    {isEditing ? (
                      <input type="text" value={userProfile.firstName} />
                    ) : (
                      <p>{userProfile.firstName}</p>
                    )}
                  </div>

                  <div className="dh-pc-detail-field">
                    <label>Отчество</label>
                    {isEditing ? (
                      <input type="text" value={userProfile.patronymic} />
                    ) : (
                      <p>{userProfile.patronymic}</p>
                    )}
                  </div>

                  <div className="dh-pc-detail-field">
                    <label>Должность</label>
                    <p></p>
                  </div>

                  <div className="dh-pc-detail-field">
                    <label>Отделение</label>
                    <p>{userProfile.department}</p>
                  </div>
                </div>

                <div className="dh-pc-detail-group">
                  <h3 className="dh-pc-detail-group-title">Контактная информация</h3>
                  
                  <div className="dh-pc-detail-field">
                    <label>Email</label>
                    {isEditing ? (
                      <input type="email" value={userProfile.email} />
                    ) : (
                      <p>{userProfile.email}</p>
                    )}
                  </div>

                  <div className="dh-pc-detail-field">
                    <label>Телефон</label>
                    {isEditing ? (
                      <input type="tel" value={userProfile.phone} />
                    ) : (
                      <p>{userProfile.phone}</p>
                    )}
                  </div>

                  <div className="dh-pc-detail-field">
                    <label>Рабочий телефон</label>
                    <p>{userProfile.workPhone}</p>
                  </div>

                  <div className="dh-pc-detail-field">
                    <label>Кабинет</label>
                    <p>{userProfile.office}</p>
                  </div>
                </div>

                <div className="dh-pc-detail-group">
                  <h3 className="dh-pc-detail-group-title">Профессиональная информация</h3>
                  
                  <div className="dh-pc-detail-field">
                    <label>Дата приема на работу</label>
                    <p>{userProfile.employmentDate}</p>
                  </div>

                  <div className="dh-pc-detail-field">
                    <label>Квалификация</label>
                    <div className="dh-pc-qualifications">
                      {userProfile.qualifications.map((qual, index) => (
                        <span key={index} className="dh-pc-qualification-tag">
                          {qual}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="dh-pc-security-tab">
            <div className="dh-pc-security-section">
              <h3 className="dh-pc-subsection-title">Смена пароля</h3>
              <div className="dh-pc-password-form">
                <div className="dh-pc-form-field">
                  <label>Текущий пароль</label>
                  <input type="password" placeholder="Введите текущий пароль" />
                </div>
                <div className="dh-pc-form-field">
                  <label>Новый пароль</label>
                  <input type="password" placeholder="Введите новый пароль" />
                </div>
                <div className="dh-pc-form-field">
                  <label>Подтвердите новый пароль</label>
                  <input type="password" placeholder="Повторите новый пароль" />
                </div>
                <button className="dh-pc-btn-primary">Сменить пароль</button>
              </div>
            </div>
          </div>
        )}
      </div> */}
    </div>
  );
};