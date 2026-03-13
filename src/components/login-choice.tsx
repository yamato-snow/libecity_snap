"use client";

interface LoginChoiceProps {
  onNewUser: () => void;
  onRelogin: () => void;
}

export function LoginChoice({ onNewUser, onRelogin }: LoginChoiceProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-xl font-bold text-gray-800">ようこそ！</h2>
      <p className="text-gray-600">ログイン方法を選んでください</p>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={onNewUser}
          className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl
                     hover:bg-emerald-600 transition-colors"
        >
          初めての方
        </button>
        <button
          onClick={onRelogin}
          className="w-full py-3 bg-white text-emerald-500 font-bold rounded-xl
                     border-2 border-emerald-500 hover:bg-emerald-50 transition-colors"
        >
          再ログイン
        </button>
      </div>
    </div>
  );
}
