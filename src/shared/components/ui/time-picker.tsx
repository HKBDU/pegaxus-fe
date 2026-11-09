import {
  TimePickerWithIcon,
  type TimePickerWithIconProps,
} from "@/shared/components/shadcn-studio/date-picker/date-picker-09"

type TimePickerProps = TimePickerWithIconProps & {
  "aria-label"?: string
}

function TimePicker(props: TimePickerProps) {
  return <TimePickerWithIcon {...props} />
}

export { TimePicker, type TimePickerProps }
