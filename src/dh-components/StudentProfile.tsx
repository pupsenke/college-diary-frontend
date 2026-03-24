import React, { useState, useEffect } from 'react';
import './StudentProfileStyle.css';
import { headApiService, FullStudentInfo } from '../services/headApiService';
import { apiService } from '../services/studentApiService';

interface StudentProfileProps {
  studentId: number;
  onClose: () => void;
  groupName?: string;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ 
  studentId, 
  onClose,
  groupName 
}) => {
  const [student, setStudent] = useState<FullStudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'documents'>('info');

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      const studentData = await headApiService.getStudentById(studentId);
      setStudent(studentData);
      setError(null);
      
    } catch (err) {
      setError('Не удалось загрузить данные студента');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const getScrollbarWidth = () => {
      const div = document.createElement('div');
      div.style.overflow = 'scroll';
      div.style.position = 'absolute';
      div.style.top = '-9999px';
      document.body.appendChild(div);
      const scrollbarWidth = div.offsetWidth - div.clientWidth;
      document.body.removeChild(div);
      return scrollbarWidth;
    };

    const scrollbarWidth = getScrollbarWidth();
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.classList.add('modal-open');

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.classList.remove('modal-open');
    };
  }, []);

  const getFullName = () => {
    if (!student) return '';
    return `${student.lastName} ${student.name} ${student.patronymic}`;
  };

  const getInitials = () => {
    if (!student) return '';
    return `${student.name.charAt(0)}${student.patronymic?.charAt(0) || ''}`;
  };

  if (loading) {
    return (
      <div className="sp-modal-overlay" onClick={onClose}>
        <div className="sp-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="sp-loading">
            <div className="sp-loading-spinner"></div>
            <p>Загрузка профиля студента...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="sp-modal-overlay" onClick={onClose}>
        <div className="sp-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="sp-error">
            <p>{error || 'Данные студента не найдены'}</p>
            <button className="sp-close-button" onClick={onClose}>Закрыть</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-modal-overlay" onClick={onClose}>
      <div className="sp-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="sp-profile-container">
          {/* Шапка профиля */}
          <div className="sp-profile-header">
            <div className="sp-avatar-circle">
              {getInitials()}
            </div>
            <div className="sp-header-info">
              <h1 className="sp-student-name">{getFullName()}</h1>
              <div className="sp-student-meta">
                <span className="sp-meta-item">Студент</span>
                {groupName && <span className="sp-meta-item">Группа: {groupName}</span>}
              </div>
            </div>
            <div className="sp-modal-header">
              <button className="sp-modal-close" onClick={onClose}>×</button>
            </div>
          </div>

          {/* Контент табов */}
          <div className="sp-tab-content">
            {activeTab === 'info' && (
              <div className="sp-info-tab">
                <div className="sp-info-grid">
                  <div className="sp-info-row">
                    <div className="sp-info-label">Фамилия:</div>
                    <div className="sp-info-value">{student.lastName}</div>
                  </div>
                  <div className="sp-info-row">
                    <div className="sp-info-label">Имя:</div>
                    <div className="sp-info-value">{student.name}</div>
                  </div>
                  <div className="sp-info-row">
                    <div className="sp-info-label">Отчество:</div>
                    <div className="sp-info-value">{student.patronymic || '-'}</div>
                  </div>
                  <div className="sp-info-row">
                    <div className="sp-info-label">Дата рождения:</div>
                    <div className="sp-info-value">{student.birthDate || '-'}</div>
                  </div>
                  <div className="sp-info-row">
                    <div className="sp-info-label">Email:</div>
                    <div className="sp-info-value">{student.email || '-'}</div>
                  </div>
                  <div className="sp-info-row">
                    <div className="sp-info-label">Телефон:</div>
                    <div className="sp-info-value">{student.telephone || '-'}</div>
                  </div>
                  <div className="sp-info-row">
                    <div className="sp-info-label">Адрес:</div>
                    <div className="sp-info-value">{student.address || '-'}</div>
                  </div>
                  <div className="sp-info-row">
                    <div className="sp-info-label">Логин:</div>
                    <div className="sp-info-value">{student.login}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;