import React, { useState, useEffect, useRef } from 'react';
import './DepartmentManagementSectionStyle.css';
import { 
  headApiService, 
  GroupInfo as ApiGroupInfo,
  CuratorInfo,
  StudentInfo,
  SubjectTeacher,
  GroupMark,
  GroupAttendance,
  LessonDate
} from '../services/headApiService';
import StudentProfile from './StudentProfile';

interface GroupDetailProps {
  groupId: number;
  onClose: () => void;
  onGroupDeleted?: () => void;
}

export const GroupDetail: React.FC<GroupDetailProps> = ({ groupId, onClose, onGroupDeleted }) => {
  const [groupInfo, setGroupInfo] = useState<ApiGroupInfo | null>(null);
  const [curatorInfo, setCuratorInfo] = useState<CuratorInfo | null>(null);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [searchStudentTerm, setSearchStudentTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'performance' | 'attendance'>('info');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Состояния для успеваемости и посещаемости
  const [subjectsWithTeachers, setSubjectsWithTeachers] = useState<SubjectTeacher[]>([]);
  const [selectedSubjectTeacher, setSelectedSubjectTeacher] = useState<SubjectTeacher | null>(null);
  const [marksData, setMarksData] = useState<GroupMark[]>([]);
  const [attendanceData, setAttendanceData] = useState<GroupAttendance[]>([]);
  const [lessonDates, setLessonDates] = useState<LessonDate[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isSubjectsLoading, setIsSubjectsLoading] = useState(false);
  
  // Разделенные состояния для загрузки данных
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(false);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  
  // Состояния для профиля студента
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [isStudentProfileOpen, setIsStudentProfileOpen] = useState(false);
  
  // Refs для отслеживания загрузки
  const subjectsLoadedRef = useRef(false);
  const performanceLoadedRef = useRef(false);
  const attendanceLoadedRef = useRef(false);

  // Функция для получения цвета оценки
  const getGradeColor = (grade: number | null): string => {
    if (grade === null) return '#d1d5db';
    if (grade === 0) return '#d1d5db';
    if (grade >= 4) return '#2cbb00';
    if (grade >= 3) return '#f59e0b';
    if (grade >= 1) return '#ef4444';
    return '#d1d5db';
  };

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  // Загрузка предметов только при переключении на вкладку успеваемости/посещаемости
  useEffect(() => {
    if ((activeTab === 'performance' || activeTab === 'attendance') && !subjectsLoadedRef.current && !isSubjectsLoading) {
      loadSubjectsWithTeachers();
    }
  }, [activeTab]);

  // Загрузка данных по успеваемости
  useEffect(() => {
    if (activeTab === 'performance' && selectedSubjectTeacher && !performanceLoadedRef.current && !isPerformanceLoading) {
      loadPerformanceData();
    }
  }, [activeTab, selectedSubjectTeacher]);

  // Загрузка данных по посещаемости
  useEffect(() => {
    if (activeTab === 'attendance' && selectedSubjectTeacher && !attendanceLoadedRef.current && !isAttendanceLoading) {
      loadAttendanceData();
    }
  }, [activeTab, selectedSubjectTeacher]);

  const loadGroupData = async () => {
    try {
      setLoading(true);
      
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

  const loadSubjectsWithTeachers = async () => {
    if (subjectsLoadedRef.current || isSubjectsLoading) return;
    
    try {
      setIsSubjectsLoading(true);
      const subjects = await headApiService.getGroupSubjectsWithTeachers(groupId);
      setSubjectsWithTeachers(subjects);
      subjectsLoadedRef.current = true;
      
      if (subjects.length > 0) {
        const firstSubject = subjects[0];
        setSelectedSubjectTeacher(firstSubject);
      }
    } catch (err) {
      console.error('Ошибка загрузки предметов с преподавателями:', err);
    } finally {
      setIsSubjectsLoading(false);
    }
  };

  const loadPerformanceData = async () => {
    if (!selectedSubjectTeacher || performanceLoadedRef.current) return;
    
    try {
      setIsPerformanceLoading(true);
      
      const marks = await headApiService.getGroupMarksWithTeachers(
        groupId, 
        selectedSubjectTeacher.subjectId, 
        selectedSubjectTeacher.teacherId
      );
      setMarksData(marks);
      
      const dates = await headApiService.getLessonDatesBySubject(
        groupId,
        selectedSubjectTeacher.subjectId,
        selectedSubjectTeacher.teacherId
      );
      setLessonDates(dates);
      
      performanceLoadedRef.current = true;
    } catch (err) {
      console.error('Ошибка загрузки данных успеваемости:', err);
    } finally {
      setIsPerformanceLoading(false);
    }
  };

  const loadAttendanceData = async () => {
    if (!selectedSubjectTeacher || attendanceLoadedRef.current) return;
    
    try {
      setIsAttendanceLoading(true);
      
      const attendance = await headApiService.getGroupAttendanceWithTeachers(
        groupId,
        selectedSubjectTeacher.subjectId,
        selectedSubjectTeacher.teacherId
      );
      setAttendanceData(attendance);
      
      const dates = await headApiService.getLessonDatesBySubject(
        groupId,
        selectedSubjectTeacher.subjectId,
        selectedSubjectTeacher.teacherId
      );
      setLessonDates(dates);
      
      attendanceLoadedRef.current = true;
    } catch (err) {
      console.error('Ошибка загрузки данных посещаемости:', err);
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Сброс флагов при смене предмета
  const handleSubjectChange = (subjectTeacher: SubjectTeacher | null) => {
    setSelectedSubjectTeacher(subjectTeacher);
    performanceLoadedRef.current = false;
    attendanceLoadedRef.current = false;
    setMarksData([]);
    setAttendanceData([]);
    setLessonDates([]);
  };

  const handleDeleteGroup = async () => {
    if (!groupInfo) return;
    
    const confirmed = window.confirm(
      `Вы уверены, что хотите удалить группу ${groupInfo.name}?\n\n` +
      `Это действие нельзя отменить. Все данные о студентах и успеваемости группы будут удалены.`
    );
    
    if (!confirmed) return;
    
    try {
      setIsDeleting(true);
      await headApiService.deleteGroup(groupId);
      alert(`Группа ${groupInfo.name} успешно удалена`);
      
      if (onGroupDeleted) {
        onGroupDeleted();
      }
      
      onClose();
    } catch (error) {
      console.error('Ошибка при удалении группы:', error);
      alert('Не удалось удалить группу. Пожалуйста, попробуйте позже.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getMarkForStudent = (studentId: number, lessonNumber: number): number | null => {
    const mark = marksData.find(m => m.studentId === studentId && m.lessonNumber === lessonNumber);
    return mark ? mark.mark : null;
  };

  const handleStudentClick = (studentId: number) => {
    setSelectedStudentId(studentId);
    setIsStudentProfileOpen(true);
  };

  const handleCloseStudentProfile = () => {
    setIsStudentProfileOpen(false);
    setSelectedStudentId(null);
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

  // Получаем уникальные предметы для выбора
  const uniqueSubjects = subjectsWithTeachers.reduce((acc: SubjectTeacher[], item: SubjectTeacher) => {
    if (!acc.find(s => s.subjectId === item.subjectId)) {
      acc.push(item);
    }
    return acc;
  }, []);

  // Получаем преподавателей для выбранного предмета
  const teachersForSubject = subjectsWithTeachers.filter(
    s => s.subjectId === selectedSubjectTeacher?.subjectId
  );

  // Расчет среднего балла для студента по выбранному предмету
  const calculateStudentAverage = (studentId: number): number => {
    const studentMarks = marksData.filter(m => m.studentId === studentId && m.mark !== null);
    if (studentMarks.length === 0) return 0;
    const sum = studentMarks.reduce((total, m) => total + m.mark, 0);
    return sum / studentMarks.length;
  };

  // Расчет среднего балла по группе
  const calculateGroupAverage = (): number => {
    if (students.length === 0) return 0;
    const sum = students.reduce((total, student) => total + calculateStudentAverage(student.id), 0);
    return sum / students.length;
  };

  // Функция для получения цвета статуса посещаемости
  const getStatusColor = (status: 'п' | 'у' | 'н' | null): string => {
    switch (status) {
      case 'п': return '#2cbb00';
      case 'у': return '#f59e0b';
      case 'н': return '#ef4444';
      default: return '#d1d5db';
    }
  };

  // Функция для получения текста статуса
  const getStatusText = (status: 'п' | 'у' | 'н' | null): string => {
    switch (status) {
      case 'п': return 'Присутствовал';
      case 'у': return 'Уважительная причина';
      case 'н': return 'Отсутствовал';
      default: return 'Не отмечен';
    }
  };

  // Функция для получения цвета процента
  const getPercentColor = (percent: number): string => {
    if (percent >= 90) return '#2cbb00';
    if (percent >= 75) return '#a5db28';
    if (percent >= 60) return '#f59e0b';
    return '#ef4444';
  };

  // Функция для получения цвета процента посещаемости
  const getAttendancePercentColor = (percent: number): string => {
    if (percent >= 90) return '#2cbb00';
    if (percent >= 75) return '#a5db28';
    if (percent >= 60) return '#f59e0b';
    return '#ef4444';
  };

  // Функция для нормализации даты
  const normalizeDate = (date: string): string => {
    if (!date) return '';
    if (date.includes('-')) {
      return date.split('T')[0];
    }
    if (date.includes('.')) {
      const parts = date.split('.');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      if (parts.length === 2) {
        const currentYear = new Date().getFullYear();
        return `${currentYear}-${parts[1]}-${parts[0]}`;
      }
    }
    return date;
  };

  // Расчет общего процента посещаемости группы
  const calculateGroupAttendancePercentage = (): number => {
    if (students.length === 0) return 0;
    
    let totalPresent = 0;
    let totalLessons = 0;
    
    students.forEach(student => {
      const studentAttendances = attendanceData.filter(a => a.studentId === student.id);
      totalLessons += studentAttendances.length;
      totalPresent += studentAttendances.filter(a => a.status === 'п').length;
    });
    
    return totalLessons > 0 ? (totalPresent / totalLessons) * 100 : 0;
  };

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
    <>
      <div className="dhm-group-modal">
        <div className="dhm-group-modal-header">
          <div className="dhm-modal-header-content">
            <div className="dhm-group-badge-large">{groupInfo.name}</div>
            <div className="dhm-group-subtitle">
              {groupInfo.course} курс • {students.length} студентов • {groupInfo.formEducation}
            </div>
          </div>
          <div className="dhm-modal-header-buttons">
            <button className="dhm-modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="dhm-group-modal-body">
          {/* Табы */}
          <div className="dhm-group-tabs">
            <button 
              className={`dhm-group-tab ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('info');
              }}
            >
              Информация о группе
            </button>
            <button 
              className={`dhm-group-tab ${activeTab === 'performance' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('performance');
              }}
            >
              Успеваемость
            </button>
            <button 
              className={`dhm-group-tab ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('attendance');
              }}
            >
              Посещаемость
            </button>
          </div>

          {/* Информационная вкладка */}
          {activeTab === 'info' && (
            <>
              <div className="dhm-group-main-info">
                <div className="dhm-group-details-grid">
                  <div className="dhm-detail-item">
                    <div className="dhm-detail-label">Куратор</div>
                    <div className="dhm-detail-value">{getCuratorInitials()}</div>
                    {curatorInfo?.email && (
                      <div className="dhm-detail-email">{curatorInfo.email}</div>
                    )}
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
                        <div 
                          key={student.id} 
                          className="dhm-student-item dhm-student-clickable"
                          onClick={() => handleStudentClick(student.id)}
                        >
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
                          <span>... и еще {students.length - 5}</span>
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
            </>
          )}

          {/* Вкладка успеваемости */}
          {activeTab === 'performance' && (
            <div className="dhm-performance-tab">
              {isSubjectsLoading ? (
                <div className="dhm-loading-small">
                  <div className="dhm-loading-spinner"></div>
                  <p>Загрузка списка предметов...</p>
                </div>
              ) : uniqueSubjects.length === 0 ? (
                <div className="dhm-no-data">
                  <p>Нет предметов для отображения</p>
                </div>
              ) : (
                <>
                  <div className="dhm-subject-selector">
                    <div className="dhm-select-group">
                      <label className="dhm-select-label">Предмет:</label>
                      <select
                        className="dhm-subject-select"
                        value={selectedSubjectTeacher?.subjectId || ''}
                        onChange={(e) => {
                          const subject = uniqueSubjects.find(s => s.subjectId === Number(e.target.value));
                          if (subject) {
                            const firstTeacher = subjectsWithTeachers.find(
                              s => s.subjectId === subject.subjectId
                            );
                            handleSubjectChange(firstTeacher || subject);
                          }
                        }}
                      >
                        {uniqueSubjects.map(subject => (
                          <option key={subject.subjectId} value={subject.subjectId}>
                            {subject.subjectName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="dhm-select-group">
                      <label className="dhm-select-label">Преподаватель:</label>
                      {teachersForSubject.length > 1 ? (
                        <select
                          className="dhm-subject-select"
                          value={selectedSubjectTeacher?.teacherId || ''}
                          onChange={(e) => {
                            const teacher = teachersForSubject.find(t => t.teacherId === Number(e.target.value));
                            handleSubjectChange(teacher || null);
                          }}
                        >
                          {teachersForSubject.map(teacher => (
                            <option key={teacher.teacherId} value={teacher.teacherId}>
                              {teacher.teacherLastName} {teacher.teacherName.charAt(0)}.
                              {teacher.teacherPatronymic ? teacher.teacherPatronymic.charAt(0) + '.' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="dhm-teacher-display">
                          {teachersForSubject.length === 1 ? (
                            <span className="dhm-teacher-name">
                              {teachersForSubject[0].teacherLastName} {teachersForSubject[0].teacherName.charAt(0)}.
                              {teachersForSubject[0].teacherPatronymic ? teachersForSubject[0].teacherPatronymic.charAt(0) + '.' : ''}
                            </span>
                          ) : (
                            <span className="dhm-teacher-name">Преподаватель не назначен</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {isPerformanceLoading ? (
                    <div className="dhm-loading-small">
                      <div className="dhm-loading-spinner"></div>
                      <p>Загрузка данных...</p>
                    </div>
                  ) : lessonDates.length === 0 ? (
                    <div className="dhm-no-data">
                      <p>Нет данных об оценках</p>
                    </div>
                  ) : (
                    <>
                      <div className="dhm-table-container">
                        <table className="dhm-data-table">
                          <thead>
                            <tr>
                              <th className="dhm-student-col">Студент</th>
                              <th className="dhm-average-col">Средний балл</th>
                              {lessonDates.map(lesson => (
                                <th key={lesson.number} className="dhm-date-col">
                                  {new Date(lesson.date).toLocaleDateString('ru-RU')}
                                  <br />
                                </th>
                              ))}
                              </tr>
                             </thead>
                          <tbody>
                            {students.map(student => {
                              const studentMarks = marksData.filter(m => m.studentId === student.id && m.mark !== null);
                              const avg = studentMarks.length > 0
                                ? studentMarks.reduce((sum, m) => sum + m.mark, 0) / studentMarks.length
                                : 0;

                              return (
                                <tr key={student.id}>
                                  <td className="dhm-student-name">
                                    {student.lastName} {student.name.charAt(0)}.
                                    {student.patronymic ? student.patronymic.charAt(0) + '.' : ''}
                                   </td>
                                  <td className="dhm-average-cell">
                                    <div
                                      className="dhm-average-badge"
                                      style={{ backgroundColor: getGradeColor(avg || null) }}
                                    >
                                      {avg > 0 ? avg.toFixed(2) : '-'}
                                    </div>
                                   </td>
                                  {lessonDates.map(lesson => {
                                    const mark = marksData.find(
                                      m => m.studentId === student.id && m.lessonNumber === lesson.number
                                    );
                                    const markValue = mark ? mark.mark : null;
                                    
                                    return (
                                      <td key={lesson.number} className="dhm-mark-cell">
                                        <div
                                          className="dhm-mark"
                                          style={{ backgroundColor: getGradeColor(markValue) }}
                                        >
                                          {markValue !== null ? markValue : '-'}
                                        </div>
                                       </td>
                                    );
                                  })}
                                 </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="dhm-group-average-footer">
                        <div className="dhm-group-average">
                          <div className="dhm-average-label">Средний балл группы</div>
                          <div
                            className="dhm-average-value"
                            style={{
                              backgroundColor: getGradeColor(calculateGroupAverage() || null)
                            }}
                          >
                            {calculateGroupAverage() > 0 ? calculateGroupAverage().toFixed(2) : '—'}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Вкладка посещаемости */}
          {activeTab === 'attendance' && (
            <div className="dhm-performance-tab">
              {isSubjectsLoading ? (
                <div className="dhm-loading-small">
                  <div className="dhm-loading-spinner"></div>
                  <p>Загрузка списка предметов...</p>
                </div>
              ) : uniqueSubjects.length === 0 ? (
                <div className="dhm-no-data">
                  <p>Нет предметов для отображения</p>
                </div>
              ) : (
                <>
                  <div className="dhm-subject-selector">
                    <div className="dhm-select-group">
                      <label className="dhm-select-label">Предмет:</label>
                      <select
                        className="dhm-subject-select"
                        value={selectedSubjectTeacher?.subjectId || ''}
                        onChange={(e) => {
                          const subject = uniqueSubjects.find(s => s.subjectId === Number(e.target.value));
                          if (subject) {
                            const firstTeacher = subjectsWithTeachers.find(
                              s => s.subjectId === subject.subjectId
                            );
                            handleSubjectChange(firstTeacher || subject);
                          }
                        }}
                      >
                        {uniqueSubjects.map(subject => (
                          <option key={subject.subjectId} value={subject.subjectId}>
                            {subject.subjectName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="dhm-select-group">
                      <label className="dhm-select-label">Преподаватель:</label>
                      {teachersForSubject.length > 1 ? (
                        <select
                          className="dhm-subject-select"
                          value={selectedSubjectTeacher?.teacherId || ''}
                          onChange={(e) => {
                            const teacher = teachersForSubject.find(t => t.teacherId === Number(e.target.value));
                            handleSubjectChange(teacher || null);
                          }}
                        >
                          {teachersForSubject.map(teacher => (
                            <option key={teacher.teacherId} value={teacher.teacherId}>
                              {teacher.teacherLastName} {teacher.teacherName.charAt(0)}.
                              {teacher.teacherPatronymic ? teacher.teacherPatronymic.charAt(0) + '.' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="dhm-teacher-display">
                          {teachersForSubject.length === 1 ? (
                            <span className="dhm-teacher-name">
                              {teachersForSubject[0].teacherLastName} {teachersForSubject[0].teacherName.charAt(0)}.
                              {teachersForSubject[0].teacherPatronymic ? teachersForSubject[0].teacherPatronymic.charAt(0) + '.' : ''}
                            </span>
                          ) : (
                            <span className="dhm-teacher-name">Преподаватель не назначен</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {isAttendanceLoading ? (
                    <div className="dhm-loading-small">
                      <div className="dhm-loading-spinner"></div>
                      <p>Загрузка данных...</p>
                    </div>
                  ) : lessonDates.length === 0 ? (
                    <div className="dhm-no-data">
                      <p>Нет данных о посещаемости</p>
                    </div>
                  ) : (
                    <div className="dhm-table-container">
                      <table className="dhm-data-table">
                        <thead>
                          <tr>
                            <th className="dhm-student-col">Студент</th>
                            <th className="dhm-average-col">% посещаемости</th>
                            {lessonDates.map(lesson => (
                              <th key={lesson.number} className="dhm-date-col">
                                {new Date(lesson.date).toLocaleDateString('ru-RU')}
                                <br />
                              </th>
                            ))}
                            </tr>
                          </thead>

                        <tbody>
                          {students.map(student => {
                            const studentAttendances = attendanceData.filter(a => a.studentId === student.id);
                            const totalLessons = studentAttendances.length;
                            const presentCount = studentAttendances.filter(a => a.status === 'п').length;
                            const attendancePercent = totalLessons > 0 ? (presentCount / totalLessons) * 100 : 0;

                            return (
                              <tr key={student.id}>
                                <td className="dhm-student-name">
                                  {student.lastName} {student.name.charAt(0)}.
                                  {student.patronymic ? student.patronymic.charAt(0) + '.' : ''}
                                </td>

                                <td className="dhm-average-cell">
                                  <div
                                    className="dhm-average-badge"
                                    style={{
                                      backgroundColor: getAttendancePercentColor(attendancePercent),
                                      color: 'white'
                                    }}
                                  >
                                    {attendancePercent > 0 ? attendancePercent.toFixed(1) + '%' : '-'}
                                  </div>
                                </td>

                                {lessonDates.map(lesson => {
                                  const lessonDateNormalized = normalizeDate(lesson.date);
                                  
                                  const attendance = attendanceData.find(
                                    a => a.studentId === student.id && 
                                        normalizeDate(a.date) === lessonDateNormalized
                                  );

                                  const status = attendance?.status ?? null;
                                  const statusText = getStatusText(status as 'п' | 'у' | 'н' | null);

                                  return (
                                    <td key={lesson.number} className="dhm-mark-cell">
                                      <div
                                        className="dhm-attendance-status"
                                        style={{
                                          backgroundColor: getStatusColor(status as 'п' | 'у' | 'н' | null)
                                        }}
                                        title={statusText}
                                      >
                                        {status === 'п' ? 'п' : status === 'у' ? 'У' : status === 'н' ? 'н' : '-'}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      
                    </div>
                    
                  )}
                  {/* Общий процент посещаемости группы */}
                      <div className="dhm-group-average-footer">
                        <div className="dhm-group-average">
                          <div className="dhm-average-label">Общая посещаемость группы</div>
                          <div
                            className="dhm-average-value"
                            style={{
                              backgroundColor: (() => {
                                const totalPercent = calculateGroupAttendancePercentage();
                                if (totalPercent >= 90) return '#2cbb00';
                                if (totalPercent >= 75) return '#a5db28';
                                if (totalPercent >= 60) return '#f59e0b';
                                return '#ef4444';
                              })()
                            }}
                          >
                            {(() => {
                              const totalPercent = calculateGroupAttendancePercentage();
                              return totalPercent > 0 ? totalPercent.toFixed(1) + '%' : '—';
                            })()}
                          </div>
                        </div>
                      </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="dhm-group-modal-footer">
          <button 
            className="dhm-modal-delete-btn"
            onClick={handleDeleteGroup}
            disabled={isDeleting}
          >
            {isDeleting ? 'Удаление...' : 'Удалить группу'}
          </button>
        </div>
      </div>

      {/* Модальное окно профиля студента */}
      {isStudentProfileOpen && selectedStudentId && (
        <div className="sp-modal-overlay" onClick={handleCloseStudentProfile}>
          <div className="sp-modal-content" onClick={(e) => e.stopPropagation()}>
            <StudentProfile 
              studentId={selectedStudentId}
              onClose={handleCloseStudentProfile}
              groupName={groupInfo?.name}
            />
          </div>
        </div>
      )}
    </>
  );
};