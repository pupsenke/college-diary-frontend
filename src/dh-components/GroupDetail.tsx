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
    <div className="dh-group-modal">
      <div className="dh-group-modal-header">
        <div className="dh-modal-header-content">
          <div className="dh-group-badge-large">{groupInfo.name}</div>
          <div className="dh-group-subtitle">{groupInfo.course} курс • {groupInfo.students} студентов</div>
        </div>
        <button className="dh-modal-close" onClick={onClose}>×</button>
      </div>

      <div className="dh-group-modal-body">
        {/* Основная информация о группе */}
        <div className="dh-group-main-info">
          <div className="dh-group-stats">
            <div className="dh-group-stat-item">
              <div className="dh-stat-content">
                <div className="dh-stat-label">Средний балл</div>
                <div className="dh-stat-value">{groupInfo.performance}</div>
              </div>
            </div>

            <div className="dh-group-stat-item">
              <div className="dh-stat-content">
                <div className="dh-stat-label">Посещаемость</div>
                <div className="dh-stat-value">{groupInfo.attendance}%</div>
              </div>
            </div>
          </div>

          <div className="dh-group-details-grid">
            <div className="dh-detail-item">
              <div className="dh-detail-label">Куратор</div>
              <div className="dh-detail-value">{groupInfo.curator}</div>
            </div>
            <div className="dh-detail-item">
              <div className="dh-detail-label">Староста</div>
              <div className="dh-detail-value">{groupInfo.leader}</div>
            </div>
            <div className="dh-detail-item">
              <div className="dh-detail-label">Специальность</div>
              <div className="dh-detail-value">{groupInfo.speciality}</div>
            </div>
            <div className="dh-detail-item">
              <div className="dh-detail-label">Год поступления</div>
              <div className="dh-detail-value">{groupInfo.year}</div>
            </div>
          </div>
        </div>

        {/* Список студентов */}
        <div className="dh-group-section">
          <div className="dh-section-header-small">
            <h3 className="dh-section-title">Список студентов</h3>
            <button className="dh-view-all-btn">
              Показать всех ({groupInfo.students})
            </button>
          </div>
          <div className="dh-group-section-content">
            <div className="dh-students-preview">
              <div className="dh-student-item">
                <div className="dh-student-avatar">ША</div>
                <div className="dh-student-info">
                  <div className="dh-student-name">Шевякова Алина Ильинична</div>
                  <div className="dh-student-status">Староста</div>
                </div>
              </div>
              <div className="dh-student-item">
                <div className="dh-student-avatar">ПИ</div>
                <div className="dh-student-info">
                  <div className="dh-student-name">Петров Иван Сергеевич</div>
                </div>
              </div>
              <div className="dh-student-item">
                <div className="dh-student-avatar">СК</div>
                <div className="dh-student-info">
                  <div className="dh-student-name">Сидорова Ксения Андреевна</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Расписание */}
        <div className="dh-group-section">
          <div className="dh-section-header-small">
            <h3 className="dh-section-title">Расписание на неделю</h3>
            <div className="dh-schedule-actions">
              <button className="dh-schedule-btn">Текущая неделя</button>
              <button className="dh-schedule-btn">Следующая неделя</button>
            </div>
          </div>
          <div className="dh-group-section-content">
            <div className="dh-schedule-preview">
              <h3>ЗДЕСЬ БУДЕТ РАСПИСАНИЕ ГРУППЫ</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="dh-group-modal-footer">
        <button className="dh-modal-btn dh-modal-btn-secondary" onClick={onClose}>
          Закрыть
        </button>
        <button className="dh-modal-btn dh-modal-btn-primary">
          Редактировать группу
        </button>
        <button className="dh-modal-btn dh-modal-btn-secondary">
          Экспорт данных
        </button>
      </div>
    </div>
  );
};