"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FC,
  type ChangeEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

/* ── Unit Types ── */
export interface MeasurementUnit {
  code: string;
  label: string;
  symbol: string;
  /** Rate relative to CM (1 CM = 1) */
  toCmRate: number;
}

const UNITS: MeasurementUnit[] = [
  { code: "CM", label: "Centimeters", symbol: "cm", toCmRate: 1 },
  { code: "IN", label: "Inches", symbol: "in", toCmRate: 2.54 },
  { code: "FT", label: "Feet", symbol: "ft", toCmRate: 30.48 },
];

function convert(value: number, from: MeasurementUnit, to: MeasurementUnit): number {
  if (isNaN(value)) return 0;
  // Convert to CM first, then to target
  const inCm = value * from.toCmRate;
  return inCm / to.toCmRate;
}

/* ── Unit Dropdown ── */
interface DropdownProps {
  selected: MeasurementUnit;
  onSelect: (unit: MeasurementUnit) => void;
  units: MeasurementUnit[];
}

const UnitDropdown: FC<DropdownProps> = ({ selected, onSelect, units }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-[5px] border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition-all active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        <span className="flex size-5 items-center justify-center rounded-[3px] bg-indigo-50 text-[10px] font-extrabold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
          {selected.symbol}
        </span>
        <span>{selected.code}</span>
        <ChevronDown
          className={`size-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-1.5 w-44 rounded-[5px] border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            {units.map((unit) => (
              <button
                key={unit.code}
                type="button"
                onClick={() => {
                  onSelect(unit);
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-[3px] bg-indigo-50 text-[10px] font-extrabold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    {unit.symbol}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {unit.label}
                  </span>
                </div>
                {unit.code === selected.code && (
                  <Check className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Animated Number ── */
interface AnimatedNumberProps {
  value: string;
}

const AnimatedNumber: FC<AnimatedNumberProps> = ({ value }) => {
  const chars = String(value || "0").split("");

  return (
    <div className="flex items-center text-xl font-bold text-slate-900 dark:text-slate-100">
      {chars.map((char, i) => {
        const delay = (chars.length - 1 - i) * 0.03;
        return <DigitColumn key={i} digit={char} delay={delay} />;
      })}
    </div>
  );
};

interface DigitColumnProps {
  digit: string;
  delay?: number;
}

const DigitColumn: FC<DigitColumnProps> = ({ digit, delay = 0 }) => {
  const num = Number(digit);

  if (Number.isNaN(num)) {
    return (
      <span className="inline-block w-[0.5em] text-center font-extrabold text-slate-900 dark:text-white">
        {digit}
      </span>
    );
  }

  return (
    <div className="relative flex items-center justify-center" style={{ height: 26, width: "0.6em" }}>
      <AnimatePresence initial={false}>
        <motion.span
          key={digit}
          initial={{ opacity: 0, y: -8, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            bounce: 0.2,
            duration: 0.35,
            delay,
          }}
          className="absolute font-extrabold text-slate-900 dark:text-white"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

/* ── Main Component ── */
interface SwapMeasurementCardProps {
  defaultFromCode?: string;
  defaultToCode?: string;
  defaultAmount?: string;
}

export const SwapMeasurementCard: FC<SwapMeasurementCardProps> = ({
  defaultFromCode = "CM",
  defaultToCode = "IN",
  defaultAmount = "100",
}) => {
  const fromDefault = UNITS.find((u) => u.code === defaultFromCode) || UNITS[0];
  const toDefault = UNITS.find((u) => u.code === defaultToCode) || UNITS[1];

  const [fromUnit, setFromUnit] = useState(fromDefault);
  const [toUnit, setToUnit] = useState(toDefault);
  const [fromAmount, setFromAmount] = useState(defaultAmount);
  const [toAmount, setToAmount] = useState("");
  const [copied, setCopied] = useState(false);

  const doConvert = useCallback(
    (amount: string, from: MeasurementUnit, to: MeasurementUnit): string => {
      const val = parseFloat(amount);
      if (isNaN(val)) return "";
      return convert(val, from, to).toFixed(4).replace(/\.?0+$/, "");
    },
    [],
  );

  useEffect(() => {
    requestAnimationFrame(() =>
      setToAmount(doConvert(fromAmount, fromUnit, toUnit)),
    );
  }, [doConvert, fromAmount, fromUnit, toUnit]);

  const handleFromChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setFromAmount(val);
      setToAmount(doConvert(val, fromUnit, toUnit));
    }
  };

  const handleToChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setToAmount(val);
      setFromAmount(doConvert(val, toUnit, fromUnit));
    }
  };

  const handleSwap = () => {
    const prevFrom = fromUnit;
    const prevTo = toUnit;
    const prevFromAmount = fromAmount;
    setFromUnit(prevTo);
    setToUnit(prevFrom);
    setFromAmount(toAmount);
    setToAmount(prevFromAmount);
  };

  const rate = convert(1, fromUnit, toUnit).toFixed(4).replace(/\.?0+$/, "");

  const handleCopy = () => {
    const summary = `${fromAmount} ${fromUnit.symbol} = ${toAmount} ${toUnit.symbol}`;
    navigator.clipboard.writeText(toAmount);
    setCopied(true);
    toast.success(`Copied: ${summary}`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="flex w-full flex-col gap-4"
    >
      {/* From input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          From
        </label>
        <div className="flex items-center justify-between rounded-[5px] border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="relative mr-3 flex-1">
            <AnimatedNumber value={fromAmount} />
            <input
              title="from"
              value={fromAmount}
              onChange={handleFromChange}
              className="absolute inset-0 w-full bg-transparent text-xl font-bold tracking-wide text-transparent caret-indigo-600 outline-none dark:caret-indigo-400"
              inputMode="decimal"
            />
          </div>
          <UnitDropdown
            selected={fromUnit}
            units={UNITS}
            onSelect={(u) => {
              setFromUnit(u);
              setToAmount(doConvert(fromAmount, u, toUnit));
            }}
          />
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={handleSwap}
          className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs transition-all hover:border-indigo-300 hover:text-indigo-600 active:scale-90 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-indigo-800 dark:hover:text-indigo-400"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="rotate-90">
            <path d="M3.5 1.75L1.75 3.5L3.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1.75 3.5H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M10.5 12.25L12.25 10.5L10.5 8.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12.25 10.5H3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* To input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          To
        </label>
        <div className="flex items-center justify-between rounded-[5px] border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="relative mr-3 flex-1">
            <AnimatedNumber value={toAmount} />
            <input
              title="to"
              value={toAmount}
              onChange={handleToChange}
              className="absolute inset-0 w-full bg-transparent text-xl font-bold tracking-wide text-transparent caret-indigo-600 outline-none dark:caret-indigo-400"
              inputMode="decimal"
            />
          </div>
          <UnitDropdown
            selected={toUnit}
            units={UNITS}
            onSelect={(u) => {
              setToUnit(u);
              setToAmount(doConvert(fromAmount, fromUnit, u));
            }}
          />
        </div>
      </div>

      {/* Copy Result */}
      <button
        type="button"
        onClick={handleCopy}
        className="flex w-full items-center justify-center gap-2 rounded-[5px] bg-indigo-600 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 active:scale-[0.98] dark:bg-indigo-500 dark:hover:bg-indigo-600"
      >
        {copied ? (
          <>
            <CheckCircle className="size-4" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="size-4" />
            Copy Result
          </>
        )}
      </button>

      {/* Conversion rate */}
      <p className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
        1 {fromUnit.symbol} = {rate} {toUnit.symbol}
      </p>
    </motion.div>
  );
};
