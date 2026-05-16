export default function PendingPage() {
  return (
    <div className="min-h-full flex items-center justify-center bg-slate-50 py-12 px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Thanks for signing up
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Your account is pending approval. An administrator will review your request
            and grant you access shortly.
          </p>
          <p className="text-slate-400 text-xs mt-4">
            If you have not yet confirmed your email, please check your inbox first.
          </p>
        </div>
      </div>
    </div>
  )
}
