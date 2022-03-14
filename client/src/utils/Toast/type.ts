export type ToastType = "SUCCESS" | "ERROR" | "WARNING";
export type Toast = {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  remove?: (id: string) => void;
};
