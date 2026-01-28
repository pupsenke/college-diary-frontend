import React from 'react';
import './DepartmentManagementSectionStyle.css';

interface GroupDetailProps {
  groupId: number;
  onClose: () => void;
}

export const GroupDetail: React.FC<GroupDetailProps> = ({ groupId, onClose }) => {
  const groupInfo = {
    id: groupId,
    name: `2992`,
    curator: 'Голубева Г.А.',
    leader: 'Шевякова А.И.',
    students: 26,
    speciality: '09.02.07 Информационные системы и программирование',
    year: 2022,
    semester: 'Осенний',
    performance: 4.2,
    attendance: 87.5,
    course: 4,
  };

  return (
    <div className="dhm-group-modal">
      <div className="dhm-group-modal-header">
        <div className="dhm-modal-header-content">
          <div className="dhm-group-badge-large">{groupInfo.name}</div>
          <div className="dhm-group-subtitle">{groupInfo.course} курс • {groupInfo.students} студентов</div>
        </div>
        <button className="dhm-modal-close" onClick={onClose}>×</button>
      </div>

      <div className="dhm-group-modal-body">
        {/* Основная информация о группе */}
        <div className="dhm-group-main-info">
          <div className="dhm-group-stats">
            <div className="dhm-group-stat-item">
              <div className="dhm-stat-content">
                <div className="dhm-stat-label">Средний балл</div>
                <div className="dhm-stat-value">{groupInfo.performance}</div>
              </div>
            </div>

            <div className="dhm-group-stat-item">
              <div className="dhm-stat-content">
                <div className="dhm-stat-label">Посещаемость</div>
                <div className="dhm-stat-value">{groupInfo.attendance}%</div>
              </div>
            </div>
          </div>

          <div className="dhm-group-details-grid">
            <div className="dhm-detail-item">
              <div className="dhm-detail-label">Куратор</div>
              <div className="dhm-detail-value">{groupInfo.curator}</div>
            </div>
            <div className="dhm-detail-item">
              <div className="dhm-detail-label">Староста</div>
              <div className="dhm-detail-value">{groupInfo.leader}</div>
            </div>
            <div className="dhm-detail-item">
              <div className="dhm-detail-label">Специальность</div>
              <div className="dhm-detail-value">{groupInfo.speciality}</div>
            </div>
            <div className="dhm-detail-item">
              <div className="dhm-detail-label">Год поступления</div>
              <div className="dhm-detail-value">{groupInfo.year}</div>
            </div>
          </div>
        </div>

        {/* Список студентов */}
        <div className="dhm-group-section">
          <div className="dhm-section-header-small">
            <h3 className="dhm-section-title">Список студентов</h3>
            <button className="dhm-view-all-btn">
              Показать всех ({groupInfo.students})
            </button>
          </div>
          <div className="dhm-group-section-content">
            <div className="dhm-students-preview">
              <div className="dhm-student-item">
                <div className="dhm-student-avatar">АИ</div>
                <div className="dhm-student-info">
                  <div className="dhm-student-name">Шевякова Алина Ильинична</div>
                  <div className="dhm-student-status">Староста</div>
                </div>
              </div>
              <div className="dhm-student-item">
                <div className="dhm-student-avatar">ВА</div>
                <div className="dhm-student-info">
                  <div className="dhm-student-name">Шкиперова Валерия Анатольевна</div>
                </div>
              </div>
              <div className="dhm-student-item">
                <div className="dhm-student-avatar">АР</div>
                <div className="dhm-student-info">
                  <div className="dhm-student-name">Темнева Альбина Руслановна</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Расписание */}
        <div className="dhm-group-section">
          <div className="dhm-section-header-small">
            <h3 className="dhm-section-title">Расписание на неделю</h3>
            <div className="dhm-schedule-actions">
              <button className="dhm-schedule-btn">Текущая неделя</button>
              <button className="dhm-schedule-btn">Следующая неделя</button>
            </div>
          </div>
          <div className="dhm-group-section-content">
            <div className="dhm-schedule-preview">
              <h3>ЗДЕСЬ БУДЕТ РАСПИСАНИЕ ГРУППЫ</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="dhm-group-modal-footer">
        <button className="dhm-modal-btn dhm-modal-btn-secondary" onClick={onClose}>
          Закрыть
        </button>
        <button className="dhm-modal-btn dhm-modal-btn-primary">
          Редактировать группу
        </button>
        <button className="dhm-modal-btn dhm-modal-btn-secondary">
          Экспорт данных
        </button>
      </div>
    </div>
  );
};

