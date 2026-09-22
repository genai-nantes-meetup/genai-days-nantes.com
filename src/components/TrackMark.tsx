import { Telescope, Wrench } from 'lucide-react';
import './track-mark.css';

export type TrackId = 'decideurs' | 'tech';

interface TrackMarkProps {
  track: TrackId;
  variant?: 'label' | 'icon';
  className?: string;
}

const TRACKS = {
  decideurs: {
    label: 'Ceux qui décident',
    Icon: Telescope,
  },
  tech: {
    label: 'Ceux qui implémentent',
    Icon: Wrench,
  },
} as const;

export default function TrackMark({ track, variant = 'label', className }: TrackMarkProps) {
  const { label, Icon } = TRACKS[track];
  const classes = ['track-mark', `track-mark--${variant}`, className].filter(Boolean).join(' ');

  if (variant === 'label') {
    return (
      <span className={classes} data-track-mark={track} data-track-mark-variant={variant}>
        <Icon className="track-mark__icon" aria-hidden="true" strokeWidth={1.85} />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span
      className={classes}
      aria-hidden="true"
      data-track-mark={track}
      data-track-mark-variant={variant}
    >
      <Icon className="track-mark__icon" strokeWidth={1.85} />
    </span>
  );
}
