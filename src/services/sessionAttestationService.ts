import { saveAs } from 'file-saver';

export interface StudentAttestation {
  number: number;
  fullName: string;
  fullNameOriginal: string;
}

export interface AttestationData {
  attestationNumber: string;
  date: string;
  attestationForm: string;
  semester: number;
  teacherName: string;
  subject: string;
  specialityCode: string;
  specialityName: string;
  course: number;
  group: string;
  students: StudentAttestation[];
  headName: string;
}

export class SessionAttestationService {
  
  static async generateAttestationDocument(data: AttestationData): Promise<Blob> {
    const html = this.generateHtml(data);
    return new Blob([html], { type: 'application/msword' });
  }
  
  private static generateHtml(data: AttestationData): string {
    // Получаем текст формы аттестации
    const attestationFormText = this.getAttestationFormText(data.attestationForm);
    
    // Генерируем строки таблицы для КАЖДОГО студента
    const studentRows = data.students.map(student => 
      '<tr>' +
        '<td style="border:1px solid #000000;padding:6px 8px;text-align:center;vertical-align:top;font-size:14px;">' + student.number + '</td>' +
        '<td style="border:1px solid #000000;padding:6px 8px;vertical-align:top;font-size:14px;">' + student.fullName + '</td>' +
        '<td style="border:1px solid #000000;padding:6px 8px;text-align:center;vertical-align:top;font-size:14px;">&nbsp;</td>' +
        '<td style="border:1px solid #000000;padding:6px 8px;text-align:center;vertical-align:top;font-size:14px;">&nbsp;</td>' +
        '<td style="border:1px solid #000000;padding:6px 8px;text-align:center;vertical-align:top;font-size:14px;">&nbsp;</td>' +
        '<td style="border:1px solid #000000;padding:6px 8px;text-align:center;vertical-align:top;font-size:14px;">&nbsp;</td>' +
        '<td style="border:1px solid #000000;padding:6px 8px;text-align:center;vertical-align:top;font-size:14px;">&nbsp;</td>' +
        '<td style="border:1px solid #000000;padding:6px 8px;text-align:center;vertical-align:top;font-size:14px;">&nbsp;</td>' +
      '</tr>'
    ).join('');
    
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Аттестационная ведомость</title>
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
            line-height: 0.9;
            padding: 2px 2px;
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
    <span class="semester-text">Семестр ${data.semester}</span>
  </div>

  <div class="form-semester-line">
    <span class="attestation-form">${attestationFormText}</span>
  </div>

  <div class="small-text">Вид промежуточной аттестации: экзамен, зачет, дифференцированный зачет</div>

  <div class="underline-text">${data.teacherName}</div>
  <div class="small-text">Фамилия И.О. преподавателя, проводящего аттестацию</div>

  <div class="normal-text">Дисциплина <u>${data.subject}</u></div>
  <div class="small-text">(МДК, учебная или производственная практика)</div>

  <div class="normal-text">Специальность <u>${data.specialityName}</u></div>
  <div class="small-text">Код, наименование</div>

  <div class="course-group">Курс ${data.course} Группа ${data.group}</div>

  <table class="attestation-table" cellspacing="0" cellpadding="0">
    <thead>
      <tr>
        <th rowspan="2" style="width:6%;">№ п/п</th>
        <th rowspan="2" style="width:30%;">Ф.И.О.</th>
        <th rowspan="2" style="width:12%;">Отметка о допуске</th>
        <th rowspan="2" style="width:8%;">Оценка</th>
        <th rowspan="2" style="width:10%;">Подпись преподавателя</th>
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
    <span>Зам. директора по УМ и ВР/ зав.уч.частью /зав.отделением ____________ /${data.headName}</span>\
  </div>
</div>
</body>
</html>`;
  }
  
  private static getAttestationFormText(form: string): string {
    switch (form) {
      case 'exam': return 'экзамен';
      case 'credit': return 'зачёт';
      case 'test': return 'дифференцированный зачет';
      default: return 'экзамен';
    }
  }
  
  static downloadDocument(blob: Blob, fileName: string): void {
    saveAs(blob, fileName);
  }
}