'use client';
export default function Choices({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Record<string, string>;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="choices-field">
      <legend>{label}</legend>
      <div className="choices">
        {Object.entries(options).map(([key, text]) => (
          <label className={`choice ${value === key ? 'selected' : ''}`} key={key}>
            <input
              type="radio"
              name={label}
              value={key}
              checked={value === key}
              onChange={() => onChange(key)}
            />
            <span>{text}</span>
            <span className="radio-mark" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
