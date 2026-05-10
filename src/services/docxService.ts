// services/docxService.ts - с гарантированным enter после каждого студента
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

export interface ScholarshipDocData {
  specialityCode: string;
  specialityName: string;
  course: number;
  group: string;
  excellentStudents: string[];      // студенты с оценками "5"
  goodExcellentStudents: string[];  // студенты с оценками "4-5"
  goodStudents: string[];           // студенты с оценками "4"
  headName: string;                 // ФИО заведующего отделением
}

export class DocxService {
  
  static async generateScholarshipDocument(
    templateBlob: Blob, 
    data: ScholarshipDocData
  ): Promise<Blob> {
    try {
      const arrayBuffer = await templateBlob.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater();
      doc.loadZip(zip);
      
      // Создаем строки с принудительным добавлением enter после каждого студента
      let excellentText = '';
      data.excellentStudents.forEach((name, i) => {
        excellentText += `${i + 1}. ${name}\r\n`;
      });
      
      let goodExcellentText = '';
      data.goodExcellentStudents.forEach((name, i) => {
        goodExcellentText += `${i + 1}. ${name}\r\n`;
      });
      
      let goodText = '';
      data.goodStudents.forEach((name, i) => {
        goodText += `${i + 1}. ${name}\r\n`;
      });
      
      const templateData = {
        specialityCode: data.specialityCode,
        specialityName: data.specialityName,
        course: data.course,
        group: data.group,
        excellentStudents: excellentText,
        goodExcellentStudents: goodExcellentText,
        goodStudents: goodText,
        headName: data.headName
      };
      
      console.log('Данные для шаблона:', templateData);
      
      doc.setData(templateData);
      doc.render();
      
      return doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      
    } catch (error) {
      console.error('Ошибка при генерации DOCX документа:', error);
      throw error;
    }
  }
  
  static downloadDocument(blob: Blob, fileName: string): void {
    saveAs(blob, fileName);
  }
  
  static async loadTemplate(templatePath: string): Promise<Blob> {
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(`Ошибка загрузки шаблона: ${response.status}`);
    }
    return await response.blob();
  }
}