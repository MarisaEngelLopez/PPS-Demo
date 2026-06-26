import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { filterInputStyle, inputStyle, labelStyle } from "@/components/ui/layoutStyles";

type FieldShellProps = {
  label: ReactNode;
  children: ReactNode;
};

type Option = {
  value: string;
  label: string;
};

type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: Option[];
  placeholder?: string;
};

export function FilterField({ label, children }: FieldShellProps) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export function CheckboxFilterField({
  label,
  name,
  defaultChecked,
}: {
  label: ReactNode;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={Boolean(defaultChecked)}
      />
      {label}
    </label>
  );
}

export function DetailField({ label, children }: FieldShellProps) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, marginTop: 0, ...props.style }} />;
}

export function DateInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <TextInput {...props} type="date" />;
}

export function TextAreaInput(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, minHeight: "48px", marginTop: 0, ...props.style }}
    />
  );
}

export function SelectInput({ options, placeholder, ...props }: SelectInputProps) {
  return (
    <select {...props} style={{ ...inputStyle, marginTop: 0, ...props.style }}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function FilterSelectInput({
  options,
  placeholder,
  ...props
}: SelectInputProps) {
  return (
    <select {...props} style={{ ...filterInputStyle, ...props.style }}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function FilterTextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...filterInputStyle, ...props.style }} />;
}
