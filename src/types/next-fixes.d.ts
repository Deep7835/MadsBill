declare module "next/font/google" {
  export function Geist(options?: any): { variable: string; className: string };
  export function Geist_Mono(options?: any): { variable: string; className: string };
  export function Inter(options?: any): { variable: string; className: string };
}

declare module "next/headers" {
  export function cookies(): Promise<{
    get(name: string): { name: string; value: string } | undefined;
    getAll(): Array<{ name: string; value: string }>;
    set(name: string, value: string, options?: any): void;
    delete(name: string): void;
    has(name: string): boolean;
  }>;
  export function headers(): Promise<any>;
}
