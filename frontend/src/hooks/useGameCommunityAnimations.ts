import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type AnimationRefs = {
    root: RefObject<HTMLElement | null>;
    heroCards: RefObject<HTMLElement | null>;
    sections: RefObject<HTMLElement[]>;
    playStyleCards: RefObject<HTMLElement[]>;
    joinPhotos: RefObject<HTMLElement | null>;
};

export function useGameCommunityAnimations(refs: AnimationRefs) {
    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isMobile = window.matchMedia('(max-width: 767px)').matches;

        if (prefersReducedMotion) {
            gsap.set(
                [
                    refs.heroCards.current,
                    ...refs.sections.current,
                    ...refs.playStyleCards.current,
                    refs.joinPhotos.current,
                ].filter(Boolean),
                { opacity: 1, y: 0, x: 0, rotate: 0 },
            );
            return;
        }

        const ctx = gsap.context(() => {
            const heroCards = refs.heroCards.current?.querySelectorAll('.game-hero-card');
            if (heroCards?.length) {
                gsap.fromTo(
                    heroCards,
                    { y: isMobile ? 24 : 48, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: isMobile ? 0.6 : 0.9,
                        stagger: 0.12,
                        ease: 'power2.out',
                        delay: 0.15,
                    },
                );

                gsap.to(heroCards, {
                    y: isMobile ? -8 : -18,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: refs.heroCards.current,
                        start: 'top top',
                        end: 'bottom top',
                        scrub: isMobile ? 0.6 : 1.2,
                    },
                });
            }

            refs.sections.current.forEach((section) => {
                if (!section) return;
                gsap.fromTo(
                    section,
                    { y: isMobile ? 20 : 36, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: isMobile ? 0.55 : 0.75,
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: section,
                            start: 'top 88%',
                            toggleActions: 'play none none none',
                        },
                    },
                );
            });

            const playCards = refs.playStyleCards.current.filter(Boolean);
            if (playCards.length) {
                gsap.fromTo(
                    playCards,
                    { y: isMobile ? 16 : 28, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: isMobile ? 0.45 : 0.6,
                        stagger: 0.1,
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: playCards[0],
                            start: 'top 85%',
                            toggleActions: 'play none none none',
                        },
                    },
                );
            }

            const joinPhotos = refs.joinPhotos.current?.querySelectorAll('.game-join-photo');
            if (joinPhotos?.length) {
                gsap.fromTo(
                    joinPhotos,
                    { y: 20, opacity: 0, rotate: (i) => (i - 1) * 6 },
                    {
                        y: 0,
                        opacity: 1,
                        rotate: (i) => [-4, 2, 5][i] ?? 0,
                        duration: 0.7,
                        stagger: 0.1,
                        ease: 'back.out(1.2)',
                        scrollTrigger: {
                            trigger: refs.joinPhotos.current,
                            start: 'top 85%',
                            toggleActions: 'play none none none',
                        },
                    },
                );
            }
        }, refs.root);

        return () => ctx.revert();
    }, [refs.root, refs.heroCards, refs.sections, refs.playStyleCards, refs.joinPhotos]);
}
