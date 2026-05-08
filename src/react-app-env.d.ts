/// <reference types="react-scripts" />

// Эта декларация говорит TypeScript, что импорт любых .css файлов допустим
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}