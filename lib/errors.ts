import { toast } from 'sonner';

interface ErrorOptions {
  title?: string;
  action?: string;
  icon?: string;
}

export function handleSystemError(error: unknown, options: ErrorOptions = {}) {
  if (process.env.NODE_ENV !== 'production') {
    console.error("System Error Caught:", error);
  }

  let message = "Beklenmedik bir veri iletim hatası oluştu.";
  const errMsg = error instanceof Error ? error.message : (typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : '');

  if (errMsg) {
    if (errMsg.includes('auth/invalid-credential')) message = "Kod adı veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.";
    if (errMsg.includes('auth/operation-not-allowed')) message = "E-posta/Şifre girişi Firebase Konsol'da aktif değil. Lütfen Veli Paneli talimatlarını izleyin.";
    if (errMsg.includes('auth/user-not-found')) message = "Bu pilot kaydı sistemde bulunamadı.";
    if (errMsg.includes('auth/email-already-in-use')) message = "Bu e-posta adresi zaten bir komuta kaydına bağlı.";
    if (errMsg.includes('permission-denied')) message = "Bu işlem için yetkiniz bulunmuyor. Lütfen rütbenizi kontrol edin.";
    if (errMsg.includes('quota-exceeded')) message = "Sistem kapasitesi doldu (Günlük limit). Yarın tekrar deneyin.";
    if (errMsg.includes('network-request-failed')) message = "Bağlantı koptu. Lütfen internet hattınızı kontrol edin.";
  }

  const userFriendlyMessage = options.title 
    ? `${options.title}: ${message}` 
    : message;

  toast.error(userFriendlyMessage, {
    description: options.action || "Lütfen sistem yöneticisiyle iletişime geçin.",
    duration: 5000,
  });
  
  return userFriendlyMessage;
}

export function validateInput(value: string, type: 'username' | 'password' | 'email') {
  if (!value) return "Lütfen bu alanı boş bırakmayın.";
  
  if (type === 'username' && value.length < 3) return "Kod adı en az 3 karakter olmalıdır.";
  if (type === 'password' && value.length < 6) return "Şifre en az 6 karakterden oluşmalı ve güvenli olmalıdır.";
  if (type === 'email' && !value.includes('@')) return "Lütfen geçerli bir e-posta formatı giriniz.";
  
  return null;
}
