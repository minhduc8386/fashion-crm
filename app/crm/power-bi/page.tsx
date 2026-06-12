export default function PowerBiDashboardPage() {
  const embedUrl = process.env.POWERBI_EMBED_URL;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Business Intelligence</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Power BI Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">
          Embed Power BI Service report trong CRM bằng biến môi trường, không hard-code URL hoặc token.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {embedUrl ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <iframe
              title="Power BI Dashboard"
              src={embedUrl}
              className="h-[72vh] w-full"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-lg font-semibold text-slate-950">
              Power BI Service dashboard will be embedded here.
            </p>
            <p className="mt-2 max-w-xl text-sm text-slate-500">
              Please configure POWERBI_EMBED_URL in your environment variables. Access tokens
              should stay server-side and must not be placed in frontend code.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
