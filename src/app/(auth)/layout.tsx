import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex items-center justify-center bg-slate-50 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image src="/clear_logo.svg" alt="DPA Dashboard Logo" width={150} height={150} />
          </div>
          <h1 className="font-poppins text-[32px] font-bold text-[#1d2d47] leading-tight">DPA Dashboard</h1>
          <p className="font-poppins text-[20px] text-slate-500 mt-1">Welcome Back</p>
        </div>
        {children}
      </div>
    </div>
  )
}
