import React, { useState, useEffect } from 'react';
import { headApiService, StudentInfo, SubjectTeacher } from '../services/headApiService';
import { SessionAttestationService, AttestationData } from '../services/sessionAttestationService';
import { methodistApiService } from '../services/methodistApiService';
import { useUser } from '../context/UserContext';
import './SessionAttestationSectionStyle.css';

interface SessionAttestationSectionProps {
  groupId: number;
  onClose?: () => void;
}

type AttestationForm = 'exam' | 'credit' | 'test';

export const SessionAttestationSection: React.FC<SessionAttestationSectionProps> = ({ groupId, onClose }) => {
  const { user } = useUser();
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectTeacher[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [availableTeachers, setAvailableTeachers] = useState<SubjectTeacher[]>([]);
  const [attestationForm, setAttestationForm] = useState<AttestationForm>('exam');
  const [semester, setSemester] = useState<7 | 8>(7);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [date, setDate] = useState<string>(new Date().toLocaleDateString('ru-RU'));
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 3; i <= currentYear + 2; i++) {
      years.push(i);
    }
    setAvailableYears(years);
  }, []);

  useEffect(() => {
    loadData();
  }, [groupId]);

  useEffect(() => {
    if (selectedSubjectId) {
      const teachers = subjects.filter(s => s.subjectId === selectedSubjectId);
      setAvailableTeachers(teachers);
      if (teachers.length > 0) {
        setSelectedTeacherId(teachers[0].teacherId);
      } else {
        setSelectedTeacherId(null);
      }
    }
  }, [selectedSubjectId, subjects]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsData, groupData, subjectsData] = await Promise.all([
        headApiService.getGroupStudents(groupId),
        headApiService.getGroupById(groupId),
        headApiService.getGroupSubjectsWithTeachers(groupId)
      ]);
      
      setStudents(studentsData);
      setGroupInfo(groupData);
      
      const uniqueSubjectsMap = new Map<number, SubjectTeacher>();
      subjectsData.forEach(s => {
        if (!uniqueSubjectsMap.has(s.subjectId)) {
          uniqueSubjectsMap.set(s.subjectId, s);
        }
      });
      const uniqueSubjects = Array.from(uniqueSubjectsMap.values());
      setSubjects(uniqueSubjects);
      
      if (uniqueSubjects.length > 0) {
        setSelectedSubjectId(uniqueSubjects[0].subjectId);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedTeacher = () => {
    return availableTeachers.find(t => t.teacherId === selectedTeacherId);
  };

    const handleExport = async () => {
    if (students.length === 0) {
      alert('Нет студентов для формирования ведомости');
      return;
    }
    
    setExporting(true);
    try {
      const selectedTeacher = getSelectedTeacher();
      const selectedSubject = subjects.find(s => s.subjectId === selectedSubjectId);
      
      const attestationData: AttestationData = {
        attestationNumber: '',
        date: date,
        attestationForm: attestationForm,
        semester: semester,
        teacherName: selectedTeacher ? `${selectedTeacher.teacherLastName} ${selectedTeacher.teacherName} ${selectedTeacher.teacherPatronymic ? selectedTeacher.teacherPatronymic : ''}` : 'Не указан',
        subject: selectedSubject?.subjectName || 'Не указан',
        specialityCode: groupInfo?.specialty?.split(' ')[0] || '09.02.07',
        specialityName: groupInfo?.specialty || 'Информационные системы и программирование',
        course: groupInfo?.course || 7,
        group: `${groupInfo?.numberGroup || groupId}`,
        students: students.map((student, index) => ({
          number: index + 1,
          fullName: `${student.lastName} ${student.name} ${student.patronymic ? student.patronymic : ''}`,
          fullNameOriginal: `${student.lastName} ${student.name} ${student.patronymic}`
        })),
        headName: "Голубева Г.А."
      };
      
      const documentBlob = await SessionAttestationService.generateAttestationDocument(attestationData);
      const fileName = `Аттестационная_ведомость_${groupInfo?.numberGroup || groupId}_${selectedSubject?.subjectName || 'предмет'}_${selectedYear}.doc`;
      
      // ЗАГРУЗКА НА СЕРВЕР 
      const file = new File([documentBlob], fileName, {
        type: 'application/msword'
      });
      await methodistApiService.uploadFile(file, 'session_attestation', user?.id);
      console.log('Аттестационная ведомость загружена на сервер');
      
      SessionAttestationService.downloadDocument(documentBlob, fileName);
      
    } catch (error) {
      console.error('Ошибка при экспорте:', error);
      alert('Произошла ошибка при формировании документа. Пожалуйста, попробуйте снова.');
    } finally {
      setExporting(false);
    }
  };

  // ФУНКЦИЯ ПЕЧАТИ
  const handlePrint = () => {
    if (!groupInfo || students.length === 0) return;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.width = '0px';
    printFrame.style.height = '0px';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);

    const printDocument = printFrame.contentWindow?.document;
    if (!printDocument) return;

    const selectedTeacher = getSelectedTeacher();
    const selectedSubject = subjects.find(s => s.subjectId === selectedSubjectId);

    const attestationFormText = attestationForm === 'exam' ? 'экзамен' : 
      attestationForm === 'credit' ? 'зачёт' : 'дифференцированный зачет';

    const academicYear = `${selectedYear}-${selectedYear + 1}`;
    const romanSemester = semester === 7 ? 'VII' : 'VIII';

    const teacherName = selectedTeacher 
      ? `${selectedTeacher.teacherLastName} ${selectedTeacher.teacherName} ${selectedTeacher.teacherPatronymic ? selectedTeacher.teacherPatronymic : ''}`
      : 'Не указан';

    const subjectName = selectedSubject?.subjectName || 'Не указан';
    const specialty = groupInfo?.specialty || '09.02.07 Информационные системы и программирование';
    const course = groupInfo?.course || 4;
    const groupName = `${groupInfo?.numberGroup || groupId}`;

    const studentRows = students.map((student, index) => {
      const fullName = `${student.lastName} ${student.name} ${student.patronymic ? student.patronymic : ''}`;
      return `
        <tr>
          <td style="border:1px solid #000000;padding:4px 6px;text-align:center;vertical-align:middle;font-size:11pt;">${index + 1}</td>
          <td style="border:1px solid #000000;padding:4px 6px;vertical-align:middle;font-size:11pt;">${fullName}</td>
          <td style="border:1px solid #000000;padding:4px 6px;text-align:center;vertical-align:middle;font-size:11pt;">&nbsp;</td>
          <td style="border:1px solid #000000;padding:4px 6px;text-align:center;vertical-align:middle;font-size:11pt;">&nbsp;</td>
          <td style="border:1px solid #000000;padding:4px 6px;text-align:center;vertical-align:middle;font-size:11pt;">&nbsp;</td>
          <td style="border:1px solid #000000;padding:4px 6px;text-align:center;vertical-align:middle;font-size:11pt;">&nbsp;</td>
          <td style="border:1px solid #000000;padding:4px 6px;text-align:center;vertical-align:middle;font-size:11pt;">&nbsp;</td>
          <td style="border:1px solid #000000;padding:4px 6px;text-align:center;vertical-align:middle;font-size:11pt;">&nbsp;</td>
        </tr>
      `;
    }).join('');

    printDocument.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Аттестационная ведомость - ${groupName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 20mm 15mm 25mm;
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.3;
            background: white;
            padding: 0;
            margin: 0;
          }

          @media print {
            body {
              padding: 0;
              margin: 0;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            thead {
              display: table-header-group;
            }
          }

          .document {
            width: 100%;
          }

          .university-text {
            font-size: 10pt;
            line-height: 1.2;
            text-align: center;
            margin: 0;
            padding: 0;
          }

          .college-title {
            font-size: 10pt;
            font-weight: bold;
            line-height: 1.2;
            text-align: center;
            margin-top: 3px;
            margin-bottom: 12px;
          }

          .title-line {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 8px;
            flex-wrap: wrap;
          }

          .attestation-title {
            font-size: 13pt;
            font-weight: bold;
            line-height: 1.2;
          }

          .attestation-number {
            font-size: 12pt;
            line-height: 1.2;
            flex: 1;
            text-align: center;
          }

          .attestation-date {
            font-size: 12pt;
            line-height: 1.2;
            text-align: right;
            min-width: 150px;
          }

          .semester-text {
            font-size: 12pt;
            font-weight: bold;
            line-height: 1.2;
            text-align: right;
          }

          .form-semester-line {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 6px;
          }

          .attestation-form {
            font-size: 12pt;
            text-decoration: underline;
            line-height: 1.2;
          }

          .normal-text {
            font-size: 11pt;
            line-height: 1.3;
            margin-bottom: 3px;
          }

          .small-text {
            font-size: 8pt;
            line-height: 1.2;
            margin-bottom: 6px;
            color: #333;
          }

          .course-group {
            font-size: 11pt;
            line-height: 1.3;
            margin-top: 6px;
            margin-bottom: 12px;
          }

          .attestation-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            table-layout: fixed;
            font-size: 10pt;
          }

          .attestation-table th,
          .attestation-table td {
            border: 1px solid #000000;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }

          .attestation-table th {
            font-size: 9pt;
            font-weight: bold;
            line-height: 1.1;
            text-align: center;
            background-color: transparent;
            padding: 4px 3px;
            vertical-align: middle;
          }

          .attestation-table td {
            font-size: 11pt;
            line-height: 1.2;
            padding: 4px 4px;
            vertical-align: middle;
          }

          .footer-note {
            font-size: 8pt;
            line-height: 1.2;
            margin-top: 6px;
            margin-bottom: 12px;
          }

          .signature-date-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
            flex-wrap: wrap;
            gap: 10px;
          }

          .date-field {
            font-size: 11pt;
            line-height: 1.2;
          }

          .grades-summary {
            text-align: right;
          }

          .grades-line {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            font-size: 11pt;
            line-height: 1.3;
            margin-bottom: 2px;
          }

          .teacher-signature-line {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11pt;
            line-height: 1.3;
            margin-bottom: 8px;
          }

          .chief-signature {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-top: 30px;
            font-size: 11pt;
            line-height: 1.3;
          }

          .bold {
            font-weight: bold;
          }

          .underline {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="document">
          <div class="university-text">Министерство науки и высшего образования Российской Федерации</div>
          <div class="university-text">Федеральное государственное бюджетное образовательное учреждение</div>
          <div class="university-text">высшего образования</div>
          <div class="university-text">«Новгородский государственный университет имени Ярослава Мудрого»</div>
          <div class="university-text">ПОЛИТЕХНИЧЕСКИЙ ИНСТИТУТ</div>
          <div class="college-title">ПОЛИТЕХНИЧЕСКИЙ КОЛЛЕДЖ</div>

          <div class="title-line">
            <span class="attestation-title">Аттестационная ведомость</span>
            <span class="attestation-number">№ __________</span>
            <span class="attestation-date">Дата __________</span>
          </div>

          <div class="form-semester-line">
            <span class="attestation-form">${attestationFormText}</span>
            <span class="semester-text">Семестр ${romanSemester}</span>
          </div>

          <div class="small-text">Вид промежуточной аттестации: экзамен, зачет, дифференцированный зачет</div>

          <div class="normal-text"><u>${teacherName}</u></div>
          <div class="small-text">Фамилия И.О. преподавателя, проводящего аттестацию</div>

          <div class="normal-text">Дисциплина <u>${subjectName}</u></div>
          <div class="small-text">(МДК, учебная или производственная практика)</div>

          <div class="normal-text">Специальность <u>${specialty}</u></div>
          <div class="small-text">Код, наименование</div>

          <div class="course-group">Курс ${course} Группа ${groupName}</div>

          <table class="attestation-table" cellspacing="0" cellpadding="0">
            <thead>
              <tr>
                <th rowspan="2" style="width:6%;">№ п/п</th>
                <th rowspan="2" style="width:24%;">Ф.И.О.</th>
                <th rowspan="2" style="width:14%;">Отметка о допуске</th>
                <th rowspan="2" style="width:8%;">Оценка</th>
                <th rowspan="2" style="width:14%;">Подпись преподавателя</th>
                <th colspan="3" style="text-align:center; width:34%;">Пересдача</th>
              </tr>
              <tr>
                <th style="width:11%;">Оценка</th>
                <th style="width:11%;">Дата</th>
                <th style="width:12%;">Подпись ответств. лица</th>
              </tr>
            </thead>
            <tbody>
              ${studentRows}
            </tbody>
          </table>

          <div class="footer-note">
            * Оценки проставляются цифрами и в скобках прописью
          </div>

          <div class="signature-date-container">
            <div class="date-field">«__________» ______________20__г.</div>
            <div class="grades-summary">
              <div class="grades-line"><span>Итого оценок:</span><span>5 __________</span></div>
              <div class="grades-line"><span></span><span>4 __________</span></div>
              <div class="grades-line"><span></span><span>3 __________</span></div>
              <div class="grades-line"><span></span><span>2 __________</span></div>
              <div class="grades-line"><span></span><span>1 __________</span></div>
              <div class="grades-line"><span></span><span>Не аттестовано __________</span></div>
            </div>
          </div>

          <div class="teacher-signature-line">
            <span>Подпись преподавателя ________________________</span>
          </div>

          <div class="chief-signature">
            <span>Зам. директора по УМ и ВР/ зав.уч.частью /зав.отделением ____________ /Голубева Г.А.</span>
          </div>
        </div>
      </body>
      </html>
    `);

    printDocument.close();

    printFrame.contentWindow?.focus();
    printFrame.contentWindow?.print();

    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="sas-loading-container">
        <div className="sas-loading-spinner"></div>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div className="sas-container">
      <div className="sas-header">
        <div className="sas-header-left">
          <h2>Аттестационная ведомость</h2>
          <p className="sas-subtitle">Формирование документов для аттестации студентов</p>
        </div>
        <div className="sas-actions">
          <button 
            className="sas-export-btn"
            onClick={handleExport}
            disabled={exporting || students.length === 0}
          >
            {exporting ? 'Формирование документа...' : 'Сохранить DOCX'}
          </button>
          <button 
            className="sas-print-btn"
            onClick={handlePrint}
            disabled={students.length === 0}
          >
            Печать
          </button>
        </div>
      </div>

      <div className="sas-form">
        <div className="sas-form-row">
          {/* Фильтр по году */}
          <div className="sas-form-group">
            <label className="sas-label">Год</label>
            <select 
              className="sas-select sas-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="sas-form-group">
            <label className="sas-label">Семестр</label>
            <div className="sas-semester-buttons">
              <button 
                className={`sas-semester-btn ${semester === 7 ? 'active' : ''}`}
                onClick={() => setSemester(7)}
              >
                7 семестр
              </button>
              <button 
                className={`sas-semester-btn ${semester === 8 ? 'active' : ''}`}
                onClick={() => setSemester(8)}
              >
                8 семестр
              </button>
            </div>
          </div>
        </div>

        <div className="sas-form-row">
          <div className="sas-form-group">
            <label className="sas-label">Дисциплина</label>
            <select 
              className="sas-select"
              value={selectedSubjectId || ''}
              onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
            >
              {subjects.map(subject => (
                <option key={subject.subjectId} value={subject.subjectId}>
                  {subject.subjectName}
                </option>
              ))}
            </select>
          </div>

          <div className="sas-form-group">
            <label className="sas-label">Преподаватель</label>
            <select 
              className="sas-select"
              value={selectedTeacherId || ''}
              onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
              disabled={availableTeachers.length === 0}
            >
              {availableTeachers.map(teacher => (
                <option key={teacher.teacherId} value={teacher.teacherId}>
                  {teacher.teacherLastName} {teacher.teacherName.charAt(0)}.{teacher.teacherPatronymic ? teacher.teacherPatronymic.charAt(0) + '.' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="sas-form-row">
          <div className="sas-form-group">
            <label className="sas-label">Вид аттестации</label>
            <div className="sas-attestation-buttons">
              <button 
                className={`sas-attestation-btn ${attestationForm === 'exam' ? 'active' : ''}`}
                onClick={() => setAttestationForm('exam')}
              >
                Экзамен
              </button>
              <button 
                className={`sas-attestation-btn ${attestationForm === 'credit' ? 'active' : ''}`}
                onClick={() => setAttestationForm('credit')}
              >
                Зачет
              </button>
              <button 
                className={`sas-attestation-btn ${attestationForm === 'test' ? 'active' : ''}`}
                onClick={() => setAttestationForm('test')}
              >
                Дифференцированный зачет
              </button>
            </div>
          </div>
        </div>

        <div className="sas-students-info">
          <h4>Студенты группы ({students.length})</h4>
          <div className="sas-students-list">
            {students.map((student, index) => (
              <div key={student.id} className="sas-student-item">
                {index + 1}. {student.lastName} {student.name} {student.patronymic}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};