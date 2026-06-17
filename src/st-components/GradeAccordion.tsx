import React, { useState } from 'react';
import { apiService } from '../services/studentApiService';
import { GradeDetail } from './PerformanceSection';

interface GradeAccordionItemProps {
  detail: GradeDetail;
  subject: string;
  teacher: string;
  studentId: number;
  onGradeClick: (subject: string, grade: number | null, number: number, topic: string, teacher: string, stId?: number) => void;
  onDownloadFile: (fileId: number, fileName: string) => void;
  getFileIcon: (fileName: string) => React.ReactNode; // Изменено с string на React.ReactNode
  getGradeColor: (grade: number | null) => string;
}

export const GradeAccordionItem: React.FC<GradeAccordionItemProps> = ({ 
  detail, 
  subject, 
  teacher, 
  studentId, 
  onGradeClick, 
  onDownloadFile, 
  getFileIcon, 
  getGradeColor 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [gradeComments, setGradeComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const loadGradeComments = async () => {
    if (!detail.stId) return;
    setLoadingComments(true);
    try {
      const info = await apiService.getMarkInfo(studentId, detail.stId, detail.id);
      console.log('Загруженные комментарии:', info.changes);
      setGradeComments(info.changes || []);
    } catch (error) {
      console.error('Ошибка загрузки комментариев:', error);
      setGradeComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggle = async () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (newExpanded && gradeComments.length === 0) {
      await loadGradeComments();
    }
  };

  const visibleComments = gradeComments.filter((change: any) => 
    change.comment || (change.files && change.files.length > 0)
  );

  return (
    <div className="pf-grade-accordion-item">
      <div 
        className={`pf-grade-accordion-header ${isExpanded ? 'pf-expanded' : ''}`}
        onClick={handleToggle}
      >
        <div className="pf-grade-header-info">
          <div className="pf-grade-main">
            <span 
              className={`pf-grade-value-small ${!detail.hasValue ? 'pf-no-data' : ''}`}
              style={{ 
                backgroundColor: detail.hasValue ? getGradeColor(detail.grade) : '#d1d5db'
              }}
            >
              {detail.hasValue ? detail.grade : '-'}
            </span>
            <div className="pf-grade-title">
              <span className="pf-grade-date">{detail.date}</span>
            </div>
          </div>
          <div className="pf-grade-actions">
            <button 
              className="pf-expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
            >
              <span className={`pf-expand-icon ${isExpanded ? 'pf-rotated' : ''}`}>
                <img 
                  src="/blue_toggle_icon_back.svg" 
                  alt="Развернуть"
                  className="pf-detail-icon"
                />
              </span>
            </button>
            <button 
              className="pf-detail-btn"
              onClick={(e) => {
                e.stopPropagation();
                onGradeClick(
                  subject,
                  detail.hasValue ? detail.grade : null,
                  detail.id,
                  detail.topic,
                  teacher,
                  detail.stId
                );
              }}
              title="Подробная информация"
            >
              <img 
                src="/st-icons/information_icon.svg" 
                alt="Подробная информация"
                className="pf-detail-icon"
              />
            </button>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="pf-grade-accordion-content">
          {loadingComments ? (
            <div className="pf-loading-small">
              <div className="pf-loading-spinner"></div>
              <p>Загрузка комментариев...</p>
            </div>
          ) : visibleComments.length > 0 ? (
            <div className="pf-grade-comments">
              {visibleComments.map((change: any) => (
                <div key={change.id} className="pf-grade-comment-item">
                  <div className="pf-comment-header">
                    <span className="pf-comment-author">
                      {change.teacherOrStudent ? 'Преподаватель' : 'Студент'}
                    </span>
                    <span className="pf-comment-date">
                      {new Date(change.dateTime).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  {change.comment && (
                    <div className="pf-comment-text">{change.comment}</div>
                  )}
                  {change.files && change.files.length > 0 && (
                    <div className="pf-comment-files">
                      {change.files.map((file: any) => (
                        <button
                          key={file.id}
                          className="pf-comment-file-link"
                          onClick={() => onDownloadFile(file.id, file.name)}
                        >
                          <span className="pf-file-icon">{getFileIcon(file.name)}</span>
                          <span className="pf-file-name">{file.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="pf-no-comments-message">
              <p>Нет комментариев к этой оценке</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};