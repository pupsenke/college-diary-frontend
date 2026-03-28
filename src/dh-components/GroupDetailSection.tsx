import React, { useState, useEffect, useRef } from 'react';
import './GroupDetailSectionStyle.css';
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
import { 
  calculateStudentAverage, 
  calculateGroupAverage,
  calculateStudentAttendancePercent,
  getGradeColor
} from '../utils/groupCalculations';
import { SelectCuratorModal } from './SelectCuratorModal';

interface GroupDetailViewProps {
  groupId: number;
  onClose?: () => void;
  onGroupDeleted?: () => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({ groupId, onClose, onGroupDeleted }) => {
  const [groupInfo, setGroupInfo] = useState<ApiGroupInfo | null>(null);
  const [curatorInfo, setCuratorInfo] = useState<CuratorInfo | null>(null);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [searchStudentTerm, setSearchStudentTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'performance' | 'attendance'>('info');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCuratorModalOpen, setIsCuratorModalOpen] = useState(false);
  
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
      
      if (onClose) {
        onClose();
      }
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

  // Вспомогательная функция для получения среднего балла студента
  const getStudentAverage = (studentId: number): number => {
    return calculateStudentAverage(marksData, studentId);
  };

  // Расчет среднего балла по группе
  const groupAverage = calculateGroupAverage(students, marksData);

  const handleOpenCuratorModal = () => {
    setIsCuratorModalOpen(true);
  };

  const handleSelectCurator = async (staffId: number, staffFullName: string) => {
    if (!groupInfo) return;
    try {
      await headApiService.updateGroupCurator(groupInfo.id, staffId);
      setCuratorInfo({
        lastName: staffFullName.split(' ')[0],
        name: staffFullName.split(' ')[1] || '',
        patronymic: staffFullName.split(' ')[2] || '',
        email: ''
      });
      await loadGroupData();
    } catch (error) {
      console.error('Ошибка при назначении куратора:', error);
      alert('Не удалось назначить куратора. Попробуйте позже.');
    } finally {
      setIsCuratorModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="dhm-group-detail-container">
        <div className="dhm-group-detail-loading">
          <div className="dhm-loading-spinner"></div>
          <p>Загрузка данных группы...</p>
        </div>
      </div>
    );
  }

  if (error || !groupInfo) {
    return (
      <div className="dhm-group-detail-container">
        <div className="dhm-group-detail-error">
          <p className="dhm-error-message">{error || 'Группа не найдена'}</p>
          <button 
            className="dhm-retry-button"
            onClick={loadGroupData}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dhm-group-detail-container">
        {/* Шапка группы */}
        <div className="dhm-group-detail-header">
          <div className="dhm-group-badge-large">{groupInfo.name}</div>
          <div className="dhm-group-subtitle">
            {groupInfo.course} курс • {students.length} студентов • {groupInfo.formEducation}
          </div>
          <button 
            className="dhm-modal-delete-btn"
            onClick={handleDeleteGroup}
            disabled={isDeleting}
          >
            {isDeleting ? 'Удаление...' : 'Удалить группу'}
          </button>
        </div>

        {/* Табы */}
        <div className="dhm-group-tabs">
          <button 
            className={`dhm-group-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Информация о группе
          </button>
          <button 
            className={`dhm-group-tab ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            Успеваемость
          </button>
          <button 
            className={`dhm-group-tab ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            Посещаемость
          </button>
        </div>

        <div className="dhm-group-detail-body">
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
                    <button 
                      className="dhm-choose-curator-btn"
                      onClick={handleOpenCuratorModal}
                    >
                      {curatorInfo ? 'Изменить куратора' : 'Выбрать куратора'}
                    </button>
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
                </div>
              </div>

              <div className="dhm-group-section">
                <div className="dhm-section-header-small">
                  <h3 className="dhm-section-title">Список студентов</h3>
                  <div className="dhm-student-actions">
                    
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
                      
                          {students.length > 5 && (
                      <button 
                        className="dhm-view-all-btn"
                        onClick={toggleShowAllStudents}
                      >
                        {showAllStudents ? 'Скрыть' : `Показать всех (${students.length})`}
                      </button>
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
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {students.map(student => {
                              const studentAvg = getStudentAverage(student.id);
                              
                              return (
                                <tr key={student.id}>
                                  <td className="dhm-student-name">
                                    {getStudentFullName(student)}
                                  </td>
                                  <td className="dhm-average-cell">
                                    <div
                                      className="dhm-average-badge"
                                      style={{ backgroundColor: getGradeColor(studentAvg || null) }}
                                    >
                                      {studentAvg > 0 ? studentAvg.toFixed(2) : '-'}
                                    </div>
                                  </td>
                                  {lessonDates.map(lesson => {
                                    const mark = getMarkForStudent(student.id, lesson.number);
                                    
                                    return (
                                      <td key={lesson.number} className="dhm-mark-cell">
                                        <div
                                          className="dhm-mark"
                                          style={{ backgroundColor: getGradeColor(mark) }}
                                        >
                                          {mark !== null ? mark : '-'}
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
                              backgroundColor: getGradeColor(groupAverage || null)
                            }}
                          >
                            {groupAverage > 0 ? groupAverage.toFixed(2) : '—'}
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
                    <>
                      <div className="dhm-table-container">
                        <table className="dhm-data-table">
                          <thead>
                            <tr>
                              <th className="dhm-student-col">Студент</th>
                              <th className="dhm-average-col">% посещаемости</th>
                              {(() => {
                                const existingLessonIds = new Set<number>();
                                attendanceData.forEach(attendance => {
                                  existingLessonIds.add(attendance.lessonNumber);
                                });
                                
                                const filteredLessons = lessonDates.filter(lesson => 
                                  existingLessonIds.has(lesson.lessonId)
                                );
                                
                                const uniqueLessons = filteredLessons.reduce((acc, current) => {
                                  const exists = acc.find(item => item.lessonId === current.lessonId);
                                  if (!exists) {
                                    acc.push(current);
                                  }
                                  return acc;
                                }, [] as LessonDate[]);
                                
                                return uniqueLessons.map(lesson => {
                                  const dateObj = new Date(lesson.date);
                                  const day = dateObj.getDate().toString().padStart(2, '0');
                                  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                                  const year = (dateObj.getFullYear()).toString().padStart(2, '0');
                                  const displayDate = `${day}.${month}.${year}`;
                                  
                                  return (
                                    <th key={lesson.lessonId} className="dhm-date-col">
                                      {displayDate}
                                    </th>
                                  );
                                });
                              })()}
                            </tr>
                          </thead>

                          <tbody>
                            {students.map(student => {
                              const studentAttendances = attendanceData.filter(
                                a => a.studentId === student.id
                              );
                              
                              const uniqueAttendances = studentAttendances.reduce((acc, current) => {
                                const exists = acc.find(item => item.lessonNumber === current.lessonNumber);
                                if (!exists) {
                                  acc.push(current);
                                }
                                return acc;
                              }, [] as typeof studentAttendances);
                              
                              const getStatusClass = (status: string): string => {
                                switch (status) {
                                  case 'п': return 'dhm-status-present';
                                  case 'у': return 'dhm-status-absent';
                                  case 'н': return 'dhm-status-not';
                                  default: return 'dhm-status-empty';
                                }
                              };
                              
                              const getPercentColor = (percent: number, hasData: boolean): string => {
                                if (!hasData) return '#9ca3af';
                                if (percent === 0) return '#ef4444';
                                if (percent >= 70) return '#2cbb00';
                                if (percent >= 55) return '#a5db28';
                                if (percent >= 20) return '#f59e0b';
                                return '#ef4444';
                              };
                              
                              const existingLessonIds = new Set<number>();
                              attendanceData.forEach(attendance => {
                                existingLessonIds.add(attendance.lessonNumber);
                              });
                              
                              const filteredLessons = lessonDates.filter(lesson => 
                                existingLessonIds.has(lesson.lessonId)
                              );
                              
                              const uniqueLessons = filteredLessons.reduce((acc, current) => {
                                const exists = acc.find(item => item.lessonId === current.lessonId);
                                if (!exists) {
                                  acc.push(current);
                                }
                                return acc;
                              }, [] as LessonDate[]);
                              
                              const studentAttendancePercent = calculateStudentAttendancePercent(attendanceData, student.id, lessonDates);
                              const hasData = studentAttendancePercent !== -1;
                              const displayPercent = hasData ? studentAttendancePercent.toFixed(1) + '%' : '-';
                              const bgColor = hasData ? getPercentColor(studentAttendancePercent, true) : '#d1d5db';
                              
                              return (
                                <tr key={student.id}>
                                  <td className="dhm-student-name">
                                    {getStudentFullName(student)}
                                  </td>
                                  <td className="dhm-average-cell">
                                    <div
                                      className="dhm-average-badge"
                                      style={{ backgroundColor: bgColor, color: 'white' }}
                                    >
                                      {displayPercent}
                                    </div>
                                  </td>
                                  {uniqueLessons.map(lesson => {
                                    const attendance = uniqueAttendances.find(
                                      a => a.lessonNumber === lesson.lessonId
                                    );
                                    const status = attendance?.status || '';
                                    
                                    return (
                                      <td key={lesson.lessonId} className="dhm-mark-cell">
                                        <div className={`dhm-cell-status ${getStatusClass(status)}`}>
                                          {status || '-'}
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
                          <div className="dhm-average-label">Общая посещаемость группы</div>
                          <div
                            className="dhm-average-value"
                            style={{
                              backgroundColor: (() => {
                                let totalPresent = 0;
                                let totalLessons = 0;
                                
                                students.forEach(student => {
                                  const studentAttendances = attendanceData.filter(
                                    a => a.studentId === student.id
                                  );
                                  const uniqueAttendances = studentAttendances.reduce((acc, current) => {
                                    const exists = acc.find(item => item.lessonNumber === current.lessonNumber);
                                    if (!exists) {
                                      acc.push(current);
                                    }
                                    return acc;
                                  }, [] as typeof studentAttendances);
                                  
                                  totalLessons += uniqueAttendances.length;
                                  totalPresent += uniqueAttendances.filter(a => a.status === 'п').length;
                                });
                                
                                const groupPercent = totalLessons > 0 ? (totalPresent / totalLessons) * 100 : 0;
                                const hasGroupData = totalLessons > 0;
                                
                                if (!hasGroupData) return '#9ca3af';
                                if (groupPercent === 0) return '#ef4444';
                                if (groupPercent >= 90) return '#2cbb00';
                                if (groupPercent >= 75) return '#a5db28';
                                if (groupPercent >= 60) return '#f59e0b';
                                return '#ef4444';
                              })(),
                              color: 'white'
                            }}
                          >
                            {(() => {
                              let totalPresent = 0;
                              let totalLessons = 0;
                              
                              students.forEach(student => {
                                const studentAttendances = attendanceData.filter(
                                  a => a.studentId === student.id
                                );
                                const uniqueAttendances = studentAttendances.reduce((acc, current) => {
                                  const exists = acc.find(item => item.lessonNumber === current.lessonNumber);
                                  if (!exists) {
                                    acc.push(current);
                                  }
                                  return acc;
                                }, [] as typeof studentAttendances);
                                
                                totalLessons += uniqueAttendances.length;
                                totalPresent += uniqueAttendances.filter(a => a.status === 'п').length;
                              });
                              
                              const groupPercent = totalLessons > 0 ? (totalPresent / totalLessons) * 100 : 0;
                              const hasGroupData = totalLessons > 0;
                              
                              return hasGroupData ? groupPercent.toFixed(1) + '%' : '—';
                            })()}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
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

      {isCuratorModalOpen && (
        <SelectCuratorModal
          onClose={() => setIsCuratorModalOpen(false)}
          onSelect={handleSelectCurator}
          currentCuratorId={groupInfo?.curatorId}
        />
      )}
    </>
  );
};