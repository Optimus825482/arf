import Link from "next/link";
import { Home, Radar } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-slate-200">
      <div className="glass-panel w-full max-w-md space-y-5 p-8 text-center">
        <Radar className="mx-auto h-14 w-14 text-cyan-400" aria-hidden="true" />
        <div>
          <h1 className="font-mono text-2xl font-bold uppercase tracking-wide text-white">
            Rota bulunamadı
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Bu koordinatta aktif bir görev yok. Ana üsse dönüp devam edebilirsin.
          </p>
        </div>
        <Link
          href="/ogrenci"
          aria-label="Öğrenci ana sayfasına dön"
          className="neon-btn-blue mx-auto flex items-center justify-center gap-2 px-6 py-3"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Ana Üs
        </Link>
      </div>
    </div>
  );
}
