export type ToastType = 'ERROR' | 'SUCCESS' | 'WARNING';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  remove?: (id: string) => void;
}
