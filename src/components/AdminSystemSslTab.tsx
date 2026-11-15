import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileKey2,
  Globe,
  KeyRound,
  Lock,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
} from 'lucide-react';
import {
  clearClientCachesAndStorage,
  performFullSystemReset,
  reloadApplicationCleanly,
} from '../utils/systemReset';

interface TlsInspectionResult {
  host: string;
  reachable: boolean;
  authorized: boolean;
  authorizationError: string | null;
  protocol: string | null;
  cipher: string | null;
  subject: string | null;
  issuer: string | null;
  validFrom: string | null;
  validTo: string | null;
  daysRemaining: number | null;
  serialNumber: string | null;
  fingerprint256: string | null;
  subjectAltNames: string[];
  error: string | null;
}

interface SslStatusPayload {
  checkedAt: string;
  targetDomain: string;
  activeOrigin: string;
  requestIsHttps: boolean;
  nativeTlsEnabled: boolean;
  hstsEnabled: boolean;
  dns: {
    domain: string;
    aRecords: string[];
    aaaaRecords: string[];
    wwwCname: string[];
    caaRecords: string[];
    txtRecords: string[];
    checks: {
      hasApexA: boolean;
      pointsToCloudRun: boolean;
      wwwPointsToGoogle: boolean;
      caaAllowsSsl: boolean;
    };
  };
  domainTls: TlsInspectionResult;
  activeHostTls: TlsInspectionResult | null;
}

interface SystemHealthPayload {
  ok: boolean;
  timestamp: string;
  uptimeSeconds: number;
  nodeVersion: string;
  environment: string;
  canonicalCustomDomain: string;
  requestProtocol: string;
  nativeTlsEnabled: boolean;
  memoryMb: {
    rss: number;
    heapUsed: number;
  };
  activeSupportThreads: number;
  activePaymentSessions: number;
  activeWsClients: number;
}

interface GeneratedCertPayload {
  ok: boolean;
  mode: 'self_signed' | 'csr';
  domain: string;
  san: string[];
  validityDays: number | null;
  fingerprint256: string;
  validTo: string;
  primaryPem: string;
  privateKeyPem: string;
}

interface AdminSystemSslTabProps {
  isEn: boolean;
  isGlobalAdmin: boolean;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatIsoDate(iso: string | null, locale: string): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AdminSystemSslTab({
  isEn,
  isGlobalAdmin,
}: AdminSystemSslTabProps) {
  const locale = isEn ? 'en-US' : 'tr-TR';
  const [domainInput, setDomainInput] = useState('atlassofra.com.tr');
  const [sslStatus, setSslStatus] = useState<SslStatusPayload | null>(null);
  const [sslLoading, setSslLoading] = useState(false);
  const [sslError, setSslError] = useState('');

  const [health, setHealth] = useState<SystemHealthPayload | null>(null);

  const [certMode, setCertMode] = useState<'csr' | 'self_signed'>('csr');
  const [certOrg, setCertOrg] = useState('atlassofra');
  const [certCountry, setCertCountry] = useState('TR');
  const [certDays, setCertDays] = useState('365');
  const [generatingCert, setGeneratingCert] = useState(false);
  const [generatedCert, setGeneratedCert] =
    useState<GeneratedCertPayload | null>(null);
  const [certError, setCertError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [confirmResetMode, setConfirmResetMode] = useState<
    null | 'cache' | 'full'
  >(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetResultMsg, setResetResultMsg] = useState('');

  const fetchSslAndHealth = useCallback(async (targetDomain: string) => {
    setSslLoading(true);
    setSslError('');
    try {
      const [sslResp, healthResp] = await Promise.all([
        fetch(
          `/api/ssl/status?domain=${encodeURIComponent(targetDomain.trim() || 'atlassofra.com.tr')}`
        ),
        fetch('/api/system/health'),
      ]);

      if (!sslResp.ok) {
        throw new Error(`SSL durum sorgusu başarısız (${sslResp.status})`);
      }
      const sslJson = (await sslResp.json()) as SslStatusPayload;
      setSslStatus(sslJson);

      if (healthResp.ok) {
        const healthJson = (await healthResp.json()) as SystemHealthPayload;
        setHealth(healthJson);
      }
    } catch (err) {
      setSslError(
        err instanceof Error
          ? err.message
          : 'SSL ve sistem durumu alınamadı.'
      );
    } finally {
      setSslLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSslAndHealth('atlassofra.com.tr');
  }, [fetchSslAndHealth]);

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1500);
    } catch {
      // Ignore clipboard errors
    }
  };

