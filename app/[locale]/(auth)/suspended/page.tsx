export default function SuspendedPage() {
  return (
    <div style={{ background: '#050A0F', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Cairo, sans-serif' }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '24px', padding: '40px', maxWidth: '420px', width: '100%', textAlign: 'center', backdropFilter: 'blur(12px)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h1 style={{ color: '#C9A84C', fontSize: '22px', fontWeight: '900', marginBottom: '8px' }}>الحساب موقوف</h1>
        <p style={{ color: '#8899BB', fontSize: '13px', lineHeight: '1.8' }}>تم إيقاف حسابك مؤقتاً. تواصل مع الإدارة للمزيد من المعلومات.</p>
        <p style={{ color: '#4A5A7A', fontSize: '11px', marginTop: '20px' }}>JK Trading Journal</p>
      </div>
    </div>
  )
}
