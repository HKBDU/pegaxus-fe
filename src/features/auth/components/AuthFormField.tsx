import type { ComponentProps } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { cn } from "@/lib/utils";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";

export const authInputClass =
  "h-14 rounded-none border-neutral-300 bg-white px-4 text-base text-neutral-900 shadow-none " +
  "placeholder:text-neutral-400 " +
  "focus-visible:border-[#F39200] focus-visible:ring-[#F39200]/20 " +
  "aria-invalid:border-red-600 " +
  "aria-invalid:focus-visible:!border-[#F39200] " +
  "aria-invalid:focus-visible:!ring-[#F39200]/20";

export const authLabelClass =
  "font-['Arial_Narrow',Impact,sans-serif] text-xl font-bold uppercase !text-[#202020]";

export const authMessageClass = "text-sm !text-red-700";

export const authPrimaryButtonClass =
  "h-15 w-full rounded-none bg-[#F39200] font-['Arial_Narrow',Impact,sans-serif] " +
  "text-2xl font-bold text-[#202020] uppercase shadow-none hover:bg-[#df8500]";

type InputProps = Omit<
  ComponentProps<typeof Input>,
  "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "ref"
>;

interface AuthFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends InputProps {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
}

export function AuthFormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  className,
  ...inputProps
}: AuthFormFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={authLabelClass}>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              {...inputProps}
              className={cn(authInputClass, className)}
            />
          </FormControl>
          <FormMessage className={authMessageClass} />
        </FormItem>
      )}
    />
  );
}
