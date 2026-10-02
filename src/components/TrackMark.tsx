import { Telescope, Wrench } from 'lucide-react';
import type { Locale } from '../lib/i18n';
import './track-mark.css';

export type TrackId = 'decideurs' | 'tech';

interface TrackMarkProps {
  track: TrackId;
  variant?: 'label' | 'icon';
  className?: string;
  /* Composant React : il ne lit pas l'URL, l'appelant lui passe la langue. */
  locale?: Locale;
}

const TRACKS = {
  decideurs: {
    label: { fr: 'Ceux qui décident', en: 'Those who decide' },
    Icon: Telescope,
  },
  tech: {
    label: { fr: 'Ceux qui implémentent', en: 'Those who implement' },
    Icon: Wrench,
  },
} as const;

export default function TrackMark({ track, variant = 'label', className, locale = 'fr' }: TrackMarkProps) {
  const { Icon } = TRACKS[track];
  const label = TRACKS[track].label[locale];
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
