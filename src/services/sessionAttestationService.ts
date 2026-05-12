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
    size: A4;
    margin: 2cm 1.5cm 2cm 3cm;
  }
  body {
    font-family: 'Times New Roman', Times, serif;
    margin: 0;
    padding: 0;
    background: white;
  }
  .document {
    width: 100%;
  }
  /* Шапка документа */
  .university-text {
    font-size: 11pt;
    line-height: 1.2;
    text-align: center;
    margin: 0;
    padding: 0;
  }
  .college-title {
    font-size: 11pt;
    font-weight: bold;
    line-height: 1.2;
    text-align: center;
    margin-top: 4px;
    margin-bottom: 16px;
  }
  /* Заголовок с номером и датой */
  .title-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 12px;
  }
  .attestation-title {
    font-size: 14pt;
    font-weight: bold;
    line-height: 1.2;
  }
  .attestation-number {
    font-size: 14pt;
    font-weight: bold;
    line-height: 1.2;
    text-decoration: none;
    flex: 1;
    text-align: center;
  }
  .attestation-date {
    font-size: 14px;
    font-weight: bold;
    line-height: 1.2;
    text-align: right;
    min-width: 150px;
  }
  /* Строка с формой аттестации и семестром */
  .form-semester-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 8px;
  }
  .attestation-form {
    font-size: 14px;
    text-decoration: underline;
    line-height: 1.2;
  }
  .semester-text {
    font-size: 14px;
    font-weight: bold;
    line-height: 1.2;
    text-align: right;
  }
  /* Остальные строки */
  .normal-text {
    font-size: 14px;
    line-height: 1.2;
    margin-bottom: 4px;
  }
  .underline-text {
    text-decoration: underline;
    font-size: 14px;
    line-height: 1.2;
    margin-bottom: 4px;
  }
  .small-text {
    font-size: 8pt;
    line-height: 1.2;
    margin-bottom: 8px;
  }
  .course-group {
    font-size: 14px;
    line-height: 1.2;
    margin-top: 8px;
    margin-bottom: 16px;
  }
  /* Таблица */
  .attestation-table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    table-layout: fixed;
  }
  .attestation-table th,
  .attestation-table td {
    border: 1px solid #000000;
    word-wrap: break-word;
    word-break: break-word;
    white-space: normal;
  }
  .attestation-table th {
    font-size: 12px;
    font-weight: bold;
    line-height: 1;
    text-align: center;
    background-color: transparent;
    padding: 6px 3px;
    vertical-align: middle;
  }
  .attestation-table td {
    font-size: 14px;
    line-height: 0.5;
    padding: 6px 4px;
  }
  /* Подвал */
  .footer-note {
    font-size: 8pt;
    line-height: 1.2;
    margin-top: 8px;
    margin-bottom: 16px;
  }
  .signature-date-container {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  }
  .date-field {
    font-size: 14px;
    line-height: 1.2;
  }
  .grades-summary {
    text-align: right;
  }
  .grades-line {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    font-size: 14px;
    line-height: 1.2;
    margin-bottom: 4px;
  }
  .teacher-signature-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14pt;
    line-height: 1;
  }
  .chief-signature {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 40px;
    font-size: 12pt;
    line-height: 1;
  }
  .signature-right {
    text-align: right;
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