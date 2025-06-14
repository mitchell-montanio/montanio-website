document.addEventListener('DOMContentLoaded', () => {
    const galleries = document.querySelectorAll('.horizontal-gallery, .horizontal-gallery-shorter');

    galleries.forEach(gallery => {
        // Determine scroll speed based on screen size
        function getScrollSpeed() {
            return window.innerWidth <= 768 ? 5 : 10; // 5px for mobile, 10px for desktop
        }

        let autoScroll;
        function startAutoScroll() {
            autoScroll = setInterval(() => {
                gallery.scrollLeft += getScrollSpeed();
                // Optional: stop at the end
                if (gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth) {
                    clearInterval(autoScroll);
                }
            }, 10);
        }
        startAutoScroll();

        // Pause auto-scroll on hover
        gallery.addEventListener('mouseenter', () => clearInterval(autoScroll));
        // Resume auto-scroll on mouse leave
        gallery.addEventListener('mouseleave', startAutoScroll);

        // Wheel scroll
        gallery.addEventListener('wheel', (e) => {
            if (e.deltaY === 0) return;
            e.preventDefault();
            gallery.scrollLeft += e.deltaY * 3;
        }, { passive: false });

        // Adjust scroll speed on window resize
        window.addEventListener('resize', () => {
            clearInterval(autoScroll);
            startAutoScroll();
        });
    });
});