import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const base = "rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50";
  const styles = {
    primary: "bg-primary text-white hover:opacity-90",
    ghost: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
  }[variant];
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-gray-200 bg-white p-5 ${className}`}>{children}</div>;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="mb-6 text-2xl font-bold text-gray-900">{children}</h1>;
}
