import React, { useState, useEffect } from 'react';
import './DepartmentManagementSectionStyle.css';
import { 
  headApiService, 
  GroupInfo as ApiGroupInfo,
  CuratorInfo,
  StudentInfo 
} from '../services/headApiService';

interface GroupDetailProps {
  groupId: number;
  onClose: () => void;
}

export const GroupDetail: React.FC<GroupDetailProps> = ({ groupId, onClose }) => {
  const [groupInfo, setGroupInfo] = useState<ApiGroupInfo | null>(null);
  const [curatorInfo, setCuratorInfo] = useState<CuratorInfo | null>(null);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [searchStudentTerm, setSearchStudentTerm] = useState('');

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  const loadGroupData = async () => {
    try {
      setLoading(true);
      
      // Загружаем группы и находим нужную
      const groups = await headApiService.getGroups();
      const group = groups.find(g => g.id === groupId);
      
      if (!group) {
        throw new Error('Группа не найдена');
      }

      const groupData: ApiGroupInfo = {
        id: group.id,
        name: group.numberGroup.toString(),
        numberGroup: group.numberGroup,
        admissionYear: group.admissionYear,
        course: group.course,
        formEducation: group.formEducation,
        profile: group.profile,
        specialty: group.specialty,
        curatorId: group.idCurator
      };
      setGroupInfo(groupData);

      // Загружаем куратора
      try {
        const curator = await headApiService.getCurator(group.idCurator);
        setCuratorInfo({
          lastName: curator.lastName,
          name: curator.name,
          patronymic: curator.patronymic,
          email: curator.email
        });
      } catch (curatorError) {
        console.error('Ошибка при загрузке куратора:', curatorError);
        setCuratorInfo(null);
      }

      // Загружаем студентов
      const studentsData = await headApiService.getGroupStudents(groupId);
      setStudents(studentsData);

      setError(null);
    } catch (error) {
      console.error('Ошибка при загрузке данных группы:', error);
      setError('Не удалось загрузить данные группы');
    } finally {
      setLoading(false);
    }
  };

  const getCuratorInitials = () => {
    if (!curatorInfo) return 'Не указан';
    return `${curatorInfo.lastName} ${curatorInfo.name.charAt(0)}.${curatorInfo.patronymic ? curatorInfo.patronymic.charAt(0) + '.' : ''}`;
  };

  const getStudentFullName = (student: StudentInfo) => {
    return `${student.lastName} ${student.name} ${student.patronymic}`;
  };

  const getStudentInitials = (student: StudentInfo) => {
    const nameInitial = student.name.charAt(0);
    const patronymicInitial = student.patronymic ? student.patronymic.charAt(0) : '';
    return `${nameInitial}${patronymicInitial}`;
  };

  const toggleShowAllStudents = () => {
    setShowAllStudents(!showAllStudents);
  };

  const filteredStudents = students.filter(student => {
    const fullName = getStudentFullName(student).toLowerCase();
    const searchTerm = searchStudentTerm.toLowerCase();
    return fullName.includes(searchTerm) || 
           student.email?.toLowerCase().includes(searchTerm) ||
           student.telephone?.includes(searchTerm);
  });

  const displayedStudents = showAllStudents ? filteredStudents : filteredStudents.slice(0, 5);

  if (loading) {
    return (
      <div className="dhm-group-modal">
        <div className="dhm-group-modal-header">
          <div className="dhm-modal-header-content">
            <div className="dhm-group-badge-large">Загрузка...</div>
          </div>
          <button className="dhm-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="dhm-group-modal-body">
          <div className="dhm-loading">
            <div className="dhm-loading-spinner"></div>
            <p>Загрузка данных группы...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !groupInfo) {
    return (
      <div className="dhm-group-modal">
        <div className="dhm-group-modal-header">
          <div className="dhm-modal-header-content">
            <div className="dhm-group-badge-large">Ошибка</div>
          </div>
          <button className="dhm-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="dhm-group-modal-body">
          <div className="dhm-error">
            <p className="dhm-error-message">{error || 'Группа не найдена'}</p>
            <button 
              className="dhm-retry-button"
              onClick={loadGroupData}
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dhm-group-modal">
      <div className="dhm-group-modal-header">
        <div className="dhm-modal-header-content">
          <div className="dhm-group-badge-large">{groupInfo.name}</div>
          <div className="dhm-group-subtitle">
            {groupInfo.course} курс • {students.length} студентов • {groupInfo.formEducation}
          </div>
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
                <div className="dhm-stat-value">Пропуск</div>
              </div>
            </div>

            <div className="dhm-group-stat-item">
              <div className="dhm-stat-content">
                <div className="dhm-stat-label">Посещаемость</div>
                <div className="dhm-stat-value">Пропуск</div>
              </div>
            </div>
          </div>

          <div className="dhm-group-details-grid">
            <div className="dhm-detail-item">
              <div className="dhm-detail-label">Куратор</div>
              <div className="dhm-detail-value">{getCuratorInitials()}</div>
              {curatorInfo?.email && (
                <div className="dhm-detail-email">{curatorInfo.email}</div>
              )}
            </div>
            <div className="dhm-detail-item">
              <div className="dhm-detail-label">Староста</div>
              <div className="dhm-detail-value">Пропуск</div>
            </div>
            <div className="dhm-detail-item">
              <div className="dhm-detail-label">Специальность</div>
              <div className="dhm-detail-value">{groupInfo.specialty}</div>
            </div>
            <div className="dhm-detail-item">
              <div className="dhm-detail-label">Профиль</div>
              <div className="dhm-detail-value">{groupInfo.profile}</div>
            </div>
            <div className="dhm-detail-item">
              <div className="dhm-detail-label">Год поступления</div>
              <div className="dhm-detail-value">{groupInfo.admissionYear}</div>
            </div>
            <div className="dhm-detail-item">
              <div className="dhm-detail-label">Форма обучения</div>
              <div className="dhm-detail-value">{groupInfo.formEducation}</div>
            </div>
          </div>
        </div>

        {/* Список студентов */}
        <div className="dhm-group-section">
          <div className="dhm-section-header-small">
            <h3 className="dhm-section-title">Список студентов</h3>
            <div className="dhm-student-actions">
              {students.length > 5 && (
                <button 
                  className="dhm-view-all-btn"
                  onClick={toggleShowAllStudents}
                >
                  {showAllStudents ? 'Скрыть' : `Показать всех (${students.length})`}
                </button>
              )}
            </div>
          </div>
          
          {/* Поиск студентов */}
          {showAllStudents && (
            <div className="dhm-student-search-container">
              <input
                type="text"
                className="dhm-search-input"
                placeholder="Поиск по имени, фамилии, email или телефону..."
                value={searchStudentTerm}
                onChange={(e) => setSearchStudentTerm(e.target.value)}
              />
            </div>
          )}
          
          <div className="dhm-group-section-content">
            {students.length > 0 ? (
              <div className={`dhm-students-preview ${showAllStudents ? 'dhm-all-students' : ''}`}>
                {displayedStudents.map((student) => (
                  <div key={student.id} className="dhm-student-item">
                    <div className="dhm-student-avatar">
                      {getStudentInitials(student)}
                    </div>
                    <div className="dhm-student-info">
                      <div className="dhm-student-name">
                        {getStudentFullName(student)}
                      </div>
                      <div className="dhm-student-contact">
                        {student.email && (
                          <div className="dhm-student-email">
                            <span className="dhm-contact-label">Email:</span> {student.email}
                          </div>
                        )}
                        {student.telephone && (
                          <div className="dhm-student-phone">
                            <span className="dhm-contact-label">Тел:</span> {student.telephone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {!showAllStudents && students.length > 5 && (
                  <div className="dhm-more-students">
                    <span>... и еще {students.length - 5} студентов</span>
                  </div>
                )}
                
                {showAllStudents && filteredStudents.length === 0 && (
                  <div className="dhm-no-results">
                    <p>Студенты не найдены. Попробуйте другой поисковый запрос.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="dhm-no-students">
                <p>В группе нет студентов</p>
              </div>
            )}
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
              <div className="dhm-schedule-placeholder">
                <h3>ЗДЕСЬ БУДЕТ РАСПИСАНИЕ ГРУППЫ</h3>
                <p>Функционал расписания будет потом</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dhm-group-modal-footer">
        <button className="dhm-modal-btn dhm-modal-btn-secondary" onClick={onClose}>
          Закрыть
        </button>
        <button className="dhm-modal-btn dhm-modal-btn-primary" disabled>
          Редактировать группу (недоступно)
        </button>
        <button className="dhm-modal-btn dhm-modal-btn-secondary" disabled>
          Экспорт данных (недоступно)
        </button>
      </div>
    </div>
  );
};