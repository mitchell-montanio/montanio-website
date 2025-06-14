document.addEventListener('DOMContentLoaded', () => {
    const albumWrapper = document.querySelector('.album-wrapper');
    const slider = document.querySelector('#album-slider');
    const galleries = document.querySelectorAll('.horizontal-gallery, .horizontal-gallery-shorter');

    if (!albumWrapper || !slider) {
        console.error('Required elements not found!');
        // Don't return here, allow gallery scroll to work even if slider/albumWrapper missing
    }

    // Slider logic (if present)
    if (albumWrapper && slider) {
        const maxScroll = albumWrapper.scrollWidth - albumWrapper.offsetWidth;
        slider.max = maxScroll;
        slider.addEventListener('input', (e) => {
            const scrollValue = e.target.value;
            albumWrapper.style.transform = `translateX(-${scrollValue}px)`;
        });
    }

    // Auto-scroll on load
    galleries.forEach(gallery => {
        let autoScroll = setInterval(() => {
            gallery.scrollLeft += 1; // Adjust speed by changing this value
            // Optional: stop at the end
            if (gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth) {
                clearInterval(autoScroll);
            }
        }, 10); // Adjust interval for speed

        // Pause auto-scroll on hover
        gallery.addEventListener('mouseenter', () => clearInterval(autoScroll));
        // Resume auto-scroll on mouse leave
        gallery.addEventListener('mouseleave', () => {
            autoScroll = setInterval(() => {
                gallery.scrollLeft += 1;
                if (gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth) {
                    clearInterval(autoScroll);
                }
            }, 10);
        });
    });

    galleries.forEach(gallery => {
        gallery.addEventListener('wheel', (e) => {
            if (e.deltaY === 0) return; // Only act on vertical scroll
            e.preventDefault();
            gallery.scrollLeft += e.deltaY * 3; // This makes down = right, up = left
        }, { passive: false });
    });
});