  const handleGenerateCert = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingCert(true);
    setCertError('');
    try {
      const resp = await fetch('/api/ssl/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domainInput.trim() || 'atlassofra.com.tr',
          mode: certMode,
          organization: certOrg.trim() || 'atlassofra',
          country: certCountry.trim() || 'TR',
          validityDays: Number(certDays) || 365,
        }),
      });
      const data = (await resp.json()) as GeneratedCertPayload & {
        error?: string;
      };
      if (!resp.ok) {
        throw new Error(data.error || 'Sertifika üretilemedi.');
      }
      setGeneratedCert(data);
    } catch (err) {
      setCertError(
        err instanceof Error ? err.message : 'Sertifika üretimi başarısız.'
      );
    } finally {
      setGeneratingCert(false);
    }
  };

  const handleExecuteReset = async (mode: 'cache' | 'full') => {
    setResetBusy(true);
    setResetResultMsg('');
    try {
      if (mode === 'cache') {
        const res = await clearClientCachesAndStorage();
        setResetResultMsg(
          isEn
            ? `Cleared ${res.clearedLocalKeys} local keys, ${res.unregisteredServiceWorkers} service workers, and ${res.deletedCaches} caches. Reloading...`
            : `${res.clearedLocalKeys} yerel anahtar, ${res.unregisteredServiceWorkers} Service Worker ve ${res.deletedCaches} önbellek temizlendi. Yenileniyor...`
        );
      } else {
        const res = await performFullSystemReset(true);
        setResetResultMsg(
          isEn
            ? `Full system reset complete (${res.clearedSupportThreads} threads, ${res.clearedLocalKeys} local keys, ${res.deletedCaches} caches cleared). Reloading...`
            : `Sistem sıfırdan yenilendi (${res.clearedSupportThreads} destek kaydı, ${res.clearedLocalKeys} yerel anahtar, ${res.deletedCaches} önbellek temizlendi). Yenileniyor...`
        );
      }
      window.setTimeout(() => {
        reloadApplicationCleanly();
      }, 900);
    } finally {
      setResetBusy(false);
      setConfirmResetMode(null);
    }
  };

  const renderTlsCard = (title: string, tlsData: TlsInspectionResult) => {
    const isHealthy = tlsData.reachable && tlsData.authorized;
    return (
      <div className="bg-[#FAF9F7] border border-[#E6E4DF] rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#575550]">
              {title}
            </p>
            <p className="font-mono text-sm font-semibold text-[#141413] truncate mt-0.5">
              {tlsData.host}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border whitespace-nowrap shrink-0 ${
              isHealthy
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : tlsData.reachable
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-red-50 text-[#DC2626] border-red-200'
            }`}
          >
            {isHealthy ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>
              {isHealthy
                ? isEn
                  ? 'Valid TLS'
                  : 'Geçerli SSL'
                : tlsData.reachable
                  ? isEn
                    ? 'Untrusted / Pending'
                    : 'Doğrulanmadı'
                  : isEn
                    ? 'No TLS Handshake'
                    : 'SSL Yanıtı Yok'}
            </span>
          </span>
        </div>

        {tlsData.reachable ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div>
              <p className="text-[#575550]">{isEn ? 'Issuer' : 'Sertifika Sağlayıcı'}</p>
              <p className="font-medium text-[#141413] truncate">
                {tlsData.issuer || '—'}
              </p>
            </div>
            <div>
              <p className="text-[#575550]">{isEn ? 'Protocol & Cipher' : 'Protokol & Şifreleme'}</p>
              <p className="font-mono text-[#141413] truncate">
                {tlsData.protocol || '—'} {tlsData.cipher ? `· ${tlsData.cipher}` : ''}
              </p>
            </div>
            <div>
              <p className="text-[#575550]">{isEn ? 'Valid Window' : 'Geçerlilik Tarihleri'}</p>
              <p className="font-mono tabular-nums text-[#141413]">
                {formatIsoDate(tlsData.validFrom, locale)} →{' '}
                {formatIsoDate(tlsData.validTo, locale)}
              </p>
            </div>
            <div>
              <p className="text-[#575550]">{isEn ? 'Days Remaining' : 'Kalan Süre'}</p>
              <p className="font-mono tabular-nums font-semibold text-[#141413]">
                {tlsData.daysRemaining !== null
                  ? isEn
                    ? `${tlsData.daysRemaining} days`
                    : `${tlsData.daysRemaining} gün`
                  : '—'}
              </p>
            </div>
            {tlsData.subjectAltNames.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-[#575550]">SAN ({isEn ? 'Covered Domains' : 'Kapsanan Alan Adları'})</p>
                <p className="font-mono text-[11px] text-[#141413] break-all">
                  {tlsData.subjectAltNames.join(', ')}
                </p>
              </div>
            )}
            {tlsData.fingerprint256 && (
              <div className="sm:col-span-2">
                <p className="text-[#575550]">SHA-256 Fingerprint</p>
                <p className="font-mono text-[10px] text-[#575550] break-all">
                  {tlsData.fingerprint256}
                </p>
              </div>
            )}
            {tlsData.authorizationError && (
              <div className="sm:col-span-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                {tlsData.authorizationError}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-[#575550] leading-relaxed">
            {tlsData.error ||
              (isEn
                ? 'Port 443 could not complete a TLS handshake yet. Verify DNS propagation below.'
                : '443 portunda henüz TLS el sıkışması tamamlanamadı. Aşağıdaki DNS yayılımını doğrulayın.')}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Live SSL/TLS Inspector & DNS Readiness */}
      <div className="bg-white border border-[#E6E4DF] rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#D9043D]" />
              <h3 className="font-display text-lg font-semibold text-[#141413]">
                {isEn
                  ? 'SSL / TLS Certificate & Domain Verification'
                  : 'SSL / TLS Sertifika & Alan Adı Denetimi'}
              </h3>
            </div>
            <p className="text-xs text-[#575550] mt-1">
              {isEn
                ? 'Inspects live TLS handshake, X.509 issuer/expiry, HSTS headers, and DNS A/AAAA/CNAME/CAA records.'
                : 'Canlı TLS el sıkışması, X.509 sertifika süresi, HSTS başlıkları ve DNS A/AAAA/CNAME/CAA kayıtlarını gerçek zamanlı denetler.'}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void fetchSslAndHealth(domainInput);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="atlassofra.com.tr"
              aria-label={isEn ? 'Domain to inspect' : 'Denetlenecek alan adı'}
              className="px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] font-mono text-xs text-[#141413] w-48"
            />
            <button
              type="submit"
              disabled={sslLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg bg-[#D9043D] text-white text-xs font-semibold hover:bg-[#B80032] disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${sslLoading ? 'animate-spin' : ''}`}
              />
              <span>
                {sslLoading
                  ? isEn
                    ? 'Checking...'
                    : 'Denetleniyor...'
                  : isEn
                    ? 'Inspect SSL'
                    : 'SSL Denetle'}
              </span>
            </button>
          </form>
        </div>

        {sslError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC2626]">
            {sslError}
          </div>
        )}

        {sslStatus && (
          <>
            {/* Security Headers & Transport Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg bg-[#FAF9F7] border border-[#E6E4DF]">
                <p className="text-[11px] text-[#575550]">
                  {isEn ? 'Active Transport' : 'Aktif Bağlantı'}
                </p>
                <p className="font-mono text-sm font-semibold text-[#141413] mt-0.5">
                  {sslStatus.requestIsHttps ? 'HTTPS (TLS)' : 'HTTP (Local)'}
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#FAF9F7] border border-[#E6E4DF]">
                <p className="text-[11px] text-[#575550]">HSTS Header</p>
                <p className="font-mono text-sm font-semibold text-[#141413] mt-0.5">
                  {sslStatus.hstsEnabled
                    ? 'max-age=31536000'
                    : isEn
                      ? 'Standby (Dev)'
                      : 'Hazır (Prod)'}
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#FAF9F7] border border-[#E6E4DF]">
                <p className="text-[11px] text-[#575550]">Cloud Run A IPv4</p>
                <p className="font-mono text-sm font-semibold text-[#141413] mt-0.5">
                  {sslStatus.dns.checks.pointsToCloudRun
                    ? isEn
                      ? 'Matched'
                      : 'Eşleşti'
                    : sslStatus.dns.aRecords.length > 0
                      ? sslStatus.dns.aRecords[0]
                      : isEn
                        ? 'Missing'
                        : 'Bulunamadı'}
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#FAF9F7] border border-[#E6E4DF]">
                <p className="text-[11px] text-[#575550]">CAA SSL Policy</p>
                <p className="font-mono text-sm font-semibold text-[#141413] mt-0.5">
                  {sslStatus.dns.checks.caaAllowsSsl
                    ? isEn
                      ? 'Allowed (pki.goog)'
                      : 'İzinli (pki.goog)'
                    : isEn
                      ? 'Restricted'
                      : 'Kısıtlı'}
                </p>
              </div>
            </div>

            {/* TLS Handshake Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {renderTlsCard(
                isEn ? 'Custom Domain TLS' : 'Özel Alan Adı SSL Sertifikası',
                sslStatus.domainTls
              )}
              {sslStatus.activeHostTls ? (
                renderTlsCard(
                  isEn ? 'Active Cloud Run Host TLS' : 'Aktif Sunucu SSL Sertifikası',
                  sslStatus.activeHostTls
                )
              ) : (
                <div className="bg-[#FAF9F7] border border-[#E6E4DF] rounded-xl p-4 space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#575550]">
                    {isEn ? 'Active Origin' : 'Aktif Uygulama Adresi'}
                  </p>
                  <p className="font-mono text-sm font-semibold text-[#141413] break-all">
                    {sslStatus.activeOrigin}
                  </p>
                  <p className="text-xs text-[#575550] leading-relaxed">
                    {isEn
                      ? 'Production traffic enforces HTTPS 301 redirects, www-to-apex canonicalization, and Strict-Transport-Security.'
                      : 'Canlı ortamda HTTP -> HTTPS 301 yönlendirmesi, www -> kök alan adı kanonikleştirme ve Strict-Transport-Security başlıkları etkindir.'}
                  </p>
                </div>
              )}
            </div>

            {/* DNS Records Table & Zone File Download */}
            <div className="border border-[#E6E4DF] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[#FAF9F7] border-b border-[#E6E4DF] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#D9043D]" />
                  <p className="text-xs font-semibold text-[#141413]">
                    {isEn
                      ? `Live DNS Records for ${sslStatus.dns.domain}`
                      : `${sslStatus.dns.domain} Canlı DNS Kayıtları`}
                  </p>
                </div>
                <a
                  href={`/api/ssl/zone?domain=${encodeURIComponent(sslStatus.dns.domain)}`}
                  download={`${sslStatus.dns.domain}.zone`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6E4DF] bg-white text-xs font-medium text-[#141413] hover:border-[#D9043D] hover:text-[#D9043D]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {isEn ? 'Download BIND .zone (with CAA)' : 'BIND .zone İndir (CAA Dahil)'}
                  </span>
                </a>
              </div>

              <div className="divide-y divide-[#E6E4DF] text-xs">
                <div className="px-4 py-2.5 grid grid-cols-12 gap-3 items-center">
                  <span className="col-span-3 font-mono font-semibold text-[#141413]">
                    A (@)
                  </span>
                  <span className="col-span-9 font-mono text-[#575550] break-all">
                    {sslStatus.dns.aRecords.length > 0
                      ? sslStatus.dns.aRecords.join(', ')
                      : isEn
                        ? 'Not resolved yet (Expected: 216.239.32.21, 34.21, 36.21, 38.21)'
                        : 'Henüz çözümlenmedi (Beklenen: 216.239.32.21, 34.21, 36.21, 38.21)'}
                  </span>
                </div>
                <div className="px-4 py-2.5 grid grid-cols-12 gap-3 items-center">
                  <span className="col-span-3 font-mono font-semibold text-[#141413]">
                    AAAA (@)
                  </span>
                  <span className="col-span-9 font-mono text-[#575550] break-all">
                    {sslStatus.dns.aaaaRecords.length > 0
                      ? sslStatus.dns.aaaaRecords.join(', ')
                      : '—'}
                  </span>
                </div>
                <div className="px-4 py-2.5 grid grid-cols-12 gap-3 items-center">
                  <span className="col-span-3 font-mono font-semibold text-[#141413]">
                    CNAME (www)
                  </span>
                  <span className="col-span-9 font-mono text-[#575550] break-all">
                    {sslStatus.dns.wwwCname.length > 0
                      ? sslStatus.dns.wwwCname.join(', ')
                      : isEn
                        ? 'Not resolved (Expected: ghs.googlehosted.com)'
                        : 'Çözümlenmedi (Beklenen: ghs.googlehosted.com)'}
                  </span>
                </div>
                <div className="px-4 py-2.5 grid grid-cols-12 gap-3 items-center">
                  <span className="col-span-3 font-mono font-semibold text-[#141413]">
                    CAA (@)
                  </span>
                  <span className="col-span-9 font-mono text-[#575550] break-all">
                    {sslStatus.dns.caaRecords.length > 0
                      ? sslStatus.dns.caaRecords.join(' · ')
                      : isEn
                        ? 'No CAA restriction (Recommended: 0 issue "pki.goog")'
                        : 'CAA kısıtlaması yok (Önerilen: 0 issue "pki.goog")'}
                  </span>
                </div>
                <div className="px-4 py-2.5 grid grid-cols-12 gap-3 items-center">
                  <span className="col-span-3 font-mono font-semibold text-[#141413]">
                    TXT (@)
                  </span>
                  <span className="col-span-9 font-mono text-[#575550] break-all">
                    {sslStatus.dns.txtRecords.length > 0
                      ? sslStatus.dns.txtRecords.join(' | ')
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 2. OpenSSL CSR & Certificate Generator */}
      <div className="bg-white border border-[#E6E4DF] rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileKey2 className="w-4 h-4 text-[#D9043D]" />
          <h3 className="font-display text-lg font-semibold text-[#141413]">
            {isEn
              ? 'OpenSSL Certificate & CSR Generator (2048-bit RSA)'
              : 'SSL Sertifika & CSR Anahtar Üretici (OpenSSL 2048-bit RSA)'}
          </h3>
        </div>
        <p className="text-xs text-[#575550] leading-relaxed">
          {isEn
            ? 'Generate a standards-compliant CSR + Private Key for commercial CAs (Sectigo, DigiCert, Cloudflare Origin) or a self-signed X.509 PEM pair for local/VPS TLS termination.'
            : 'Kurumsal SSL sağlayıcıları (Sectigo, DigiCert, Cloudflare Origin) için CSR + Özel Anahtar ya da yerel/VPS HTTPS kurulumu için imzalı X.509 PEM sertifika çifti üretin.'}
        </p>

        <form
          onSubmit={handleGenerateCert}
          className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
        >
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-medium text-[#575550] mb-1">
              {isEn ? 'Output Mode' : 'Üretim Modu'}
            </label>
            <select
              value={certMode}
              onChange={(e) =>
                setCertMode(e.target.value === 'self_signed' ? 'self_signed' : 'csr')
              }
              className="w-full px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
            >
              <option value="csr">
                {isEn
                  ? 'CSR + Private Key (CA Signing)'
                  : 'CSR + Özel Anahtar (CA Başvurusu)'}
              </option>
              <option value="self_signed">
                {isEn
                  ? 'Self-Signed X.509 Cert + Key (PEM)'
                  : 'X.509 Sertifika + Özel Anahtar (PEM)'}
              </option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-[#575550] mb-1">
              {isEn ? 'Organization (O)' : 'Kurum Adı (O)'}
            </label>
            <input
              type="text"
              value={certOrg}
              onChange={(e) => setCertOrg(e.target.value)}
              maxLength={64}
              className="w-full px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-[#575550] mb-1">
              {isEn ? 'Country (C)' : 'Ülke (C)'}
            </label>
            <input
              type="text"
              value={certCountry}
              onChange={(e) => setCertCountry(e.target.value.toUpperCase())}
              maxLength={2}
              className="w-full px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] font-mono text-xs uppercase"
            />
          </div>

          {certMode === 'self_signed' && (
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-medium text-[#575550] mb-1">
                {isEn ? 'Days' : 'Gün'}
              </label>
              <input
                type="number"
                min={30}
                max={825}
                value={certDays}
                onChange={(e) => setCertDays(e.target.value)}
                className="w-full px-2.5 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] font-mono text-xs"
              />
            </div>
          )}

          <div
            className={
              certMode === 'self_signed' ? 'sm:col-span-2' : 'sm:col-span-3'
            }
          >
            <button
              type="submit"
              disabled={generatingCert}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[38px] rounded-lg bg-[#141413] text-white text-xs font-semibold hover:bg-[#2a2a28] disabled:opacity-60 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>
                {generatingCert
                  ? isEn
                    ? 'Generating...'
                    : 'Üretiliyor...'
                  : isEn
                    ? 'Generate PEM'
                    : 'SSL Üret'}
              </span>
            </button>
          </div>
        </form>

        {certError && (
          <p className="text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {certError}
          </p>
        )}

        {generatedCert && (
          <div className="space-y-4 pt-2 border-t border-[#E6E4DF]">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-mono text-[#141413]">
                CN={generatedCert.domain} · SAN={generatedCert.san.join(', ')}
              </span>
              {generatedCert.fingerprint256 && (
                <span className="font-mono text-[11px] text-[#575550]">
                  {generatedCert.fingerprint256}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#141413]">
                    {generatedCert.mode === 'csr'
                      ? 'request.csr.pem'
                      : 'fullchain.pem'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy('primaryPem', generatedCert.primaryPem)
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E6E4DF] text-[11px] font-medium hover:bg-[#FAF9F7] cursor-pointer"
                    >
                      {copiedKey === 'primaryPem' ? (
                        <Check className="w-3 h-3 text-[#D9043D]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{isEn ? 'Copy' : 'Kopyala'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadTextFile(
                          generatedCert.mode === 'csr'
                            ? `${generatedCert.domain}.csr.pem`
                            : `${generatedCert.domain}.fullchain.pem`,
                          generatedCert.primaryPem
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E6E4DF] text-[11px] font-medium hover:bg-[#FAF9F7] cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>.pem</span>
                    </button>
                  </div>
                </div>
                <pre className="p-3 rounded-lg bg-[#141413] text-[#FAF9F7] font-mono text-[10px] leading-relaxed overflow-x-auto max-h-44">
                  {generatedCert.primaryPem}
                </pre>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#141413]">
                    privkey.pem (RSA 2048)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy('privateKeyPem', generatedCert.privateKeyPem)
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E6E4DF] text-[11px] font-medium hover:bg-[#FAF9F7] cursor-pointer"
                    >
                      {copiedKey === 'privateKeyPem' ? (
                        <Check className="w-3 h-3 text-[#D9043D]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{isEn ? 'Copy' : 'Kopyala'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadTextFile(
                          `${generatedCert.domain}.privkey.pem`,
                          generatedCert.privateKeyPem
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E6E4DF] text-[11px] font-medium hover:bg-[#FAF9F7] cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>.pem</span>
                    </button>
                  </div>
                </div>
                <pre className="p-3 rounded-lg bg-[#141413] text-[#FAF9F7] font-mono text-[10px] leading-relaxed overflow-x-auto max-h-44">
                  {generatedCert.privateKeyPem}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. System Health & Full Clean Refresh ("Sistemi Sıfırdan Yenile") */}
      <div className="bg-white border border-[#E6E4DF] rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#D9043D]" />
              <h3 className="font-display text-lg font-semibold text-[#141413]">
                {isEn
                  ? 'System Health & Clean Refresh'
                  : 'Sistem Sağlığı & Sıfırdan Yenileme'}
              </h3>
            </div>
            <p className="text-xs text-[#575550] mt-1">
              {isEn
                ? 'Purge stale Service Workers, browser caches, local storage, and transient server sessions for a clean start.'
                : 'Eski Service Worker önbelleklerini, tarayıcı yerel verilerini ve geçici sunucu oturumlarını temizleyip sistemi sıfırdan yeniler.'}
            </p>
          </div>
          {health && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF9F7] border border-[#E6E4DF] font-mono text-[11px] text-[#141413] whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D9043D]" />
              <span>
                Node {health.nodeVersion} · {health.memoryMb.heapUsed} MB heap ·{' '}
                {health.uptimeSeconds}s
              </span>
            </span>
          )}
        </div>

        {resetResultMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            {resetResultMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-[#E6E4DF] bg-[#FAF9F7] space-y-3">
            <div>
              <p className="text-xs font-semibold text-[#141413]">
                {isEn
                  ? 'Clear Browser Cache & Service Worker'
                  : 'Önbellek & Service Worker Temizle'}
              </p>
              <p className="text-xs text-[#575550] mt-1 leading-relaxed">
                {isEn
                  ? 'Clears Workbox caches, unregisters offline workers, resets local cart/orders, and performs a clean reload.'
                  : 'PWA Service Worker, Workbox önbelleği ve tarayıcı sepet/sipariş verilerini sıfırlayıp sayfayı taze yükler.'}
              </p>
            </div>

            {confirmResetMode === 'cache' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={resetBusy}
                  onClick={() => void handleExecuteReset('cache')}
                  className="px-3.5 py-2 min-h-[38px] rounded-lg bg-[#D9043D] text-white text-xs font-semibold hover:bg-[#B80032] disabled:opacity-60 cursor-pointer"
                >
                  {resetBusy
                    ? isEn
                      ? 'Clearing...'
                      : 'Temizleniyor...'
                    : isEn
                      ? 'Confirm Cache Reset'
                      : 'Onayla ve Yenile'}
                </button>
                <button
                  type="button"
                  disabled={resetBusy}
                  onClick={() => setConfirmResetMode(null)}
                  className="px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] bg-white text-xs font-medium text-[#141413] cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Vazgeç'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmResetMode('cache')}
                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] bg-white text-xs font-semibold text-[#141413] hover:border-[#D9043D] hover:text-[#D9043D] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>
                  {isEn ? 'Purge Client Cache' : 'İstemci Önbelleğini Yenile'}
                </span>
              </button>
            )}
          </div>

          <div className="p-4 rounded-xl border border-[#E6E4DF] bg-[#FAF9F7] space-y-3">
            <div>
              <p className="text-xs font-semibold text-[#141413]">
                {isEn
                  ? 'Full System Reset (Server + Client)'
                  : 'Sistemi Tamamen Sıfırdan Yenile (Sunucu + İstemci)'}
              </p>
              <p className="text-xs text-[#575550] mt-1 leading-relaxed">
                {isEn
                  ? 'Resets transient server payment sessions and support threads alongside all client caches (Firestore catalog data stays intact).'
                  : 'Geçici sunucu ödeme oturumlarını ve canlı destek kayıtlarını temizler, tüm istemci önbelleklerini sıfırlar (Firestore üye/restoran verileri korunur).'}
              </p>
            </div>

            {isGlobalAdmin ? (
              confirmResetMode === 'full' ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={resetBusy}
                    onClick={() => void handleExecuteReset('full')}
                    className="px-3.5 py-2 min-h-[38px] rounded-lg bg-[#DC2626] text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                  >
                    {resetBusy
                      ? isEn
                        ? 'Resetting...'
                        : 'Sıfırlanıyor...'
                      : isEn
                        ? 'Confirm Full Reset'
                        : 'Tam Sıfırlamayı Onayla'}
                  </button>
                  <button
                    type="button"
                    disabled={resetBusy}
                    onClick={() => setConfirmResetMode(null)}
                    className="px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] bg-white text-xs font-medium text-[#141413] cursor-pointer"
                  >
                    {isEn ? 'Cancel' : 'Vazgeç'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResetMode('full')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[38px] rounded-lg bg-[#D9043D] text-white text-xs font-semibold hover:bg-[#B80032] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {isEn ? 'Reset System from Scratch' : 'Sistemi Sıfırdan Yenile'}
                  </span>
                </button>
              )
            ) : (
              <p className="text-[11px] text-[#575550]">
                {isEn
                  ? 'Server-wide reset requires Global Admin access.'
                  : 'Sunucu geneli sıfırlama için Ana Yönetici yetkisi gerekir.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
