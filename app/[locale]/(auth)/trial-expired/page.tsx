export default function TrialExpiredPage() {
  return (
    <div style={{ background: '#050A0F', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Cairo, sans-serif' }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '24px', padding: '40px', maxWidth: '420px', width: '100%', textAlign: 'center', backdropFilter: 'blur(12px)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏰</div>
        <h1 style={{ color: '#C9A84C', fontSize: '22px', fontWeight: '900', marginBottom: '8px' }}>انتهت تجربتك المجانية</h1>
        <p style={{ color: '#8899BB', fontSize: '13px', lineHeight: '1.8' }}>انتهت فترة التجربة المجانية (7 أيام). للاستمرار في استخدام JK Trading Journal، تواصل معنا للاشتراك بـ <strong style={{color:'#C9A84C'}}>60$ شهرياً</strong>.</p>
        <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(201,168,76,0.08)', borderRadius: '12px', border: '1px solid rgba(201,168,76,0.2)' }}>
          <p style={{ color: '#C9A84C', fontSize: '12px', fontWeight: '700' }}>للاشتراك: تواصل مع الإدارة</p>
        </div>
        <p style={{ color: '#4A5A7A', fontSize: '11px', marginTop: '20px' }}>JK Trading Journal</p>
      </div>
    </div>
  )
}
