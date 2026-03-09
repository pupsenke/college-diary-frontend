import React, { useState, useEffect } from 'react';
import './AcademicWorkSectionStyle.css';

interface StudentGrade {
  id: number;
  name: string;
  grades: {
    [subject: string]: string;
  };
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
}

interface Subject {
  id: number;
  name: string;
  assessmentForm: string;
}

export const AcademicWorkSection: React.FC = () => {
  const [selectedGroup, setSelectedGroup] = useState<GroupStatement | null>(null);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [isNAModalOpen, setIsNAModalOpen] = useState(false);
  const [selectedNAStudent, setSelectedNAStudent] = useState<StudentGrade | null>(null);
  const [selectedNASubject, setSelectedNASubject] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Моковые данные групп
  const [groups, setGroups] = useState<GroupStatement[]>([
    {
      id: 1,
      groupNumber: '2992',
      specialty: '09.02.07 Информационные системы и программирование',
      course: 3,
      semester: 5,
      academicYear: '2024-2025',
      formOfStudy: 'очная',
      students: [
        {
          id: 1,
          name: 'Абрамов Кирилл Денисович',
          grades: {
            'Теория вероятностей и математическая статистика, Эу': '4',
            'Компьютерные сети, Эу': '3',
            'Основы программирования и конфигурирования в корпоративных информационных системах на платформе 1С:Предприятие, Эу': '5',
            'Технология разработки и защиты баз данных, ДЗ': '3',
            'Проектный практикум, ДЗ': '5',
            'УП.01 Учебная практика, ДЗ': 'н/а',
            'УП.11 Учебная практика, ДЗ': '4',
            'Физическая культура, З': 'зач.'
          },
          average: 4.1,
          behavior: 'х',
          absencesTotal: 4,
          absencesUnjustified: 4,
          scholarship: '',
          gradesCount: { five: 1, four: 1, three: 1 }
        },
        {
          id: 2,
          name: 'Андреев Никита Игоревич',
          grades: {
            'Теория вероятностей и математическая статистика, Эу': '3',
            'Компьютерные сети, Эу': '3',
            'Основы программирования и конфигурирования в корпоративных информационных системах на платформе 1С:Предприятие, Эу': '3',
            'Технология разработки и защиты баз данных, ДЗ': '3',
            'Проектный практикум, ДЗ': '5',
            'УП.01 Учебная практика, ДЗ': '5',
            'УП.11 Учебная практика, ДЗ': '4',
            'Физическая культура, З': 'зач.'
          },
          average: 3.7,
          behavior: 'х',
          absencesTotal: 16,
          absencesUnjustified: 14,
          scholarship: '',
          gradesCount: { five: 0, four: 0, three: 3 }
        }
      ]
    },
    {
      id: 2,
      groupNumber: '2993',
      specialty: '09.02.07 Информационные системы и программирование',
      course: 3,
      semester: 5,
      academicYear: '2024-2025',
      formOfStudy: 'очная',
      students: [
        {
          id: 1,
          name: 'Иванов Иван Иванович',
          grades: {
            'Теория вероятностей и математическая статистика, Эу': '5',
            'Компьютерные сети, Эу': '4',
            'Основы программирования и конфигурирования в корпоративных информационных системах на платформе 1С:Предприятие, Эу': '5',
            'Технология разработки и защиты баз данных, ДЗ': '4',
            'Проектный практикум, ДЗ': '5',
            'УП.01 Учебная практика, ДЗ': '5',
            'УП.11 Учебная практика, ДЗ': '5',
            'Физическая культура, З': 'зач.'
          },
          average: 4.6,
          behavior: 'х',
          absencesTotal: 8,
          absencesUnjustified: 2,
          scholarship: '4-5',
          gradesCount: { five: 2, four: 1, three: 0 }
        }
      ]
    },
    {
      id: 3,
      groupNumber: '2994',
      specialty: '09.02.07 Информационные системы и программирование',
      course: 3,
      semester: 5,
      academicYear: '2024-2025',
      formOfStudy: 'очная',
      students: [
        {
          id: 1,
          name: 'Петров Петр Петрович',
          grades: {
            'Теория вероятностей и математическая статистика, Эу': '4',
            'Компьютерные сети, Эу': '4',
            'Основы программирования и конфигурирования в корпоративных информационных системах на платформе 1С:Предприятие, Эу': '4',
            'Технология разработки и защиты баз данных, ДЗ': '3',
            'Проектный практикум, ДЗ': '4',
            'УП.01 Учебная практика, ДЗ': '4',
            'УП.11 Учебная практика, ДЗ': '4',
            'Физическая культура, З': 'зач.'
          },
          average: 3.9,
          behavior: 'х',
          absencesTotal: 12,
          absencesUnjustified: 6,
          scholarship: '',
          gradesCount: { five: 0, four: 3, three: 1 }
        }
      ]
    }
  ]);

  const subjects: Subject[] = [
    { id: 1, name: 'Теория вероятностей и математическая статистика', assessmentForm: 'Эу' },
    { id: 2, name: 'Компьютерные сети', assessmentForm: 'Эу' },
    { id: 3, name: 'Основы программирования и конфигурирования в корпоративных информационных системах на платформе 1С:Предприятие', assessmentForm: 'Эу' },
    { id: 4, name: 'Технология разработки и защиты баз данных', assessmentForm: 'ДЗ' },
    { id: 5, name: 'Проектный практикум', assessmentForm: 'ДЗ' },
    { id: 6, name: 'УП.01 Учебная практика', assessmentForm: 'ДЗ' },
    { id: 7, name: 'УП.11 Учебная практика', assessmentForm: 'ДЗ' },
    { id: 8, name: 'Физическая культура', assessmentForm: 'З' }
  ];

  const handleGroupClick = (group: GroupStatement) => {
    setSelectedGroup(group);
    setIsStatementModalOpen(true);
  };

  const handleGradeChange = (studentId: number, subjectName: string, newGrade: string) => {
    if (!selectedGroup) return;
    
    const updatedGroup = { ...selectedGroup };
    const student = updatedGroup.students.find(s => s.id === studentId);
    if (student) {
      student.grades[subjectName] = newGrade;
      
      // Пересчет среднего балла и количества оценок
      const grades = Object.values(student.grades)
        .filter(grade => grade !== 'зач.' && grade !== 'н/а' && grade !== '')
        .map(grade => parseInt(grade));
      
      if (grades.length > 0) {
        student.average = parseFloat((grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1));
      }
      
      // Пересчет количества оценок
      student.gradesCount.five = Object.values(student.grades).filter(g => g === '5').length;
      student.gradesCount.four = Object.values(student.grades).filter(g => g === '4').length;
      student.gradesCount.three = Object.values(student.grades).filter(g => g === '3').length;
    }
    
    setSelectedGroup(updatedGroup);
  };

  const handleNAGradeClick = (student: StudentGrade, subjectName: string) => {
    setSelectedNAStudent(student);
    setSelectedNASubject(subjectName);
  };

  const handleCreateAttestation = () => {
    // Логика создания направления на аттестацию
    alert(`Создано направление на аттестацию для ${selectedNAStudent?.name} по предмету "${selectedNASubject}"`);
    
    // Обновляем оценку с н/а на оценку после аттестации
    if (selectedNAStudent && selectedGroup) {
      handleGradeChange(selectedNAStudent.id, selectedNASubject, '4'); // Пример: ставим 4 после аттестации
    }
  };

  const handleExportStatement = () => {
    // Логика экспорта ведомости (в будущем)
    alert('Экспорт ведомости будет реализован позже');
  };


  const StatementModal = () => {
    if (!isStatementModalOpen || !selectedGroup) return null;

    // Расчет статистики
    const calculateStatistics = () => {
      if (!selectedGroup) return { fivesOnly: 0, foursAndFives: 0, oneThree: 0, naCount: 0 };
      
      let fivesOnly = 0;
      let foursAndFives = 0;
      let oneThree = 0;
      let naCount = 0;

      selectedGroup.students.forEach(student => {
        // Подсчет н/а
        const naGrades = Object.values(student.grades).filter(grade => grade === 'н/а').length;
        if (naGrades > 0) naCount++;

        // Оценки числовые
        const numericGrades = Object.values(student.grades)
          .filter(grade => grade === '5' || grade === '4' || grade === '3')
          .map(grade => grade as '5' | '4' | '3');
        
        if (numericGrades.length === 0) return;

        // Только 5
        const hasOnlyFives = numericGrades.every(grade => grade === '5') && numericGrades.length > 0;
        if (hasOnlyFives) fivesOnly++;

        // 4 и 5 (без троек)
        const hasFoursAndFives = numericGrades.every(grade => grade === '5' || grade === '4') && 
                                numericGrades.some(grade => grade === '4' || grade === '5');
        if (hasFoursAndFives) foursAndFives++;

        // Ровно одна 3
        const threeCount = numericGrades.filter(grade => grade === '3').length;
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
                  <button 
                    className="dh-at-btn-secondary"
                    onClick={() => setIsEditing(false)}
                  >
                    Отменить редактирование
                  </button>
                  <button 
                    className="dh-at-btn-primary"
                    onClick={() => {
                      setIsEditing(false);
                      // Логика сохранения изменений
                      alert('Изменения сохранены');
                    }}
                  >
                    Сохранить
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="dh-at-btn-secondary"
                    onClick={() => setIsEditing(true)}
                  >
                    Редактировать
                  </button>
                  <button 
                    className="dh-at-btn-primary"
                    onClick={handleExportStatement}
                  >
                    Экспорт
                  </button>
                </>
              )}
              <button 
                className="dh-at-modal-close"
                onClick={() => setIsStatementModalOpen(false)}
              >
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
                    <th colSpan={subjects.length}>Наименование дисциплины (МДК)/ форма аттестации</th>
                    <th rowSpan={2}>Средний балл</th>
                    <th rowSpan={2}>Поведение</th>
                    <th rowSpan={2}>Пропуски занятий всего</th>
                    <th rowSpan={2}>в т. ч. по неуважит. причинам</th>
                    <th rowSpan={2}>Стипендия:</th>
                    <th colSpan={3}>Кол-во оценок</th>
                  </tr>
                  <tr>
                    {subjects.map((subject) => (
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
                  {selectedGroup.students.map((student, index) => (
                    <tr key={student.id}>
                      <td>{index + 1}</td>
                      <td className="dh-at-student-name">{student.name}</td>
                      {subjects.map((subject) => {
                        const grade = student.grades[`${subject.name}, ${subject.assessmentForm}`];
                        return (
                          <td key={subject.id}>
                            {isEditing ? (
                              <select 
                                value={grade}
                                onChange={(e) => handleGradeChange(student.id, `${subject.name}, ${subject.assessmentForm}`, e.target.value)}
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
                                onClick={() => handleNAGradeClick(student, `${subject.name}, ${subject.assessmentForm}`)}
                              >
                                н/а
                              </button>
                            ) : (
                              grade
                            )}
                          </td>
                        );
                      })}
                      <td className="dh-at-average">{student.average}</td>
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
                    <td colSpan={subjects.length + 12} className="dh-at-statistics-footer">
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

  return (
    <div className="dh-at-section dh-at-academic-section">
      <div className="dh-at-section-header">
        <h1 className="dh-at-section-title">Сводные ведомости групп</h1>
      </div>

      <div className="dh-at-groups-grid">
        {groups.map((group) => (
          <div 
            key={group.id} 
            className="dh-at-group-card"
            onClick={() => handleGroupClick(group)}
          >
            <div className="dh-at-group-header">
              <h3 className="dh-at-group-title">Группа {group.groupNumber}</h3>
              <span className="dh-at-group-badge">Курс {group.course}</span>
            </div>
            
            <div className="dh-at-group-info">
              <p className="dh-at-group-specialty">{group.specialty}</p>
              <div className="dh-at-group-details">
                <span>Семестр: {group.semester}</span>
                <span>Форма: {group.formOfStudy}</span>
                <span>Уч. год: {group.academicYear}</span>
              </div>
              <p className="dh-at-group-students">Студентов: {group.students.length}</p>
            </div>
            
            <div className="dh-at-group-footer">
              <button className="dh-at-view-button">
                Просмотреть ведомость
              </button>
            </div>
          </div>
        ))}
      </div>
      <StatementModal />
    </div>
  );
};