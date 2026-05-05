import React, { useState, useEffect } from 'react';
import { headApiService, StudentInfo } from '../services/headApiService';
import './ScholarshipSectionStyle.css';

interface ScholarshipData {
  studentId: number;
  year: number;
  semester: 1 | 2;
  averageGrade: number;
  scholarshipType: 'excellent' | 'good-excellent' | 'good' | 'none';
  amount: number | null;
}

interface ScholarshipSectionProps {
  groupId: number;
  onClose?: () => void;
}

export const ScholarshipSection: React.FC<ScholarshipSectionProps> = ({ groupId, onClose }) => {
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [scholarships, setScholarships] = useState<ScholarshipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    loadStudents();
    loadAvailableYears();
  }, [groupId]);

  useEffect(() => {
    if (students.length > 0) {
      loadScholarships();
    }
  }, [students, selectedYear, selectedSemester]);

  const loadStudents = async () => {
    try {
      const studentsData = await headApiService.getGroupStudents(groupId);
      setStudents(studentsData);
    } catch (error) {
      console.error('Ошибка при загрузке студентов:', error);
    }
  };

  const loadAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 3; i <= currentYear + 2; i++) {
      years.push(i);
    }
    setAvailableYears(years);
  };

  const getScholarshipType = (averageGrade: number): 'excellent' | 'good-excellent' | 'good' | 'none' => {
    if (averageGrade >= 4.8) return 'excellent';
    if (averageGrade >= 4.0) return 'good-excellent';
    if (averageGrade >= 3.5) return 'good';
    return 'none';
  };

  const getScholarshipAmount = (type: 'excellent' | 'good-excellent' | 'good' | 'none'): number | null => {
    switch (type) {
      case 'excellent':
        return 3500;
      case 'good-excellent':
        return 2500;
      case 'good':
        return 1800;
      default:
        return null;
    }
  };

  const getStudentAverageGrade = async (studentId: number): Promise<number> => {
    try {
      const average = await headApiService.getStudentOverallAverage(studentId);
      return average;
    } catch (error) {
      console.error(`Ошибка получения среднего балла для студента ${studentId}:`, error);
      return 0;
    }
  };

  const loadScholarships = async () => {
    setLoading(true);
    try {
      const scholarshipsData: ScholarshipData[] = [];
      
      for (const student of students) {
        const averageGrade = await getStudentAverageGrade(student.id);
        const scholarshipType = getScholarshipType(averageGrade);
        const amount = getScholarshipAmount(scholarshipType);
        
        scholarshipsData.push({
          studentId: student.id,
          year: selectedYear,
          semester: selectedSemester,
          averageGrade: averageGrade,
          scholarshipType: scholarshipType,
          amount: amount
        });
      }
      
      scholarshipsData.sort((a, b) => b.averageGrade - a.averageGrade);
      setScholarships(scholarshipsData);
    } catch (error) {
      console.error('Ошибка при загрузке данных о стипендиях:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScholarshipForStudent = (studentId: number): ScholarshipData | undefined => {
    return scholarships.find(s => s.studentId === studentId);
  };

  const getScholarshipTypeName = (type: ScholarshipData['scholarshipType']): string => {
    const types = {
      excellent: 'Повышенная стипендия (только 5)',
      'good-excellent': 'Обычная стипендия (4-5)',
      good: 'Пониженная стипендия (4)',
      none: 'Не получает стипендию'
    };
    return types[type];
  };


  const getScholarshipTypeClass = (type: ScholarshipData['scholarshipType']): string => {
    const classes = {
      excellent: 'schs-type-excellent',
      'good-excellent': 'schs-type-good-excellent',
      good: 'schs-type-good',
      none: 'schs-type-none'
    };
    return classes[type];
  };

  const formatAmount = (amount: number | null): string => {
    if (amount === null) return '—';
    return `${amount.toLocaleString('ru-RU')} ₽`;
  };

  const getStudentFullName = (student: StudentInfo) => {
    return `${student.lastName} ${student.name} ${student.patronymic}`;
  };

  const getStudentInitials = (student: StudentInfo) => {
    const nameInitial = student.name.charAt(0);
    const patronymicInitial = student.patronymic ? student.patronymic.charAt(0) : '';
    return `${nameInitial}${patronymicInitial}`;
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  const handleSemesterChange = (semester: 1 | 2) => {
    setSelectedSemester(semester);
  };

  const getStatistics = () => {
    const totalStudents = students.length;
    const receivingCount = scholarships.filter(s => s.scholarshipType !== 'none').length;
    const totalAmount = scholarships.reduce((sum, s) => sum + (s.amount || 0), 0);
    const averageAmount = receivingCount > 0 ? totalAmount / receivingCount : 0;
    
    const byType = {
      excellent: scholarships.filter(s => s.scholarshipType === 'excellent').length,
      goodExcellent: scholarships.filter(s => s.scholarshipType === 'good-excellent').length,
      good: scholarships.filter(s => s.scholarshipType === 'good').length,
      none: scholarships.filter(s => s.scholarshipType === 'none').length
    };

    const averageGradeGroup = scholarships.reduce((sum, s) => sum + s.averageGrade, 0) / totalStudents;

    return {
      totalStudents,
      receivingCount,
      averageAmount,
      byType,
      coveragePercent: totalStudents > 0 ? (receivingCount / totalStudents) * 100 : 0,
      averageGradeGroup
    };
  };

  const stats = getStatistics();

  return (
    <div className="schs-container">
      {/* Фильтры */}
      <div className="schs-filters">
        <div className="schs-filter-group">
          <label className="schs-filter-label">Год:</label>
          <select 
            className="schs-filter-select"
            value={selectedYear}
            onChange={(e) => handleYearChange(Number(e.target.value))}
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="schs-filter-group">
          <label className="schs-filter-label">Семестр:</label>
          <div className="schs-semester-buttons">
            <button
              className={`schs-semester-btn ${selectedSemester === 1 ? 'active' : ''}`}
              onClick={() => handleSemesterChange(1)}
            >
              1 семестр
            </button>
            <button
              className={`schs-semester-btn ${selectedSemester === 2 ? 'active' : ''}`}
              onClick={() => handleSemesterChange(2)}
            >
              2 семестр
            </button>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="schs-stats">
        <div className="schs-stat-card">
          <div className="schs-stat-value">{stats.totalStudents}</div>
          <div className="schs-stat-label">Всего студентов</div>
        </div>
        <div className="schs-stat-card">
          <div className="schs-stat-value">{stats.receivingCount}</div>
          <div className="schs-stat-label">Получают стипендию</div>
        </div>
        <div className="schs-stat-card">
          <div className="schs-stat-value">{stats.coveragePercent.toFixed(1)}%</div>
          <div className="schs-stat-label">Охват стипендиями</div>
        </div>
        <div className="schs-stat-card">
          <div className="schs-stat-value">{formatAmount(stats.averageAmount)}</div>
          <div className="schs-stat-label">Средний размер</div>
        </div>
        <div className="schs-stat-card">
          <div className="schs-stat-value">{stats.averageGradeGroup.toFixed(2)}</div>
          <div className="schs-stat-label">Средний балл группы</div>
        </div>
      </div>

      {/* Распределение по типам */}
      <div className="schs-types-distribution">
        <h4 className="schs-distribution-title">Распределение по типам стипендий</h4>
        <div className="schs-types-bars">
          <div className="schs-type-bar-item">
            <span className="schs-type-label">Повышенная (5)</span>
            <div className="schs-bar-container">
              <div 
                className="schs-bar schs-excellent-bar" 
                style={{ width: `${(stats.byType.excellent / stats.totalStudents) * 100}%` }}
              />
            </div>
            <span className="schs-type-count">{stats.byType.excellent}</span>
            <span className="schs-type-condition">сессия сдана на 5</span>
          </div>
          <div className="schs-type-bar-item">
            <span className="schs-type-label">Повышенная (4-5)</span>
            <div className="schs-bar-container">
              <div 
                className="schs-bar schs-good-excellent-bar" 
                style={{ width: `${(stats.byType.goodExcellent / stats.totalStudents) * 100}%` }}
              />
            </div>
            <span className="schs-type-count">{stats.byType.goodExcellent}</span>
            <span className="schs-type-condition">сессия сдана на 4-5</span>
          </div>
          <div className="schs-type-bar-item">
            <span className="schs-type-label">Обычная (4)</span>
            <div className="schs-bar-container">
              <div 
                className="schs-bar schs-good-bar" 
                style={{ width: `${(stats.byType.good / stats.totalStudents) * 100}%` }}
              />
            </div>
            <span className="schs-type-count">{stats.byType.good}</span>
            <span className="schs-type-condition">сессия сдана на 4</span>
          </div>
          <div className="schs-type-bar-item">
            <span className="schs-type-label">Не получают</span>
            <div className="schs-bar-container">
              <div 
                className="schs-bar schs-none-bar" 
                style={{ width: `${(stats.byType.none / stats.totalStudents) * 100}%` }}
              />
            </div>
            <span className="schs-type-count">{stats.byType.none}</span>
            <span className="schs-type-condition">сессия сдана с 3</span>
          </div>
        </div>
      </div>

      {/* Таблица студентов */}
      {loading ? (
        <div className="schs-loading">
          <div className="schs-loading-spinner"></div>
          <p>Расчет стипендий...</p>
        </div>
      ) : (
        <div className="schs-table-container">
          <table className="schs-table">
            <thead>
              <tr>
                <th className="schs-student-col">Студент</th>
                <th className="schs-grade-col">Средний балл</th>
                <th className="schs-type-col">Тип стипендии</th>
                <th className="schs-amount-col">Размер (₽)</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const scholarship = getScholarshipForStudent(student.id);
                const type = scholarship?.scholarshipType || 'none';
                const amount = scholarship?.amount || null;
                const averageGrade = scholarship?.averageGrade || 0;
                
                return (
                  <tr key={student.id}>
                    <td className="schs-student-cell">
                      <div className="schs-student-avatar">
                        {getStudentInitials(student)}
                      </div>
                      <span className="schs-student-name">{getStudentFullName(student)}</span>
                    </td>
                    <td className="schs-grade-cell">
                      <span className={`schs-grade-badge ${averageGrade >= 4.5 ? 'high' : averageGrade >= 4.0 ? 'good' : averageGrade >= 3.0 ? 'medium' : 'low'}`}>
                        {averageGrade > 0 ? averageGrade.toFixed(2) : '—'}
                      </span>
                    </td>
                    <td className="schs-type-cell">
                      <div className="schs-type-info">
                        <span className={`schs-type-badge ${getScholarshipTypeClass(type)}`}>
                          {getScholarshipTypeName(type)}
                        </span>
                      </div>
                    </td>
                    <td className={`schs-amount-cell ${amount === null ? 'schs-no-amount' : ''}`}>
                      {formatAmount(amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};