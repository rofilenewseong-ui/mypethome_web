export default function MobileOnlyPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ background: '#F5F1EA' }}
    >
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-6"
        style={{ background: 'linear-gradient(135deg, #6B8E5E, #4A6741)' }}
      >
        📱
      </div>
      <h1 className="text-xl font-bold mb-3" style={{ color: '#2D2D2D' }}>
        모바일에서 접속해주세요
      </h1>
      <p className="text-sm text-center leading-relaxed max-w-sm" style={{ color: '#888' }}>
        PetHolo는 모바일 전용 서비스입니다.<br />
        스마트폰에서 접속하시면 모든 기능을 이용하실 수 있습니다.
      </p>
      <div
        className="mt-8 px-6 py-3 rounded-2xl text-sm font-bold"
        style={{ background: '#f0ebe4', color: '#aaa' }}
      >
        QR 코드로 모바일에서 열기 (준비 중)
      </div>
    </div>
  );
}
