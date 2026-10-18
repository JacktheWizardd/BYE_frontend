// Small line icons drawn for BYE: 24px grid, 1.75 stroke, round caps. Decorative unless labelled.
type IconProps = { className?: string }
const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

export const SearchIcon = ({ className }: IconProps) => <svg {...base} className={className}><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></svg>
export const ArrowRight = ({ className }: IconProps) => <svg {...base} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
export const ChevronDown = ({ className }: IconProps) => <svg {...base} className={className}><path d="M6 9l6 6 6-6" /></svg>
export const CheckIcon = ({ className }: IconProps) => <svg {...base} className={className}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
export const SparkIcon = ({ className }: IconProps) => <svg {...base} className={className}><path d="M12 3.5l1.8 5.2L19 10.5l-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z" /><path d="M18.5 16v4M16.5 18h4" /></svg>
export const LaptopIcon = ({ className }: IconProps) => <svg {...base} className={className}><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" /></svg>
export const LockIcon = ({ className }: IconProps) => <svg {...base} className={className}><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>
export const MailIcon = ({ className }: IconProps) => <svg {...base} className={className}><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="M4 7l8 6 8-6" /></svg>
export const SortIcon = ({ className }: IconProps) => <svg {...base} className={className}><path d="M7 4v16M3.5 16.5L7 20l3.5-3.5M17 20V4M13.5 7.5L17 4l3.5 3.5" /></svg>
