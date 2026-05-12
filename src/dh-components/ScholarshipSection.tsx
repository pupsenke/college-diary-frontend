import React, { useState, useEffect } from 'react';
import { headApiService, StudentInfo, ScholarshipCategory } from '../services/headApiService';
import { DocxService, ScholarshipDocData } from '../services/docxService';
import './ScholarshipSectionStyle.css';

interface ScholarshipSectionProps {
  groupId: number;
  onClose?: () => void;
}

export const ScholarshipSection: React.FC<ScholarshipSectionProps> = ({ groupId, onClose }) => {
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [scholarshipCategories, setScholarshipCategories] = useState<ScholarshipCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedSemester, setSelectedSemester] = useState<7 | 8>(7);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<StudentInfo | null>(null);
  const [groupInfo, setGroupInfo] = useState<any>(null);

  useEffect(() => {
    loadStudents();
    loadAvailableYears();
    loadGroupInfo();
  }, [groupId]);

  useEffect(() => {
    if (students.length > 0) {
      loadScholarshipCategories();
    }
  }, [students, selectedYear, selectedSemester]);

  const loadGroupInfo = async () => {
    try {
      const group = await headApiService.getGroupById(groupId);
      setGroupInfo(group);
    } catch (error) {
      console.error('Ошибка при загрузке информации о группе:', error);
    }
  };

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

  const loadScholarshipCategories = async () => {
    setLoading(true);
    try {
      const categories = await headApiService.getStudentsByScholarshipCategories(groupId);
      setScholarshipCategories(categories);
    } catch (error) {
      console.error('Ошибка при загрузке категорий стипендии:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStudentCategory = (studentFullName: string): string => {
    for (const category of scholarshipCategories) {
      if (category.students.includes(studentFullName)) {
        return category.category;
      }
    }
    return 'none';
  };

  const getStudentsByType = (categoryType: string): StudentInfo[] => {
    const category = scholarshipCategories.find(c => c.category === categoryType);
    if (!category) return [];
    
    return students.filter(student => 
      category.students.includes(getStudentFullName(student))
    );
  };

  const getStudentFullName = (student: StudentInfo) => {
    return `${student.lastName} ${student.name} ${student.patronymic}`;
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  const handleSemesterChange = (semester: 7 | 8) => {
    setSelectedSemester(semester);
  };

  // Экспорт в DOCX с использованием шаблона
  const handleExportToDocx = async () => {
    setExporting(true);
    try {
      // Получаем студентов по категориям
      const excellentStudents = getStudentsByType('5');
      const goodExcellentStudents = getStudentsByType('4-5');
      const goodStudents = getStudentsByType('4');
      
      // Получаем ФИО заведующего отделением
      const headName = "Голубева Г.А.";
      
      // Получаем информацию о специальности
      const specialityName = groupInfo?.specialty || '09.02.07 Информационные системы и программирование';
      
      // Подготавливаем данные для шаблона - убираем дублирование "Группа"
      const groupName = `${groupInfo?.numberGroup || groupId}`;
      
      const docData: ScholarshipDocData = {
        specialityCode: '',
        specialityName: specialityName,
        course: groupInfo?.course || 4,
        group: groupName,
        excellentStudents: excellentStudents.map(s => getStudentFullName(s)),
        goodExcellentStudents: goodExcellentStudents.map(s => getStudentFullName(s)),
        goodStudents: goodStudents.map(s => getStudentFullName(s)),
        headName: headName
      };
      
      console.log('Данные для экспорта:', docData);
      
      // Загружаем шаблон
      const templatePath = '/templates/scholarship_template.docx';
      const templateBlob = await DocxService.loadTemplate(templatePath);
      
      // Генерируем документ
      const documentBlob = await DocxService.generateScholarshipDocument(templateBlob, docData);
      
      // Скачиваем документ
      const fileName = `Стипендии_${groupInfo?.numberGroup || groupId}_${selectedYear}_семестр${selectedSemester}.docx`;
      DocxService.downloadDocument(documentBlob, fileName);
      
    } catch (error) {
      console.error('Ошибка при экспорте в DOCX:', error);
      alert('Произошла ошибка при формировании документа. Пожалуйста, попробуйте снова.');
    } finally {
      setExporting(false);
    }
  };

  const getStatistics = () => {
    const totalStudents = students.length;
    const excellentCount = getStudentsByType('5').length;
    const goodExcellentCount = getStudentsByType('4-5').length;
    const goodCount = getStudentsByType('4').length;
    const noneCount = students.length - (excellentCount + goodExcellentCount + goodCount);
    const receivingCount = excellentCount + goodExcellentCount + goodCount;

    return { 
      totalStudents, 
      receivingCount, 
      byType: {
        excellent: excellentCount,
        goodExcellent: goodExcellentCount,
        good: goodCount,
        none: noneCount
      }, 
      coveragePercent: totalStudents > 0 ? (receivingCount / totalStudents) * 100 : 0 
    };
  };

  const stats = getStatistics();

  const studentsByType = {
    excellent: getStudentsByType('5'),
    goodExcellent: getStudentsByType('4-5'),
    good: getStudentsByType('4'),
    none: students.filter(student => getStudentCategory(getStudentFullName(student)) === 'none')
  };

  if (loading) {
    return <div className="schs-loading">Загрузка данных о стипендиях...</div>;
  }

  return (
    <div className="schs-container">
      <div className="schs-filters">
        <div className="schs-filters-left">
          <div className="schs-filter-group">
            <label className="schs-filter-label">Год:</label>
            <select className="schs-filter-select" value={selectedYear} onChange={(e) => handleYearChange(Number(e.target.value))}>
              {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>

          <div className="schs-filter-group">
            <label className="schs-filter-label">Семестр:</label>
            <div className="schs-semester-buttons">
              <button className={`schs-semester-btn ${selectedSemester === 7 ? 'active' : ''}`} onClick={() => handleSemesterChange(7)}>7 семестр</button>
              <button className={`schs-semester-btn ${selectedSemester === 8 ? 'active' : ''}`} onClick={() => handleSemesterChange(8)}>8 семестр</button>
            </div>
          </div>
        </div>
        
        <button 
          className="schs-export-btn" 
          onClick={handleExportToDocx}
          disabled={exporting}
        >
          {exporting ? 'Формирование документа...' : 'Экспорт в DOCX'}
        </button>
      </div>

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
      </div>

      <div className="schs-categories">
        <h3 className="schs-categories-title">Список студентов по категориям стипендий</h3>
        <div className="schs-categories-grid">
          <div className="schs-category-card excellent-category">
            <div className="category-header">
              <span className="category-name">Повышенная стипендия (+50%)</span>
              <span className="category-count">{studentsByType.excellent.length}</span>
            </div>
            <div className="category-list">
              {studentsByType.excellent.map((student, index) => (
                <div 
                  key={student.id} 
                  className="category-student" 
                  onClick={() => setSelectedStudentForDetails(student)}
                >
                  {getStudentFullName(student)}
                </div>
              ))}
              {studentsByType.excellent.length === 0 && <div className="category-empty">Нет студентов</div>}
            </div>
          </div>

          <div className="schs-category-card goodexcellent-category">
            <div className="category-header">
              <span className="category-name">Повышенная стипендия (+25%)</span>
              <span className="category-count">{studentsByType.goodExcellent.length}</span>
            </div>
            <div className="category-list">
              {studentsByType.goodExcellent.map((student, index) => (
                <div 
                  key={student.id} 
                  className="category-student" 
                  onClick={() => setSelectedStudentForDetails(student)}
                >
                  {getStudentFullName(student)}
                </div>
              ))}
              {studentsByType.goodExcellent.length === 0 && <div className="category-empty">Нет студентов</div>}
            </div>
          </div>

          <div className="schs-category-card good-category">
            <div className="category-header">
              <span className="category-name">Стандартная стипендия</span>
              <span className="category-count">{studentsByType.good.length}</span>
            </div>
            <div className="category-list">
              {studentsByType.good.map((student, index) => (
                <div 
                  key={student.id} 
                  className="category-student" 
                  onClick={() => setSelectedStudentForDetails(student)}
                >
                  {getStudentFullName(student)}
                </div>
              ))}
              {studentsByType.good.length === 0 && <div className="category-empty">Нет студентов</div>}
            </div>
          </div>

          <div className="schs-category-card none-category">
            <div className="category-header">
              <span className="category-name">Не получают стипендию</span>
              <span className="category-count">{studentsByType.none.length}</span>
            </div>
            <div className="category-list">
              {studentsByType.none.map((student, index) => (
                <div 
                  key={student.id} 
                  className="category-student" 
                  onClick={() => setSelectedStudentForDetails(student)}
                >
                  {getStudentFullName(student)}
                </div>
              ))}
              {studentsByType.none.length === 0 && <div className="category-empty">Нет студентов</div>}
            </div>
          </div>
        </div>
      </div>

      {selectedStudentForDetails && (
        <div className="schs-modal-overlay" onClick={() => setSelectedStudentForDetails(null)}>
          <div className="schs-student-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="schs-modal-header">
              <h3>Информация о студенте</h3>
              <button className="schs-modal-close" onClick={() => setSelectedStudentForDetails(null)}>✕</button>
            </div>
            <div className="schs-student-details">
              <div className="detail-row">
                <span className="detail-label">Студент:</span>
                <span className="detail-value">{getStudentFullName(selectedStudentForDetails)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Категория стипендии:</span>
                <span className={`detail-value scholarship-type-${getStudentCategory(getStudentFullName(selectedStudentForDetails))}`}>
                  {getStudentCategory(getStudentFullName(selectedStudentForDetails)) === '5' && 'Повышенная стипендия (+50%)'}
                  {getStudentCategory(getStudentFullName(selectedStudentForDetails)) === '4-5' && 'Повышенная стипендия (+25%)'}
                  {getStudentCategory(getStudentFullName(selectedStudentForDetails)) === '4' && 'Стандартная стипендия'}
                  {getStudentCategory(getStudentFullName(selectedStudentForDetails)) === 'none' && 'Не получает стипендию'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};