import gsap from 'gsap';

// Animate modal opening
export const animateModalOpen = (modalRef, overlayRef) => {
    const tl = gsap.timeline();

    // Fade in overlay
    tl.fromTo(
        overlayRef,
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: 'power2.out' }
    );

    // Scale and fade in modal
    tl.fromTo(
        modalRef,
        {
            opacity: 0,
            scale: 0.9,
            y: 20
        },
        {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.3,
            ease: 'back.out(1.2)'
        },
        '-=0.1'
    );

    return tl;
};

// Animate modal closing
export const animateModalClose = (modalRef, overlayRef, onComplete) => {
    const tl = gsap.timeline({
        onComplete: onComplete
    });

    // Scale and fade out modal
    tl.to(modalRef, {
        opacity: 0,
        scale: 0.95,
        y: 10,
        duration: 0.2,
        ease: 'power2.in'
    });

    // Fade out overlay
    tl.to(
        overlayRef,
        {
            opacity: 0,
            duration: 0.15,
            ease: 'power2.in'
        },
        '-=0.1'
    );

    return tl;
};

// Animate button click
export const animateButtonClick = (buttonRef) => {
    gsap.to(buttonRef, {
        scale: 0.95,
        duration: 0.1,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1
    });
};

// Animate dropdown/history panel slide down
export const animateSlideDown = (panelRef) => {
    const tl = gsap.timeline();

    tl.fromTo(
        panelRef,
        {
            opacity: 0,
            height: 0,
            y: -20
        },
        {
            opacity: 1,
            height: 'auto',
            y: 0,
            duration: 0.3,
            ease: 'power2.out'
        }
    );

    return tl;
};

// Animate dropdown/history panel slide up
export const animateSlideUp = (panelRef, onComplete) => {
    const tl = gsap.timeline({
        onComplete: onComplete
    });

    tl.to(panelRef, {
        opacity: 0,
        height: 0,
        y: -10,
        duration: 0.25,
        ease: 'power2.in'
    });

    return tl;
};

// Animate list items stagger
export const animateListStagger = (itemsRef) => {
    gsap.fromTo(
        itemsRef,
        {
            opacity: 0,
            y: 20
        },
        {
            opacity: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.05,
            ease: 'power2.out'
        }
    );
};
