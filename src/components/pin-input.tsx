"use client";

import { useState, useRef } from "react";

interface PinInputProps {
  onSubmit: (pin: string) => Promise<void>;
}

export function PinInput({ onSubmit }: PinInputProps) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = async (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError("");

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when 4 digits entered
    if (value && index === 3) {
      const pin = newDigits.join("");
      if (pin.length === 4) {
        setLoading(true);
        try {
          await onSubmit(pin);
        } catch (e) {
          setError(e instanceof Error ? e.message : "エラーが発生しました");
          setDigits(["", "", "", ""]);
          inputRefs.current[0]?.focus();
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 4) {
      const newDigits = pasted.split("");
      setDigits(newDigits);
      setLoading(true);
      try {
        await onSubmit(pasted);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
        setDigits(["", "", "", ""]);
        inputRefs.current[0]?.focus();
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-gray-600">パスコードを入力してください</p>

      <div className="flex gap-3" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={loading}
            className="w-14 h-16 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl
                       focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 outline-none
                       disabled:opacity-50 transition-colors"
            aria-label={`PIN ${i + 1}桁目`}
          />
        ))}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {loading && <p className="text-gray-500 text-sm">確認中...</p>}
    </div>
  );
}
