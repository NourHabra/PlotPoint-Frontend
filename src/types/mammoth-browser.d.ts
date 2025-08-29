declare module 'mammoth/mammoth.browser' {
  export function convertToHtml(options: any): Promise<{ value: string; messages?: any[] }>;
}


