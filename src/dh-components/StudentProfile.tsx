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
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [marks, setMarks] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      const studentData = await headApiService.getStudentById(studentId);
      setStudent(studentData);
      setError(null);
      
      // Загружаем оценки и посещаемость параллельно
      await Promise.all([
        loadMarks(),
        loadAttendance()
      ]);
    } catch (err) {
      setError('Не удалось загрузить данные студента');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMarks = async () => {
    try {
      setLoadingMarks(true);
      const marksData = await headApiService.getStudentMarks(studentId);
      setMarks(marksData);
    } catch (err) {
      console.error('Ошибка загрузки оценок:', err);
    } finally {
      setLoadingMarks(false);
    }
  };

  const loadAttendance = async () => {
    try {
      setLoadingAttendance(true);
      const attendanceData = await headApiService.getStudentAttendance(studentId);
      setAttendance(attendanceData);
    } catch (err) {
      console.error('Ошибка загрузки посещаемости:', err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const loadDocuments = async () => {
    if (documents.length > 0) return;
    
    try {
      setLoadingDocuments(true);
      const documentsData = await headApiService.getStudentDocuments(studentId);
      setDocuments(documentsData);
    } catch (err) {
      console.error('Ошибка загрузки документов:', err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleTabChange = (tab: 'info' | 'documents') => {
    setActiveTab(tab);
    
    if (tab === 'documents') loadDocuments();
  };

  const downloadDocument = async (docId: number, fileName: string) => {
    try {
      await apiService.downloadDocument(docId);
    } catch (error) {
      console.error('Ошибка скачивания:', error);
      alert('Не удалось скачать документ');
    }
  };

  const calculateAverageMark = () => {
    if (!marks || marks.length === 0) return '—';
    
    let sum = 0;
    let count = 0;
    
    marks.forEach(subject => {
      if (subject.marksBySt) {
        subject.marksBySt.forEach((mark: any) => {
          if (mark.value && mark.value > 0) {
            sum += mark.value;
            count++;
          }
        });
      }
    });
    
    return count > 0 ? (sum / count).toFixed(2) : '—';
  };

  const calculateAttendancePercentage = () => {
    if (!attendance || attendance.length === 0) return '—';
    
    let present = 0;
    let total = 0;
    
    attendance.forEach(subject => {
      subject.attendances?.forEach((a: any) => {
        if (a.status) {
          total++;
          if (a.status === 'п') present++;
        }
      });
    });
    
    return total > 0 ? ((present / total) * 100).toFixed(1) + '%' : '—';
  };

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

          {/* Карточки со статистикой */}
          <div className="sp-stats-cards">
            <div className="sp-stat-card">
              <div className="sp-stat-title">Средний балл</div>
              <div className="sp-stat-value">
                {loadingMarks ? '...' : calculateAverageMark()}
              </div>
            </div>
            <div className="sp-stat-card">
              <div className="sp-stat-title">Посещаемость</div>
              <div className="sp-stat-value">
                {loadingAttendance ? '...' : calculateAttendancePercentage()}
              </div>
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
                    <div className="sp-info-value">{student.patronymic || '—'}</div>
                  </div>
                  <div className="sp-info-row">
                    <div className="sp-info-label">Дата рождения:</div>
                    <div className="sp-info-value">{student.birthDate || '—'}</div>
                  </div>
                  <div className="sp-info-row">
                    <div className="sp-info-label">Email:</div>
                    <div className="sp-info-value">{student.email || '—'}</div>
                  </div>
                  <div className="sp-info-row">
                    <div className="sp-info-label">Телефон:</div>
                    <div className="sp-info-value">{student.telephone || '—'}</div>
                  </div>
                  <div className="sp-info-row">
                    <div className="sp-info-label">Адрес:</div>
                    <div className="sp-info-value">{student.address || '—'}</div>
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