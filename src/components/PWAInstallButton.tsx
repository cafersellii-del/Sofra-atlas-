import { useState } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  MonitorDown,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'footer' | 'banner';
}

export function PWAInstallButton({ variant = 'header' }: PWAInstallButtonProps) {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isEmbeddedPreview,
    promptInstall,
  } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await promptInstall();
      if (accepted) {
        setJustInstalled(true);
        return;
      }
    }
    setShowGuide(true);
  };

  return (
    <>
      {variant === 'footer' ? (
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D9043D] hover:underline underline-offset-4 cursor-pointer"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>
            {justInstalled ? 'Uygulama Yüklendi' : 'Uygulamayı İndir (App)'}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          title="Sofra Atlas mobil ve masaüstü uygulamasını yükleyin"
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-[#141413] text-xs font-semibold hover:border-[#D9043D] hover:text-[#D9043D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {justInstalled ? (
            <CheckCircle2 className="w-4 h-4 text-[#D9043D] shrink-0" />
          ) : (
            <Download className="w-4 h-4 text-[#D9043D] shrink-0" />
          )}
          <span className="hidden sm:inline">
            {justInstalled ? 'Uygulama Yüklendi' : 'Uygulamayı İndir'}
          </span>
          <span className="sm:hidden">App</span>
        </button>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
          onClick={() => setShowGuide(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Sofra Atlas Uygulamasını İndir"
        >
          <div
            className="w-full max-w-md bg-white border border-[#E6E4DF] rounded-xl p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/pwa-192x192.png"
                  alt="Sofra Atlas"
                  className="w-12 h-12 rounded-xl border border-[#E6E4DF] shrink-0"
                />
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#141413]">
                    Sofra Atlas Uygulamasını İndir
                  </h3>
                  <p className="text-xs text-[#575550]">
                    Android, iOS ve Masaüstü (PWA · Çevrimdışı Hazır)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Kapat"
                className="w-8 h-8 rounded-lg border border-[#E6E4DF] flex items-center justify-center text-[#575550] hover:text-[#141413] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isEmbeddedPreview && (
              <div className="p-3.5 rounded-lg bg-[#FAF9F7] border border-[#E6E4DF] space-y-2">
                <p className="text-xs text-[#141413] font-medium">
                  Tek Tıkla Yükleme İçin Yeni Sekmede Açın
                </p>
                <p className="text-xs text-[#575550] leading-relaxed">
                  Tarayıcı güvenlik kuralları gereği uygulama yükleme penceresi
                  önizleme çerçevesi dışında (tam pencerede) aktifleşir.
                </p>
                <a
                  href={
                    typeof window !== 'undefined' ? window.location.href : '/'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D9043D] text-white text-xs font-semibold hover:bg-[#B80032] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Tam Ekranda Aç ve Yükle</span>
                </a>
              </div>
            )}

            <div className="space-y-3 text-xs text-[#575550]">
              {isIOS ? (
                <div className="p-3.5 rounded-lg border border-[#E6E4DF] space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-[#141413]">
                    <Smartphone className="w-4 h-4 text-[#D9043D]" />
                    <span>iPhone / iPad (Safari) Kurulumu</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                    <li>
                      Alt çubuktaki{' '}
                      <span className="inline-flex items-center gap-1 font-medium text-[#141413]">
                        <Share className="w-3.5 h-3.5 text-[#D9043D]" /> Paylaş
                      </span>{' '}
                      simgesine dokunun.
                    </li>
                    <li>
                      Listeden{' '}
                      <strong className="text-[#141413]">
                        &ldquo;Ana Ekrana Ekle&rdquo;
                      </strong>{' '}
                      seçeneğini seçin.
                    </li>
                    <li>
                      Sağ üstten <strong className="text-[#141413]">Ekle</strong>{' '}
                      tuşuna basarak uygulamayı ana ekranınıza alın.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg border border-[#E6E4DF] space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-[#141413]">
                    <MonitorDown className="w-4 h-4 text-[#D9043D]" />
                    <span>Android, Chrome, Edge & Masaüstü Kurulumu</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                    <li>
                      Tarayıcı adres çubuğunun sağındaki{' '}
                      <strong className="text-[#141413]">
                        Yükle (Bilgisayar/Telefon + ok)
                      </strong>{' '}
                      simgesine tıklayın.
                    </li>
                    <li>
                      Mobilde sağ üst menüden (⋮){' '}
                      <strong className="text-[#141413]">
                        &ldquo;Uygulamayı Yükle / Ana Ekrana Ekle&rdquo;
                      </strong>{' '}
                      seçeneğine dokunun.
                    </li>
                    <li>
                      Sofra Atlas bağımsız uygulama penceresiyle ve çevrimdışı
                      menü önbelleğiyle cihazınıza kurulur.
                    </li>
                  </ol>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {isInstallable && (
                <button
                  type="button"
                  onClick={() => {
                    void promptInstall();
                    setShowGuide(false);
                  }}
                  className="px-4 py-2 min-h-[38px] rounded-lg bg-[#D9043D] text-white text-xs font-semibold hover:bg-[#B80032] cursor-pointer"
                >
                  Şimdi Yükle
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] text-xs font-medium text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
