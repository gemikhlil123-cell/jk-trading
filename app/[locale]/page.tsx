import Link from 'next/link'

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <main className="min-h-screen bg-[#0A192F] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1D3461] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#F5F5DC] flex items-center justify-center">
            <span className="text-[#0A192F] font-bold text-sm">JK</span>
          </div>
          <span className="font-bold text-[#F5F5DC] text-lg">JK Trading Journal</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/login`}
            className="text-[#F5F5DC]/70 hover:text-[#F5F5DC] text-sm transition-colors"
          >
            تسجيل الدخول
          </Link>
          <Link
            href={`/${locale}/register`}
            className="bg-[#F5F5DC] text-[#0A192F] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#E8E8C0] transition-colors"
          >
            ابدأ الآن
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#112240] border border-[#1D3461] rounded-full px-4 py-1.5 text-sm text-[#F5F5DC]/70 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            منهجية SMC / ICT & Quarterly Theory
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-[#F5F5DC] leading-tight mb-6">
            يوميات تداول
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#F5F5DC] to-[#C8C8A0]">
              احترافية
            </span>
          </h1>

          <p className="text-xl text-[#F5F5DC]/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            سجّل صفقاتك، حدّد الإعدادات الناجحة، واحذف العادات الخاسرة — كل ذلك من خلال تحليل آلي ذكي
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${locale}/register`}
              className="bg-[#F5F5DC] text-[#0A192F] px-8 py-3.5 rounded-xl font-bold text-lg hover:bg-[#E8E8C0] transition-all hover:scale-105"
            >
              ابدأ مجاناً
            </Link>
            <Link
              href={`/${locale}/login`}
              className="border border-[#1D3461] text-[#F5F5DC] px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-[#112240] transition-colors"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 border-t border-[#1D3461]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '📊',
              title: 'محرك الذكاء الاصطناعي',
              desc: 'يحلل صفقاتك ويحدد قائمة الاحتفاظ وقائمة الإزالة تلقائياً',
            },
            {
              icon: '🎯',
              title: 'أسباب الدخول الإلزامية',
              desc: 'SMT، PSP، FVG، CISD — وسوم دقيقة لكل صفقة',
            },
            {
              icon: '📈',
              title: 'مراجعة أسبوعية',
              desc: 'تقارير مفصلة تُظهر نقاط قوتك وضعفك بشكل بياني واضح',
            },
          ].map((f) => (
            <div key={f.title} className="bg-[#112240] border border-[#1D3461] rounded-xl p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-[#F5F5DC] text-lg mb-2">{f.title}</h3>
              <p className="text-[#F5F5DC]/60 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1D3461] px-6 py-6 text-center text-[#F5F5DC]/40 text-sm">
        © {new Date().getFullYear()} JK Trading Journal — جميع الحقوق محفوظة
      </footer>
    </main>
  )
}
