declare module 'mailparser' {
  export function simpleParser(source: string | Buffer): Promise<any>;
}
