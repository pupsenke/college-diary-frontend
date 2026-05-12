import React, { useState, useEffect } from 'react';
import { headApiService } from '../services/headApiService';
import ExcelJS from 'exceljs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
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
  naSubjects?: Set<string>;
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

interface GroupReportResponse {
  subjectNames: string[];
  studentsData: StudentReportData[][];
}

interface StudentReportData {
  fio: string;
  marks: number[];
  average: number;
  count_3: number;
  count_4: number;
  count_5: number;
  non_excused: number;
  scholarship: string;
  total_absent: number;
}

interface SummaryStatementSectionProps {
  groupId: number;
  onClose: () => void;
}

interface AttestationFormData {
  attestationForm: string;
  teacherName: string;
  headName: string;
  courseworkTopic: string;
  attestationNumber: string;
  attestationDate: string;
}

export const SummaryStatementSection: React.FC<SummaryStatementSectionProps> = ({ groupId, onClose }) => {
  const [groupStatement, setGroupStatement] = useState<GroupStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isNAModalOpen, setIsNAModalOpen] = useState(false);
  const [selectedNAStudent, setSelectedNAStudent] = useState<StudentGrade | null>(null);
  const [selectedNASubject, setSelectedNASubject] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Фильтры год и семестр
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedSemester, setSelectedSemester] = useState<number>(7);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const [attestationFormData, setAttestationFormData] = useState<AttestationFormData>({
    attestationForm: 'экзамен',
    teacherName: '',
    headName: 'Голубева Г.А.',
    courseworkTopic: '',
    attestationNumber: '',
    attestationDate: new Date().toISOString().split('T')[0]
  });

  const attestationForms = ['зачет', 'дифф. зачет', 'экзамен', 'курсовой проект'];
  const headOptions = ['Голубева Г.А.'];

  // Инициализация доступных годов
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 3; i <= currentYear + 2; i++) {
      years.push(i);
    }
    setAvailableYears(years);
  }, []);

  // Перезагрузка данных при изменении фильтров
  useEffect(() => {
    if (groupId) {
      loadGroupStatement();
    }
  }, [groupId, selectedYear, selectedSemester]);

  // Функция для форматирования среднего балла
  const formatAverageDisplay = (avg: number): string => {
    if (avg === 0 || isNaN(avg)) return '-';
    if (Number.isInteger(avg)) return avg.toString();
    return avg.toFixed(1);
  };

  const handleExportStatement = () => {
    if (!groupStatement) return;
    exportToExcel();
  };

  // Функция экспорта в Excel с использованием ExcelJS
  const exportToExcel = async () => {
    if (!groupStatement) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Сводная ведомость');
      
      const subjectCount = groupStatement.subjects.length;
      
      // Структура колонок:
      const afterSubjectsStart = 3 + subjectCount;
      const avgCol = afterSubjectsStart;           // Средний балл
      const behaviorCol = afterSubjectsStart + 1;  // Поведение
      const totalAbsentCol = afterSubjectsStart + 2; // Пропуски всего
      const unjustifiedCol = afterSubjectsStart + 3; // в т.ч. неув.
      const scholarshipCol = afterSubjectsStart + 4; // Стипендия
      const gradesStartCol = afterSubjectsStart + 5; // Начало колонок с оценками (5,4,3)
      
      const lastColIndex = gradesStartCol + 2;
      const lastColLetter = String.fromCharCode(65 + lastColIndex - 1);
      
      // 1. Заголовок ведомости
      worksheet.mergeCells(`A1:${lastColLetter}1`);
      worksheet.getCell('A1').value = `Сводная аттестационная ведомость на ${groupStatement.academicYear} учебный год Семестр ${groupStatement.semester}`;
      worksheet.getCell('A1').font = { size: 14, bold: true };
      worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      
      worksheet.mergeCells(`A2:${lastColLetter}2`);
      worksheet.getCell('A2').value = `Специальность: ${groupStatement.specialty}`;
      worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
      
      worksheet.mergeCells(`A3:${lastColLetter}3`);
      worksheet.getCell('A3').value = `Курс: ${groupStatement.course} Группа: ${groupStatement.groupNumber} Форма обучения: ${groupStatement.formOfStudy}`;
      worksheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };
      
      // 2. Первая строка заголовка (строка 5)
      const firstHeaderRow = worksheet.getRow(5);
      firstHeaderRow.height = 30;
      firstHeaderRow.getCell(1).value = '№ п/п';
      firstHeaderRow.getCell(2).value = 'Фамилия, имя, отчество студента';
      
      // Объединение для дисциплин C5 до колонки с предметами
      worksheet.mergeCells(5, 3, 5, 2 + subjectCount);
      firstHeaderRow.getCell(3).value = 'Наименование дисциплины (МДК)/ форма аттестации';
      
      // Ячейки после предметов
      firstHeaderRow.getCell(avgCol).value = 'Средний балл';
      firstHeaderRow.getCell(behaviorCol).value = 'Поведение';
      firstHeaderRow.getCell(totalAbsentCol).value = 'Пропуски занятий всего';
      firstHeaderRow.getCell(unjustifiedCol).value = 'в т. ч. по неуважит. причинам';
      firstHeaderRow.getCell(scholarshipCol).value = 'Стипендия:';
      
      // Объединение для кол-ва оценок - объединяем 3 колонки
      worksheet.mergeCells(5, gradesStartCol, 5, gradesStartCol + 2);
      firstHeaderRow.getCell(gradesStartCol).value = 'Кол-во оценок';
      
      // Стили первой строки
      for (let i = 1; i <= lastColIndex; i++) {
        const cell = firstHeaderRow.getCell(i);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7893d9' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }
      
      // 3. Вторая строка заголовка (строка 6)
      const secondHeaderRow = worksheet.getRow(6);
      secondHeaderRow.height = 80;
      
      // Заливаем цветом A6 и B6
      const cellA6 = secondHeaderRow.getCell(1);
      cellA6.value = '';
      cellA6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7893d9' } };
      cellA6.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      
      const cellB6 = secondHeaderRow.getCell(2);
      cellB6.value = '';
      cellB6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7893d9' } };
      cellB6.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      
      // Добавляем предметы с вертикальным текстом
      groupStatement.subjects.forEach((subject, idx) => {
        const cell = secondHeaderRow.getCell(3 + idx);
        cell.value = `${subject.name}, ${subject.assessmentForm}`;
        cell.alignment = { 
          horizontal: 'center', 
          vertical: 'middle', 
          wrapText: true,
          textRotation: 255
        };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7893d9' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      
      // Пустые ячейки для среднего балла, поведения и т.д.
      for (let i = avgCol; i <= scholarshipCol; i++) {
        const cell = secondHeaderRow.getCell(i);
        cell.value = '';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7893d9' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }
      
      // Отдельные ячейки 5, 4, 3
      const cell5 = secondHeaderRow.getCell(gradesStartCol);
      cell5.value = '5';
      cell5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7893d9' } };
      cell5.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
      cell5.alignment = { horizontal: 'center', vertical: 'middle' };
      cell5.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      
      const cell4 = secondHeaderRow.getCell(gradesStartCol + 1);
      cell4.value = '4';
      cell4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7893d9' } };
      cell4.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
      cell4.alignment = { horizontal: 'center', vertical: 'middle' };
      cell4.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      
      const cell3 = secondHeaderRow.getCell(gradesStartCol + 2);
      cell3.value = '3';
      cell3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7893d9' } };
      cell3.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
      cell3.alignment = { horizontal: 'center', vertical: 'middle' };
      cell3.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      
      // 4. Данные студентов
      groupStatement.students.forEach((student, idx) => {
        const row = worksheet.getRow(7 + idx);
        row.height = 18;
        
        row.getCell(1).value = idx + 1;
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(1).font = { size: 10 };
        row.getCell(1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        
        row.getCell(2).value = student.name;
        row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(2).font = { size: 10 };
        row.getCell(2).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        
        // Оценки по предметам
        groupStatement.subjects.forEach((subject, subjIdx) => {
          const subjectKey = `${subject.name}, ${subject.assessmentForm}`;
          const grade = student.grades.get(subjectKey) || '';
          const cell = row.getCell(3 + subjIdx);
          cell.value = grade;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { size: 10 };
          if (student.naSubjects?.has(subjectKey)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe8f4fd' } };
          }
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        
        // Средний балл
        const avgCell = row.getCell(avgCol);
        avgCell.value = student.average;
        avgCell.numFmt = '0.0';
        avgCell.font = { bold: true, color: { argb: 'FF002FA7' }, size: 10 };
        avgCell.alignment = { horizontal: 'center', vertical: 'middle' };
        avgCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        
        // Поведение
        row.getCell(behaviorCol).value = student.behavior;
        row.getCell(behaviorCol).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(behaviorCol).font = { size: 10 };
        row.getCell(behaviorCol).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        
        // Пропуски всего
        row.getCell(totalAbsentCol).value = student.absencesTotal;
        row.getCell(totalAbsentCol).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(totalAbsentCol).font = { size: 10 };
        row.getCell(totalAbsentCol).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        
        // Пропуски неуважительные
        row.getCell(unjustifiedCol).value = student.absencesUnjustified;
        row.getCell(unjustifiedCol).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(unjustifiedCol).font = { size: 10 };
        row.getCell(unjustifiedCol).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        
        // Стипендия
        row.getCell(scholarshipCol).value = student.scholarship;
        row.getCell(scholarshipCol).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(scholarshipCol).font = { size: 10 };
        row.getCell(scholarshipCol).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        
        // Оценки 5,4,3
        row.getCell(gradesStartCol).value = student.gradesCount.five;
        row.getCell(gradesStartCol).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(gradesStartCol).font = { size: 10 };
        row.getCell(gradesStartCol).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        
        row.getCell(gradesStartCol + 1).value = student.gradesCount.four;
        row.getCell(gradesStartCol + 1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(gradesStartCol + 1).font = { size: 10 };
        row.getCell(gradesStartCol + 1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        
        row.getCell(gradesStartCol + 2).value = student.gradesCount.three;
        row.getCell(gradesStartCol + 2).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(gradesStartCol + 2).font = { size: 10 };
        row.getCell(gradesStartCol + 2).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      
      // 6. Настройка ширины колонок
      worksheet.getColumn(1).width = 6; 
      worksheet.getColumn(2).width = 35;
      for (let i = 0; i < subjectCount; i++) worksheet.getColumn(3 + i).width = 25; 
      worksheet.getColumn(avgCol).width = 10;
      worksheet.getColumn(behaviorCol).width = 8;
      worksheet.getColumn(totalAbsentCol).width = 12;
      worksheet.getColumn(unjustifiedCol).width = 16;
      worksheet.getColumn(scholarshipCol).width = 10;
      worksheet.getColumn(gradesStartCol).width = 6;
      worksheet.getColumn(gradesStartCol + 1).width = 6;
      worksheet.getColumn(gradesStartCol + 2).width = 6;
      
      // 7. Сохраняем файл
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Сводная_ведомость_${groupStatement.groupNumber}_${groupStatement.academicYear}_семестр${groupStatement.semester}.xlsx`);
      
    } catch (error) {
      console.error('Ошибка при экспорте:', error);
      setError('Не удалось экспортировать ведомость');
    }
  };

  const getAssessmentForm = (subjectName: string): string => {
    if (subjectName.toLowerCase().includes('физическая культура')) return 'З';
    else if (subjectName.toLowerCase().includes('системное программирование') || subjectName.toLowerCase().includes('разработка программных модулей') || subjectName.toLowerCase().includes('поддержка и тестирование программных модулей')) return 'Эу';
    return 'ДЗ';
  };

  const loadGroupStatement = async () => {
    try {
      setLoading(true);
      setError(null);
      const groups = await headApiService.getGroups();
      const group = groups.find(g => g.id === groupId);
      if (!group) throw new Error('Группа не найдена');
      
      // Если API поддерживает параметры года и семестра:
      // const reportData = await headApiService.getGroupReport(groupId, selectedYear, selectedSemester);
      const reportData = await headApiService.getGroupReport(groupId);
      
      if (!reportData || !reportData.subjectNames || !reportData.studentsData || !reportData.studentsData[0]) {
        throw new Error('Некорректные данные от сервера');
      }
      const subjects: Subject[] = reportData.subjectNames.map((name, index) => ({
        id: index + 1,
        name: name,
        assessmentForm: getAssessmentForm(name),
      }));
      const studentGrades: StudentGrade[] = reportData.studentsData[0].map((studentData, index) => {
        const gradesMap = new Map<string, string>();
        const naSubjects = new Set<string>();
        subjects.forEach((subject, subjectIndex) => {
          const mark = studentData.marks[subjectIndex];
          let grade = '';
          if (mark === 5) grade = '5';
          else if (mark === 4) grade = '4';
          else if (mark === 3) grade = '3';
          else if (mark === 2) grade = '2';
          else if (mark === 0) {
            grade = 'н/а';
            naSubjects.add(`${subject.name}, ${subject.assessmentForm}`);
          }
          else grade = mark?.toString() || '';
          gradesMap.set(`${subject.name}, ${subject.assessmentForm}`, grade);
        });
        return {
          id: index + 1,
          name: studentData.fio,
          grades: gradesMap,
          average: studentData.average,
          behavior: 'х',
          absencesTotal: studentData.total_absent,
          absencesUnjustified: studentData.non_excused,
          scholarship: studentData.scholarship,
          gradesCount: { five: studentData.count_5, four: studentData.count_4, three: studentData.count_3 },
          naSubjects,
        };
      });
      studentGrades.sort((a, b) => a.name.localeCompare(b.name));
      setGroupStatement({
        id: group.id,
        groupNumber: group.numberGroup.toString(),
        specialty: group.specialty,
        course: group.course,
        semester: selectedSemester,
        academicYear: `${selectedYear}-${selectedYear + 1}`,
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
      if (!student.naSubjects) student.naSubjects = new Set();
      if (newGrade === 'н/а') student.naSubjects.add(subjectKey);
      else student.naSubjects.delete(subjectKey);
      let five = 0, four = 0, three = 0, sum = 0, count = 0;
      Array.from(student.grades.values()).forEach(grade => {
        const gradeStr = grade.toString();
        if (gradeStr === '5') five++;
        else if (gradeStr === '4') four++;
        else if (gradeStr === '3') three++;
        const num = parseFloat(gradeStr);
        if (!isNaN(num) && num >= 2 && num <= 5) { sum += num; count++; }
      });
      student.gradesCount = { five, four, three };
      student.average = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
    }
    setGroupStatement(updatedGroup);
  };

  const handleNAGradeClick = (student: StudentGrade, subjectKey: string) => {
    setSelectedNAStudent(student);
    setSelectedNASubject(subjectKey);
    setAttestationFormData({
      attestationForm: 'экзамен',
      teacherName: '',
      headName: 'Голубева Г.А.',
      courseworkTopic: '',
      attestationNumber: '',
      attestationDate: new Date().toISOString().split('T')[0]
    });
    setIsNAModalOpen(true);
  };

  const formatDateForDocument = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return { day: date.getDate(), month: months[date.getMonth()], year: date.getFullYear() };
  };

  const generateAttestationDocument = async () => {
    if (!selectedNAStudent || !groupStatement || !selectedNASubject) return;
    setIsGenerating(true);
    try {
      const subjectName = selectedNASubject.split(',')[0];
      const specialtyMatch = groupStatement.specialty.match(/(\d+\.\d+\.\d+)\s+(.+)/);
      const currentDate = formatDateForDocument(attestationFormData.attestationDate);
      const templateData = {
        attestationForm: attestationFormData.attestationForm,
        semester: groupStatement.semester,
        studentName: selectedNAStudent.name,
        specialityCode: specialtyMatch ? specialtyMatch[1] : '',
        specialityName: specialtyMatch ? specialtyMatch[2] : groupStatement.specialty,
        course: groupStatement.course,
        group: groupStatement.groupNumber,
        subject: subjectName,
        courseworkTopic: attestationFormData.courseworkTopic || '_________________________',
        teacherName: attestationFormData.teacherName || '_________________________',
        headName: attestationFormData.headName,
        attestationNumber: attestationFormData.attestationNumber || '_______',
        attestationDay: currentDate.day,
        attestationMonth: currentDate.month,
        attestationYear: currentDate.year
      };
      const response = await fetch('/templates/attestation_direction_template.docx');
      if (!response.ok) throw new Error('Ошибка загрузки шаблона');
      const arrayBuffer = await response.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      doc.render(templateData);
      const blob = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      saveAs(blob, `Направление_на_аттестацию_${selectedNAStudent.name.replace(/\s+/g, '_')}_${subjectName}.docx`);
      
      const updatedGroup = { ...groupStatement };
      const student = updatedGroup.students.find(s => s.id === selectedNAStudent.id);
      if (student) {
        student.grades.set(selectedNASubject, '');
        if (!student.naSubjects) student.naSubjects = new Set();
        student.naSubjects.add(selectedNASubject);
        let five = 0, four = 0, three = 0, sum = 0, count = 0;
        Array.from(student.grades.values()).forEach(grade => {
          const gradeStr = grade.toString();
          if (gradeStr === '5') five++;
          else if (gradeStr === '4') four++;
          else if (gradeStr === '3') three++;
          const num = parseFloat(gradeStr);
          if (!isNaN(num) && num >= 2 && num <= 5) { sum += num; count++; }
        });
        student.gradesCount = { five, four, three };
        student.average = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
      }
      setGroupStatement(updatedGroup);
      setIsNAModalOpen(false);
    } catch (error) {
      console.error('Ошибка создания документа:', error);
      setError('Не удалось создать документ направления на аттестацию');
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateStatistics = () => {
    if (!groupStatement) return { fivesOnly: 0, foursAndFives: 0, hasThree: 0, naCount: 0 };
    let fivesOnly = 0, foursAndFives = 0, hasThree = 0, naCount = 0;
    groupStatement.students.forEach(student => {
      const grades = Array.from(student.grades.values());
      if (grades.filter(g => g === 'н/а').length > 0) naCount++;
      const numericGrades = grades.filter(g => g === '5' || g === '4' || g === '3');
      if (numericGrades.length === 0) return;
      if (numericGrades.every(g => g === '5')) fivesOnly++;
      if (numericGrades.every(g => g === '5' || g === '4')) foursAndFives++;
      if (numericGrades.filter(g => g === '3').length > 0) hasThree++;
    });
    return { fivesOnly, foursAndFives, hasThree, naCount };
  };

  const getSubjectNameLength = (name: string): string => {
    if (name.length > 50) return 'very-long-name';
    if (name.length > 30) return 'long-name';
    return '';
  };

  const shouldHighlightCell = (student: StudentGrade, subjectKey: string): boolean => {
    return student.naSubjects?.has(subjectKey) || false;
  };

  // Обработчики фильтров
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  const handleSemesterChange = (semester: number) => {
    setSelectedSemester(semester);
  };

  if (loading) {
    return <div className="dh-at-summary-loading" style={{ padding: '40px', textAlign: 'center' }}>
      <div className="dhm-loading-spinner" style={{ margin: '0 auto 16px' }}></div>
      <p>Загрузка сводной ведомости...</p>
    </div>;
  }

  if (error || !groupStatement) {
    return <div className="dh-at-summary-error" style={{ padding: '40px', textAlign: 'center' }}>
      <p className="dhp-error-message">{error || 'Группа не найдена'}</p>
      <button className="dhp-retry-button" onClick={loadGroupStatement}>Попробовать снова</button>
    </div>;
  }

  const statistics = calculateStatistics();

  return (
    <div className="dh-at-statement-wrapper" style={{ height: '100%', overflow: 'auto' }}>
      <div className="dh-at-statement-header">
        <div className="dh-at-statement-actions">
          {/* Фильтры год и семестр */}
          <div className="dh-at-filters-left">
            <div className="dh-at-filter-group">
              <label className="dh-at-filter-label">Год:</label>
              <select 
                className="dh-at-filter-select" 
                value={selectedYear} 
                onChange={(e) => handleYearChange(Number(e.target.value))}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="dh-at-filter-group">
              <label className="dh-at-filter-label">Семестр:</label>
              <div className="dh-at-semester-buttons">
                <button 
                  className={`dh-at-semester-btn ${selectedSemester === 7 ? 'active' : ''}`} 
                  onClick={() => handleSemesterChange(7)}
                >
                  7 семестр
                </button>
                <button 
                  className={`dh-at-semester-btn ${selectedSemester === 8 ? 'active' : ''}`} 
                  onClick={() => handleSemesterChange(8)}
                >
                  8 семестр
                </button>
              </div>
            </div>
          </div>

          <div className="dh-at-actions-right">
            {isEditing ? (
              <>
                <button className="dh-at-btn-secondary" onClick={() => setIsEditing(false)}>Отменить редактирование</button>
                <button className="dh-at-btn-primary" onClick={() => { setIsEditing(false); alert('Изменения сохранены (локально)'); }}>Сохранить</button>
              </>
            ) : (
              <>
                <button className="dh-at-btn-secondary" onClick={() => setIsEditing(true)}>Редактировать</button>
                <button className="dh-at-btn-primary" onClick={handleExportStatement}>Экспорт</button>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="dh-at-statement-body">
        <div className="dh-at-statement-title">
          <div className="dh-at-main-title">Сводная аттестационная ведомость на {groupStatement.academicYear} учебный год Семестр {groupStatement.semester}</div>
          <div>Специальность: {groupStatement.specialty}</div>
          <div>Курс: {groupStatement.course} Группа: {groupStatement.groupNumber} Форма обучения: {groupStatement.formOfStudy}</div>
        </div>
        <div className="dh-at-table-container">
          <table className="dh-at-statement-table">
            <thead>
              <tr><th rowSpan={2}>№ п/п</th><th rowSpan={2}>Фамилия, имя, отчество студента</th>
                <th colSpan={groupStatement.subjects.length}>Наименование дисциплины (МДК)/ форма аттестации</th>
                <th rowSpan={2}>Средний балл</th><th rowSpan={2}>Поведение</th><th rowSpan={2}>Пропуски занятий всего</th>
                <th rowSpan={2}>в т. ч. по неуважит. причинам</th><th rowSpan={2}>Стипендия:</th><th colSpan={3}>Кол-во оценок</th>
              </tr>
              <tr>{groupStatement.subjects.map((subject) => (
                <th key={subject.id} className={`dh-at-vertical-header ${getSubjectNameLength(subject.name)}`}>
                  <div className="dh-at-vertical-text">{subject.name}, {subject.assessmentForm}</div>
                </th>
              ))}<th>5</th><th>4</th><th>3</th></tr>
            </thead>
            <tbody>
              {groupStatement.students.map((student, idx) => (
                <tr key={student.id}>
                  <td>{idx + 1}</td>
                  <td className="dh-at-student-name">{student.name}</td>
                  {groupStatement.subjects.map((subject) => {
                    const subjectKey = `${subject.name}, ${subject.assessmentForm}`;
                    const grade = student.grades.get(subjectKey) || '';
                    const isHighlighted = shouldHighlightCell(student, subjectKey);
                    return (
                      <td key={subject.id} style={isHighlighted ? { backgroundColor: '#cfe6f8' } : {}}>
                        {isEditing ? (
                          <select value={grade} onChange={(e) => handleGradeChange(student.id, subjectKey, e.target.value)} className="dh-at-grade-select">
                            <option value="">-</option><option value="5">5</option><option value="4">4</option>
                            <option value="3">3</option><option value="зач.">зач.</option><option value="н/а">н/а</option>
                          </select>
                        ) : grade === 'н/а' ? (
                          <button className="dh-at-na-button" onClick={() => handleNAGradeClick(student, subjectKey)}>н/а</button>
                        ) : (grade)}
                      </td>
                    );
                  })}
                  <td className="dh-at-average">{formatAverageDisplay(student.average)}</td>
                  <td>{student.behavior}</td>
                  <td>{student.absencesTotal}</td>
                  <td>{student.absencesUnjustified}</td>
                  <td>{student.scholarship}</td>
                  <td>{student.gradesCount.five}</td><td>{student.gradesCount.four}</td><td>{student.gradesCount.three}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={groupStatement.subjects.length + 12} className="dh-at-statistics-footer">
              <div className="dh-at-statistics-grid">
                <div className="dh-at-stat-item"><span>На «5»</span><span className="dh-at-stat-value">{statistics.fivesOnly} чел.</span></div>
                <div className="dh-at-stat-item"><span>На «4», «5»</span><span className="dh-at-stat-value">{statistics.foursAndFives} чел.</span></div>
                <div className="dh-at-stat-item"><span>Есть «3»</span><span className="dh-at-stat-value">{statistics.hasThree} чел.</span></div>
                <div className="dh-at-stat-item"><span>н/а</span><span className="dh-at-stat-value dh-at-na-stat">{statistics.naCount} чел.</span></div>
              </div>
            </td></tr></tfoot>
          </table>
        </div>
      </div>
      {isNAModalOpen && selectedNAStudent && (
        <div className="dh-at-modal-overlay" onClick={() => setIsNAModalOpen(false)}>
          <div className="dh-at-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="dh-at-modal-header"><h3>Направление на аттестацию</h3><button className="dh-at-modal-close" onClick={() => setIsNAModalOpen(false)}>×</button></div>
            <div className="dh-at-modal-body">
              <div className="dh-at-na-info"><p>Студент: <strong>{selectedNAStudent.name}</strong></p><p>Предмет: <strong>{selectedNASubject.split(',')[0]}</strong></p></div>
              <div className="dh-at-form-group"><label>Форма аттестации *</label>
                <select value={attestationFormData.attestationForm} onChange={(e) => setAttestationFormData({...attestationFormData, attestationForm: e.target.value})} className="dh-at-input">
                  {attestationForms.map(form => <option key={form} value={form}>{form}</option>)}
                </select>
              </div>
              <div className="dh-at-form-group"><label>Преподаватель (ФИО) *</label>
                <input type="text" value={attestationFormData.teacherName} onChange={(e) => setAttestationFormData({...attestationFormData, teacherName: e.target.value})} className="dh-at-input" placeholder="Введите ФИО преподавателя" required />
              </div>
              <div className="dh-at-form-group"><label>Заведующий отделением *</label>
                <select value={attestationFormData.headName} onChange={(e) => setAttestationFormData({...attestationFormData, headName: e.target.value})} className="dh-at-input">
                  {headOptions.map(head => <option key={head} value={head}>{head}</option>)}
                </select>
              </div>
            </div>
            <div className="dh-at-modal-footer">
              <button className="dh-at-btn-secondary" onClick={() => setIsNAModalOpen(false)}>Отмена</button>
              <button className="dh-at-btn-primary" onClick={generateAttestationDocument} disabled={isGenerating || !attestationFormData.teacherName}>
                {isGenerating ? 'Формирование...' : 'Создать направление'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};