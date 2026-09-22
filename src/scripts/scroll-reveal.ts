import gsapDefault from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface GsapLike {
  fromTo: (target: unknown, from: Record<string, unknown>, to: Record<string, unknown>) => unknown;
  registerPlugin: (...plugins: unknown[]) => void;
}

export function initScrollReveal(root: ParentNode = document, gsapInstance: GsapLike = gsapDefault): number {
  gsapInstance.registerPlugin(ScrollTrigger);

  const targets = root.querySelectorAll('[data-reveal]');
  targets.forEach((el) => {
    gsapInstance.fromTo(
      el,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%' },
      },
    );
  });

  return targets.length;
}
