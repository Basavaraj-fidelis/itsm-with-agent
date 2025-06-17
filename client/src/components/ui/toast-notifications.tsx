
import { toast } from "@/hooks/use-toast";

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
}

export const showToast = {
  success: ({ title = "Success", description }: Omit<ToastProps, "variant">) =>
    toast({
      title,
      description,
      variant: "default",
      className: "border-green-200 bg-green-50 text-green-900",
    }),

  error: ({ title = "Error", description }: Omit<ToastProps, "variant">) =>
    toast({
      title,
      description,
      variant: "destructive",
    }),

  info: ({ title = "Info", description }: Omit<ToastProps, "variant">) =>
    toast({
      title,
      description,
      variant: "default",
    }),

  warning: ({ title = "Warning", description }: Omit<ToastProps, "variant">) =>
    toast({
      title,
      description,
      variant: "default",
      className: "border-yellow-200 bg-yellow-50 text-yellow-900",
    }),
};
