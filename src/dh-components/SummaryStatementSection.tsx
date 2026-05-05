import React, { useState, useEffect } from 'react';
import { headApiService } from '../services/headApiService';
import './SummaryStatementSectionStyle.css';

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

interface SummaryStatementSectionProps {
  groupId: number;
  onClose: () => void;
}

export const SummaryStatementSection: React.FC<SummaryStatementSectionProps> = ({ groupId, onClose }) => {
  const [groupStatement, setGroupStatement] = useState<GroupStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isNAModalOpen, setIsNAModalOpen] = useState(false);
  const [selectedNAStudent, setSelectedNAStudent] = useState<StudentGrade | null>(null);
  const [selectedNASubject, setSelectedNASubject] = useState<string>('');

  useEffect(() => {
    loadGroupStatement();
  }, [groupId]);

  const getAssessmentForm = (subjectName: string): string => {
    if (subjectName.toLowerCase().includes('физическая культура')) {
      return 'З';
    }
    return 'Экзамен';
  };

  const loadGroupStatement = async () => {
    try {
      setLoading(true);
      setError(null);

      // Получаем информацию о группе
      const groups = await headApiService.getGroups();
      const group = groups.find(g => g.id === groupId);
      
      if (!group) {
        throw new Error('Группа не найдена');
      }

      // Получаем студентов группы
      const studentsInfo = await headApiService.getGroupStudents(groupId);
      
      // Получаем предметы группы
      const subjectsInfo = await headApiService.getGroupSubjects(groupId);

      const subjects: Subject[] = subjectsInfo.map(s => ({
        id: s.id,
        name: s.name,
        assessmentForm: getAssessmentForm(s.name),
      }));

      const studentGrades: StudentGrade[] = [];

      // Загружаем оценки для каждого студента
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

        // Подсчет количества оценок
        let five = 0, four = 0, three = 0;
        Array.from(gradesMap.values()).forEach(grade => {
          if (grade === '5') five++;
          else if (grade === '4') four++;
          else if (grade === '3') three++;
        });

        // Расчет среднего балла
        let sum = 0, count = 0;
        Array.from(gradesMap.values()).forEach(grade => {
          const num = parseFloat(grade);
          if (!isNaN(num) && num >= 2 && num <= 5) {
            sum += num;
            count++;
          }
        });
        const average = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;

        // Получаем статистику посещаемости
        const attendanceStats = await headApiService.getStudentAttendanceStats(student.id, groupId);

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

      // Сортируем студентов по алфавиту
      studentGrades.sort((a, b) => a.name.localeCompare(b.name));

      setGroupStatement({
        id: group.id,
        groupNumber: group.numberGroup.toString(),
        specialty: group.specialty,
        course: group.course,
        semester: 5,
        academicYear: `${group.admissionYear}-${group.admissionYear + 1}`,
        formOfStudy: group.formEducation,
        students: studentGrades,
        subjects,
        studentsCount: studentGrades.length,
      });
    } catch (err) {
      console.error('Ошибка загрузки сводной ведомости:', err);
      setError('Не удалось загрузить данные сводной ведомости');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (studentId: number, subjectKey: string, newGrade: string) => {
    if (!groupStatement) return;
    
    const updatedGroup = { ...groupStatement };
    const student = updatedGroup.students.find(s => s.id === studentId);
    
    if (student) {
      student.grades.set(subjectKey, newGrade);
      
      // Пересчет количества оценок
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
    
    setGroupStatement(updatedGroup);
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

  const calculateStatistics = () => {
    if (!groupStatement) return { fivesOnly: 0, foursAndFives: 0, oneThree: 0, naCount: 0 };
    
    let fivesOnly = 0;
    let foursAndFives = 0;
    let oneThree = 0;
    let naCount = 0;

    groupStatement.students.forEach(student => {
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

  const getSubjectNameLength = (name: string): string => {
    if (name.length > 50) return 'very-long-name';
    if (name.length > 30) return 'long-name';
    return '';
  };

  if (loading) {
    return (
      <div className="dh-at-summary-loading" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="dhm-loading-spinner" style={{ margin: '0 auto 16px' }}></div>
        <p>Загрузка сводной ведомости...</p>
      </div>
    );
  }

  if (error || !groupStatement) {
    return (
      <div className="dh-at-summary-error" style={{ padding: '40px', textAlign: 'center' }}>
        <p className="dhp-error-message">{error || 'Группа не найдена'}</p>
        <button className="dhp-retry-button" onClick={loadGroupStatement}>
          Попробовать снова
        </button>
      </div>
    );
  }

  const statistics = calculateStatistics();

  return (
    <div className="dh-at-statement-wrapper" style={{ height: '100%', overflow: 'auto' }}>
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
        </div>
      </div>

      <div className="dh-at-statement-body">
        <div className="dh-at-statement-title">
          <div className="dh-at-main-title">
            Сводная аттестационная ведомость на {groupStatement.academicYear} (заглушка) учебный год Семестр {groupStatement.semester} (заглушка)
          </div>
          <div>Специальность: {groupStatement.specialty}</div>
          <div>Курс: {groupStatement.course} Группа: {groupStatement.groupNumber} Форма обучения: {groupStatement.formOfStudy}</div>
        </div>

        <div className="dh-at-table-container">
          <table className="dh-at-statement-table">
            <thead>
              <tr>
                <th rowSpan={2}>№ п/п</th>
                <th rowSpan={2}>Фамилия, имя, отчество студента</th>
                <th colSpan={groupStatement.subjects.length}>Наименование дисциплины (МДК)/ форма аттестации</th>
                <th rowSpan={2}>Средний балл</th>
                <th rowSpan={2}>Поведение</th>
                <th rowSpan={2}>Пропуски занятий всего</th>
                <th rowSpan={2}>в т. ч. по неуважит. причинам</th>
                <th rowSpan={2}>Стипендия:</th>
                <th colSpan={3}>Кол-во оценок</th>
              </tr>
              <tr>
                {groupStatement.subjects.map((subject) => (
                  <th 
                    key={subject.id} 
                    className={`dh-at-vertical-header ${getSubjectNameLength(subject.name)}`}
                  >
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
              {groupStatement.students.map((student, idx) => (
                <tr key={student.id}>
                  <td>{idx + 1}</td>
                  <td className="dh-at-student-name">{student.name}</td>
                  {groupStatement.subjects.map((subject) => {
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
                <td colSpan={groupStatement.subjects.length + 12} className="dh-at-statistics-footer">
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

      {/* Модальное окно для направления на аттестацию */}
      {isNAModalOpen && selectedNAStudent && (
        <div className="dh-at-modal-overlay" onClick={() => setIsNAModalOpen(false)}>
          <div className="dh-at-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="dh-at-modal-header">
              <h3>Направление на аттестацию</h3>
              <button className="dh-at-modal-close" onClick={() => setIsNAModalOpen(false)}>×</button>
            </div>
            <div className="dh-at-modal-body">
              <div className="dh-at-na-info">
                <p>Студент: <strong>{selectedNAStudent.name}</strong></p>
                <p>Предмет: <strong>{selectedNASubject}</strong></p>
              </div>
              <p>Создать направление на аттестацию?</p>
            </div>
            <div className="dh-at-modal-footer">
              <button className="dh-at-btn-secondary" onClick={() => setIsNAModalOpen(false)}>Отмена</button>
              <button className="dh-at-btn-primary" onClick={handleCreateAttestation}>Создать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};