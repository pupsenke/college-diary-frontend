import React, { useState, useEffect } from 'react';
import './AcademicWorkSectionStyle.css';
import { headApiService, GroupInfo, StudentInfo, SubjectInfo } from '../services/headApiService';

interface Subject {
  id: number;
  name: string;
  assessmentForm: string;
}

interface StudentGrade {
  id: number;
  name: string;
  grades: Map<string, string>;
  average: number;
  behavior: string;
  absencesTotal: number;
  absencesUnjustified: number;
  scholarship: string;
  gradesCount: {
    five: number;
    four: number;
    three: number;
  };
}

interface GroupStatement {
  id: number;
  groupNumber: string;
  specialty: string;
  course: number;
  semester: number;
  academicYear: string;
  formOfStudy: string;
  students: StudentGrade[];
  subjects: Subject[];
  studentsCount?: number;
}

export const AcademicWorkSection: React.FC = () => {
  const [groups, setGroups] = useState<GroupStatement[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<GroupStatement[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupStatement | null>(null);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [isNAModalOpen, setIsNAModalOpen] = useState(false);
  const [selectedNAStudent, setSelectedNAStudent] = useState<StudentGrade | null>(null);
  const [selectedNASubject, setSelectedNASubject] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    let filtered = groups;
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(g => g.course === selectedCourse);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(g =>
        g.groupNumber.toLowerCase().includes(term) ||
        g.specialty.toLowerCase().includes(term)
      );
    }
    setFilteredGroups(filtered);
  }, [groups, searchTerm, selectedCourse]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const apiGroups = await headApiService.getGroups();
      const filteredApiGroups = apiGroups.filter(g => g.specialty === "09.02.07 Информационные системы и программирование");

      const groupStatements: GroupStatement[] = [];

      for (const apiGroup of filteredApiGroups) {
        // Загружаем количество студентов для каждой группы
        let studentsCount = 0;
        try {
          const students = await headApiService.getGroupStudents(apiGroup.id);
          studentsCount = students.length;
        } catch (err) {
          console.error(`Ошибка загрузки студентов для группы ${apiGroup.id}:`, err);
        }

        groupStatements.push({
          id: apiGroup.id,
          groupNumber: apiGroup.numberGroup.toString(),
          specialty: apiGroup.specialty,
          course: apiGroup.course,
          semester: 5,
          academicYear: `${apiGroup.admissionYear}-${apiGroup.admissionYear + 1}`,
          formOfStudy: apiGroup.formEducation,
          students: [],
          subjects: [],
          studentsCount: studentsCount,
        });
      }

      setGroups(groupStatements);
      setError(null);
    } catch (err) {
      console.error('Ошибка загрузки групп:', err);
      setError('Не удалось загрузить список групп');
    } finally {
      setLoading(false);
    }
  };

  const getAssessmentForm = (subjectName: string): string => {
    if (subjectName.toLowerCase().includes('физическая культура')) {
      return 'З (заглушка)';
    }
    return 'Эу (заглушка)';
  };

  const loadGroupDetails = async (group: GroupStatement) => {
    try {
      const studentsInfo = await headApiService.getGroupStudents(group.id);
      const subjectsInfo = await headApiService.getGroupSubjects(group.id);

      const subjects: Subject[] = subjectsInfo.map(s => ({
        id: s.id,
        name: s.name,
        assessmentForm: getAssessmentForm(s.name),
      }));

      const studentGrades: StudentGrade[] = [];

      for (const student of studentsInfo) {
        const fullName = `${student.lastName} ${student.name} ${student.patronymic}`.trim();
        const gradesMap = new Map<string, string>();

        for (const subject of subjects) {
          const finalMark = await headApiService.getStudentFinalMark(student.id, subject.id);
          let grade = finalMark || '';
          if (!grade) {
            const marks = await headApiService.getStudentSubjectMarks(student.id, subject.id);
            if (marks.length > 0) {
              const avg = marks.reduce((a, b) => a + b, 0) / marks.length;
              grade = avg.toFixed(1);
            } else {
              grade = '';
            }
          }
          const subjectKey = `${subject.name}, ${subject.assessmentForm}`;
          gradesMap.set(subjectKey, grade);
        }

        let five = 0, four = 0, three = 0;
        Array.from(gradesMap.values()).forEach(grade => {
          if (grade === '5') five++;
          else if (grade === '4') four++;
          else if (grade === '3') three++;
        });

        let sum = 0, count = 0;
        Array.from(gradesMap.values()).forEach(grade => {
          const num = parseFloat(grade);
          if (!isNaN(num) && num >= 2 && num <= 5) {
            sum += num;
            count++;
          }
        });
        const average = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;

        const attendanceStats = await headApiService.getStudentAttendanceStats(student.id, group.id);

        studentGrades.push({
          id: student.id,
          name: fullName,
          grades: gradesMap,
          average,
          behavior: 'х',
          absencesTotal: attendanceStats.total,
          absencesUnjustified: attendanceStats.unjustified,
          scholarship: '',
          gradesCount: { five, four, three },
        });
      }

      studentGrades.sort((a, b) => a.name.localeCompare(b.name));

      return {
        ...group,
        students: studentGrades,
        subjects,
        studentsCount: studentGrades.length, 
      };
    } catch (err) {
      console.error('Ошибка загрузки деталей группы:', err);
      throw err;
    }
  };

  const handleGroupClick = async (group: GroupStatement) => {
    try {
      const fullGroup = await loadGroupDetails(group);
      setSelectedGroup(fullGroup);
      setIsStatementModalOpen(true);
    } catch (err) {
      alert('Не удалось загрузить данные группы');
    }
  };

  const handleGradeChange = (studentId: number, subjectKey: string, newGrade: string) => {
    if (!selectedGroup) return;
    const updatedGroup = { ...selectedGroup };
    const student = updatedGroup.students.find(s => s.id === studentId);
    if (student) {
      student.grades.set(subjectKey, newGrade);
      let five = 0, four = 0, three = 0;
      let sum = 0, count = 0;
      Array.from(student.grades.values()).forEach(grade => {
        if (grade === '5') five++;
        else if (grade === '4') four++;
        else if (grade === '3') three++;
        const num = parseFloat(grade);
        if (!isNaN(num) && num >= 2 && num <= 5) {
          sum += num;
          count++;
        }
      });
      student.gradesCount = { five, four, three };
      student.average = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
    }
    setSelectedGroup(updatedGroup);
  };

  const handleNAGradeClick = (student: StudentGrade, subjectKey: string) => {
    setSelectedNAStudent(student);
    setSelectedNASubject(subjectKey);
    setIsNAModalOpen(true);
  };

  const handleCreateAttestation = () => {
    if (selectedNAStudent && selectedNASubject) {
      alert(`Создано направление на аттестацию для ${selectedNAStudent.name} по предмету "${selectedNASubject}"`);
      handleGradeChange(selectedNAStudent.id, selectedNASubject, '4');
    }
    setIsNAModalOpen(false);
  };

  const handleExportStatement = () => {
    alert('Экспорт ведомости будет реализован позже');
  };

  const StatementModal = () => {
    if (!isStatementModalOpen || !selectedGroup) return null;

    const calculateStatistics = () => {
      let fivesOnly = 0;
      let foursAndFives = 0;
      let oneThree = 0;
      let naCount = 0;

      selectedGroup.students.forEach(student => {
        const grades = Array.from(student.grades.values());
        const naGrades = grades.filter(g => g === 'н/а').length;
        if (naGrades > 0) naCount++;

        const numericGrades = grades.filter(g => g === '5' || g === '4' || g === '3').map(g => g as '5' | '4' | '3');
        if (numericGrades.length === 0) return;

        const hasOnlyFives = numericGrades.every(g => g === '5') && numericGrades.length > 0;
        if (hasOnlyFives) fivesOnly++;

        const hasFoursAndFives = numericGrades.every(g => g === '5' || g === '4') &&
          numericGrades.some(g => g === '4' || g === '5');
        if (hasFoursAndFives) foursAndFives++;

        const threeCount = numericGrades.filter(g => g === '3').length;
        if (threeCount === 1) oneThree++;
      });

      return { fivesOnly, foursAndFives, oneThree, naCount };
    };

    const statistics = calculateStatistics();

    return (
      <div className="dh-at-modal-overlay dh-at-statement-overlay">
        <div className="dh-at-modal-content dh-at-statement-content">
          <div className="dh-at-statement-header">
            <h3>Сводная аттестационная ведомость</h3>
            <div className="dh-at-statement-actions">
              {isEditing ? (
                <>
                  <button className="dh-at-btn-secondary" onClick={() => setIsEditing(false)}>
                    Отменить редактирование
                  </button>
                  <button
                    className="dh-at-btn-primary"
                    onClick={() => {
                      setIsEditing(false);
                      alert('Изменения сохранены (локально)');
                    }}
                  >
                    Сохранить
                  </button>
                </>
              ) : (
                <>
                  <button className="dh-at-btn-secondary" onClick={() => setIsEditing(true)}>
                    Редактировать
                  </button>
                  <button className="dh-at-btn-primary" onClick={handleExportStatement}>
                    Экспорт
                  </button>
                </>
              )}
              <button className="dh-at-modal-close" onClick={() => setIsStatementModalOpen(false)}>
                ×
              </button>
            </div>
          </div>

          <div className="dh-at-statement-body">
            <div className="dh-at-statement-title">
              <div className="dh-at-main-title">
                Сводная аттестационная ведомость на {selectedGroup.academicYear} учебный год Семестр {selectedGroup.semester}
              </div>
              <div>Специальность {selectedGroup.specialty}</div>
              <div>Курс {selectedGroup.course} Группа {selectedGroup.groupNumber} Форма обучения {selectedGroup.formOfStudy}</div>
            </div>

            <div className="dh-at-table-container">
              <table className="dh-at-statement-table">
                <thead>
                  <tr>
                    <th rowSpan={2}>№ п/п</th>
                    <th rowSpan={2}>Фамилия, имя, отчество студента</th>
                    <th colSpan={selectedGroup.subjects.length}>Наименование дисциплины (МДК)/ форма аттестации</th>
                    <th rowSpan={2}>Средний балл</th>
                    <th rowSpan={2}>Поведение</th>
                    <th rowSpan={2}>Пропуски занятий всего</th>
                    <th rowSpan={2}>в т. ч. по неуважит. причинам</th>
                    <th rowSpan={2}>Стипендия:</th>
                    <th colSpan={3}>Кол-во оценок</th>
                   </tr>
                   <tr>
                    {selectedGroup.subjects.map((subject) => (
                      <th key={subject.id} className="dh-at-vertical-header">
                        <div className="dh-at-vertical-text">
                          {subject.name}, {subject.assessmentForm}
                        </div>
                      </th>
                    ))}
                    <th>5</th>
                    <th>4</th>
                    <th>3</th>
                   </tr>
                </thead>
                <tbody>
                  {selectedGroup.students.map((student, idx) => (
                    <tr key={student.id}>
                      <td>{idx + 1}</td>
                      <td className="dh-at-student-name">{student.name}</td>
                      {selectedGroup.subjects.map((subject) => {
                        const subjectKey = `${subject.name}, ${subject.assessmentForm}`;
                        const grade = student.grades.get(subjectKey) || '';
                        return (
                          <td key={subject.id}>
                            {isEditing ? (
                              <select
                                value={grade}
                                onChange={(e) => handleGradeChange(student.id, subjectKey, e.target.value)}
                                className="dh-at-grade-select"
                              >
                                <option value="">-</option>
                                <option value="5">5</option>
                                <option value="4">4</option>
                                <option value="3">3</option>
                                <option value="зач.">зач.</option>
                                <option value="н/а">н/а</option>
                              </select>
                            ) : grade === 'н/а' ? (
                              <button
                                className="dh-at-na-button"
                                onClick={() => handleNAGradeClick(student, subjectKey)}
                              >
                                н/а
                              </button>
                            ) : (
                              grade
                            )}
                          </td>
                        );
                      })}
                      <td className="dh-at-average">{student.average || '-'}</td>
                      <td>{student.behavior}</td>
                      <td>{student.absencesTotal}</td>
                      <td>{student.absencesUnjustified}</td>
                      <td>{student.scholarship}</td>
                      <td>{student.gradesCount.five}</td>
                      <td>{student.gradesCount.four}</td>
                      <td>{student.gradesCount.three}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={selectedGroup.subjects.length + 12} className="dh-at-statistics-footer">
                      <div className="dh-at-statistics-grid">
                        <div className="dh-at-stat-item">
                          <span>На «5»</span>
                          <span className="dh-at-stat-value">{statistics.fivesOnly} чел.</span>
                        </div>
                        <div className="dh-at-stat-item">
                          <span>На «4», «5»</span>
                          <span className="dh-at-stat-value">{statistics.foursAndFives} чел.</span>
                        </div>
                        <div className="dh-at-stat-item">
                          <span>С одной «3»</span>
                          <span className="dh-at-stat-value">{statistics.oneThree} чел.</span>
                        </div>
                        <div className="dh-at-stat-item">
                          <span>н/а</span>
                          <span className="dh-at-stat-value dh-at-na-stat">{statistics.naCount} чел.</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const NAModal = () => {
    if (!isNAModalOpen || !selectedNAStudent) return null;
    return (
      <div className="dh-at-modal-overlay" onClick={() => setIsNAModalOpen(false)}>
        <div className="dh-at-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="dh-at-modal-header">
            <h3>Направление на аттестацию</h3>
            <button className="dh-at-modal-close" onClick={() => setIsNAModalOpen(false)}>×</button>
          </div>
          <div className="dh-at-modal-body">
            <p>Студент: <strong>{selectedNAStudent.name}</strong></p>
            <p>Предмет: <strong>{selectedNASubject}</strong></p>
            <p>Создать направление на аттестацию?</p>
          </div>
          <div className="dh-at-modal-footer">
            <button className="dh-at-btn-secondary" onClick={() => setIsNAModalOpen(false)}>Отмена</button>
            <button className="dh-at-btn-primary" onClick={handleCreateAttestation}>Создать</button>
          </div>
        </div>
      </div>
    );
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);
  const handleCourseFilterChange = (course: number | 'all') => setSelectedCourse(course);

  // Группировка групп по курсам
  const groupsByCourse = {
    1: filteredGroups.filter(g => g.course === 1),
    2: filteredGroups.filter(g => g.course === 2),
    3: filteredGroups.filter(g => g.course === 3),
    4: filteredGroups.filter(g => g.course === 4)
  };

  const renderGroupCard = (group: GroupStatement) => (
    <div key={group.id} className="dh-at-group-card" onClick={() => handleGroupClick(group)}>
      <div className="dh-at-group-header">
        <h3 className="dh-at-group-title">Группа {group.groupNumber}</h3>
      </div>
      <div className="dh-at-group-info">
        <div className="dh-at-group-specialty">{group.specialty}</div>
        <div className="dh-at-group-details">
          <span>Семестр: {group.semester}  (заглушка)</span>
          <span>Форма обучения: {group.formOfStudy}</span>
          <span className="dh-at-students-count">Студентов: {group.studentsCount || 0}</span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="dh-at-section dh-at-academic-section">
        <div className="dhm-loading">
          <div className="dhm-loading-spinner"></div>
          <p>Загрузка групп...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dh-at-section dh-at-academic-section">
        <div className="dhm-error">
          <p className="dhm-error-message">{error}</p>
          <button className="dhm-retry-button" onClick={loadGroups}>Попробовать снова</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dh-at-section dh-at-academic-section">
      <div className="dh-at-section-header">
        <h1 className="dh-at-section-title">Сводные ведомости групп</h1> </div>
        <div className="dh-at-filters">
          <div className="dh-at-search-container">
            <input
              type="text"
              className="dh-at-search-input"
              placeholder="Поиск по номеру или специальности"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <div className="dh-at-course-filter">
            <button
              className={`dh-at-course-filter-btn ${selectedCourse === 'all' ? 'active' : ''}`}
              onClick={() => handleCourseFilterChange('all')}
            >
              Все курсы
            </button>
            {[1, 2, 3, 4].map(course => (
              <button
                key={course}
                className={`dh-at-course-filter-btn ${selectedCourse === course ? 'active' : ''}`}
                onClick={() => handleCourseFilterChange(course)}
              >
                {course} курс
              </button>
            ))}
          </div>
        </div>
      

      <div className="dh-at-courses-container">
        {selectedCourse === 'all' ? (
          // Показываем все курсы
          [1, 2, 3, 4].map(course => (
            groupsByCourse[course as keyof typeof groupsByCourse].length > 0 && (
              <div key={course} className="dh-at-course-section">
                <h3 className="dh-at-course-title">{course} курс</h3>
                <div className="dh-at-groups-grid">
                  {groupsByCourse[course as keyof typeof groupsByCourse].map(group => renderGroupCard(group))}
                </div>
              </div>
            )
          ))
        ) : (
          // Показываем только выбранный курс
          <div className="dh-at-course-section">
            <h3 className="dh-at-course-title">{selectedCourse} курс</h3>
            <div className="dh-at-groups-grid">
              {groupsByCourse[selectedCourse as keyof typeof groupsByCourse].map(group => renderGroupCard(group))}
            </div>
          </div>
        )}

        {filteredGroups.length === 0 && (
          <div className="dh-at-no-groups">
            <p>Группы не найдены</p>
          </div>
        )}
      </div>

      <StatementModal />
      <NAModal />
    </div>
  );
};