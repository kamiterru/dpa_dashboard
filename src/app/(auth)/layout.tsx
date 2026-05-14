export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex items-center justify-center bg-slate-50 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">DPA Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Data Processing Agreement Management</p>
        </div>
        {children}
      </div>
    </div>
  )
}
