import type { ReactNode } from 'react';

type SectionProps = {
  id?: string;
  children: ReactNode;
  className?: string;
  /** Largeur du conteneur interne ; `false` pour gérer soi-même. */
  contained?: boolean;
};

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 sm:px-8 ${className}`}>{children}</div>;
}

export default function Section({ id, children, className = '', contained = true }: SectionProps) {
  return (
    <section id={id} className={`py-20 sm:py-24 lg:py-32 ${className}`}>
      {contained ? <Container>{children}</Container> : children}
    </section>
  );
}

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'center' | 'left';
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className = '',
}: SectionHeadingProps) {
  const isCentered = align === 'center';

  return (
    <div
      className={`${isCentered ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl text-left'} ${className}`}
    >
      {eyebrow && (
        <span
          className={`mb-3 inline-flex items-center rounded-full border border-surface-container-high bg-white px-3 py-1 text-xs font-bold uppercase tracking-widest text-secondary ${
            isCentered ? '' : 'w-fit'
          }`}
        >
          {eyebrow}
        </span>
      )}

      <h2 className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl lg:text-4xl">
        {title}
      </h2>

      {description && (
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant sm:text-base">
          {description}
        </p>
      )}
    </div>
  );
}
