import React, { useState, useEffect } from 'react';
import { headApiService, StudentInfo } from '../services/headApiService';
import StudentProfile from './StudentProfile';
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

export const DepartmentGroupsList: React.FC<DepartmentGroupsListProps> = ({ groups, onGroupSelect }) => {
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [groupsByCourse, setGroupsByCourse] = useState<Record<number, GroupData[]>>({});
  const [groupStudents, setGroupStudents] = useState<Record<number, StudentInfo[]>>({});
  const [loadingStudents, setLoadingStudents] = useState<Record<number, boolean>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [isStudentProfileOpen, setIsStudentProfileOpen] = useState(false);
  const [selectedGroupName, setSelectedGroupName] = useState<string>('');

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

  const loadGroupStudents = async (groupId: number) => {
    if (groupStudents[groupId]) return;
    
    try {
      setLoadingStudents(prev => ({ ...prev, [groupId]: true }));
      const students = await headApiService.getGroupStudents(groupId);
      setGroupStudents(prev => ({ ...prev, [groupId]: students }));
    } catch (error) {
      console.error('Ошибка при загрузке студентов группы:', error);
    } finally {
      setLoadingStudents(prev => ({ ...prev, [groupId]: false }));
    }
  };

  const toggleExpand = async (groupId: number, groupName: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
    } else {
      setExpandedGroupId(groupId);
      setSelectedGroupName(groupName);
      await loadGroupStudents(groupId);
    }
  };

  const handleStudentClick = (studentId: number) => {
    setSelectedStudentId(studentId);
    setIsStudentProfileOpen(true);
  };

  const handleCloseStudentProfile = () => {
    setIsStudentProfileOpen(false);
    setSelectedStudentId(null);
  };

  const getStudentFullName = (student: StudentInfo) => {
    return `${student.lastName} ${student.name} ${student.patronymic}`;
  };

  const getStudentInitials = (student: StudentInfo) => {
    const nameInitial = student.name.charAt(0);
    const patronymicInitial = student.patronymic ? student.patronymic.charAt(0) : '';
    return `${nameInitial}${patronymicInitial}`;
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

  const GroupExpandedInfo = ({ group }: { group: GroupData }) => {
    const students = groupStudents[group.id] || [];
    const isLoading = loadingStudents[group.id];

    return (
      <div className="dgl-group-expanded-info">
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
        </div>

        {/* Список студентов со скроллом */}
        <div className="dgl-students-section">
          <div className="dgl-students-header">
            <span className="dgl-students-title">Список студентов</span>
          </div>
          
          {isLoading ? (
            <div className="dgl-students-loading">
              <div className="dgl-loading-spinner-small"></div>
              <span>Загрузка студентов...</span>
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
                  onClick={() => handleStudentClick(student.id)}
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
                          <div className="dgl-group-stats">
                            <div className="dgl-group-stat">
                              <span className="dgl-stat-label">Студентов:</span>
                              <span className="dgl-stat-value">{group.students}</span>
                            </div>
                            <div className="dgl-group-stat">
                              <span className="dgl-stat-label">Куратор:</span>
                              <span className="dgl-stat-value">{group.curator}</span>
                            </div>
                            <div className="dgl-group-stat">
                              <span className="dgl-stat-label">Ср. балл:</span>
                              <span className="dgl-stat-value">{group.averageGrade?.toFixed(2) || '—'}</span>
                            </div>
                            <div className="dgl-group-stat">
                              <span className="dgl-stat-label">Посещ.:</span>
                              <span className="dgl-stat-value">{group.attendance?.toFixed(1) || '—'}%</span>
                            </div>
                          </div>
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
                          <GroupExpandedInfo group={group} />
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