import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import './PersonalCabinetSectionStyle.css';

export const PersonalCabinetSection: React.FC = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const userProfile = {
    lastName: user?.lastName || 'Иванов',
    firstName: user?.name || 'Иван',
    patronymic: user?.patronymic || 'Иванович',
    department: 'Информационные технологии',
    email: 'g.a.golubeva@college.ru',
    phone: '+7 (911) 123-45-67',
    office: '208',
    workPhone: '+7 (8162) 12-34-56',
    employmentDate: '15.08.2018'
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Здесь будет логика смены пароля
    console.log('Смена пароля:', passwordForm);
    setIsPasswordModalOpen(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="dh-pc-section dh-pc-personal-section">
      <div className="dh-pc-section-header">
        <h1 className="dh-pc-section-title">Личный кабинет</h1>
      </div>

      <div className="dh-pc-personal-content">
        <div className="dh-pc-profile-tab">
          

          <div className="dh-pc-profile-details">
            <div className="dh-pc-details-grid">
              <div className="dh-pc-detail-group">
                <h3 className="dh-pc-detail-group-title">Основная информация</h3>
                
                <div className="dh-pc-detail-field">
                  <label>Фамилия</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={userProfile.lastName} 
                      onChange={(e) => {}}
                    />
                  ) : (
                    <p>{userProfile.lastName}</p>
                  )}
                </div>

                <div className="dh-pc-detail-field">
                  <label>Имя</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={userProfile.firstName} 
                      onChange={(e) => {}}
                    />
                  ) : (
                    <p>{userProfile.firstName}</p>
                  )}
                </div>

                <div className="dh-pc-detail-field">
                  <label>Отчество</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={userProfile.patronymic} 
                      onChange={(e) => {}}
                    />
                  ) : (
                    <p>{userProfile.patronymic}</p>
                  )}
                </div>

                <div className="dh-pc-detail-field">
                  <label>Должность</label>
                  <p>Заведующий отделением</p>
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
                    <input 
                      type="email" 
                      value={userProfile.email} 
                      onChange={(e) => {}}
                    />
                  ) : (
                    <p>{userProfile.email}</p>
                  )}
                </div>

                <div className="dh-pc-detail-field">
                  <label>Телефон</label>
                  {isEditing ? (
                    <input 
                      type="tel" 
                      value={userProfile.phone} 
                      onChange={(e) => {}}
                    />
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
            </div>
          </div>
        </div>

        <div className="dh-pc-profile-footer">
            <div className="dh-pc-header-actions">
              <button 
                className="dh-pc-edit-btn"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Сохранить' : 'Редактировать профиль'}
              </button>
              <button 
                className="dh-pc-password-btn"
                onClick={() => setIsPasswordModalOpen(true)}
              >
                Сменить пароль
              </button>
            </div>
          </div>
      </div>

      {/* Модальное окно смены пароля */}
      {isPasswordModalOpen && (
        <div className="dh-pc-modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="dh-pc-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="dh-pc-modal-header">
              <h3 className="dh-pc-modal-title">Смена пароля</h3>
              <button 
                className="dh-pc-modal-close"
                onClick={() => setIsPasswordModalOpen(false)}
              >
                ×
              </button>
            </div>
            
            <form className="dh-pc-password-form" onSubmit={handlePasswordSubmit}>
              <div className="dh-pc-form-field">
                <label htmlFor="currentPassword">Текущий пароль</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Введите текущий пароль"
                  required
                />
              </div>
              
              <div className="dh-pc-form-field">
                <label htmlFor="newPassword">Новый пароль</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Введите новый пароль"
                  required
                />
              </div>
              
              <div className="dh-pc-form-field">
                <label htmlFor="confirmPassword">Подтвердите новый пароль</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Повторите новый пароль"
                  required
                />
              </div>
              
              <div className="dh-pc-modal-actions">
                <button 
                  type="button"
                  className="dh-pc-btn-secondary"
                  onClick={() => setIsPasswordModalOpen(false)}
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  className="dh-pc-btn-primary"
                >
                  Сменить пароль
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};