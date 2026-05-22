// DepartmentGroupsList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { headApiService, StudentInfo } from '../services/headApiService';
import StudentProfile from './StudentProfile';
import { cacheService } from '../services/cacheService';
import { CACHE_TTL } from '../services/cacheConstants';
import './DepartmentGroupsListStyle.css';

interface GroupData {
  id: number;
  name: string;
  numberGroup: number;
  course: number;
  students: number;
  curator: string;
  curatorId: number;
  speciality: string;
  profile: string;
  averageGrade?: number;
  attendance?: number;
}

interface DepartmentGroupsListProps {
  groups: GroupData[];
  onGroupSelect?: (groupId: number) => void;
}

// Хук для кешированной загрузки студентов группы
function useCachedGroupStudents(groupId: number | null) {
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const loadStudents = useCallback(async (ignoreCache = false) => {
    if (!groupId) return;

    setLoading(true);
    setError(null);

    try {
      const cacheKey = `group_students_${groupId}`;

      // Проверяем кеш если не игнорируем
      if (!ignoreCache) {
        const cached = cacheService.get<StudentInfo[]>(cacheKey, { ttl: CACHE_TTL.GROUP_STUDENTS });
        if (cached) {
          setStudents(cached);
          setFromCache(true);
          setLoading(false);
          
          // Если есть интернет, обновляем в фоне
          if (cacheService.isNetworkOnline()) {
            loadStudents(true);
          }
          return;
        }
      }

      // Если нет интернета и нет кеша
      if (!cacheService.isNetworkOnline()) {
        throw new Error('Нет подключения к интернету');
      }

      // Загружаем свежие данные
      const freshStudents = await headApiService.getGroupStudents(groupId);
      setStudents(freshStudents);
      setFromCache(false);
      
      // Сохраняем в кеш
      cacheService.set(cacheKey, freshStudents, { ttl: CACHE_TTL.GROUP_STUDENTS });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки студентов');
      
      // Пробуем кеш как fallback
      const cacheKey = `group_students_${groupId}`;
      const cached = cacheService.get<StudentInfo[]>(cacheKey, { ttl: CACHE_TTL.GROUP_STUDENTS });
      if (cached) {
        setStudents(cached);
        setFromCache(true);
        setError('Используются кэшированные данные');
      }
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) {
      loadStudents();
    }
  }, [groupId, loadStudents]);

  return { students, loading, error, fromCache, refetch: () => loadStudents(true) };
}

