export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#1A1A1A] flex flex-col items-center justify-center z-[100]">
      <img
        src="/Logo_Naranja.jpeg"
        alt="Recorramos México"
        className="w-40 h-40 rounded-2xl object-cover animate-pulse"
      />
      <div className="mt-6 flex gap-1.5">
        <span className="w-2.5 h-2.5 bg-[#E8670A] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2.5 h-2.5 bg-[#E8670A] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2.5 h-2.5 bg-[#E8670A] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
