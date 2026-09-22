interface LoadingSpinnerProps {
  tamanho?: "sm" | "md" | "lg";
  texto?: string;
}

const tamanhoClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export default function LoadingSpinner({
  tamanho = "md",
  texto,
}: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8">
      <div
        className={`${tamanhoClasses[tamanho]} animate-spin rounded-full border-2 border-gray-600 border-t-green-500`}
      />
      {texto && <p className="text-sm text-gray-400">{texto}</p>}
    </div>
  );
}
