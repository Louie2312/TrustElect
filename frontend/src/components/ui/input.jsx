export function Input({ type = "text", placeholder, value, onChange, className = "" }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`w-full px-3 py-2 border rounded-md text-gray-800 focus:outline-none focus:ring focus:border-blue-500 ${className}`}
    />
  );
}