// Компонент для отображения информации о группе с кешированием
const GroupExpandedInfo: React.FC<{ 
  group: GroupData; 
  onStudentClick: (studentId: number, groupName: string) => void;
}> = ({ group, onStudentClick }) => {
  const { students, loading, error, fromCache } = useCachedGroupStudents(group.id);

  const getStudentFullName = (student: StudentInfo) => {
    return `${student.lastName} ${student.name} ${student.patronymic}`;
  };

  const getStudentInitials = (student: StudentInfo) => {
    const nameInitial = student.name.charAt(0);
    const patronymicInitial = student.patronymic ? student.patronymic.charAt(0) : '';
    return `${nameInitial}${patronymicInitial}`;
  };

  return (
    <div className="dgl-group-expanded-info">
      {/* Предупреждение о кеше */}
      {fromCache && !loading && (
        <div className="dgl-cache-badge">
          <span className="dgl-cache-text">Нет подключения к интернету. Отображаются сохраненные данные из локального хранилища</span>
        </div>
      )}

      {/* Основная информация о группе */}
      <div className="dgl-expanded-grid">
        <div className="dgl-expanded-item">
          <span className="dgl-expanded-label">Специальность</span>
          <span className="dgl-expanded-value">{group.speciality}</span>
        </div>
        <div className="dgl-expanded-item">
          <span className="dgl-expanded-label">Профиль</span>
          <span className="dgl-expanded-value">{group.profile}</span>
        </div>
        <div className="dgl-expanded-item">
          <span className="dgl-expanded-label">Куратор</span>
          <span className="dgl-expanded-value">{group.curator}</span>
        </div>
      </div>

      {/* Список студентов со скроллом */}
      <div className="dgl-students-section">
        <div className="dgl-students-header">
          <span className="dgl-students-title">Список студентов</span>
          <span className="dgl-students-count">{students.length} чел.</span>
        </div>
        
        {loading && !students.length ? (
          <div className="dgl-students-loading">
            <div className="dgl-loading-spinner-small"></div>
            <span>Загрузка студентов...</span>
          </div>
        ) : error && !students.length ? (
          <div className="dgl-students-error">
            <span className="dgl-error-icon">⚠️</span>
            <span className="dgl-error-text">{error}</span>
          </div>
        ) : students.length === 0 ? (
          <div className="dgl-no-students">
            <p>В группе нет студентов</p>
          </div>
        ) : (
          <div className="dgl-students-list-scrollable">
            {students.map((student) => (
              <div 
                key={student.id} 
                className="dgl-student-item"
                onClick={() => onStudentClick(student.id, group.name)}
              >
                <div className="dgl-student-avatar">
                  {getStudentInitials(student)}
                </div>
                <div className="dgl-student-info">
                  <div className="dgl-student-name">
                    {getStudentFullName(student)}
                  </div>
                  <div className="dgl-student-contact">
                    {student.email && (
                      <span className="dgl-student-email">{student.email}</span>
                    )}
                    {student.telephone && (
                      <span className="dgl-student-phone">{student.telephone}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Компонент для отображения метрик с заглушками
const GroupMetrics: React.FC<{ group: GroupData }> = ({ group }) => {
  // Заглушки для среднего балла и посещаемости
  const displayAverageGrade = 0;
  const displayAttendance = 0;

  return (
    <div className="dgl-group-stats">
      <div className="dgl-group-stat">
        <span className="dgl-stat-label">Студентов:</span>
        <span className="dgl-stat-value">{group.students}</span>
      </div>
      <div className="dgl-group-stat">
        <span className="dgl-stat-label">Куратор:</span>
        <span className="dgl-stat-value">{group.curator}</span>
      </div>
      {/* <div className="dgl-group-stat placeholder-stat">
        <span className="dgl-stat-label">Ср. балл:</span>
        <span className="dgl-stat-value demo-value">
          {displayAverageGrade.toFixed(2)}
        </span>
      </div>
      <div className="dgl-group-stat placeholder-stat">
        <span className="dgl-stat-label">Посещаемость:</span>
        <span className="dgl-stat-value demo-value">
          {displayAttendance.toFixed(1)}%
        </span>
      </div> */}
    </div>
  );
};

export const DepartmentGroupsList: React.FC<DepartmentGroupsListProps> = ({ groups, onGroupSelect }) => {
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [groupsByCourse, setGroupsByCourse] = useState<Record<number, GroupData[]>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [isStudentProfileOpen, setIsStudentProfileOpen] = useState(false);
  const [selectedGroupName, setSelectedGroupName] = useState<string>('');
  const [onlineStatus, setOnlineStatus] = useState(true);

  // Отслеживание статуса сети
  useEffect(() => {
    const updateOnlineStatus = () => {
      setOnlineStatus(navigator.onLine);
    };

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Группировка групп по курсам
  useEffect(() => {
    const grouped: Record<number, GroupData[]> = {
      1: [],
      2: [],
      3: [],
      4: []
    };
    
    groups.forEach(group => {
      if (grouped[group.course]) {
        grouped[group.course].push(group);
      }
    });
    
    Object.keys(grouped).forEach(course => {
      grouped[Number(course)].sort((a, b) => a.numberGroup - b.numberGroup);
    });
    
    setGroupsByCourse(grouped);
  }, [groups]);

  const toggleExpand = async (groupId: number, groupName: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
    } else {
      setExpandedGroupId(groupId);
      setSelectedGroupName(groupName);
    }
  };

  const handleStudentClick = (studentId: number, groupName: string) => {
    setSelectedStudentId(studentId);
    setSelectedGroupName(groupName);
    setIsStudentProfileOpen(true);
  };

  const handleCloseStudentProfile = () => {
    setIsStudentProfileOpen(false);
    setSelectedStudentId(null);
  };

  const getCourseName = (course: number): string => {
    const names: Record<number, string> = {
      1: 'Первый курс',
      2: 'Второй курс',
      3: 'Третий курс',
      4: 'Четвертый курс'
    };
    return names[course] || `${course} курс`;
  };


  return (
    <>
      <div className="dgl-container">
        <div className="dgl-header">
          <h2 className="dgl-title">Информация о группах</h2>
          <p className="dgl-subtitle">Все группы отделения по курсам</p>
        </div>

        <div className="dgl-courses-list">
          {[1, 2, 3, 4].map(course => {
            const courseGroups = groupsByCourse[course] || [];
            if (courseGroups.length === 0) return null;
            
            return (
              <div key={course} className="dgl-course-block">
                <div className="dgl-course-title-block">
                  <h3 className="dgl-course-name">{getCourseName(course)}</h3>
                  <span className="dgl-course-groups-count">{courseGroups.length} групп</span>
                </div>

                <div className="dgl-groups-list">
                  {courseGroups.map(group => (
                    <div 
                      key={group.id} 
                      className={`dgl-group-item ${expandedGroupId === group.id ? 'expanded' : ''}`}
                    >
                      <div 
                        className="dgl-group-row"
                        onClick={() => toggleExpand(group.id, group.name)}
                      >
                        <div className="dgl-group-main-info">
                          <div className="dgl-group-badge-wrapper">
                            <span className="dgl-group-badge">
                              {group.name}
                            </span>
                          </div>
                          <GroupMetrics group={group} />
                        </div>
                        <div className="dgl-group-arrow">
                          <svg 
                            className={`dgl-arrow-icon ${expandedGroupId === group.id ? 'rotated' : ''}`}
                            width="18" 
                            height="18" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </div>
                      </div>

                      {expandedGroupId === group.id && (
                        <div className="dgl-group-expanded">
                          <GroupExpandedInfo 
                            group={group} 
                            onStudentClick={handleStudentClick}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {groups.length === 0 && (
          <div className="dgl-empty-state">
            <h3>Нет групп</h3>
            <p>В отделении пока нет ни одной группы</p>
          </div>
        )}
      </div>

      {/* Модальное окно профиля студента */}
      {isStudentProfileOpen && selectedStudentId && (
        <div className="sp-modal-overlay" onClick={handleCloseStudentProfile}>
          <div className="sp-modal-content" onClick={(e) => e.stopPropagation()}>
            <StudentProfile 
              studentId={selectedStudentId}
              onClose={handleCloseStudentProfile}
              groupName={selectedGroupName}
            />
          </div>
        </div>
      )}
    </>
  );
};